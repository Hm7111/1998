// سكريبت تنظيف شامل للمشروع
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// إنشاء مصفوفة لتخزين الملفات المحذوفة للتقرير النهائي
const deletedFiles = [];
const deletedDirs = [];
let totalSizeSaved = 0;

// وظيفة لحساب حجم الملف
function getFileSizeInBytes(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

// وظيفة لتحويل الحجم إلى وحدة قابلة للقراءة
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  else return (bytes / 1073741824).toFixed(2) + ' GB';
}

// وظيفة لأرشفة ملفات الهجرة القديمة (حفظ آخر 10 فقط)
function archiveMigrations() {
  console.log('\n🗄️  أرشفة ملفات الهجرة القديمة...');
  
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  const archiveDir = path.join(process.cwd(), 'supabase/migrations_archive');
  
  // التحقق من وجود مجلد الهجرة
  if (!fs.existsSync(migrationsDir)) {
    console.log('  ⚠️ مجلد الهجرة غير موجود!');
    return;
  }
  
  // إنشاء مجلد الأرشيف إذا لم يكن موجودًا
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    console.log(`  ✅ تم إنشاء مجلد الأرشيف: ${archiveDir}`);
  }
  
  // جلب قائمة ملفات الهجرة
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  // عدد الملفات التي سيتم الاحتفاظ بها
  const keepLatest = 10;
  
  // ملفات للأرشفة (جميع الملفات باستثناء آخر 10)
  const filesToArchive = migrationFiles.slice(0, Math.max(0, migrationFiles.length - keepLatest));
  
  console.log(`  📊 إجمالي ملفات الهجرة: ${migrationFiles.length}`);
  console.log(`  ⭐ سيتم الاحتفاظ بـ ${keepLatest} ملفات أخيرة`);
  console.log(`  📦 سيتم أرشفة ${filesToArchive.length} ملفات`);
  
  // إنشاء ملف .gitignore في مجلد الأرشيف
  fs.writeFileSync(path.join(archiveDir, '.gitignore'), '*\n!.gitignore\n');
  
  // نقل الملفات إلى الأرشيف
  filesToArchive.forEach(file => {
    const sourcePath = path.join(migrationsDir, file);
    const destPath = path.join(archiveDir, file);
    
    try {
      const fileSize = getFileSizeInBytes(sourcePath);
      
      // نسخ الملف إلى الأرشيف
      fs.copyFileSync(sourcePath, destPath);
      
      // التحقق من نجاح النسخ قبل حذف الملف الأصلي
      if (fs.existsSync(destPath)) {
        // حذف الملف من المجلد الأصلي
        fs.unlinkSync(sourcePath);
        deletedFiles.push({ path: sourcePath, size: fileSize });
        totalSizeSaved += fileSize;
        console.log(`  🗑️  تمت أرشفة: ${file} (${formatSize(fileSize)})`);
      }
    } catch (error) {
      console.error(`  ❌ خطأ في أرشفة الملف ${file}:`, error.message);
    }
  });
  
  console.log(`  ✅ تمت أرشفة ${filesToArchive.length} ملفات بنجاح`);
}

// وظيفة لحذف المجلدات المؤقتة وملفات البناء
function cleanTempAndBuildDirs() {
  console.log('\n🧹 حذف المجلدات المؤقتة وملفات البناء...');
  
  const dirsToClean = [
    '.bolt/tmp',
    '.bolt/supabase_discarded_migrations',
    'coverage',
    'dist',
    'build',
    'node_modules/.cache',
    '.vite'
  ];
  
  dirsToClean.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    
    if (fs.existsSync(dirPath)) {
      try {
        // حساب حجم المجلد قبل الحذف
        let dirSize = 0;
        if (process.platform === 'win32') {
          try {
            const output = execSync(`powershell -command "(Get-ChildItem -Recurse '${dirPath}' | Measure-Object -Property Length -Sum).Sum"`).toString().trim();
            dirSize = parseInt(output) || 0;
          } catch (e) {
            // حالة الخطأ، نستمر بدون حساب الحجم
          }
        } else {
          try {
            const output = execSync(`du -sb "${dirPath}" | cut -f1`).toString().trim();
            dirSize = parseInt(output) || 0;
          } catch (e) {
            // حالة الخطأ، نستمر بدون حساب الحجم
          }
        }
        
        // حذف المجلد
        if (process.platform === 'win32') {
          execSync(`if exist "${dirPath}" rmdir /s /q "${dirPath}"`);
        } else {
          execSync(`rm -rf "${dirPath}"`);
        }
        
        deletedDirs.push({ path: dirPath, size: dirSize });
        totalSizeSaved += dirSize;
        console.log(`  🗑️  تم حذف: ${dir} (${formatSize(dirSize)})`);
      } catch (err) {
        console.error(`  ❌ خطأ في حذف ${dir}:`, err.message);
      }
    } else {
      console.log(`  ℹ️ المجلد غير موجود: ${dir}`);
    }
  });
}

// وظيفة لحذف ملفات الاختبار
function cleanTestFiles() {
  console.log('\n🧪 حذف ملفات الاختبار...');
  
  const searchAndDeleteTests = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // تجاهل node_modules و .git
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        
        if (entry.isDirectory()) {
          // حذف مجلدات الاختبار
          if (entry.name === '__tests__' || entry.name === 'tests' || entry.name === 'test') {
            try {
              let dirSize = 0;
              if (process.platform === 'win32') {
                try {
                  const output = execSync(`powershell -command "(Get-ChildItem -Recurse '${fullPath}' | Measure-Object -Property Length -Sum).Sum"`).toString().trim();
                  dirSize = parseInt(output) || 0;
                } catch (e) {}
              } else {
                try {
                  const output = execSync(`du -sb "${fullPath}" | cut -f1`).toString().trim();
                  dirSize = parseInt(output) || 0;
                } catch (e) {}
              }
              
              if (process.platform === 'win32') {
                execSync(`rmdir /s /q "${fullPath}"`);
              } else {
                execSync(`rm -rf "${fullPath}"`);
              }
              
              deletedDirs.push({ path: fullPath, size: dirSize });
              totalSizeSaved += dirSize;
              console.log(`  🗑️  تم حذف مجلد اختبار: ${fullPath} (${formatSize(dirSize)})`);
            } catch (err) {
              console.error(`  ❌ خطأ في حذف مجلد الاختبار ${fullPath}:`, err.message);
            }
          } else {
            // استمر في البحث في المجلدات الفرعية
            searchAndDeleteTests(fullPath);
          }
        } else if (entry.isFile() && 
                  (entry.name.endsWith('.test.js') || 
                   entry.name.endsWith('.test.tsx') || 
                   entry.name.endsWith('.test.ts') || 
                   entry.name.endsWith('.spec.js') || 
                   entry.name.endsWith('.spec.tsx') || 
                   entry.name.endsWith('.spec.ts'))) {
          
          const fileSize = getFileSizeInBytes(fullPath);
          fs.unlinkSync(fullPath);
          deletedFiles.push({ path: fullPath, size: fileSize });
          totalSizeSaved += fileSize;
          console.log(`  🗑️  تم حذف ملف اختبار: ${fullPath} (${formatSize(fileSize)})`);
        }
      }
    } catch (err) {
      console.error(`  ❌ خطأ في معالجة المجلد ${dir}:`, err.message);
    }
  };
  
  searchAndDeleteTests(process.cwd());
}

// وظيفة لحذف ملفات PDF والوثائق الكبيرة
function cleanPDFAndDocs() {
  console.log('\n📄 حذف ملفات PDF والوثائق الكبيرة...');
  
  const searchAndDeleteDocs = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // تجاهل node_modules و .git و supabase
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'supabase') {
          continue;
        }
        
        if (entry.isDirectory()) {
          // البحث في المجلدات الفرعية
          searchAndDeleteDocs(fullPath);
        } else if (entry.isFile()) {
          // حذف ملفات PDF والوثائق الكبيرة (أكبر من 1 ميجابايت)
          const fileSize = getFileSizeInBytes(fullPath);
          const fileExt = path.extname(entry.name).toLowerCase();
          
          // حذف ملفات PDF والوثائق الكبيرة (باستثناء الملفات الأساسية)
          if ((fileExt === '.pdf' || fileExt === '.doc' || fileExt === '.docx' || fileExt === '.xls' || 
              fileExt === '.xlsx' || fileExt === '.ppt' || fileExt === '.pptx') && 
              fileSize > 1048576) { // أكبر من 1 ميجابايت
            
            fs.unlinkSync(fullPath);
            deletedFiles.push({ path: fullPath, size: fileSize });
            totalSizeSaved += fileSize;
            console.log(`  🗑️  تم حذف ملف وثيقة كبير: ${fullPath} (${formatSize(fileSize)})`);
          }
        }
      }
    } catch (err) {
      console.error(`  ❌ خطأ في معالجة المجلد ${dir}:`, err.message);
    }
  };
  
  searchAndDeleteDocs(process.cwd());
}

// وظيفة لحذف ملفات السجلات والملفات المؤقتة
function cleanLogAndTempFiles() {
  console.log('\n📝 حذف ملفات السجلات والملفات المؤقتة...');
  
  const searchAndDeleteTemp = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // تجاهل node_modules و .git
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        
        if (entry.isDirectory()) {
          // البحث في المجلدات الفرعية
          searchAndDeleteTemp(fullPath);
        } else if (entry.isFile() && 
                  (entry.name.endsWith('.log') || 
                   entry.name.endsWith('.tmp') || 
                   entry.name.endsWith('.temp'))) {
          
          const fileSize = getFileSizeInBytes(fullPath);
          fs.unlinkSync(fullPath);
          deletedFiles.push({ path: fullPath, size: fileSize });
          totalSizeSaved += fileSize;
          console.log(`  🗑️  تم حذف ملف مؤقت: ${fullPath} (${formatSize(fileSize)})`);
        }
      }
    } catch (err) {
      console.error(`  ❌ خطأ في معالجة المجلد ${dir}:`, err.message);
    }
  };
  
  searchAndDeleteTemp(process.cwd());
}

// تنفيذ عمليات التنظيف
console.log('🚀 بدء عملية التنظيف الشاملة للمشروع...');

// حفظ حجم المشروع قبل التنظيف
let initialSize = 0;
try {
  if (process.platform === 'win32') {
    const output = execSync(`powershell -command "(Get-ChildItem -Recurse '${process.cwd()}' | Measure-Object -Property Length -Sum).Sum"`).toString().trim();
    initialSize = parseInt(output) || 0;
  } else {
    const output = execSync(`du -sb "${process.cwd()}" | cut -f1`).toString().trim();
    initialSize = parseInt(output) || 0;
  }
} catch (e) {
  console.log('⚠️ غير قادر على حساب حجم المشروع الأولي');
}

// تنفيذ خطوات التنظيف
archiveMigrations();
cleanTempAndBuildDirs();
cleanTestFiles();
cleanPDFAndDocs();
cleanLogAndTempFiles();

// إظهار ملخص للنتائج
console.log('\n📊 تقرير التنظيف:');
console.log(`  📁 عدد المجلدات المحذوفة: ${deletedDirs.length}`);
console.log(`  📄 عدد الملفات المحذوفة: ${deletedFiles.length}`);
console.log(`  💾 إجمالي المساحة المحررة: ${formatSize(totalSizeSaved)}`);

// حساب حجم المشروع بعد التنظيف
let finalSize = 0;
try {
  if (process.platform === 'win32') {
    const output = execSync(`powershell -command "(Get-ChildItem -Recurse '${process.cwd()}' | Measure-Object -Property Length -Sum).Sum"`).toString().trim();
    finalSize = parseInt(output) || 0;
  } else {
    const output = execSync(`du -sb "${process.cwd()}" | cut -f1`).toString().trim();
    finalSize = parseInt(output) || 0;
  }
  
  const reduction = initialSize - finalSize;
  const reductionPercentage = initialSize > 0 ? (reduction / initialSize * 100).toFixed(2) : 0;
  
  console.log(`  📈 حجم المشروع قبل التنظيف: ${formatSize(initialSize)}`);
  console.log(`  📉 حجم المشروع بعد التنظيف: ${formatSize(finalSize)}`);
  console.log(`  ✨ نسبة التخفيض: ${reductionPercentage}%`);
} catch (e) {
  console.log('⚠️ غير قادر على حساب حجم المشروع النهائي');
}

// كتابة تقرير مفصل بالملفات المحذوفة
const reportContent = `
# تقرير التنظيف الشامل للمشروع
تاريخ التنظيف: ${new Date().toLocaleString('ar-SA')}

## ملخص
- عدد المجلدات المحذوفة: ${deletedDirs.length}
- عدد الملفات المحذوفة: ${deletedFiles.length}
- إجمالي المساحة المحررة: ${formatSize(totalSizeSaved)}
- حجم المشروع قبل التنظيف: ${formatSize(initialSize)}
- حجم المشروع بعد التنظيف: ${formatSize(finalSize)}
- نسبة التخفيض: ${initialSize > 0 ? (((initialSize - finalSize) / initialSize) * 100).toFixed(2) : 0}%

## المجلدات المحذوفة
${deletedDirs.map(dir => `- ${dir.path} (${formatSize(dir.size)})`).join('\n')}

## الملفات المحذوفة
${deletedFiles.map(file => `- ${file.path} (${formatSize(file.size)})`).join('\n')}
`;

fs.writeFileSync('cleanup-report.md', reportContent);
console.log('\n📋 تم إنشاء تقرير مفصل في ملف: cleanup-report.md');
console.log('\n✅ اكتملت عملية التنظيف بنجاح!');
