import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface CreateUserPayload {
  email: string;
  password: string;
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
    if (req.method !== 'POST') {
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

    // Parse request body
    const payload: CreateUserPayload = await req.json();

    // Check if the user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', payload.email)
      .maybeSingle();

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create user in Auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name,
      }
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error('Failed to create user');
    }

    // Insert user data into users table
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
      // Cleanup: delete the auth user if db insert fails
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'User created successfully',
        user: newUser.user
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