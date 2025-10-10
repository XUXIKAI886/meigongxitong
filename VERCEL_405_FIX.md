# Vercel 405错误修复指南

## 问题描述
部署到Vercel后，`/api/logo-studio/generate` 路由返回 **HTTP 405 (Method Not Allowed)** 错误。

## 已执行的修复

### 1. 添加 Node.js Runtime 配置 ✅
在 `src/app/api/logo-studio/generate/route.ts` 中添加:
```typescript
export const runtime = 'nodejs';
export const maxDuration = 300;
```

### 2. 更新 vercel.json 配置 ✅
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 300,
      "runtime": "nodejs20.x"
    }
  }
}
```

## 可能的原因分析

### 原因1: Vercel缓存问题
Vercel可能缓存了旧的Edge Runtime配置

**解决方法**:
1. 访问 Vercel Dashboard
2. 进入项目 Settings → General
3. 点击 "Redeploy" 并选择 "Clear Build Cache"
4. 重新部署

### 原因2: Next.js 15 配置问题
Next.js 15 的 App Router 可能需要特殊配置

**解决方法**:
在 `next.config.ts` 中添加:
```typescript
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};
```

### 原因3: Vercel Regions 配置冲突
香港区域(hkg1)可能不完全支持Node.js Runtime

**解决方法**:
临时移除 regions 配置，使用默认区域:
```json
{
  "regions": []  // 或直接删除此行
}
```

### 原因4: 文件大小限制
FormData上传可能触发Body Size限制

**解决方法**:
在 `next.config.ts` 中添加:
```typescript
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    responseLimit: false
  }
};
```

## 调试步骤

### 步骤1: 检查Vercel部署日志
```bash
vercel logs --follow
```

### 步骤2: 测试API路由
在浏览器开发者工具 Console 中执行:
```javascript
fetch('/api/logo-studio/generate', {
  method: 'POST',
  body: new FormData()
}).then(r => console.log(r.status, r.statusText))
```

### 步骤3: 检查Runtime配置
访问部署日志，搜索 "runtime" 关键词，确认是否使用了 Node.js Runtime

### 步骤4: 查看Function日志
在 Vercel Dashboard → Functions → 查看该API的执行日志

## 最终解决方案（推荐）

### 方案A: 清除缓存重新部署
```bash
# 在Vercel Dashboard中
1. Settings → General → Redeploy
2. 勾选 "Clear Build Cache"
3. 点击 "Redeploy"
```

### 方案B: 使用环境变量强制Runtime
在 Vercel Dashboard → Settings → Environment Variables 添加:
```
VERCEL_FORCE_RUNTIME=nodejs20.x
```

### 方案C: 简化vercel.json
```json
{
  "framework": "nextjs"
}
```
让Next.js自己管理所有配置。

## 验证修复

修复后，应该看到:
1. ✅ POST请求返回 200 状态码
2. ✅ 返回JSON: `{ ok: true, jobId: "..." }`
3. ✅ Function日志显示正确的Runtime: "nodejs20.x"

## 联系支持

如果以上方法都无效，可能是Vercel平台问题：
1. 联系Vercel Support
2. 提供部署URL和错误截图
3. 说明已尝试的修复方法

## 临时替代方案

在修复完成前，可以：
1. 使用本地开发环境: `npm run dev`
2. 或使用其他部署平台（Netlify、Railway等）
