const fs = require('fs');
const path = require('path');

const runtimeConfig = `
// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时
`;

const apiRoutes = [
  'src/app/api/generate/storefront/route.ts',
  'src/app/api/generate/poster/route.ts',
  'src/app/api/reverse-prompt/route.ts',
  'src/app/api/generate/product/route.ts',
  'src/app/api/generate/logo/route.ts',
  'src/app/api/background-fusion/batch/route.ts',
  'src/app/api/background-fusion/route.ts',
  'src/app/api/food-replacement/batch/route.ts',
  'src/app/api/food-replacement/route.ts',
  'src/app/api/picture-wall/route.ts',
  'src/app/api/product-refine/batch/route.ts',
  'src/app/api/product-refine/route.ts',
  'src/app/api/signboard/replace-text/route.ts',
  'src/app/api/multi-fusion/route.ts',
  // logo-studio/generate已手动添加
];

apiRoutes.forEach(routePath => {
  const fullPath = path.join(__dirname, '..', routePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`跳过不存在的文件: ${routePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // 检查是否已经有runtime配置
  if (content.includes('export const runtime')) {
    console.log(`跳过已配置的文件: ${routePath}`);
    return;
  }

  // 找到第一个class或export async function的位置
  const classMatch = content.match(/^(\/\/.*\n)*class\s+/m);
  const funcMatch = content.match(/^(\/\/.*\n)*export\s+async\s+function\s+/m);

  let insertPos;
  if (classMatch && funcMatch) {
    insertPos = Math.min(classMatch.index, funcMatch.index);
  } else if (classMatch) {
    insertPos = classMatch.index;
  } else if (funcMatch) {
    insertPos = funcMatch.index;
  } else {
    console.log(`无法找到插入位置: ${routePath}`);
    return;
  }

  // 插入runtime配置
  const newContent = content.slice(0, insertPos) + runtimeConfig + '\n' + content.slice(insertPos);

  fs.writeFileSync(fullPath, newContent, 'utf8');
  console.log(`✅ 已添加runtime配置: ${routePath}`);
});

console.log('\n✅ 完成！所有API路由已配置Node.js Runtime。');
