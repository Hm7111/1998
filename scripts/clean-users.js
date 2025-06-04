// Clean up non-admin users and their dependencies
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupNonAdminUsers() {
  try {
    console.log('Starting cleanup of non-admin users...');
    
    // Validate at least one admin exists
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    
    if (adminError) throw adminError;
    
    if (!adminUsers || adminUsers.length === 0) {
      console.error('CRITICAL ERROR: No admin users found! Aborting cleanup process.');
      return;
    }
    
    console.log(`Found ${adminUsers.length} admin users. They will be preserved.`);
    
    // Get non-admin users
    const { data: nonAdminUsers, error: nonAdminError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .neq('role', 'admin');
    
    if (nonAdminError) throw nonAdminError;
    
    if (!nonAdminUsers || nonAdminUsers.length === 0) {
      console.log('No non-admin users found to clean up.');
      return;
    }
    
    console.log(`Found ${nonAdminUsers.length} non-admin users to clean up.`);
    const nonAdminIds = nonAdminUsers.map(user => user.id);
    
    // Run the SQL function to delete all non-admin users and their dependencies
    const { data, error } = await supabase.rpc('delete_non_admin_users');
    
    if (error) throw error;
    
    console.log('Cleanup completed successfully!');
    console.log(`Deleted ${nonAdminUsers.length} non-admin users and all their dependencies.`);
    console.log('Deleted users:', nonAdminUsers.map(user => `${user.full_name} (${user.email})`).join(', '));
    
    return { success: true, deletedCount: nonAdminUsers.length };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return { success: false, error: error.message };
  }
}

// Run the cleanup function
cleanupNonAdminUsers()
  .then(result => {
    if (result.success) {
      console.log('✅ Cleanup process completed successfully');
    } else {
      console.error('❌ Cleanup process failed:', result.error);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  });