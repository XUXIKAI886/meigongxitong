# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 15 + React 19 的 **AI 驱动外卖商家图片设计系统**，提供 8 大核心功能模块：单品图换背景、Logo设计、门头招牌、图片墙、产品精修、食物替换、背景融合、多图融合。

## 常用开发命令

### 开发环境
```bash
npm run dev          # 启动开发服务器 (使用 Turbopack)
npm run build        # 构建生产版本 (使用 Turbopack)
npm run start        # 启动生产服务器
npm run lint         # ESLint 代码检查
```

### 🔧 端口管理规则 (重要!)
**在任何项目启动开发服务器时，必须遵循以下流程：**

1. **端口检测**：先检查目标端口是否被占用
   ```bash
   netstat -ano | findstr :3000  # Windows检查端口占用
   ```

2. **进程终止**：如果端口被占用，强制终止占用进程
   ```bash
   taskkill //F //PID <进程ID>    # Windows终止进程
   ```

3. **服务器启动**：清理端口后启动新服务器
   ```bash
   npm run dev                    # 启动开发服务器
   ```

**说明**：这个流程防止了端口冲突导致的服务器启动失败，确保开发环境的稳定性。Claude必须在每次启动服务器前执行这个检查流程。

### 环境变量配置
必须配置的环境变量 (.env.local):
```bash
# AI API 配置
IMAGE_API_BASE_URL=your_image_api_url
IMAGE_API_KEY=your_image_api_key
IMAGE_MODEL_NAME=your_image_model
CHAT_API_BASE_URL=your_chat_api_url
CHAT_API_KEY=your_chat_api_key
CHAT_MODEL_NAME=your_chat_model

# 应用配置
NEXT_PUBLIC_APP_NAME=美工设计系统
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
STORAGE_ROOT=./.uploads
```

## 核心架构设计

### 1. API 路由层 (`src/app/api/`)
- **多租户架构**：每个功能模块都有独立的 API 路由
- **作业队列系统**：`/jobs/[id]` - 异步任务处理和进度跟踪
- **文件服务**：`/files/[filename]` - 安全的静态文件服务
- **模板管理**：`/templates/` - 背景和素材模板管理

### 2. 智能作业队列系统 (`src/lib/job-queue.ts`)
- **内存存储**：使用 Map 进行作业状态管理
- **并发控制**：用户级别的并发限制 (最多2个并发任务)
- **状态管理**：queued → running → succeeded/failed
- **自动清理**：定期清理过期作业，避免内存泄漏
- **实时进度**：WebSocket 风格的轮询机制

### 3. 重构后的API客户端架构 (`src/lib/api/`)
**✅ 已完成代码质量优化 - 符合文件规模控制要求**
```
src/lib/api/
├── base/
│   └── BaseApiClient.ts (44行) - 基础客户端类
├── clients/
│   ├── ImageApiClient.ts (73行) - 图像生成客户端
│   ├── ChatApiClient.ts (55行) - 聊天API客户端
│   ├── ProductImageApiClient.ts (131行) - 单品图专用客户端
│   └── ProductRefineApiClient.ts (113行) - 产品精修客户端
└── index.ts (36行) - 统一导出和向后兼容层
```
- **模块化设计**：每个客户端职责单一，便于维护
- **继承体系**：BaseApiClient提供通用功能
- **向后兼容**：保持与现有代码的兼容性
- **统一错误处理**：标准化的重试机制和错误日志

### 4. 重构后的组件设计系统 (`src/components/ui/`)
**✅ 已完成目录结构优化 - 符合8文件限制要求**
```
src/components/ui/
├── base/ (4个文件) - 基础组件
│   ├── button.tsx, input.tsx, label.tsx, badge.tsx
├── form/ (4个文件) - 表单组件
│   ├── select.tsx, textarea.tsx, switch.tsx, form.tsx
├── feedback/ (4个文件) - 反馈组件
│   ├── alert.tsx, progress.tsx, skeleton.tsx, sonner.tsx
├── layout/ (5个文件) - 布局组件
│   ├── card.tsx, dialog.tsx, tabs.tsx, tooltip.tsx, alert-dialog.tsx
└── index.ts - 统一导出层，保持向后兼容
```
- **分类管理**：按功能类型组织，便于查找和维护
- **规模控制**：每个目录不超过8个文件
- **向后兼容**：通过index.ts保持现有导入路径有效

### 5. 重构后的功能模块架构

#### F6 - 食物替换工具 (`food-replacement/`) - ✅ 已完成重构
**原1,175行 → 现252行主页面 + 6个专用组件**
```
src/app/food-replacement/
├── page.tsx (252行) - 主页面逻辑
├── types.ts (36行) - 类型定义
├── components/ (6个组件，总计579行)
│   ├── BatchModeToggle.tsx (52行)
│   ├── SourceImageUpload.tsx (134行)
│   ├── TargetImageUpload.tsx (100行)
│   ├── ProcessingStatus.tsx (92行)
│   ├── ResultDisplay.tsx (97行)
│   └── TemplateSelector.tsx (104行)
└── hooks/ (3个Hook，总计315行)
    ├── useFoodReplacement.ts (128行)
    ├── useImageUpload.ts (141行)
    └── useTemplates.ts (46行)
```
- **职责分离**：每个组件专注单一功能
- **状态管理**：Custom Hooks管理复杂状态逻辑
- **可维护性**：代码模块化，便于测试和修改

#### 其他功能模块
#### F1 - 单品图换背景 (`product-image/`)
- API: `/api/generate/product`
- 智能抠图 + 背景替换
- 输出规格：600×450px

#### F2 - Logo设计工作室 (`brand-studio/`)
- API: `/api/reverse-prompt`, `/api/generate/logo`
- AI提示词反推 + 批量素材生成
- 多尺寸输出：Logo(800×800)、店招(1280×720)、海报(1440×480)

#### F3 - 门头招牌替换 (`signboard/`)
- API: `/api/signboard/replace-text`
- 透视保持 + 自然文字替换
- 超高分辨率：4693×3520px

#### F4 - 图片墙生成 (`picture-wall/`)
- API: `/api/picture-wall`
- 风格分析 + 批量生成
- 输出：3张 240×330px

#### F5 - 产品精修 (`product-refine/`)
- API: `/api/product-refine`, `/api/product-refine/batch`
- AI智能增强 + 批量处理

#### F7 - 背景融合工具 (`background-fusion/`)
- API: `/api/background-fusion`, `/api/background-fusion/batch`
- 智能融合 + 场景适配
- 批量处理，实时进度跟踪

#### F8 - 多图融合工具 (`multi-fusion/`)
- API: `/api/multi-fusion`
- 最多8张图片智能融合
- 精确食物提取，杂物过滤

## 关键技术特性

### 1. 批量处理优化
- **智能重试机制**：3次重试，2秒间隔
- **网络容错**：处理 timeout、socket hang up、ECONNRESET
- **部分成功策略**：部分失败不影响成功的结果
- **实时进度跟踪**：精确的处理状态显示

### 2. AI提示词优化
- **杂物过滤算法**：严格排除背景、桌面、餐具
- **容器识别逻辑**：有碗保留碗+食物，无碗只提取食物
- **提示词精简**：减少32%复杂度，提升成功率

### 3. 文件管理与安全
- **类型验证**：严格的MIME类型检查
- **大小限制**：10MB文件大小限制
- **路径安全**：防止路径遍历攻击
- **自动清理**：定期清理临时文件

## 开发注意事项

### 代码风格
- **中文注释**：所有注释和文档使用中文
- **TypeScript严格模式**：启用strict类型检查
- **组件命名**：PascalCase，文件名使用kebab-case
- **API路由**：RESTful设计，使用标准HTTP状态码

### 性能优化
- **Turbopack构建**：使用Next.js 15的Turbopack加速构建
- **图片优化**：使用Sharp进行服务端图片处理
- **代码分割**：按路由自动分割代码
- **缓存策略**：API响应缓存和静态资源优化

### 错误处理
- **统一错误格式**：标准化的ApiResponse类型
- **详细日志记录**：包含请求ID和处理时长
- **用户友好提示**：隐藏技术细节，提供可操作的错误信息
- **优雅降级**：部分功能失败不影响整体系统

### 测试与调试
- **开发调试**：`/api/debug/jobs` 路由用于作业状态调试
- **API测试**：使用Postman或类似工具测试各个API端点
- **错误监控**：检查浏览器开发者工具的网络和控制台选项卡

## 部署说明

### 生产环境检查清单
1. 配置所有必需的环境变量
2. 确保AI API服务可访问
3. 创建uploads目录并设置适当权限
4. 配置静态文件服务
5. 启用HTTPS（推荐）
6. 设置适当的CORS策略

### 监控指标
- API响应时间和成功率
- 作业队列长度和处理延迟
- 文件存储使用情况
- AI API配额消耗情况