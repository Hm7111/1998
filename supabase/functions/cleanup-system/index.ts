// Supabase Edge Function for system cleanup
import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify the user is authenticated and has admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminCheck || adminCheck.role !== 'admin') {
      throw new Error('Unauthorized - Admin access required');
    }

    // Parse request parameters
    const params = req.url.includes('?') 
      ? Object.fromEntries(new URL(req.url).searchParams)
      : {};
    
    const daysThreshold = parseInt(params.days || '30', 10);
    const cleanupType = params.type || 'all';

    // Perform the cleanup operations
    const results = await performCleanup(supabase, daysThreshold, cleanupType);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم تنظيف النظام بنجاح',
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

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

async function performCleanup(supabase, daysThreshold: number, cleanupType: string) {
  const results = {};
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  const cutoffDateStr = cutoffDate.toISOString();

  // 1. تنظيف المستخدمين غير النشطين
  if (cleanupType === 'all' || cleanupType === 'users') {
    const { data: inactiveUsers, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', false)
      .lt('updated_at', cutoffDateStr);
    
    if (!fetchError && inactiveUsers && inactiveUsers.length > 0) {
      results.inactiveUsers = { count: inactiveUsers.length };
      
      // لا نحذف المستخدمين فعلياً، فقط نعد عددهم
      // يمكن تفعيل الحذف الفعلي عند الحاجة
    }
  }

  // 2. تنظيف الخطابات المسودة القديمة
  if (cleanupType === 'all' || cleanupType === 'letters') {
    const { data: oldDrafts, error: draftsError } = await supabase
      .from('letters')
      .select('id')
      .eq('status', 'draft')
      .lt('updated_at', cutoffDateStr);
    
    if (!draftsError && oldDrafts && oldDrafts.length > 0) {
      results.oldDrafts = { count: oldDrafts.length };
      
      // حذف المسودات القديمة
      const draftIds = oldDrafts.map(draft => draft.id);
      const { error: deleteError } = await supabase
        .from('letters')
        .delete()
        .in('id', draftIds);
      
      if (!deleteError) {
        results.oldDrafts.deleted = draftIds.length;
      }
    }
  }

  // 3. تنظيف المهام المكتملة أو المرفوضة القديمة
  if (cleanupType === 'all' || cleanupType === 'tasks') {
    const { data: oldTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .in('status', ['completed', 'rejected'])
      .lt('updated_at', cutoffDateStr);
    
    if (!tasksError && oldTasks && oldTasks.length > 0) {
      results.oldTasks = { count: oldTasks.length };
      
      // تعطيل المهام القديمة بدلاً من حذفها
      const taskIds = oldTasks.map(task => task.id);
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ is_active: false })
        .in('id', taskIds);
      
      if (!updateError) {
        results.oldTasks.deactivated = taskIds.length;
      }
    }
  }

  // 4. تنظيف الإشعارات المقروءة القديمة
  if (cleanupType === 'all' || cleanupType === 'notifications') {
    const { data: oldNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id')
      .eq('is_read', true)
      .lt('created_at', cutoffDateStr);
    
    if (!notificationsError && oldNotifications && oldNotifications.length > 0) {
      results.oldNotifications = { count: oldNotifications.length };
      
      // حذف الإشعارات القديمة
      const notificationIds = oldNotifications.map(notification => notification.id);
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
      
      if (!deleteError) {
        results.oldNotifications.deleted = notificationIds.length;
      }
    }
  }

  // 5. تنظيف سجلات الأحداث القديمة
  if (cleanupType === 'all' || cleanupType === 'audit_logs') {
    const { data: oldLogs, error: logsError } = await supabase
      .from('audit_logs')
      .select('id')
      .lt('performed_at', cutoffDateStr);
    
    if (!logsError && oldLogs && oldLogs.length > 0) {
      results.oldLogs = { count: oldLogs.length };
      
      // حذف سجلات الأحداث القديمة
      const logIds = oldLogs.map(log => log.id);
      const { error: deleteError } = await supabase
        .from('audit_logs')
        .delete()
        .in('id', logIds);
      
      if (!deleteError) {
        results.oldLogs.deleted = logIds.length;
      }
    }
  }

  return results;
}