import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface UserPayload {
  email: string;
  password?: string;
  full_name: string;
  role: string;
  branch_id?: string;
  permissions?: any[];
  is_active?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Verify request method
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
      throw new Error('Method not allowed');
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the user is authenticated and has admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin by checking the users table
    const { data: adminCheck, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminCheck || adminCheck.role !== 'admin') {
      throw new Error('Unauthorized - Admin access required');
    }

    // Handle different HTTP methods
    if (req.method === 'POST') {
      return await handlePostRequest(req);
    } else if (req.method === 'PUT') {
      return await handlePutRequest(req);
    } else if (req.method === 'DELETE') {
      return await handleDeleteRequest(req);
    }

    throw new Error('Method not implemented');

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * معالجة طلب POST (إنشاء مستخدم جديد)
 */
async function handlePostRequest(req: Request) {
  const payload = await req.json();

  // التعامل مع طلبات خاصة
  if (payload.action === 'reset_password') {
    return await handlePasswordReset(payload.email);
  }

  try {
    // التحقق من وجود المستخدم قبل إنشائه - استخدام طريقة مباشرة أكثر موثوقية
    const { data: existingDbUser, error: dbError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', payload.email)
      .maybeSingle();
    
    if (dbError) {
      console.error('Error checking database:', dbError);
    }
    
    if (existingDbUser) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني مسجل مسبقاً في قاعدة البيانات' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    
    // إنشاء المستخدم في نظام المصادقة باستخدام Service Role (لديه جميع الصلاحيات)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name,
      }
    });

    if (createError) {
      // التعامل بشكل خاص مع أخطاء "البريد الإلكتروني موجود بالفعل"
      if (createError.message.includes('already registered') || 
          createError.message.includes('User already exists') ||
          createError.message.includes('duplicate key')) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني مسجل مسبقاً في نظام المصادقة' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      throw new Error(`Error creating auth user: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error('Failed to create user');
    }

    // إدخال بيانات المستخدم في جدول المستخدمين
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: newUser.user.id,
        email: payload.email,
        full_name: payload.full_name,
        role: payload.role,
        branch_id: payload.branch_id,
        permissions: payload.permissions,
        is_active: payload.is_active ?? true
      });

    if (insertError) {
      // تنظيف: حذف المستخدم من نظام المصادقة إذا فشل الإدخال
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Error inserting user data: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'تم إنشاء المستخدم بنجاح',
        user: newUser.user
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    // لوج الخطأ للتشخيص
    console.error("Error in user creation:", error);
    
    // التعامل مع خطأ تكرار البريد الإلكتروني بشكل خاص
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    if (errorMessage.includes('duplicate key') || 
        errorMessage.includes('already registered') || 
        errorMessage.includes('users_email_key')) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني مسجل مسبقاً' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}

/**
 * معالجة طلب PUT (تحديث مستخدم)
 */
async function handlePutRequest(req: Request) {
  const { userId, password } = await req.json();

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User ID is required' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  if (password) {
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (passwordError) {
      return new Response(
        JSON.stringify({ error: passwordError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ message: 'تم تحديث المستخدم بنجاح' }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

/**
 * معالجة طلب DELETE (حذف مستخدم)
 */
async function handleDeleteRequest(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User ID is required' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    return new Response(
      JSON.stringify({ error: deleteError.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  return new Response(
    JSON.stringify({ message: 'تم حذف المستخدم بنجاح' }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

/**
 * معالجة طلب إعادة تعيين كلمة المرور
 */
async function handlePasswordReset(email: string) {
  if (!email) {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

  if (resetError) {
    return new Response(
      JSON.stringify({ error: resetError.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  return new Response(
    JSON.stringify({ message: 'تم إرسال رابط إعادة تعيين كلمة المرور بنجاح' }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}