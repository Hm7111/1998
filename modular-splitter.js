// سكريبت تقسيم المشروع إلى وحدات وظيفية منفصلة
// يساعد في تنظيم المشروع وتقليل استهلاك التوكن في البرومت
const fs = require('fs');
const path = require('path');

// تعريف الوحدات الوظيفية للمشروع
const modules = [
  {
    name: 'core',
    description: 'النواة الأساسية للنظام',
    paths: [
      'src/App.tsx',
      'src/main.tsx',
      'src/index.css',
      'src/routes.tsx',
      'src/store/theme.ts',
      'src/lib/supabase.ts',
      'src/lib/auth.tsx',
      'src/lib/utils.ts',
      'src/components/layout',
      'src/components/auth',
      'src/components/ui',
      'src/hooks/useToast.tsx',
      'src/hooks/useAuth.ts',
      'src/providers'
    ]
  },
  {
    name: 'letters',
    description: 'نظام إدارة الخطابات',
    paths: [
      'src/features/letters',
      'src/components/letters',
      'src/hooks/useLetters.ts',
      'src/pages/admin/Letters.tsx',
      'src/pages/admin/ViewLetter.tsx',
      'src/pages/admin/EditLetter.tsx',
      'src/lib/letter-utils.ts',
      'src/lib/pdf-export.ts'
    ]
  },
  {
    name: 'templates',
    description: 'نظام إدارة قوالب الخطابات',
    paths: [
      'src/features/templates',
      'src/components/templates',
      'src/data/letterTemplates.ts',
      'src/types/templates.ts'
    ]
  },
  {
    name: 'workflow',
    description: 'نظام سير العمل والموافقات',
    paths: [
      'src/features/workflow',
      'src/components/workflow',
      'src/hooks/useWorkflow.ts',
      'src/pages/admin/Approvals.tsx'
    ]
  },
  {
    name: 'users',
    description: 'نظام إدارة المستخدمين والصلاحيات',
    paths: [
      'src/features/users',
      'src/components/users',
      'src/pages/admin/Users.tsx',
      'src/pages/admin/permissions'
    ]
  },
  {
    name: 'branches',
    description: 'نظام إدارة الفروع',
    paths: [
      'src/features/branches',
      'src/components/branches',
      'src/hooks/useBranches.ts',
      'src/pages/admin/Branches.tsx'
    ]
  },
  {
    name: 'tasks',
    description: 'نظام إدارة المهام',
    paths: [
      'src/features/tasks',
      'src/pages/admin/tasks'
    ]
  },
  {
    name: 'dashboard',
    description: 'لوحة التحكم والإحصائيات',
    paths: [
      'src/pages/admin/Dashboard.tsx',
      'src/hooks/useDashboardStats.ts'
    ]
  }
];

// إنشاء دليل الوثائق لكل وحدة
function createModuleDocumentation() {
  console.log('📝 إنشاء وثائق للوحدات الوظيفية...');
  
  const docsDir = path.join(process.cwd(), 'docs');
  
  // إنشاء مجلد الوثائق إذا لم يكن موجوداً
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  // إنشاء ملف README للوثائق
  const readmeContent = `
# وثائق النظام

هذا المجلد يحتوي على وثائق النظام مقسمة حسب الوحدات الوظيفية.

## الوحدات الوظيفية:

${modules.map(module => `- [${module.name}](./modules/${module.name}.md): ${module.description}`).join('\n')}

## كيفية استخدام هذه الوثائق

استخدم هذه الوثائق للحصول على فهم شامل للنظام والتعامل مع وحداته المختلفة بشكل منفصل،
مما يساعد في تقليل استهلاك التوكن عند التعامل مع البرومت.
  `;
  
  fs.writeFileSync(path.join(docsDir, 'README.md'), readmeContent);
  
  // إنشاء مجلد للوحدات
  const modulesDir = path.join(docsDir, 'modules');
  if (!fs.existsSync(modulesDir)) {
    fs.mkdirSync(modulesDir, { recursive: true });
  }
  
  // إنشاء وثيقة لكل وحدة
  for (const module of modules) {
    console.log(`📄 إنشاء وثيقة للوحدة: ${module.name}`);
    
    let fileContent = `# وحدة ${module.name}\n\n`;
    fileContent += `${module.description}\n\n`;
    fileContent += `## المسارات الرئيسية\n\n`;
    
    for (const modulePath of module.paths) {
      fileContent += `- \`${modulePath}\`\n`;
    }
    
    fileContent += `\n## الملفات الرئيسية\n\n`;
    
    for (const modulePath of module.paths) {
      const fullPath = path.join(process.cwd(), modulePath);
      
      if (!fs.existsSync(fullPath)) {
        fileContent += `- ⚠️ المسار غير موجود: \`${modulePath}\`\n`;
        continue;
      }
      
      if (fs.statSync(fullPath).isDirectory()) {
        fileContent += `### مجلد: \`${modulePath}\`\n\n`;
        
        try {
          const files = fs.readdirSync(fullPath);
          
          for (const file of files) {
            if (file.startsWith('.')) continue; // تجاهل الملفات المخفية
            
            const filePath = path.join(fullPath, file);
            
            if (fs.statSync(filePath).isDirectory()) {
              fileContent += `- 📁 **${file}/**\n`;
            } else {
              const ext = path.extname(file).toLowerCase();
              if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md'].includes(ext)) {
                fileContent += `- 📄 ${file}\n`;
              }
            }
          }
        } catch (error) {
          fileContent += `⚠️ خطأ في قراءة المجلد: ${error.message}\n`;
        }
        
        fileContent += '\n';
      } else {
        fileContent += `- 📄 \`${modulePath}\`\n`;
      }
    }
    
    fileContent += `\n## استخدام هذه الوحدة مع البرومت\n\n`;
    fileContent += `عند العمل على هذه الوحدة، يُفضل تركيز السياق على الملفات المذكورة أعلاه فقط لتقليل استهلاك التوكن.\n`;
    fileContent += `يمكنك استخدام العبارة التالية مع البرومت:\n\n`;
    fileContent += `> أريد العمل على وحدة ${module.name} فقط، وتحديداً على [وصف المهمة].\n`;
    
    fs.writeFileSync(path.join(modulesDir, `${module.name}.md`), fileContent);
  }
  
  console.log('✅ تم إنشاء وثائق الوحدات بنجاح!');
}

// إنشاء ملف إرشادات للتعامل مع البرومت
function createPromptGuide() {
  console.log('\n📝 إنشاء دليل للتعامل مع البرومت...');
  
  const guideContent = `
# دليل التعامل مع البرومت

هذا الدليل يساعدك في التعامل الفعال مع البرومت للعمل على هذا المشروع بكفاءة وتوفير التوكن.

## استراتيجيات تقليل استهلاك التوكن

### 1. استخدام نهج الوحدات

المشروع مقسم إلى وحدات وظيفية منفصلة، ويُفضل التعامل مع كل وحدة بشكل منفصل:

${modules.map(module => `- **${module.name}**: ${module.description}`).join('\n')}

### 2. أمثلة على طريقة الاستفسار

بدلاً من تحميل المشروع بالكامل في كل مرة، يمكنك استخدام الأنماط التالية:

\`\`\`
أريد العمل على وحدة [اسم الوحدة] فقط، وتحديداً [وصف المهمة]
\`\`\`

\`\`\`
لدي مشكلة في [وصف المشكلة] ضمن وحدة [اسم الوحدة]
\`\`\`

### 3. استخدام المراجع بدلاً من الشيفرة الكاملة

بدلاً من نسخ الشيفرة الكاملة، يمكنك استخدام المراجع:

\`\`\`
يجب تعديل الدالة handleSubmit في ملف src/features/letters/pages/LetterEditor.tsx لإضافة [الوظيفة المطلوبة]
\`\`\`

### 4. الاعتماد على الوثائق

استخدم وثائق الوحدات في مجلد \`docs/modules\` للحصول على معلومات حول كل وحدة دون الحاجة لتحميل الشيفرة كاملة.

## المجلدات المؤرشفة

بعض المجلدات الكبيرة تم أرشفتها للتقليل من حجم المشروع. يمكن الوصول إليها في:

- \`.bolt/modules\`: أرشيفات الوحدات
- \`.bolt/backups\`: نسخ احتياطية للمجلدات التي تم أرشفتها

## نصائح إضافية

- قم بتحديد الملفات التي تحتاج للعمل عليها بوضوح
- ركز على الجزء المراد تعديله
- استخدم ملفي \`PROJECT-INDEX.md\` و \`PROJECT-SUMMARY.md\` كمرجع سريع
- قم بتنظيف المشروع دورياً باستخدام \`node deep-cleanup.js\`
- قم بأرشفة ملفات الهجرة القديمة باستخدام \`node archive-migrations.js\`
`;
  
  // كتابة الملف
  fs.writeFileSync('PROMPT-GUIDE.md', guideContent);
  console.log('✅ تم إنشاء دليل التعامل مع البرومت في PROMPT-GUIDE.md');
}

// الدالة الرئيسية
(async function main() {
  console.log('🚀 بدء تقسيم المشروع إلى وحدات وظيفية...');
  
  // إنشاء وثائق الوحدات
  createModuleDocumentation();
  
  // إنشاء دليل التعامل مع البرومت
  createPromptGuide();
  
  console.log('\n✨ اكتملت عملية تقسيم المشروع بنجاح!');
  console.log('\n📚 الملفات التي تم إنشاؤها:');
  console.log('  - docs/README.md: دليل وثائق النظام');
  console.log('  - docs/modules/: وثائق الوحدات الوظيفية');
  console.log('  - PROMPT-GUIDE.md: دليل التعامل مع البرومت');
})();