#!/usr/bin/env node
// سكريبت إدارة ملفات الهجرة بشكل متقدم
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// الإعدادات
const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase/migrations');
const ARCHIVE_DIR = path.join(process.cwd(), 'supabase/migrations_archive');
const SUMMARY_DIR = path.join(process.cwd(), 'supabase/migrations_summary');
const KEEP_LATEST = 5; // عدد ملفات الهجرة الحديثة التي سيتم الاحتفاظ بها

// إنشاء مجلدات النظام إذا لم تكن موجودة
function createDirectories() {
  [MIGRATIONS_DIR, ARCHIVE_DIR, SUMMARY_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`تم إنشاء المجلد: ${dir}`);
    }
  });
}

// وظيفة لتلخيص محتوى ملف SQL وإنشاء نسخة ملخصة
function summarizeMigrationFile(filePath) {
  console.log(`تلخيص ملف الهجرة: ${filePath}`);
  
  // قراءة محتوى الملف
  const content = fs.readFileSync(filePath, 'utf8');
  
  // استخراج التعليقات الموجودة في الملف (يفترض أنها شرح للهجرة)
  const commentRegex = /\/\*\s*([\s\S]*?)\s*\*\//g;
  const comments = [];
  let match;
  
  while ((match = commentRegex.exec(content)) !== null) {
    comments.push(match[1].trim());
  }
  
  // تلخيص عمليات SQL
  let summary = '';
  
  // عمليات إنشاء الجداول
  const createTableMatches = content.match(/CREATE TABLE.*?;/gs) || [];
  if (createTableMatches.length > 0) {
    summary += '## إنشاء الجداول\n\n';
    createTableMatches.forEach(match => {
      const tableName = match.match(/CREATE TABLE.*?([a-zA-Z0-9_]+)/)?.[1];
      summary += `- إنشاء جدول \`${tableName}\`\n`;
    });
    summary += '\n';
  }
  
  // عمليات تعديل الجداول
  const alterTableMatches = content.match(/ALTER TABLE.*?;/gs) || [];
  if (alterTableMatches.length > 0) {
    summary += '## تعديل الجداول\n\n';
    alterTableMatches.forEach(match => {
      const tableName = match.match(/ALTER TABLE.*?([a-zA-Z0-9_]+)/)?.[1];
      summary += `- تعديل جدول \`${tableName}\`\n`;
    });
    summary += '\n';
  }
  
  // عمليات إنشاء الوظائف
  const createFunctionMatches = content.match(/CREATE OR REPLACE FUNCTION.*?END;/gs) || [];
  if (createFunctionMatches.length > 0) {
    summary += '## إنشاء الوظائف\n\n';
    createFunctionMatches.forEach(match => {
      const functionName = match.match(/CREATE OR REPLACE FUNCTION.*?([a-zA-Z0-9_]+)/)?.[1];
      summary += `- إنشاء وظيفة \`${functionName}\`\n`;
    });
    summary += '\n';
  }
  
  // عمليات إنشاء المشغلات
  const createTriggerMatches = content.match(/CREATE TRIGGER.*?;/gs) || [];
  if (createTriggerMatches.length > 0) {
    summary += '## إنشاء المشغلات\n\n';
    createTriggerMatches.forEach(match => {
      const triggerName = match.match(/CREATE TRIGGER.*?([a-zA-Z0-9_]+)/)?.[1];
      summary += `- إنشاء مشغل \`${triggerName}\`\n`;
    });
    summary += '\n';
  }
  
  // عمليات تنفيذ رموز SQL مخصصة
  const doBlockMatches = content.match(/DO \$\$([\s\S]*?)\$\$/gs) || [];
  if (doBlockMatches.length > 0) {
    summary += '## رموز SQL المخصصة\n\n';
    summary += `- ${doBlockMatches.length} كتلة رمز مخصصة\n\n`;
  }
  
  // حساب hash للملف
  const fileHash = crypto.createHash('md5').update(content).digest('hex');
  
  // إنشاء ملخص نهائي
  let finalSummary = `# ملخص ملف الهجرة: ${path.basename(filePath)}\n\n`;
  
  if (comments.length > 0) {
    finalSummary += `## التعليقات الأصلية\n\n${comments.join('\n\n')}\n\n`;
  }
  
  finalSummary += summary;
  finalSummary += `\n## البيانات التقنية\n\n`;
  finalSummary += `- اسم الملف: ${path.basename(filePath)}\n`;
  finalSummary += `- حجم الملف: ${fs.statSync(filePath).size} بايت\n`;
  finalSummary += `- MD5 Hash: ${fileHash}\n`;
  finalSummary += `- تاريخ الملخص: ${new Date().toLocaleString('ar-SA')}\n`;
  
  return finalSummary;
}

// وظيفة لأرشفة ملفات الهجرة القديمة
function archiveMigrations() {
  console.log('🗄️ بدء أرشفة ملفات الهجرة القديمة...');
  
  // التأكد من وجود المجلدات
  createDirectories();
  
  // قراءة قائمة ملفات الهجرة
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // ترتيب الملفات
  
  console.log(`📊 إجمالي عدد ملفات الهجرة: ${migrationFiles.length}`);
  
  // تحديد الملفات التي سيتم الاحتفاظ بها والملفات التي سيتم أرشفتها
  const filesToKeep = migrationFiles.slice(-KEEP_LATEST);
  const filesToArchive = migrationFiles.slice(0, -KEEP_LATEST);
  
  console.log(`🔒 سيتم الاحتفاظ بـ ${filesToKeep.length} ملفات في المجلد الرئيسي`);
  console.log(`📦 سيتم أرشفة ${filesToArchive.length} ملفات`);
  
  // إنشاء ملف .gitignore في مجلد الأرشيف
  fs.writeFileSync(path.join(ARCHIVE_DIR, '.gitignore'), '*\n!.gitignore\n!README.md\n');
  
  // إنشاء ملف README في مجلد الأرشيف
  const readmeContent = `
# أرشيف ملفات الهجرة

هذا المجلد يحتوي على ملفات الهجرة القديمة التي تم أرشفتها للتقليل من حجم المشروع.

## استعادة الملفات

لاستعادة ملفات الهجرة، قم بتنفيذ الأمر التالي:

\`\`\`
node restore-migrations.js
\`\`\`

## ملاحظات هامة

- تم الاحتفاظ بآخر ${KEEP_LATEST} ملفات هجرة في المجلد الرئيسي.
- تاريخ الأرشفة: ${new Date().toLocaleString('ar-SA')}
`;

  fs.writeFileSync(path.join(ARCHIVE_DIR, 'README.md'), readmeContent);
  
  // أرشفة الملفات وإنشاء ملخصات لها
  let archivedCount = 0;
  
  filesToArchive.forEach(file => {
    const sourcePath = path.join(MIGRATIONS_DIR, file);
    const archivePath = path.join(ARCHIVE_DIR, file);
    const summaryPath = path.join(SUMMARY_DIR, file.replace('.sql', '.md'));
    
    try {
      // تلخيص محتوى الملف
      const summary = summarizeMigrationFile(sourcePath);
      
      // كتابة الملخص
      fs.writeFileSync(summaryPath, summary);
      
      // نسخ الملف إلى الأرشيف
      fs.copyFileSync(sourcePath, archivePath);
      
      // حذف الملف من المجلد الرئيسي
      fs.unlinkSync(sourcePath);
      
      archivedCount++;
    } catch (error) {
      console.error(`❌ خطأ في أرشفة الملف ${file}:`, error.message);
    }
  });
  
  console.log(`✅ تمت أرشفة ${archivedCount} ملفات بنجاح`);
  
  // إنشاء ملف فهرس للملخصات
  const summaryFiles = fs.readdirSync(SUMMARY_DIR)
    .filter(file => file.endsWith('.md'))
    .sort();
  
  let summaryIndex = `# فهرس ملخصات ملفات الهجرة\n\n`;
  summaryIndex += `تم إنشاء ${summaryFiles.length} ملخص لملفات الهجرة.\n\n`;
  summaryIndex += `## قائمة الملخصات\n\n`;
  
  summaryFiles.forEach(file => {
    summaryIndex += `- [${file}](${file})\n`;
  });
  
  fs.writeFileSync(path.join(SUMMARY_DIR, 'README.md'), summaryIndex);
  
  return archivedCount;
}

// وظيفة لإنشاء سكريبت استعادة ملفات الهجرة
function createRestoreScript() {
  console.log('📝 إنشاء سكريبت استعادة ملفات الهجرة...');
  
  const scriptContent = `
// سكريبت لاستعادة ملفات الهجرة من الأرشيف
const fs = require('fs');
const path = require('path');

// تحديد المسارات
const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase/migrations');
const ARCHIVE_DIR = path.join(process.cwd(), 'supabase/migrations_archive');

// التأكد من وجود مجلد الأرشيف
if (!fs.existsSync(ARCHIVE_DIR)) {
  console.error('مجلد الأرشيف غير موجود!');
  process.exit(1);
}

// الحصول على قائمة ملفات الهجرة المؤرشفة
const archivedFiles = fs.readdirSync(ARCHIVE_DIR)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (archivedFiles.length === 0) {
  console.log('لا توجد ملفات مؤرشفة لاستعادتها.');
  process.exit(0);
}

console.log(\`تم العثور على \${archivedFiles.length} ملفات في الأرشيف.\`);

// استعادة الملفات من الأرشيف
let restoredCount = 0;
archivedFiles.forEach(file => {
  const sourcePath = path.join(ARCHIVE_DIR, file);
  const destPath = path.join(MIGRATIONS_DIR, file);
  
  // تخطي الملفات الموجودة بالفعل في مجلد الهجرة
  if (fs.existsSync(destPath)) {
    console.log(\`الملف \${file} موجود بالفعل في مجلد الهجرة، تم تخطيه.\`);
    return;
  }
  
  try {
    // نسخ الملف من الأرشيف إلى مجلد الهجرة
    fs.copyFileSync(sourcePath, destPath);
    restoredCount++;
    console.log(\`تمت استعادة: \${file}\`);
  } catch (error) {
    console.error(\`خطأ في استعادة الملف \${file}:\`, error);
  }
});

console.log(\`تمت استعادة \${restoredCount} ملفات بنجاح\`);
  `;
  
  fs.writeFileSync('restore-migrations.js', scriptContent);
  console.log('✅ تم إنشاء سكريبت استعادة ملفات الهجرة (restore-migrations.js)');
}

// تنفيذ الإجراءات
(async function main() {
  console.log('🚀 بدء تنفيذ سكريبت إدارة ملفات الهجرة...');
  
  // التأكد من وجود مجلدات النظام
  createDirectories();
  
  // أرشفة ملفات الهجرة القديمة
  const archivedCount = archiveMigrations();
  
  // إنشاء سكريبت الاستعادة
  if (archivedCount > 0) {
    createRestoreScript();
  }
  
  console.log('\n✨ اكتملت عملية إدارة ملفات الهجرة بنجاح!');
})();