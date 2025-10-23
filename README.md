# 美工设计系统

> **AI 驱动的一站式商家视觉生产平台**  
> 基于 Next.js 15、React 19 与 TypeScript 构建，覆盖 Logo 设计、产品精修、食物替换、背景融合、品牌分析等多种业务场景。

## 项目简介
- 使用 Next.js App Router 构建的多页面应用，配合 Tailwind CSS 4 与 Lucide React 实现响应式 UI。
- 后端通过 Edge Functions 风格的 `app/api/*` 路由暴露服务，统一由作业队列(Job Queue)调度调用第三方 AI 服务。
- 采用 in-memory 作业存储（`src/lib/job-queue.ts`），并通过 `/api/jobs/[id]` 轮询获取状态；生产部署建议接入 Redis。
- 静态模板与生成结果分别存放于 `public/*` 与 `public/generated`，临时上传内容位于 `.uploads`。

## 功能总览
- **Logo Studio（src/app/logo-studio）**：上传或选用模板，一次性生成头像、门头、横幅三套物料；反向提示词(reverse prompt)自动补全设计语言。
- **Brand Studio（src/app/brand-studio）**：上传品牌实拍图后自动解析设计要素，并批量生成 Logo/门头/海报组合。
- **产品图生成（src/app/product-image）**：支持背景替换、光效强化、尺寸裁切等多种增强策略。
- **产品图精修（src/app/product-refine）**：对已有产品图进行多轮修饰，可批量处理。
- **食物替换（src/app/food-replacement）**：将菜品替换进目标模板，支持单图和批量模式（美团/饿了么模板可选）。
- **背景融合（src/app/background-fusion）**：将源图主体融合进平台模板或自定义背景，含批量模式。
- **多图融合（src/app/multi-fusion）**：多张菜品合成同一底图，用于外卖底部氛围图。
- **图片墙（src/app/picture-wall）** 与 **商铺招牌（src/app/signboard）**：生成标准化宣传素材。

## 系统架构
### 前端层
- 所有路由位于 `src/app/*`，每个功能模块自带 `page.tsx` 与必要的 `components/`、`hooks/` 子目录，避免跨模块状态污染。
- 共享 UI 组件在 `src/components/ui`，通过 `index.ts` 聚合导出；采用 Radix UI + Tailwind CSS 组合。
- `src/lib/image-download.ts` 提供浏览器与 Tauri 双模下载能力。

### API 层
- Next.js Route Handler 放在 `src/app/api/**/route.ts`，统一引入 `runtime = 'nodejs'` 与 `maxDuration = 300`，确保 Vercel Node Runtime。
- 模板读取路由（如 `/api/templates`、`/api/background-fusion/templates`、`/api/eleme-background-templates`）使用 `resolveTemplateFromUrl` 做路径校验，杜绝路径穿越。
- `/api/files/*` 负责文件读取与清理：上传至 `.uploads`，生成内容可选择转存 `public/generated` 以便直接访问。

### 作业队列 (Job Queue)
- `src/lib/job-queue.ts` 维护内存 Map，并暴露 `JobQueue` 与 `jobRunner`。  
  - `JobQueue.createJob` 创建作业并控制单用户并发 (`config.jobs.maxConcurrentPerUser = 2`)。  
  - `jobRunner.registerProcessor` 在各 API 路由内注册处理器。  
  - `jobRunner.runJob` 异步执行 `process()`，更新进度，失败重试由各处理器自行实现。  
  - 通过 `setInterval` 每两分钟清理 15 分钟前完成的作业。
- `src/types/index.ts` 定义 `JobType` 列举全部业务（logo、product、food-replacement、background-fusion、multi-fusion 等）。

### 共享库
- `src/lib/api-client.ts` 抽象底层 HTTP 调用（图片、聊天、产品精修等），统一加上重试、限流与错误日志。
- `src/lib/api/clients/*` 为业务专用客户端，如 `ProductImageApiClient`、`ProductRefineApiClient`、`ImageApiClient`。
- `src/lib/prompt-templates.ts` 保管标准化提示词模板（含 reverse prompt、融合模板指引）。
- `src/lib/upload.ts` 封装 Multer 上传、Buffer 保存以及 Vercel 只读环境兼容逻辑。
- `src/lib/template-path.ts` 负责模板路径安全解析。

### 静态资源与模板
- 饿了么、美团等模板拆分在 `public/饿了么背景融合`（终端显示为 `public/����ô�����ں�`）与根目录 `shiwutihuangongju` 等子目录。
- Logo 模板位于专门文件夹（终端显示为 `logoģ��`），通过 `/api/logo-templates` 读取。
- 生成物料统一保存到 `public/generated`（供 CDN），临时文件留在 `.uploads`（供 `/api/files/{filename}`` 读取）。

## 目录结构（核心部分）
```text
.
├─public/
│  ├─generated/                # 生成物料输出目录
│  ├─饿了么背景融合/            # 饿了么背景模板（终端可能乱码）
│  └─饿了么底图模板/            # 饿了么多图融合模板
├─shiwutihuangongju/          # 美团背景模板原图
├─logo模板/                   # Logo Studio 预置模板（控制台显示为 logoģ��）
├─src/
│  ├─app/
│  │  ├─page.tsx              # 首页与工具导航
│  │  ├─logo-studio/
│  │  ├─brand-studio/
│  │  ├─product-image/
│  │  ├─product-refine/
│  │  ├─food-replacement/
│  │  ├─background-fusion/
│  │  ├─multi-fusion/
│  │  ├─picture-wall/
│  │  ├─signboard/
│  │  └─api/                  # 所有后端接口
│  ├─components/ui/           # UI 基础组件
│  ├─lib/                     # 客户端、上传、模板、工具函数
│  └─types/                   # 类型定义与作业载荷
├─scripts/
│  └─add-runtime-config.js    # 批量注入 Node Runtime 配置脚本
├─migrate-storage.js          # 本地/部署前同步生成物料的辅助脚本
└─.uploads/                   # Multer 上传暂存目录（运行时生成）
```

## 核心业务流程
### 通用作业执行流程
1. 前端表单或上传组件向 `/api/*` 提交请求（通常为 `FormData`，附带源图、模板、配置）。
2. 路由校验参数并创建 `JobQueue` 任务，立刻返回 `{ jobId }`。
3. 前端使用 `/api/jobs/{id}` 轮询状态，结合 `ProcessingStatus`、`Progress` 组件呈现。
4. `jobRunner` 触发对应处理器，调用第三方 AI 接口，使用 `FileManager.saveBuffer` 保存结果。
5. 任务成功后返回可访问的 `imageUrl`（`/generated/*.png` 或 Base64 Data URL），页面展示并支持下载。

### 代表流程
- **Logo Studio**  
  1. 上传原始 Logo 或选择模板（`/api/logo-templates`）。  
  2. `/api/logo-studio/generate`：先调用 `ChatApiClient` 生成 reverse prompt，再并行生成头像/门头/海报。  
  3. 结果写入 `public/generated`，返回多规格图片与提示词。
- **食物替换**  
  - 单图 POST `/api/food-replacement`，批量 POST `/api/food-replacement/batch`。  
  - 支持指定模板 URL，服务端自动从 `shiwutihuangongju` 或 `public/饿了么背景融合` 读取原图。
- **背景融合 / 多图融合**  
  - 统一调用 `ProductRefineApiClient.replaceFoodInBowl`；批量接口会逐个处理并回传成功/失败列表。
- **产品图生成 / 精修**  
  - 基于 `ProductImageApiClient` 与 `ProductRefineApiClient`，分别输出新背景或修饰结果，支持批量任务与本地打包下载。

## API 速查表

| 路径 | 方法 | 职责 | JobType | 说明 |
| --- | --- | --- | --- | --- |
| `/api/logo-studio/generate` | POST | Logo Studio 全流程（反向提示词 + 三套物料） | `logo-studio` / `logo-studio-fusion` | 返回头像、门头、海报以及提示词 |
| `/api/generate/logo` | POST | 生成单个 Logo | `generate-logo` | 供 Brand Studio 等场景复用 |
| `/api/generate/storefront` | POST | 生成门头图 | `generate-storefront` | |
| `/api/generate/poster` | POST | 生成宣传海报 | `generate-poster` | |
| `/api/reverse-prompt` | POST | 解析上传图片得到提示词 | `reverse-prompt` | |
| `/api/product-image`* | POST | （已整合至 `/api/generate/product`）生成产品图 | `generate-product` | 输入背景配置、增强参数 |
| `/api/product-refine` | POST | 单图精修 | `product-refine` | |
| `/api/product-refine/batch` | POST | 批量精修 | `batch-product-refine` | 返回输出目录与明细 |
| `/api/food-replacement` | POST | 单图食物替换 | `food-replacement` | 支持模板 URL 或自定义目标图 |
| `/api/food-replacement/batch` | POST | 批量食物替换 | `batch-food-replacement` | |
| `/api/background-fusion` | POST | 单图背景融合 | `background-fusion` | |
| `/api/background-fusion/batch` | POST | 批量背景融合 | `batch-background-fusion` | |
| `/api/multi-fusion` | POST | 多图融合 | `multi-fusion` | |
| `/api/picture-wall` | POST | 生成图片墙 | `picture-wall` | |
| `/api/signboard/replace-text` | POST | 门头文字替换 | `signboard-replace` | |
| `/api/jobs/{id}` | GET | 查询作业状态 | - | 前端轮询接口 |
| `/api/files/{filename}` | GET | 读取临时上传文件 | - | `.uploads` 中的原始文件 |
| `/api/files/cleanup` | DELETE | 清理 7 天前生成物料 | - | 首页“释放空间”按钮 |
| `/api/*-templates` | GET | 列出各类模板 | - | 映射到 `logo模板`、`shiwutihuangongju` 等目录 |

## 环境变量
在 `.env.local` 中维护，生产部署请改用安全注入方式并勿提交明文值。

- `IMAGE_API_BASE_URL` / `IMAGE_MODEL_NAME` / `IMAGE_API_KEY`
- `CHAT_API_BASE_URL` / `CHAT_MODEL_NAME` / `CHAT_API_KEY`
- `PRODUCT_IMAGE_API_BASE_URL` / `PRODUCT_IMAGE_MODEL_NAME` / `PRODUCT_IMAGE_API_KEY`
- `PRODUCT_REFINE_API_BASE_URL` / `PRODUCT_REFINE_MODEL_NAME` / `PRODUCT_REFINE_API_KEY`
- `GEMINI_API_BASE_URL` / `GEMINI_MODEL_NAME` / `GEMINI_API_KEY`（旧兼容字段，部分模块仍读取）
- `STORAGE_ROOT`（默认 `.uploads`）
- `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_DESCRIPTION`

> ⚠️ **安全提示**：仓库当前 `.env.local` 存在真实密钥，请确保不要将其提交到公共仓库或对外分发。

## 开发与运行
1. 安装依赖：`npm install`
2. 开发模式：`npm run dev`（默认使用 Turbopack，端口 3000）
3. Lint 检查：`npm run lint`
4. 生产构建：`npm run build && npm run start`
5. 环境变量变更后运行 `node scripts/add-runtime-config.js` 以确保所有 API 路由携带 `runtime` 配置。
6. 部署前执行 `node migrate-storage.js` 将 `public/generated` 与 `.uploads` 同步到目标环境。

## 存储与清理策略
- `FileManager.saveBuffer` 根据运行环境决定写入 `.uploads` 或 `public/generated`，Vercel 环境会返回 Base64 Data URL。
- `FileManager.cleanup()` 会删除 7 天前的遗留文件；首页“释放空间”按钮调用 `/api/files/cleanup` 实时清空。
- 批量生成任务（如 `/api/product-refine/batch`）会创建子目录并返回明细列表，需要手动下载或备份。

## 质量现状与优化建议
⚠️ 当前多处前端页面文件超出 200 行上限（例如 `src/app/logo-studio/page.tsx` ≈ 1700 行，`src/app/product-refine/page.tsx` ≈ 1000 行）。  
建议：
1. **方案一（推荐）**：拆分为 `components/` 子目录中的步骤组件与容器组件，保留 `page.tsx` 作为布局与状态协调层。预计 4~6 小时，涉及 6~8 个文件。
2. **方案二**：先按 Tab/Step 维度抽取主要逻辑组件，逐步迁移到自定义 hook，短期内将单文件控制在 400 行以内。预计 2 小时，影响范围 3~4 个文件。

请确认需要执行的方案后再安排重构，以降低未来维护成本。

## 参考脚本与工具
- `scripts/add-runtime-config.js`：批量为 API 路由注入 `runtime`、`maxDuration`。
- `migrate-storage.js`：在部署或迁移环境时同步生成文件目录。
- `public/generated` 下的文件可通过自定义脚本或 `FileManager.getGeneratedFileBuffer` 打包下载。

## 相关文档
- `README-图片质量标准.md`：内部图片质量标准（编码显示为 `README-ͼƬ������׼��.md`）。
- `VERCEL_405_FIX.md`、`VERCEL_REDEPLOY_STEPS.md`：Vercel 部署故障排查。
- `CLAUDE.md`、`AGENTS.md`：早期 AI 协作说明，可用于了解历史演进。

---

如需新增模块，请遵循：
1. 新建 `src/app/{feature}` 目录并保证页面逻辑 < 200 行，其余逻辑下沉 `components/` 或 `hooks/`。
2. 配套 API 路由在 `src/app/api/{feature}` 保持单一职责。
3. 在本文档的 **功能总览** 与 **API 速查表** 中补充对应条目，确保团队成员快速了解整体架构。

