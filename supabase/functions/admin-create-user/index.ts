import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

interface CreateUserRequest {
  email: string;
  password: string;
  user_metadata: {
    full_name: string;
    role: string;
    branch_id: string | null;
  };
}

serve(async (req) => {
  try {
    // إنشاء عميل Supabase مع مفتاح الخدمة
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // استخراج بيانات الطلب
    const { email, password, user_metadata } = await req.json() as CreateUserRequest;
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // إنشاء المستخدم بصلاحيات المسؤول بدون تسجيل الدخول تلقائيًا
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // تأكيد البريد تلقائيًا
      user_metadata,
    });
    
    if (error) {
      console.error('Error creating user:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ id: data.user.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
})