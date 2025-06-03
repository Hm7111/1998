# خريطة المكونات الرئيسية

## المكونات الأساسية

### مكونات المستخدم (UI)
- `Button.tsx` - زر قابل للتخصيص
- `Input.tsx` - حقل إدخال
- `Modal.tsx` - نافذة منبثقة
- `Dropdown.tsx` - قائمة منسدلة
- `Card.tsx` - بطاقة معلومات
- `Tabs.tsx` - تبويبات
- `Toast.tsx` - إشعارات

### مكونات الخطابات
- `LetterList.tsx` - قائمة الخطابات
- `LetterForm.tsx` - نموذج إنشاء/تعديل خطاب
- `LetterViewer.tsx` - عارض الخطابات
- `LetterExport.tsx` - تصدير الخطابات
- `TemplateSelector.tsx` - اختيار القوالب

### مكونات سير العمل
- `ApprovalFlow.tsx` - مخطط سير الموافقات
- `ApprovalRequest.tsx` - طلب موافقة
- `ApprovalsList.tsx` - قائمة الموافقات

### مكونات المستخدمين والفروع
- `UserList.tsx` - قائمة المستخدمين
- `UserForm.tsx` - نموذج المستخدم
- `BranchList.tsx` - قائمة الفروع
- `BranchForm.tsx` - نموذج الفرع

## صفحات التطبيق

### صفحات المصادقة
- `Login.tsx` - تسجيل الدخول

### صفحات لوحة التحكم
- `Dashboard.tsx` - الصفحة الرئيسية
- `Letters.tsx` - إدارة الخطابات
- `LetterEditor.tsx` - محرر الخطابات
- `Users.tsx` - إدارة المستخدمين
- `Branches.tsx` - إدارة الفروع
- `Settings.tsx` - الإعدادات
- `AuditLogs.tsx` - سجلات النشاط

## الخدمات (Services)

### خدمات البيانات
- `letterService.ts` - عمليات الخطابات
- `userService.ts` - عمليات المستخدمين
- `branchService.ts` - عمليات الفروع
- `templateService.ts` - عمليات القوالب
- `approvalService.ts` - عمليات الموافقات

### خدمات المساعدة
- `exportService.ts` - تصدير PDF
- `validationService.ts` - التحقق من البيانات
- `storageService.ts` - التخزين المحلي
- `notificationService.ts` - الإشعارات
