#!/usr/bin/env node

/**
 * 文件存储系统统一迁移脚本
 *
 * 用途：将所有使用FileManager.saveBuffer的API从.uploads目录迁移到public/generated目录
 * 优势：统一存储、直接静态访问、提升性能、简化管理
 */

const fs = require('fs');
const path = require('path');

// 需要迁移的文件和对应的替换模式
const filesToMigrate = [
  {
    file: 'src/app/api/picture-wall/route.ts',
    replacements: [
      {
        search: /FileManager\.saveBuffer\(\s*processedBuffer,\s*`picture-wall-\${i \+ 1}-\${Date\.now\(\)}\.png`,\s*'image\/png'\s*\)/g,
        replace: `FileManager.saveBuffer(
        processedBuffer,
        \`picture-wall-\${i + 1}-\${Date.now()}.png\`,
        'image/png',
        true  // 使用public/generated目录，实现统一存储
      )`
      }
    ]
  },
  {
    file: 'src/app/api/product-refine/route.ts',
    replacements: [
      {
        search: /FileManager\.saveBuffer\(\s*generatedImageBuffer,\s*`refined-product-\${Date\.now\(\)}\.png`,\s*'image\/png'\s*\)/g,
        replace: `FileManager.saveBuffer(
      generatedImageBuffer,
      \`refined-product-\${Date.now()}.png\`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
    )`
      }
    ]
  },
  {
    file: 'src/app/api/signboard/replace-text/route.ts',
    replacements: [
      {
        search: /FileManager\.saveBuffer\(\s*generatedImageBuffer,\s*`signboard-\${originalText}-to-\${newText}-\${Date\.now\(\)}\.png`,\s*'image\/png'\s*\)/g,
        replace: `FileManager.saveBuffer(
      generatedImageBuffer,
      \`signboard-\${originalText}-to-\${newText}-\${Date.now()}.png\`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
    )`
      }
    ]
  },
  {
    file: 'src/app/api/generate/logo/route.ts',
    replacements: [
      {
        search: /FileManager\.saveBuffer\(\s*processedBuffer,\s*`logo-\${Date\.now\(\)}\.png`,\s*'image\/png'\s*\)/g,
        replace: `FileManager.saveBuffer(
      processedBuffer,
      \`logo-\${Date.now()}.png\`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
    )`
      }
    ]
  },
  {
    file: 'src/app/api/generate/poster/route.ts',
    replacements: [
      {
        search: /FileManager\.saveBuffer\(\s*processedBuffer,\s*`poster-\${Date\.now\(\)}\.png`,\s*'image\/png'\s*\)/g,
        replace: `FileManager.saveBuffer(
      processedBuffer,
      \`poster-\${Date.now()}.png\`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
    )`
      }
    ]
  },
  {
    file: 'src/app/api/generate/storefront/route.ts',
    replacements: [
      {
        search: /FileManager\.saveBuffer\(\s*processedBuffer,\s*`storefront-\${Date\.now\(\)}\.png`,\s*'image\/png'\s*\)/g,
        replace: `FileManager.saveBuffer(
      processedBuffer,
      \`storefront-\${Date.now()}.png\`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
    )`
      }
    ]
  },
  {
    file: 'src/app/api/generate/product/route.ts',
    replacements: [
      {
        search: /FileManager\.saveBuffer\(\s*processedBuffer,\s*`product-\${Date\.now\(\)}\.png`,\s*'image\/png'\s*\)/g,
        replace: `FileManager.saveBuffer(
      processedBuffer,
      \`product-\${Date.now()}.png\`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
    )`
      }
    ]
  }
];

console.log('🚀 开始文件存储系统统一迁移...\n');

let migratedFiles = 0;
let totalReplacements = 0;

filesToMigrate.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在，跳过: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileModified = false;
  let fileReplacements = 0;

  replacements.forEach(({ search, replace }) => {
    const matches = content.match(search);
    if (matches) {
      content = content.replace(search, replace);
      fileReplacements += matches.length;
      fileModified = true;
    }
  });

  if (fileModified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 已迁移: ${file} (${fileReplacements} 处修改)`);
    migratedFiles++;
    totalReplacements += fileReplacements;
  } else {
    console.log(`ℹ️  无需修改: ${file}`);
  }
});

console.log(`\n🎉 迁移完成!`);
console.log(`📊 统计信息:`);
console.log(`   - 处理文件: ${filesToMigrate.length} 个`);
console.log(`   - 成功迁移: ${migratedFiles} 个`);
console.log(`   - 总替换数: ${totalReplacements} 处`);
console.log(`\n🎯 迁移效果:`);
console.log(`   ✅ 统一存储目录: public/generated/`);
console.log(`   ✅ 直接静态访问: /generated/[filename]`);
console.log(`   ✅ 提升访问性能: 无需API中转`);
console.log(`   ✅ 简化文件管理: 统一清理逻辑`);
console.log(`\n⚠️  注意: 请重启开发服务器使更改生效`);