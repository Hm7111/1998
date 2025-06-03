# مخطط قاعدة البيانات

## الجداول الرئيسية

### 1. جدول المستخدمين (users)
- `id` - معرف فريد (UUID)
- `email` - البريد الإلكتروني (فريد)
- `name` - اسم المستخدم
- `role` - الدور (admin, manager, user, viewer)
- `branch_id` - معرف الفرع (FK)
- `created_at` - تاريخ الإنشاء
- `avatar_url` - رابط الصورة الشخصية
- `active` - حالة الحساب (نشط/غير نشط)

### 2. جدول الخطابات (letters)
- `id` - معرف فريد (UUID)
- `title` - عنوان الخطاب
- `content` - محتوى الخطاب (HTML)
- `status` - الحالة (draft, pending, approved, rejected, archived)
- `template_id` - معرف القالب (FK)
- `created_by` - معرف المنشئ (FK)
- `created_at` - تاريخ الإنشاء
- `updated_at` - تاريخ التحديث
- `reference_number` - رقم مرجعي
- `branch_id` - معرف الفرع (FK)
- `recipient` - المستلم
- `external_reference` - مرجع خارجي
- `approval_status` - حالة الموافقة
- `zones` - مناطق المحتوى (JSON)

### 3. جدول القوالب (letter_templates)
- `id` - معرف فريد (UUID)
- `name` - اسم القالب
- `content` - محتوى القالب (HTML)
- `created_at` - تاريخ الإنشاء
- `updated_at` - تاريخ التحديث
- `created_by` - معرف المنشئ (FK)
- `is_default` - قالب افتراضي (boolean)
- `category` - تصنيف القالب
- `zones` - تعريف المناطق (JSON)

### 4. جدول الفروع (branches)
- `id` - معرف فريد (UUID)
- `name` - اسم الفرع
- `code` - رمز الفرع
- `address` - عنوان الفرع
- `manager_id` - معرف مدير الفرع (FK)
- `created_at` - تاريخ الإنشاء

### 5. جدول طلبات الموافقة (approval_requests)
- `id` - معرف فريد (UUID)
- `letter_id` - معرف الخطاب (FK)
- `requested_by` - طالب الموافقة (FK)
- `requested_to` - المطلوب منه الموافقة (FK)
- `status` - الحالة (pending, approved, rejected)
- `created_at` - تاريخ الإنشاء
- `updated_at` - تاريخ التحديث
- `comments` - ملاحظات

### 6. جدول سجل التدقيق (audit_logs)
- `id` - معرف فريد (UUID)
- `user_id` - معرف المستخدم (FK)
- `action` - الإجراء
- `entity_type` - نوع الكيان
- `entity_id` - معرف الكيان
- `timestamp` - الوقت
- `details` - تفاصيل إضافية (JSON)

### 7. جدول المهام (tasks)
- `id` - معرف فريد (UUID)
- `title` - عنوان المهمة
- `description` - وصف المهمة
- `due_date` - تاريخ الاستحقاق
- `status` - الحالة (pending, in_progress, completed, canceled)
- `priority` - الأولوية (low, medium, high, urgent)
- `assigned_to` - معرف المكلف (FK)
- `created_by` - معرف المنشئ (FK)
- `created_at` - تاريخ الإنشاء
- `updated_at` - تاريخ التحديث
- `related_letter_id` - معرف الخطاب المرتبط (FK)

## العلاقات الرئيسية

- مستخدم ينتمي إلى فرع
- خطاب ينتمي إلى مستخدم (المنشئ)
- خطاب ينتمي إلى فرع
- خطاب يستخدم قالب
- فرع لديه مدير (مستخدم)
- طلب موافقة مرتبط بخطاب
- طلب موافقة مرتبط بمستخدمين (طالب الموافقة والمطلوب منه)
- سجل تدقيق مرتبط بمستخدم
- مهمة مرتبطة بمستخدمين (المنشئ والمكلف)
- مهمة يمكن ربطها بخطاب
