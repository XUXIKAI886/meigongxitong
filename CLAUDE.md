# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 15 + React 19 的 **AI 驱动外卖商家图片设计系统**，为外卖商家提供6大核心功能：Logo设计工作室、门头招牌替换、图片墙生成、食物替换、背景融合、多图融合。

**技术栈核心**：
- Next.js 15 (App Router + Turbopack)
- React 19 + TypeScript
- Tailwind CSS 4 + Radix UI
- 多AI模型集成（Gemini API、Doubao API、Coze API）

## 常用开发命令

### 开发与构建
```bash
npm run dev          # 启动开发服务器（Turbopack，端口3000）
npm run build        # 构建生产版本（Turbopack）
npm run start        # 启动生产服务器
npm run lint         # ESLint代码检查
```

### 🔧 端口管理规则（Windows环境，重要！）
在启动开发服务器前必须检查端口占用，避免冲突：

```bash
# 1. 检查端口占用
netstat -ano | findstr :3000

# 2. 如被占用，终止进程（替换<PID>为实际进程ID）
taskkill //F //PID <PID>

# 3. 启动服务器
npm run dev
```

### 环境变量配置

项目使用三套AI API：
- **Doubao API**：Logo设计、门头招牌、图片墙（`IMAGE_*`变量）
- **Gemini API**：食物替换、背景融合、产品精修（`GEMINI_*`变量）
- **Coze API**：AI菜品图生成、提示词优化（`COZE_*`变量）

必需的环境变量（`.env.local`）：
```bash
# Doubao API配置
IMAGE_API_BASE_URL=https://jeniya.top/v1/images/generations
IMAGE_MODEL_NAME=doubao-seedream-4-0-250828
IMAGE_API_KEY=your_doubao_api_key

# Gemini API配置（统一端点）
GEMINI_API_BASE_URL=https://newapi.aicohere.org/v1/chat/completions
GEMINI_MODEL_NAME=nano-banana
GEMINI_API_KEY=your_gemini_api_key

# Coze API配置（Logo工作室AI生成）
COZE_API_BASE_URL=https://api.coze.cn/v3
COZE_ACCESS_TOKEN=your_coze_access_token
COZE_BOT_DISH_GENERATOR=bot_id_for_dish_generation
COZE_BOT_PROMPT_OPTIMIZER=bot_id_for_prompt_optimization

# 应用配置
STORAGE_ROOT=./.uploads
NEXT_PUBLIC_APP_NAME=美工设计系统
```

## 核心架构设计

### 1. 双模式处理架构（本地 vs Vercel）

系统自动检测运行环境，在本地和Vercel环境使用不同的处理策略：

**本地环境（开发/自托管）**：
- 使用JobQueue异步任务系统（`src/lib/job-queue.ts`）
- 文件保存到磁盘（`.uploads/`, `public/generated/`）
- 前端轮询作业状态（`/api/jobs/[id]`）

**Vercel环境（生产部署）**：
- 同步处理模式，立即返回结果
- FileManager返回base64 Data URLs（无磁盘写入）
- 跳过localStorage大数据存储（避免配额限制）
- 环境检测：`process.env.VERCEL === '1'`

**环境检测代码模式**：
```typescript
const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (isVercel) {
  // Vercel同步模式：直接处理并返回结果
  const result = await processor.process(jobData);
  return NextResponse.json({ ok: true, data: result });
} else {
  // 本地异步模式：创建JobQueue任务
  const job = JobQueue.createJob('task-type', payload, clientIp);
  jobRunner.runJob(job.id);
  return NextResponse.json({ ok: true, jobId: job.id });
}
```

### 2. 作业队列系统（`src/lib/job-queue.ts`）

**关键特性**：
- **内存存储**：使用globalThis持久化Map，解决Turbopack热重载数据丢失
- **并发控制**：每用户最多2个并发任务
- **状态流转**：`queued → running → succeeded/failed`
- **自动清理**：15分钟过期清理机制

**典型流程**：
```typescript
// 1. 创建作业
const job = JobQueue.createJob('task-type', payload, clientIp);

// 2. 异步执行
jobRunner.runJob(job.id);

// 3. 前端轮询状态
GET /api/jobs/[id] → { ok, job: { status, result, error } }
```

**重要提示**：
- 前端轮询必须使用 `data.job` 而非 `data.data`
- 成功状态值为 `'succeeded'` 而非 `'completed'`
- 使用globalThis避免Turbopack热重载时丢失作业数据

### 3. API客户端架构（`src/lib/api/`）

**继承体系**：
```
BaseApiClient (基础类)
├── ImageApiClient (Doubao图像生成)
├── ChatApiClient (Gemini聊天/分析)
├── ProductImageApiClient (单品图专用)
├── ProductRefineApiClient (产品精修)
└── CozeApiClient (Coze SSE流式响应)
```

**关键设计模式**：
- 统一错误处理和重试机制（3次重试，2秒间隔）
- Markdown图片链接自动下载转换
- 多格式响应支持（base64/data URL/HTTP URL）
- 向后兼容导出（`src/lib/api-client.ts`）

**重要提示**：
- 所有API客户端都继承自BaseApiClient
- Gemini API客户端需实现 `convertGeminiResponse()` 方法
- 认证方式：使用Authorization Header而非URL参数

### 4. 文件管理系统（`src/lib/upload.ts`）

**FileManager核心功能**：
- **双存储模式**：统一存储（`public/generated/`）+ 向后兼容（`.uploads/`）
- **自动清理**：服务器启动时清理7天前文件，24小时定时任务
- **安全验证**：文件类型检查、大小限制（10MB）、路径防护
- **Vercel适配**：环境检测，自动返回base64而非文件路径

**清理API**：
```bash
# 智能清理（7天前文件）
GET /api/files/cleanup?maxAgeDays=7

# 强制清理（所有文件，危险）
DELETE /api/files/cleanup
```

**文件保存模式**：
```typescript
// 第四个参数控制存储位置
FileManager.saveBuffer(buffer, filename, 'image/png', true)  // public/generated/
FileManager.saveBuffer(buffer, filename, 'image/png', false) // .uploads/
```

### 5. UI组件设计系统（`src/components/ui/`）

**分类架构**（每目录≤8文件）：
```
ui/
├── base/      - button, input, label, badge
├── form/      - select, textarea, switch, form
├── feedback/  - alert, progress, skeleton, sonner
├── layout/    - card, dialog, tabs, tooltip, alert-dialog
└── index.ts   - 统一导出，保持向后兼容
```

**重要规范**：
- 所有组件统一从 `@/components/ui` 导入
- 基于Radix UI + Tailwind CSS
- 支持深色模式（next-themes）

### 6. 功能模块示例：食物替换工具

**模块化架构**（`src/app/food-replacement/`）：
```
├── page.tsx (252行) - 主页面，协调组件和Hook
├── types.ts (36行) - 类型定义
├── components/ (6个组件)
│   ├── BatchModeToggle.tsx - 单图/批量模式切换
│   ├── SourceImageUpload.tsx - 源图片上传
│   ├── TargetImageUpload.tsx - 目标图片选择
│   ├── ProcessingStatus.tsx - 处理状态显示
│   ├── ResultDisplay.tsx - 结果展示
│   └── TemplateSelector.tsx - 模板选择器
└── hooks/ (3个Hook)
    ├── useFoodReplacement.ts - 主业务逻辑
    ├── useImageUpload.ts - 图片上传管理
    └── useTemplates.ts - 模板数据管理
```

**设计原则**：
- 组件职责单一，每个文件≤200行
- 复杂状态逻辑提取为Custom Hooks
- 批量处理支持智能重试（网络容错）

## 关键技术实现

### Coze API集成（SSE流式响应）

**架构设计**（`src/lib/api/clients/CozeApiClient.ts`）：
- **SSE流式传输**：实时接收AI生成进度，支持中途取消（AbortController）
- **双Bot机制**：
  - 提示词优化Bot：优化用户输入的菜品描述
  - 菜品图生成Bot：基于优化提示词和原图参考生成菜品图
- **文件上传处理**：自动将图片转base64并上传到Coze

**使用场景**：
```typescript
// 提示词优化（流式响应）
const optimizer = useCozePromptOptimizer({
  onOptimizationComplete: (optimized) => setDescription(optimized),
  onChunk: (chunk) => console.log('实时更新:', chunk)
});
await optimizer.optimize(description, referenceImage);

// 菜品图生成
const generator = useCozeDishGenerator({
  onGenerationComplete: (imageFile) => handleApplyImage(imageFile)
});
await generator.generate(optimizedPrompt, referenceImage);
```

**重要特性**：
- 流式数据通过回调函数逐段返回，UI实时更新
- 支持AbortController取消长时间运行的请求
- 错误处理统一在客户端封装，业务层无需关心重试逻辑
- 必须提供原图参考才能使用（UI层强制校验）

### 客户端图片压缩（Vercel优化）

**实现位置**（`src/app/logo-studio/hooks/useLogoStudioForm.ts`）：
- **压缩算法**：Canvas API，1920×1920最大尺寸，85%质量
- **触发时机**：用户上传图片时自动压缩
- **压缩效果**：5-10MB → 1-2MB，解决Vercel 4.5MB请求体限制
- **容错机制**：压缩失败时自动使用原图

**代码示例**：
```typescript
async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
): Promise<Blob> {
  // Canvas API压缩实现
  // 自动计算缩放比例、保持宽高比
  // 输出JPEG格式
}
```

**重要提示**：
- 压缩过程在浏览器端完成，减轻服务器负担
- 适用于所有需要上传大图片的场景
- 压缩日志会输出到浏览器Console，便于调试

### 批量处理与网络容错

所有批量功能（食物替换、背景融合）都实现了：
- **智能重试**：3次重试，2秒间隔
- **网络容错**：处理timeout、socket hang up、ECONNRESET
- **部分成功**：单张失败不影响其他图片
- **实时进度**：精确的处理状态和百分比

**重试机制实现**：
```typescript
let retryCount = 0;
const maxRetries = 3;

while (retryCount < maxRetries) {
  try {
    const result = await processImage(image);
    return result;
  } catch (error) {
    retryCount++;
    if (retryCount >= maxRetries) throw error;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

### AI提示词优化策略

**量化色彩增强**（位于`src/app/api/logo-studio/generate/route.ts`）：
```
青椒/青菜 → 饱和度+50%, 亮度+30%
肉类 → 饱和度+40%, 亮度+25%
辣椒/番茄 → 饱和度+60%, 亮度+20%
米饭 → 亮度+40%
```

**食物提取规则**（多图融合）：
- 有碗/盒子：保留容器+食物
- 无容器：仅提取食物本身
- 严格排除：背景、桌面、餐具、装饰物、**水印文字**

**水印排除策略**（重要！）：
```typescript
// 在createFoodReplacementPrompt()和createSimpleFusionPrompt()中
- 明确排除"AI生成"等水印文字
- 特别针对右下角标识进行专门处理
- 适用于头像、店招、海报所有类型
```

**食物摆放要求**：
- 份量：7-8分满，避免边缘大面积留白
- 布局：自然铺满容器内部空间，不仅集中中心
- 立体感：保持堆叠层次，营造丰盛饱满效果

### Logo设计工作室两阶段处理

**头像生成流程**（双API架构）：
1. **阶段1**（Gemini API）：菜品图融合到模板，仅替换食物保留容器
2. **阶段2**（Doubao API）：识别并替换模板中的店铺名文字

**店招/海报流程**（单阶段）：
- 直接使用Gemini API完成食物替换+店名替换

**重要实现细节**：
```typescript
// 阶段2必须上传完整FormData以通过后端验证
// 但实际处理使用step1ResultUrl作为图像源
const formData = new FormData();
formData.append('dishImage', dishImageFile);
formData.append('avatarTemplate', avatarTemplateFile);
formData.append('avatarTemplateId', avatarTemplateId);
formData.append('step1ResultUrl', step1ResultUrl); // 实际处理源
```

## 开发规范

### 代码风格
- **中文注释和文档**：所有注释、commit信息、文档使用中文
- **文件规模控制**：TypeScript文件≤200行，超出则拆分为组件/Hook
- **目录结构**：每目录≤8个文件，按功能分类组织
- **命名规范**：组件PascalCase，文件kebab-case，API路由RESTful

### Git提交规范
```bash
格式：type: summary（≤72字符）
类型：feat、fix、update、docs、refactor
示例：feat: 添加Logo设计工作室双平台下载功能
```

### 调试与测试
- **作业状态调试**：`GET /api/debug/jobs` 查看所有作业
- **网络监控**：使用浏览器DevTools的Network/Console选项卡
- **本地测试**：`npm run dev` 验证完整功能流程
- **Vercel测试**：检查同步模式、base64返回、localStorage跳过

## 部署注意事项

### Vercel部署（推荐）
- **环境变量**：在Vercel项目设置中配置所有`*_API_*`变量
- **超时配置**：已设置`maxDuration = 300`（5分钟）
- **自动检测**：代码自动识别Vercel环境，切换同步模式
- **无需修改**：现有代码已完美适配Vercel

### 本地/自托管部署
- **创建目录**：确保`.uploads/`和`public/generated/`存在
- **文件权限**：Node.js进程需要读写权限
- **定期清理**：FileManager自动清理，也可手动调用清理API

## 常见问题排查

### 问题：前端轮询返回404 "Job not found"
- **原因**：Turbopack热重载导致作业队列Map被重新初始化
- **解决**：已使用globalThis持久化（v1.15.0修复）

### 问题：Vercel部署后生成结果不显示
- **原因**：前端期待文件路径，但Vercel返回base64
- **解决**：前端自动检测响应格式，支持base64/文件路径（v2.2.0修复）

### 问题：批量处理部分图片失败
- **原因**：网络波动或API临时不可用
- **解决**：启用3次智能重试，部分失败不影响成功图片（v1.4.0+）

### 问题：端口3000被占用，服务器无法启动
- **原因**：之前的进程未正确终止
- **解决**：使用上述端口管理规则强制终止进程

### 问题：API响应格式错误
- **症状**：`Cannot read properties of undefined (reading 'status')`
- **原因**：使用了错误的响应路径（`data.data` 而非 `data.job`）
- **解决**：统一使用 `data.job` 访问作业状态

### 问题：Gemini API客户端报错
- **症状**：`convertGeminiResponse is not a function`
- **原因**：新API客户端缺少Gemini响应解析方法
- **解决**：确保所有Gemini客户端都实现 `convertGeminiResponse()` 方法

### 问题：413 Payload Too Large - 图片上传失败
- **原因**：Vercel Serverless Functions限制请求体为4.5MB
- **解决**：已在 `useLogoStudioForm.ts` 中实现客户端自动压缩
- **配置**：1920×1920最大尺寸，85%质量，JPEG格式
- **效果**：5-10MB原图 → 1-2MB压缩图，压缩失败时自动使用原图

### 问题：401 Unauthorized - Coze API认证失败
- **原因**：环境变量未在Vercel项目中配置
- **解决**：在Vercel Dashboard → Settings → Environment Variables 添加：
  - `COZE_API_BASE_URL`
  - `COZE_ACCESS_TOKEN`
  - `COZE_BOT_DISH_GENERATOR`
  - `COZE_BOT_PROMPT_OPTIMIZER`
- **注意**：配置后需重新部署才能生效

### 问题：TypeScript构建错误 - 类型转换失败
- **场景**：模拟`ChangeEvent<HTMLInputElement>`时单次类型断言失败
- **解决**：使用双重类型断言 `as unknown as React.ChangeEvent<HTMLInputElement>`

### 问题：AI生成图片包含水印
- **症状**：生成的头像/店招/海报右下角出现"AI生成"水印
- **原因**：原图参考包含水印，提示词未明确排除
- **解决**：已在提示词中添加水印排除指令（v2.5.0+）
- **位置**：`src/app/api/logo-studio/generate/route.ts` 中的 `createFoodReplacementPrompt()` 和 `createSimpleFusionPrompt()`

## 项目独特之处

1. **智能环境适配**：同一套代码在本地和Vercel无缝运行，无需配置
2. **三套AI模型集成**：Doubao处理图像生成，Gemini处理智能分析，Coze处理流式交互
3. **模块化重构**：v2.0版本大规模重构，符合企业级代码规范
4. **批量处理容错**：行业领先的网络容错和重试机制
5. **量化提示词**：精确的数值化AI提示词，显著提升生成质量
6. **客户端优化**：浏览器端自动图片压缩，解决云平台限制
7. **SSE流式响应**：Coze API实时反馈，支持中途取消，提升用户体验
8. **水印自动排除**：提示词工程自动移除AI生成水印，保证成图质量
