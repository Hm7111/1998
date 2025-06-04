import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

interface UpdateUserPasswordRequest {
  user_id: string;
  password: string;
}

serve(async (req) => {
  try {
    // إنشاء عميل Supabase مع مفتاح الخدمة
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // استخراج بيانات الطلب
    const { user_id, password } = await req.json() as UpdateUserPasswordRequest;
    
    if (!user_id || !password) {
      return new Response(
        JSON.stringify({ error: 'معرف المستخدم وكلمة المرور الجديدة مطلوبان' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // تحديث كلمة مرور المستخدم باستخدام واجهة برمجة التطبيقات الإدارية
    const { error } = await supabase.auth.admin.updateUserById(user_id, {
      password,
    });
    
    if (error) {
      console.error('Error updating user password:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }),
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