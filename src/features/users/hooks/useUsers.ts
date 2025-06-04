@@ -76,45 +76,31 @@
       if (existingUser) {
         throw new Error('البريد الإلكتروني مسجل مسبقاً');
       }
-
-      // التحقق من أن الدور الأساسي مسموح به (admin أو user)
-      const { data: allowedRoles } = await supabase.rpc('get_allowed_roles');
-      
-      if (Array.isArray(allowedRoles) && !allowedRoles.includes(userData.role)) {
-        throw new Error(`الدور الأساسي غير مسموح به. الأدوار المسموح بها هي: ${allowedRoles.join(', ')}`);
-      }
       
-      // إنشاء مستخدم جديد باستخدام Supabase Auth
-      const { data, error: createError } = await supabase.auth.admin.createUser({
-        email: userData.email,
-        password: userData.password,
-        email_confirm: true,
-        user_metadata: {
-          full_name: userData.full_name,
-          role: userData.role,
-          branch_id: userData.branch_id
-        }
-      });
+      // Call the Edge Function to create user
+      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
+        },
+        body: JSON.stringify(userData)
+      });
       
-      if (createError) {
-        throw new Error(`فشل إنشاء المستخدم: ${createError.message || 'خطأ غير معروف'}`);
+      if (!response.ok) {
+        const error = await response.json();
+        throw new Error(error.error || 'فشل إنشاء المستخدم');
       }
 
-      if (!data.user || !data.user.id) {
-        throw new Error('لم يتم إنشاء المستخدم بشكل صحيح');
-      }
-      
-      const userId = data.user.id;
-
-      const { error: insertError } = await supabase
-        .from('users')
-        .insert({
-          id: userId,
-          email: userData.email,
-          full_name: userData.full_name,
-          role: userData.role,
-          branch_id: userData.branch_id,
-          permissions: userData.permissions,
-          is_active: userData.is_active !== undefined ? userData.is_active : true
-        });
+      const result = await response.json();
       
-      if (insertError) {
-        console.error('Error inserting user record:', insertError);
-        throw insertError;
+      if (!result.user) {
+        throw new Error('لم يتم إنشاء المستخدم بشكل صحيح');
       }