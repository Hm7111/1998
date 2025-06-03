// سكريبت تحسين المشروع وتقليل حجمه للبرومت
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// إنشاء مصفوفة لتخزين الملفات والمجلدات التي تم تحليلها
const analyzedItems = [];

// وظيفة لتنسيق الحجم بشكل قابل للقراءة
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  else return (bytes / 1073741824).toFixed(2) + ' GB';
}

// وظيفة لحساب حجم ملف أو مجلد
function getSize(itemPath) {
  try {
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      let totalSize = 0;
      
      const files = fs.readdirSync(itemPath);
      
      for (const file of files) {
        if (file === 'node_modules' || file === '.git') continue;
        
        const filePath = path.join(itemPath, file);
        totalSize += getSize(filePath);
      }
      
      return totalSize;
    } else {
      return stats.size;
    }
  } catch (error) {
    console.error(`خطأ في حساب حجم ${itemPath}:`, error.message);
    return 0;
  }
}

// وظيفة لتحليل المشروع وإنشاء تقرير بالمجلدات والملفات الكبيرة
function analyzeProject(projectDir) {
  console.log('🔍 جاري تحليل المشروع...');
  
  const items = fs.readdirSync(projectDir);
  
  for (const item of items) {
    // تجاهل المجلدات والملفات التي لا نريد تحليلها
    if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') continue;
    
    const itemPath = path.join(projectDir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      const size = getSize(itemPath);
      analyzedItems.push({
        path: itemPath,
        type: 'directory',
        size: size
      });
    } else {
      // تحليل الملفات الكبيرة فقط (أكبر من 100 كيلوبايت)
      if (stats.size > 100 * 1024) {
        analyzedItems.push({
          path: itemPath,
          type: 'file',
          size: stats.size
        });
      }
    }
  }
  
  // ترتيب العناصر حسب الحجم (الأكبر أولاً)
  analyzedItems.sort((a, b) => b.size - a.size);
  
  console.log('\n📊 تقرير تحليل المشروع:');
  console.log('=========================');
  
  analyzedItems.forEach((item, index) => {
    console.log(`${index + 1}. ${item.path} (${formatSize(item.size)})`);
  });
}

// وظيفة لإنشاء مجلد للنسخ الاحتياطية إذا لم يكن موجوداً
function createBackupDir() {
  const backupDir = path.join(process.cwd(), '.bolt', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`✅ تم إنشاء مجلد النسخ الاحتياطية: ${backupDir}`);
  }
  
  return backupDir;
}

// وظيفة لنسخ مجلد إلى النسخ الاحتياطية وحذفه
function archiveDirectory(dirPath) {
  try {
    const dirName = path.basename(dirPath);
    const backupDir = createBackupDir();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const archiveName = `${dirName}_${timestamp}`;
    const archivePath = path.join(backupDir, archiveName);
    
    // إنشاء مجلد الأرشيف
    fs.mkdirSync(archivePath, { recursive: true });
    
    // نسخ المحتوى
    console.log(`📦 جاري أرشفة ${dirPath} إلى ${archivePath}...`);
    
    // استخدام الأمر المناسب للنظام لنسخ المجلد
    if (process.platform === 'win32') {
      execSync(`xcopy "${dirPath}" "${archivePath}" /E /I /H /Y`);
    } else {
      execSync(`cp -R "${dirPath}/"* "${archivePath}/"`);
    }
    
    // إنشاء ملف placeholder في المجلد الأصلي
    const placeholderContent = `
# المجلد تم أرشفته

تم نقل محتويات هذا المجلد إلى النسخ الاحتياطية للتقليل من حجم المشروع.
يمكنك العثور على النسخة الاحتياطية في:

\`.bolt/backups/${archiveName}\`

تم الأرشفة بتاريخ: ${new Date().toLocaleString('ar-SA')}
    `;
    
    // تفريغ المجلد الأصلي
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
    
    // إضافة ملف placeholder
    fs.writeFileSync(path.join(dirPath, 'README_ARCHIVED.md'), placeholderContent);
    
    console.log(`✅ تم أرشفة ${dirPath} بنجاح!`);
    return true;
  } catch (error) {
    console.error(`❌ خطأ في أرشفة ${dirPath}:`, error.message);
    return false;
  }
}

// وظيفة لضغط المجلدات الكبيرة
function compressLargeDirectories(threshold = 5 * 1024 * 1024) { // 5 ميجابايت افتراضياً
  console.log(`\n🗜️ البحث عن المجلدات الكبيرة لضغطها (أكبر من ${formatSize(threshold)})...`);
  
  const largeDirectories = analyzedItems.filter(item => 
    item.type === 'directory' && item.size > threshold
  );
  
  if (largeDirectories.length === 0) {
    console.log('ℹ️ لم يتم العثور على مجلدات كبيرة تتجاوز الحد المحدد.');
    return;
  }
  
  console.log(`\n📁 المجلدات الكبيرة المرشحة للأرشفة:`);
  largeDirectories.forEach((dir, index) => {
    console.log(`${index + 1}. ${dir.path} (${formatSize(dir.size)})`);
  });
  
  // المجلدات التي لا نريد أرشفتها
  const excludedDirs = [
    'src', 'public', 'node_modules', '.git', 'dist', 'build'
  ];
  
  // المجلدات المرشحة للأرشفة (استبعاد المجلدات المهمة)
  const dirsToArchive = largeDirectories.filter(dir => {
    const dirName = path.basename(dir.path);
    return !excludedDirs.includes(dirName);
  });
  
  console.log(`\n🗄️ المجلدات التي سيتم أرشفتها:`);
  
  if (dirsToArchive.length === 0) {
    console.log('ℹ️ لا توجد مجلدات مناسبة للأرشفة (تم استبعاد المجلدات الأساسية).');
    return;
  }
  
  dirsToArchive.forEach((dir, index) => {
    console.log(`${index + 1}. ${dir.path} (${formatSize(dir.size)})`);
  });
  
  console.log('\n🚀 جاري أرشفة المجلدات...');
  
  let totalArchivedSize = 0;
  let archivedCount = 0;
  
  for (const dir of dirsToArchive) {
    const success = archiveDirectory(dir.path);
    
    if (success) {
      totalArchivedSize += dir.size;
      archivedCount++;
    }
  }
  
  console.log(`\n✨ اكتملت عملية الأرشفة!`);
  console.log(`📊 إجمالي المجلدات المؤرشفة: ${archivedCount}`);
  console.log(`💾 إجمالي المساحة الموفرة: ${formatSize(totalArchivedSize)}`);
}

// وظيفة لإنشاء ملف فهرس للمشروع
function createProjectIndex() {
  console.log('\n📝 إنشاء فهرس للمشروع...');
  
  const srcDir = path.join(process.cwd(), 'src');
  let indexContent = '# فهرس المشروع\n\n';
  
  // قراءة هيكل المجلدات
  function readDirectory(dir, level = 0) {
    const indent = '  '.repeat(level);
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      if (file.startsWith('.')) continue; // تجاهل الملفات والمجلدات المخفية
      
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        indexContent += `${indent}- 📁 **${file}/**\n`;
        readDirectory(filePath, level + 1);
      } else {
        // تحقق من امتداد الملف
        const ext = path.extname(file).toLowerCase();
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          indexContent += `${indent}- 📄 ${file}\n`;
        }
      }
    }
  }
  
  // إضافة معلومات أساسية عن المشروع
  indexContent += '## هيكل المشروع\n\n';
  if (fs.existsSync(srcDir)) {
    readDirectory(srcDir);
  }
  
  // إضافة معلومات عن المكونات الرئيسية
  indexContent += '\n## المكونات الرئيسية\n\n';
  indexContent += '- **components**: مكونات واجهة المستخدم الأساسية\n';
  indexContent += '- **features**: وحدات المشروع الوظيفية\n';
  indexContent += '- **hooks**: هوكس React المخصصة\n';
  indexContent += '- **lib**: مكتبات وأدوات مساعدة\n';
  indexContent += '- **pages**: صفحات التطبيق\n';
  indexContent += '- **types**: تعريفات الأنواع (TypeScript)\n';
  
  // كتابة الملف
  fs.writeFileSync('PROJECT-INDEX.md', indexContent);
  console.log('✅ تم إنشاء فهرس المشروع في PROJECT-INDEX.md');
}

// وظيفة لإنشاء ملف تلخيص للمشروع للمساعدة في البرومت
function createProjectSummary() {
  console.log('\n📋 إنشاء ملخص للمشروع للمساعدة في البرومت...');
  
  let summaryContent = '# ملخص المشروع لتسهيل التعامل مع البرومت\n\n';
  summaryContent += '## نظرة عامة\n\n';
  summaryContent += 'هذا المشروع عبارة عن نظام إدارة خطابات للجمعية السعودية للإعاقة السمعية، ويشمل الوظائف التالية:\n\n';
  summaryContent += '- إدارة قوالب الخطابات\n';
  summaryContent += '- إنشاء وتحرير الخطابات\n';
  summaryContent += '- نظام سير العمل والموافقات\n';
  summaryContent += '- إدارة المستخدمين والصلاحيات\n';
  summaryContent += '- إدارة الفروع\n';
  summaryContent += '- تصدير الخطابات كملفات PDF\n';
  summaryContent += '- نظام المهام وإدارة العمل\n\n';
  
  summaryContent += '## الوحدات الرئيسية\n\n';
  summaryContent += '### 1. نظام الخطابات الأساسي\n';
  summaryContent += '- إنشاء وتحرير وعرض الخطابات\n';
  summaryContent += '- إدارة قوالب الخطابات\n';
  summaryContent += '- تصدير PDF بجودة عالية\n\n';
  
  summaryContent += '### 2. نظام سير العمل والموافقات\n';
  summaryContent += '- طلب موافقة على الخطابات\n';
  summaryContent += '- عرض طلبات الموافقة المعلقة\n';
  summaryContent += '- الموافقة أو رفض الطلبات\n';
  summaryContent += '- التوقيعات الإلكترونية\n\n';
  
  summaryContent += '### 3. نظام المهام\n';
  summaryContent += '- إنشاء وتتبع المهام\n';
  summaryContent += '- تعيين المهام للمستخدمين\n';
  summaryContent += '- تغيير حالة المهام\n';
  summaryContent += '- إرفاق الملفات والتعليقات\n\n';
  
  summaryContent += '### 4. نظام المستخدمين والصلاحيات\n';
  summaryContent += '- إدارة المستخدمين\n';
  summaryContent += '- إدارة الأدوار والصلاحيات\n';
  summaryContent += '- تحديد صلاحيات مخصصة للمستخدمين\n\n';
  
  summaryContent += '## قاعدة البيانات\n\n';
  summaryContent += 'يستخدم المشروع Supabase كقاعدة بيانات مع الجداول الرئيسية التالية:\n\n';
  summaryContent += '- `users`: المستخدمون\n';
  summaryContent += '- `branches`: الفروع\n';
  summaryContent += '- `letter_templates`: قوالب الخطابات\n';
  summaryContent += '- `letters`: الخطابات\n';
  summaryContent += '- `approval_requests`: طلبات الموافقة\n';
  summaryContent += '- `signatures`: التوقيعات الإلكترونية\n';
  summaryContent += '- `tasks`: المهام\n\n';
  
  summaryContent += '## ملاحظات مهمة للتعامل مع البرومت\n\n';
  summaryContent += '1. **ملفات الهجرة**: تم أرشفة العديد من ملفات الهجرة القديمة للتقليل من حجم المشروع\n';
  summaryContent += '2. **المجلدات الكبيرة**: تم ضغط وأرشفة المجلدات الكبيرة غير الضرورية\n';
  summaryContent += '3. **نمط التطوير**: يتبع المشروع نمط التطوير القائم على الميزات (Feature-based development)\n';
  summaryContent += '4. **الإرشادات لإضافة ميزة جديدة**:\n';
  summaryContent += '   - إضافة الأنواع اللازمة في `src/types`\n';
  summaryContent += '   - إضافة المكونات في `src/components` أو `src/features`\n';
  summaryContent += '   - إضافة صفحات في `src/pages`\n';
  summaryContent += '   - تحديث المسارات في `src/routes.tsx`\n\n';
  
  summaryContent += 'استخدم هذا الملخص كمرجع سريع عند العمل مع البرومت لتقليل استهلاك التوكن وتسهيل فهم المشروع.';
  
  // كتابة الملف
  fs.writeFileSync('PROJECT-SUMMARY.md', summaryContent);
  console.log('✅ تم إنشاء ملخص المشروع في PROJECT-SUMMARY.md');
}

// وظيفة لتجميع وضغط المجلدات الكبيرة غير الضرورية للتطوير اليومي
function createModuleArchives() {
  console.log('\n📦 إنشاء أرشيف للوحدات...');
  
  const modulesToArchive = [
    {
      name: 'supabase-migrations',
      paths: [
        'supabase/migrations'
      ],
      description: 'ملفات هجرة Supabase'
    },
    {
      name: 'ui-components',
      paths: [
        'src/components/ui'
      ],
      description: 'مكونات واجهة المستخدم الأساسية'
    },
    {
      name: 'letter-templates',
      paths: [
        'src/data/letterTemplates.ts',
        'src/features/letters/data'
      ],
      description: 'قوالب الخطابات والنصوص الجاهزة'
    }
  ];
  
  const archivesDir = path.join(process.cwd(), '.bolt', 'modules');
  
  // إنشاء مجلد الأرشيف إذا لم يكن موجوداً
  if (!fs.existsSync(archivesDir)) {
    fs.mkdirSync(archivesDir, { recursive: true });
  }
  
  // إنشاء ملف README للمجلد
  const readmeContent = `
# وحدات المشروع المؤرشفة

هذا المجلد يحتوي على وحدات المشروع المؤرشفة لتقليل حجم المشروع وتحسين أداء البرومت.

## الوحدات المؤرشفة:

${modulesToArchive.map(module => `- **${module.name}**: ${module.description}`).join('\n')}

## استعادة الوحدات

لاستعادة وحدة، قم بنسخ محتوياتها إلى المسارات الأصلية.
  `;
  
  fs.writeFileSync(path.join(archivesDir, 'README.md'), readmeContent);
  
  for (const module of modulesToArchive) {
    console.log(`📦 أرشفة وحدة ${module.name}...`);
    
    // إنشاء مجلد للوحدة
    const moduleDir = path.join(archivesDir, module.name);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }
    
    // إنشاء ملف README للوحدة
    const moduleReadme = `
# وحدة ${module.name}

${module.description}

## المسارات الأصلية:

${module.paths.map(p => `- \`${p}\``).join('\n')}

تم الأرشفة بتاريخ: ${new Date().toLocaleString('ar-SA')}
    `;
    
    fs.writeFileSync(path.join(moduleDir, 'README.md'), moduleReadme);
    
    // نسخ الملفات إلى الأرشيف
    for (const sourcePath of module.paths) {
      const fullSourcePath = path.join(process.cwd(), sourcePath);
      
      if (!fs.existsSync(fullSourcePath)) {
        console.warn(`⚠️ المسار ${fullSourcePath} غير موجود، تخطي...`);
        continue;
      }
      
      try {
        const targetPath = path.join(moduleDir, path.basename(sourcePath));
        
        if (fs.statSync(fullSourcePath).isDirectory()) {
          // نسخ المجلد بكامل محتوياته
          if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
          }
          
          // نسخ المحتويات
          copyRecursive(fullSourcePath, targetPath);
        } else {
          // نسخ الملف
          fs.copyFileSync(fullSourcePath, targetPath);
        }
      } catch (error) {
        console.error(`❌ خطأ في نسخ ${sourcePath}:`, error.message);
      }
    }
    
    console.log(`✅ تم أرشفة وحدة ${module.name} بنجاح!`);
  }
  
  console.log('\n✅ تم إنشاء أرشيفات الوحدات بنجاح!');
}

// وظيفة مساعدة لنسخ المجلدات بشكل متكرر
function copyRecursive(source, target) {
  const files = fs.readdirSync(source);
  
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// تنفيذ الإجراءات
(async () => {
  console.log('🚀 بدء تحسين المشروع لتقليل حجمه وتحسين أداء البرومت...');
  
  // تحليل المشروع
  analyzeProject(process.cwd());
  
  // ضغط المجلدات الكبيرة
  compressLargeDirectories();
  
  // إنشاء فهرس للمشروع
  createProjectIndex();
  
  // إنشاء ملخص للمشروع
  createProjectSummary();
  
  // إنشاء أرشيفات الوحدات
  createModuleArchives();
  
  console.log('\n✨ اكتملت عملية تحسين المشروع بنجاح!');
  console.log('📝 تم إنشاء ملفات مساعدة لتسهيل التعامل مع البرومت:');
  console.log('  - PROJECT-INDEX.md: فهرس لهيكل المشروع');
  console.log('  - PROJECT-SUMMARY.md: ملخص للمشروع ووحداته');
  console.log('  - .bolt/modules: أرشيفات للوحدات الكبيرة');
})();