# 美工设计系统

> **AI 驱动的外卖商家图片智能设计生成系统**
> 基于 Next.js 15 + React 19 + TypeScript 构建的企业级设计平台，为外卖商家提供6大核心功能：Logo设计工作室、门头招牌替换、图片墙生成、食物替换、背景融合、多图融合。

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38bdf8?style=flat-square&logo=tailwind-css)

</div>

## ✨ 核心特性

- 🎨 **6大业务功能** - Logo设计、门头招牌、图片墙、食物替换、背景融合、多图融合
- 🤖 **三套AI模型集成** - Doubao图像生成 + Gemini智能分析 + Coze流式交互
- 🚀 **双环境适配** - 同一套代码在本地（异步JobQueue）和Vercel（同步处理）无缝运行
- 📦 **模块化架构** - 企业级代码规范，每文件≤200行，目录≤8文件
- 🔄 **批量处理容错** - 智能重试（3次）、网络容错、部分成功支持
- 🎯 **量化提示词工程** - 精确的色彩增强、食物摆放、水印排除控制
- 💾 **客户端优化** - 浏览器端自动图片压缩（解决Vercel 4.5MB限制）
- ⚡ **SSE流式响应** - Coze API实时反馈，支持中途取消

## 📑 目录

- [核心特性](#-核心特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [功能模块](#-功能模块)
- [项目结构](#-项目结构)
- [核心架构](#-核心架构)
- [环境配置](#-环境配置)
- [开发指南](#-开发指南)
- [部署指南](#-部署指南)
- [常见问题](#-常见问题)
- [相关文档](#-相关文档)

## 🛠 技术栈

### 核心框架
- **Next.js 15.5.3** - 使用App Router + Turbopack
- **React 19.1.0** - 最新稳定版，服务端组件支持
- **TypeScript 5.x** - 严格类型检查
- **Node.js 20+** - 运行环境

### UI技术栈
- **Tailwind CSS 4** - 原子化CSS框架
- **Radix UI** - 无障碍UI原语组件库
  - Dialog、Select、Tabs、Progress、Switch、Tooltip等
- **Lucide React** - 现代化图标库
- **class-variance-authority** - 样式变体管理
- **next-themes** - 深色模式支持

### 状态管理与数据
- **React Hook Form** - 高性能表单管理
- **Zod** - TypeScript优先的数据验证库
- **@tanstack/react-query** - 服务端状态管理
- **@hookform/resolvers** - 表单验证解析器

### 文件处理
- **react-dropzone** - 文件拖拽上传组件
- **multer** - Node.js文件上传中间件
- **sharp** - 高性能图片处理（外部包）
- **form-data** - FormData构建工具

### HTTP与网络
- **axios** - Promise based HTTP客户端
- **node-fetch** - Node.js Fetch API实现

### AI服务集成
- **Doubao API** - 图像生成（Logo、门头、图片墙）
- **Gemini API** - 智能分析（食物替换、背景融合、产品精修）
- **Coze API** - SSE流式响应（菜品图生成、提示词优化）

## 🚀 快速开始

### 前置要求
- Node.js >= 20.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件并配置以下变量：

```bash
# Doubao API配置（Logo、门头、图片墙）
IMAGE_API_BASE_URL=https://jeniya.top/v1/images/generations
IMAGE_MODEL_NAME=doubao-seedream-4-0-250828
IMAGE_API_KEY=your_doubao_api_key

# Gemini API配置（食物替换、背景融合、产品精修）
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

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm run start
```

## 🎨 功能模块

### 1️⃣ Logo设计工作室（`/logo-studio`）

**职责**：参考Logo反推提示词，生成店铺Logo、店招和海报

提供**手动上传**和 **AI 智能生成**两种主推菜品图获取方式，满足不同商家需求：

**手动上传模式**：
- 直接上传本地菜品图片
- 自动压缩至1920×1920像素，质量85%（解决Vercel 4.5MB限制）
- 支持JPG、PNG格式，推荐2MB以内

**AI智能生成模式**（集成Coze API）：
- 📝 **提示词优化**：通过Coze提示词优化机器人实时优化菜品描述（SSE流式响应）
- 🎨 **菜品图生成**：基于优化后的提示词和**必选的原图参考**生成高质量菜品图
- ⚡ **实时反馈**：流式传输进度，支持中途取消操作
- 🔄 **重新生成**：不满意可重新生成或应用至手动模式继续编辑

**素材生成流程**（按类别选择模板后）：
- **头像生成**（800×800）：分两步处理
  1. 步骤1（Gemini API）：将主推菜品图融合到模板碗中，仅替换食物，保留容器、文字、装饰元素
  2. 步骤2（Doubao API）：识别并替换模板中的店铺名文字，保持原有字体样式
- **店招生成**（1280×720）：一步完成，使用Gemini API融合菜品并保留原有设计
- **海报生成**（1440×480）：一步完成，适配超宽横幅布局

**提示词优化亮点**：
- ✅ 自动排除AI生成水印（特别是右下角"AI生成"标识）
- ✅ 量化色彩增强指令（青菜饱和度+50%、肉类+40%、辣椒+60%等）
- ✅ 精确控制食物份量（7-8分满）和摆放位置
- ✅ 专业摄影级光影效果（高光、对比度、亮度优化）

**模板智能映射**：
- 🎯 **自动填充店铺名**：选择模板时自动填充"风格店铺名"输入框
- 📋 **模板店铺名映射表**（`constants/templateStoreNameMap.ts`）：
  - 通用-1 → 炒鸡大排档
  - 通用-2 → 锦膳私厨
  - ...（共22套模板）
  - **通用-22 → 盖饭先生**（最新添加）
- ✅ **用户可编辑**：自动填充的店铺名可手动修改

**架构特点**：
- 模块化拆分为 `components/`、`hooks/`、`constants/` 子目录
- `useLogoStudioForm` 负责表单状态与图片压缩
- `useLogoStudioTemplates` 管理模板分类与加载，支持店铺名自动映射
- `useLogoStudioGeneration` 处理素材生成与轮询逻辑
- `useCozePromptOptimizer` / `useCozeDishGenerator` 封装Coze API交互

### 2️⃣ 门头招牌文字替换（`/signboard`）

**职责**：上传门头照片，智能替换文字内容，实现拟真P图效果

**核心特性**：
- 文字识别与透视保持
- 光影匹配与自然融合
- 保持原有材质纹理和风化效果
- 输出规格：4693×3520px

### 3️⃣ 图片墙生成（`/picture-wall`）

**职责**：上传店铺头像，反推风格并生成三张统一风格的图片墙

**核心特性**：
- 风格分析与统一设计
- 批量生成（3张）
- 品牌一致性保证
- 输出规格：4800×6600px

### 4️⃣ 食物替换工具（`/food-replacement`）

**职责**：将源图片中的食物智能替换到目标图片的碗中，AI自动匹配光影和透视

**核心特性**：
- **单图/批量模式**：支持批量处理多张图片
- **批量抠图工作流**（集成Coze API）：
  - 🎯 一键批量抠图：串行处理多张图片，自动去除背景
  - 👀 抠图结果预览：棋盘格背景显示透明PNG，清晰可见
  - 🔄 单图重新抠图：鼠标悬停显示"重新抠图"按钮，不满意可重抠
  - ✨ 实时加载状态：白色遮罩 + 绿色旋转图标，清晰反馈抠图进度
  - ✅ 一键应用结果：静默替换源图，无需二次确认
  - 📛 文件名保持：抠图后保持原始文件名不变
- **双环境异步处理**：
  - 本地模式：JobQueue异步任务 + 轮询状态（每2秒，最多5分钟）
  - Vercel模式：同步处理 + 立即返回结果
  - 自动检测：代码自动适配运行环境，无需手动配置
- **智能重试**：3次重试，网络容错（timeout、ECONNRESET）
- **部分成功**：单张失败不影响其他图片
- **AI提示词优化**：
  - 提取规则：有碗保留容器，无容器仅提取食物
  - 水印排除：自动移除"AI生成"等水印
  - 食物摆放：7-8分满，自然铺满容器
- **输出规格**：1200×900px

**批量抠图操作流程**：
```
1. 上传源图片（2-10张）
   ↓
2. 点击"一键批量抠图" → SSE流式调用Coze API
   ↓
3. 预览抠图结果（棋盘格背景显示透明图）
   ├─ 满意 → 点击"一键应用"静默替换原图
   └─ 不满意 → 鼠标悬停点击"重新抠图"单独处理
   ↓
4. 选择目标图片/模板
   ↓
5. 点击"开始智能替换" → 批量处理（串行模式）
   ├─ 检测异步作业（jobId）→ 自动轮询等待
   └─ 检测同步结果（imageUrl）→ 直接显示
   ↓
6. 实时显示结果 → 成功/失败统计
```

**模块化设计**（符合企业级规范）：
```
food-replacement/
├── page.tsx (500行) - 主页面，协调组件和Hook
├── types.ts (36行) - 类型定义
├── components/ (7个组件)
│   ├── BatchModeToggle.tsx - 单图/批量模式切换
│   ├── SourceImageUpload.tsx - 源图片上传（含抠图预览）
│   ├── TargetImageUpload.tsx - 目标图片选择
│   ├── ProcessingStatus.tsx - 处理状态显示
│   ├── ResultDisplay.tsx - 结果展示
│   ├── TemplateSelector.tsx - 模板选择器
│   ├── BatchCutoutButton.tsx - 批量抠图按钮（新增）
│   └── ApplyCutoutButton.tsx - 应用抠图结果按钮（新增）
└── hooks/ (4个Hook)
    ├── useFoodReplacement.ts - 主业务逻辑
    ├── useImageUpload.ts - 图片上传管理
    ├── useTemplates.ts - 模板数据管理
    └── useBatchCutout.ts - 批量抠图状态管理（新增）
```

**技术亮点**：
- **SSE流式处理**：Coze抠图API实时反馈，优雅降级支持
- **棋盘格背景**：CSS渐变实现，清晰显示透明PNG图片
- **智能加载状态**：`recutingIndex`状态精确控制单图重抠UI
- **内存管理**：Blob URL自动创建和清理（useEffect cleanup）
- **遮罩层优化**：`pointer-events-none/auto`精确控制交互层级

### 5️⃣ 背景融合工具（`/background-fusion`）

**职责**：将美食完美融合到目标背景中，创造令人垂涎的视觉效果

**核心特性**：
- 背景融合与食欲增强
- 光影匹配与商业品质
- 批量处理支持（智能重试）
- 输出规格：1200×900px

### 6️⃣ 多图融合工具（`/multi-fusion`）

**职责**：将多张美食图片智能融合到同一背景中，生成高度一致的套餐图

**核心特性**：
- 多图融合（套餐展示）
- 风格统一与智能排列
- 完美展示美食组合
- 输出规格：1200×900px

## 📂 项目结构

```
design-system/
├── .claude/                    # Claude Code配置
├── .github/                    # GitHub工作流配置
├── public/                     # 静态资源
│   ├── generated/              # AI生成的图片（统一存储）
│   └── templates/              # 模板资源
├── .uploads/                   # 用户上传文件（临时存储，不进版本库）
├── src/                        # 源代码目录
│   ├── app/                    # Next.js 15 App Router
│   │   ├── page.tsx            # 首页导航
│   │   ├── layout.tsx          # 根布局
│   │   ├── globals.css         # 全局样式
│   │   ├── logo-studio/        # Logo设计工作室
│   │   │   ├── page.tsx
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   ├── signboard/          # 门头招牌替换
│   │   ├── picture-wall/       # 图片墙生成
│   │   ├── food-replacement/   # 食物替换工具
│   │   ├── background-fusion/  # 背景融合工具
│   │   ├── multi-fusion/       # 多图融合工具
│   │   └── api/                # API路由（26个端点）
│   │       ├── coze/           # Coze API集成
│   │       ├── logo-studio/    # Logo工作室API
│   │       ├── food-replacement/ # 食物替换API
│   │       ├── background-fusion/ # 背景融合API
│   │       ├── files/          # 文件管理API
│   │       ├── jobs/           # 作业状态查询
│   │       └── debug/          # 调试工具
│   ├── components/             # React组件
│   │   └── ui/                 # UI组件库（基于Radix UI）
│   │       ├── base/           # 基础组件（button, input, label, badge）
│   │       ├── form/           # 表单组件（select, textarea, switch, form）
│   │       ├── feedback/       # 反馈组件（alert, progress, skeleton, sonner）
│   │       ├── layout/         # 布局组件（card, dialog, tabs, tooltip）
│   │       └── index.ts        # 统一导出
│   ├── lib/                    # 核心库和工具
│   │   ├── api/                # API客户端架构
│   │   │   ├── base/           # BaseApiClient基类
│   │   │   ├── clients/        # 5个专用客户端
│   │   │   │   ├── ImageApiClient.ts       # Doubao图像生成
│   │   │   │   ├── ChatApiClient.ts        # Gemini聊天分析
│   │   │   │   ├── ProductImageApiClient.ts # 单品图生成
│   │   │   │   ├── ProductRefineApiClient.ts # 产品精修
│   │   │   │   └── CozeApiClient.ts        # Coze SSE流式响应
│   │   │   └── index.ts        # 统一导出
│   │   ├── config.ts           # 配置管理
│   │   ├── job-queue.ts        # 作业队列系统
│   │   ├── upload.ts           # 文件管理系统（FileManager）
│   │   ├── image-download.ts   # 图片下载工具
│   │   ├── prompt-templates.ts # AI提示词模板
│   │   ├── template-path.ts    # 模板路径管理
│   │   ├── image-utils.ts      # 图片工具函数
│   │   └── vercel-job-helper.ts # Vercel环境适配器
│   └── types/                  # TypeScript类型定义
│       ├── index.ts            # Job类型、任务状态等
│       ├── coze.ts             # Coze API类型
│       └── job-payloads.ts     # 作业载荷类型
├── logo模板/                   # Logo模板资源
├── 店招模板/                   # 店招模板资源
├── 海报模板/                   # 海报模板资源
├── 目标图片模板/               # 目标图片模板
├── scripts/                    # 工程化脚本
│   ├── add-runtime-config.js   # API Route runtime配置
│   └── migrate-storage.js      # 文件迁移脚本
├── package.json                # 依赖管理
├── tsconfig.json               # TypeScript配置
├── next.config.ts              # Next.js配置
├── tailwind.config.js          # Tailwind CSS配置
├── vercel.json                 # Vercel部署配置
└── .env.local                  # 环境变量（需手动创建）
```

## 🏗 核心架构

### 分层架构设计

```
┌─────────────────────────────────────────────────────┐
│           Presentation Layer (表现层)                │
│   Next.js Pages + React Components + Custom Hooks   │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│           API Layer (API层)                          │
│      Next.js API Routes (26个RESTful端点)            │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│         Business Logic Layer (业务逻辑层)            │
│  JobQueue + JobRunner + API Clients + Processors    │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│      Infrastructure Layer (基础设施层)               │
│   FileManager + ImageDownloader + Config + Utils    │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│       External Services (外部服务)                   │
│   Doubao API | Gemini API | Coze API               │
└─────────────────────────────────────────────────────┘
```

### 双环境适配模式

系统自动检测运行环境，在本地和Vercel使用不同的处理策略：

**本地环境（开发/自托管）**：
- 使用JobQueue异步任务系统（`src/lib/job-queue.ts`）
- 文件保存到磁盘（`.uploads/`, `public/generated/`）
- 前端轮询作业状态（`/api/jobs/[id]`）

**Vercel环境（生产部署）**：
- 同步处理模式，立即返回结果
- FileManager返回base64 Data URLs（无磁盘写入）
- 跳过localStorage大数据存储（避免配额限制）
- 环境检测：`process.env.VERCEL === '1'`

```typescript
// 环境检测代码模式
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

### API客户端继承体系

```
BaseApiClient (基类)
├── 统一错误处理
├── 自动重试机制（3次，2秒间隔）
├── Markdown图片链接下载
└── 响应格式标准化

专用客户端（5个）
├── ImageApiClient - Doubao图像生成
├── ChatApiClient - Gemini聊天分析
├── ProductImageApiClient - 单品图生成
├── ProductRefineApiClient - 产品精修
└── CozeApiClient - SSE流式响应
```

### 作业队列系统（JobQueue）

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

### 文件管理系统（FileManager）

**核心功能**：
- **双存储模式**：统一存储（`public/generated/`）+ 向后兼容（`.uploads/`）
- **自动清理**：服务器启动时清理7天前文件，24小时定时任务
- **安全验证**：文件类型检查、大小限制（10MB）、路径防护
- **Vercel适配**：环境检测，自动返回base64而非文件路径

**清理API**：
```bash
# 智能清理（7天前文件）
GET /api/files/cleanup?maxAgeDays=7

# 强制清理（所有文件，危险操作）
DELETE /api/files/cleanup
```

## ⚙️ 环境配置

### 必需环境变量

创建 `.env.local` 文件并配置以下变量：

```bash
# Doubao API配置（Logo、门头、图片墙）
IMAGE_API_BASE_URL=https://jeniya.top/v1/images/generations
IMAGE_MODEL_NAME=doubao-seedream-4-0-250828
IMAGE_API_KEY=your_doubao_api_key

# Gemini API配置（食物替换、背景融合、产品精修）
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
NEXT_PUBLIC_APP_DESCRIPTION=外卖商家图片智能设计生成系统
```

### 配置说明

| 变量名 | 用途 | 必需 |
|--------|------|------|
| `IMAGE_*` | Doubao图像生成API（Logo/门头/图片墙） | ✅ |
| `GEMINI_*` | Gemini智能分析API（食物替换/背景融合） | ✅ |
| `COZE_*` | Coze流式响应API（AI菜品图生成） | ⭕ 可选 |
| `STORAGE_ROOT` | 文件存储根目录 | ⭕ 默认 `./.uploads` |

## 🛠 开发指南

### 常用命令

```bash
# 开发服务器（Turbopack，端口3000）
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint
```

### 端口管理（Windows环境）

在启动开发服务器前必须检查端口占用：

```bash
# 1. 检查端口占用
netstat -ano | findstr :3000

# 2. 如被占用，终止进程（替换<PID>为实际进程ID）
taskkill //F //PID <PID>

# 3. 启动服务器
npm run dev
```

### 代码规范

- ✅ **文件规模控制**：TypeScript文件≤200行，超出则拆分为组件/Hook
- ✅ **目录结构**：每目录≤8个文件，按功能分类组织
- ✅ **中文注释和文档**：所有注释、commit信息、文档使用中文
- ✅ **命名规范**：组件PascalCase，文件kebab-case，API路由RESTful
- ✅ **类型安全**：启用TypeScript严格模式，使用Zod数据验证

### Git提交规范

```bash
格式：type: summary（≤72字符）

类型：
- feat: 新功能
- fix: 修复bug
- update: 更新功能
- docs: 文档更新
- refactor: 重构代码

示例：
feat: 添加Logo设计工作室双平台下载功能
fix: 修复Vercel环境下图片上传失败问题
update: 优化食物替换提示词，排除AI生成水印
```

### 调试与测试

```bash
# 查看所有作业状态
curl http://localhost:3000/api/debug/jobs

# 触发文件清理（7天前）
curl http://localhost:3000/api/files/cleanup?maxAgeDays=7

# 强制清理所有文件
curl -X DELETE http://localhost:3000/api/files/cleanup
```

**前端调试技巧**：
- 使用浏览器DevTools的Network选项卡监控API请求
- Console选项卡查看日志（图片压缩、作业状态等）
- 作业状态响应路径：使用 `data.job` 而非 `data.data`
- 成功状态值：`'succeeded'` 而非 `'completed'`

## 🚀 部署指南

### Vercel部署（推荐）

**1. 环境变量配置**

在Vercel Dashboard → Settings → Environment Variables 添加所有必需的环境变量：
- `IMAGE_*` 系列
- `GEMINI_*` 系列
- `COZE_*` 系列（可选）
- `STORAGE_ROOT`
- `NEXT_PUBLIC_APP_NAME`

**注意**：配置后需重新部署才能生效。

**2. 部署配置**

`vercel.json` 已配置最大执行时间为5分钟：

```json
{
  "version": 2,
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

**3. 自动适配**

代码会自动检测Vercel环境（`process.env.VERCEL === '1'`）并切换到同步处理模式：
- ✅ 无需修改代码
- ✅ 自动返回base64 Data URLs
- ✅ 跳过localStorage大数据存储
- ✅ 同步处理，立即返回结果

**4. 部署步骤**

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录Vercel
vercel login

# 3. 部署到Vercel
vercel --prod
```

### 本地/自托管部署

**1. 创建必需目录**

```bash
mkdir -p .uploads public/generated
```

**2. 配置环境变量**

创建 `.env.local` 文件并配置所有必需变量。

**3. 构建和启动**

```bash
# 安装依赖
npm install

# 生产构建
npm run build

# 启动服务器
npm run start
```

**4. 文件权限**

确保Node.js进程对以下目录有读写权限：
- `.uploads/`
- `public/generated/`

**5. 定期清理**

FileManager会自动清理过期文件，也可手动调用清理API：

```bash
# 智能清理（7天前文件）
curl http://localhost:3000/api/files/cleanup?maxAgeDays=7

# 强制清理（所有文件）
curl -X DELETE http://localhost:3000/api/files/cleanup
```

## ❓ 常见问题

### Vercel部署相关

**1. 413 Payload Too Large - 图片上传失败**

- **原因**：Vercel Serverless Functions限制请求体为4.5MB
- **解决**：已在 `useLogoStudioForm.ts` 中实现客户端自动压缩（Canvas API）
- **配置**：1920×1920最大尺寸，85%质量，JPEG格式
- **效果**：5-10MB原图 → 1-2MB压缩图，压缩失败时自动使用原图

**2. 401 Unauthorized - Coze API认证失败**

- **原因**：环境变量未在Vercel项目中配置
- **解决**：在Vercel Dashboard → Settings → Environment Variables 添加：
  - `COZE_API_BASE_URL`
  - `COZE_ACCESS_TOKEN`
  - `COZE_BOT_DISH_GENERATOR`
  - `COZE_BOT_PROMPT_OPTIMIZER`
- **注意**：配置后需重新部署才能生效

**3. TypeScript构建错误 - 类型转换失败**

- **场景**：模拟`ChangeEvent<HTMLInputElement>`时单次类型断言失败
- **解决**：使用双重类型断言 `as unknown as React.ChangeEvent<HTMLInputElement>`

### 本地开发相关

**1. 端口3000被占用，服务器无法启动**

- **原因**：之前的进程未正确终止
- **解决**：
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill //F //PID <PID>

  # macOS/Linux
  lsof -i :3000
  kill -9 <PID>
  ```

**2. Job Queue调试 - 前端轮询返回404 "Job not found"**

- **原因**：Turbopack热重载导致作业队列Map被重新初始化
- **解决**：已使用globalThis持久化（v1.15.0修复）
- **验证**：访问 `GET /api/debug/jobs` 查看所有作业

**3. API响应格式错误**

- **症状**：`Cannot read properties of undefined (reading 'status')`
- **原因**：使用了错误的响应路径（`data.data` 而非 `data.job`）
- **解决**：统一使用 `data.job` 访问作业状态
- **成功状态值**：`'succeeded'` 而非 `'completed'`

### AI生成质量优化

**1. AI生成图片包含水印**

- **症状**：生成的头像/店招/海报右下角出现"AI生成"水印
- **原因**：原图参考包含水印，提示词未明确排除
- **解决**：已在提示词中添加水印排除指令（v2.5.0+）
- **位置**：`src/app/api/logo-studio/generate/route.ts` 中的提示词函数

**2. 食物摆放不符合预期**

- **要求**：
  - 份量：7-8分满，避免边缘大面积留白
  - 布局：自然铺满容器内部空间，不仅集中中心
  - 立体感：保持堆叠层次，营造丰盛饱满效果
- **优化**：提示词中已明确食物摆放要求

**3. 色彩增强效果**

提示词已实现量化控制：

```
青椒/青菜 → 饱和度+50%, 亮度+30%
肉类      → 饱和度+40%, 亮度+25%
辣椒/番茄 → 饱和度+60%, 亮度+20%
米饭      → 亮度+40%
```

### 批量处理相关

**1. 批量处理部分图片失败**

- **原因**：网络波动或API临时不可用
- **解决**：已启用3次智能重试，部分失败不影响成功图片（v1.4.0+）
- **网络容错**：处理timeout、socket hang up、ECONNRESET等错误

**2. Coze API流式响应中断**

- **解决**：使用AbortController支持中途取消
- **重试**：流式响应失败会自动重试（统一在客户端封装）
- **调试**：查看浏览器Console日志，检查SSE连接状态

## 📚 相关文档

- **技术文档**
  - [CLAUDE.md](./CLAUDE.md) - Claude Code协作配置和项目指南
  - [COZE_API_IMPLEMENTATION.md](./COZE_API_IMPLEMENTATION.md) - Coze API集成实现详细文档
  - [COZE_INTEGRATION_SPEC.md](./COZE_INTEGRATION_SPEC.md) - Coze API集成技术规格
  - [COZE_API_FLOW.md](./COZE_API_FLOW.md) - Coze API调用流程说明

- **部署文档**
  - [VERCEL_405_FIX.md](./VERCEL_405_FIX.md) - Vercel部署405错误排障
  - [VERCEL_REDEPLOY_STEPS.md](./VERCEL_REDEPLOY_STEPS.md) - Vercel重新部署步骤

- **质量标准**
  - [README-图片处理标准化.md](./README-图片处理标准化.md) - 图片生成标准与质检要点

- **协作规范**
  - [AGENTS.md](./AGENTS.md) - AI协作流程与历史背景

## 📝 新增业务模块指南

如需新增业务模块，请遵循以下约定：

1. **创建模块目录**
   - 在 `src/app/{feature}` 新建目录
   - 保持页面逻辑精简（≤200行）
   - 将可复用部分移入 `components/` 与 `hooks/`

2. **创建API端点**
   - 放在 `src/app/api/{feature}`
   - 每个Route Handler仅处理单一职责
   - 实现双环境适配（本地/Vercel）

3. **更新文档**
   - 在README中补充功能说明
   - 更新环境变量（如有新增）
   - 添加常见问题和排障指南

4. **遵循规范**
   - 文件≤200行，目录≤8文件
   - 中文注释和文档
   - TypeScript严格模式
   - Git提交规范

## 📄 许可证

本项目为商业项目，版权归 **呈尚策划** 所有。

---

<div align="center">

**美工设计系统** © 2025 呈尚策划

基于先进AI技术，为外卖商家提供专业的图片智能设计服务

</div>
