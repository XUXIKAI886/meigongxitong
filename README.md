# 美工设计系统

> **AI 驱动的一站式商家视觉设计平台**  
> 基于 Next.js 15、React 19 与 TypeScript，覆盖 Logo 设计、产品图生成、食材替换、背景融合等多种商家视觉场景。

## 功能模块概览
- **Logo 设计工作室（`src/app/logo-studio`）**
  支持**手动上传**和 **AI 智能生成**两种菜品图获取方式。手动模式可直接上传图片；AI 模式通过 Coze API 实现提示词优化与菜品图生成（支持流式响应）。按类别选择模板后，分两步完成头像生成（第一步使用 Gemini API 融合菜品，第二步使用 Doubao API 替换店名），并可一键生成店招（1280×720）与海报（1440×480）。重构后页面拆分为 `components`、`hooks`、`constants` 子目录，便于维护表单、模板选择、生成逻辑与结果展示。
- **品牌设计工作室（`src/app/brand-studio`）**  
  上传参考 Logo，自动分析风格并输出 Logo、店招与海报三件套，适合品牌升级与延展。
- **产品图片生成（`src/app/product-image`）**  
  支持菜品抠图、底色替换、光影增强与多规格导出，适用于平台营销图快速制作。
- **产品图精修（`src/app/product-refine`）**  
  针对已有菜品图进行噪点处理、细节增强与背景修饰，提升成图质量。
- **食物替换（`src/app/food-replacement`）**  
  通过菜品模板快速换菜，实现场景化陈列；支持单图与批量模式。
- **背景融合（`src/app/background-fusion`）/多图融合（`src/app/multi-fusion`）**  
  将商品主体与平台模板融合，自动生成带氛围背景的成图。
- **图片墙（`src/app/picture-wall`）与招牌海报（`src/app/signboard`）**  
  生成宣传视觉、门店招牌及平台运营所需的素材。
- **API 接口（`src/app/api/**`）**  
  提供模板获取、文件读写、任务状态查询、素材生成等能力，统一通过 Job Queue 管理异步任务。

## 目录结构
- `src/app`：按业务模块划分的 Next.js App Router 路由。每个模块包含 `page.tsx` 入口，以及可选的 `components/`、`hooks/`、`constants/` 等子目录。
- `src/components/ui`：共享 UI 原子组件，基于 shadcn/ui + Tailwind CSS，统一从 `src/components/ui/index.ts` 导出。
- `src/lib`：领域核心库，包括 `image-download.ts`（图片下载与规格转换）、`job-queue.ts`（统一任务队列）、`api-client.ts` 及各类业务客户端。
- `src/types`：跨模块共享的类型定义，`index.ts` 包含 Job 类型、任务状态等核心契约。
- `public/`：静态资源目录，`public/generated` 用于导出的成品图；用户上传的临时文件存放于 `.uploads/`，不会进入版本库。
- `scripts/`：工程化脚本，如 `add-runtime-config.js`（自动补全 Route Handler 的 runtime 配置）、`migrate-storage.js`（本地与部署环境之间同步生成文件）。

## 核心技术与架构
- **App Router + Server Actions**：页面使用 Next.js App Router，业务逻辑通过 Route Handler 暴露，配合边缘/Node 运行时。
- **Tailwind CSS 4 + Lucide React**：统一 UI 语言，`clsx` 与 `tailwind-merge` 用于组合样式。
- **统一 Job Queue**：`src/lib/job-queue.ts` 定义内存队列，支持并发控制、进度上报与任务清理；通过 `/api/jobs/[id]` 轮询获取异步任务状态。
- **模块化拆分**：页面文件保持 <200 行，复杂交互拆分到 `components` 与自定义 `hooks`；`logo-studio` 中的 `useLogoStudioForm`、`useLogoStudioTemplates`、`useLogoStudioGeneration` 分别负责表单状态、模板加载与素材生成。
- **图片下载工具链**：`image-download.ts` 封装远程拉取、批量下载与尺寸适配，支持美团 / 饿了么规格导出。

## 本地开发与构建
1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run dev`（Turbopack，端口 3000）
3. 代码静态检查：`npm run lint`
4. 生产构建与本地预览：`npm run build && npm run start`
5. 更新 Route Handler runtime 配置：`node scripts/add-runtime-config.js`
6. 同步生成素材目录（部署前必跑）：`node migrate-storage.js`

> 建议在修改关键生成流程后，本地运行对应模块并实际产出测试素材，确保视觉与尺寸符合预期。

## 环境变量说明
在 `.env.local` 中维护以下配置，并避免提交真实密钥：

- `IMAGE_API_BASE_URL` / `IMAGE_MODEL_NAME` / `IMAGE_API_KEY`（Doubao API，用于 Logo/门头/图片墙）
- `CHAT_API_BASE_URL` / `CHAT_MODEL_NAME` / `CHAT_API_KEY`（聊天/分析专用）
- `PRODUCT_IMAGE_API_BASE_URL` / `PRODUCT_IMAGE_MODEL_NAME` / `PRODUCT_IMAGE_API_KEY`（单品图专用）
- `PRODUCT_REFINE_API_BASE_URL` / `PRODUCT_REFINE_MODEL_NAME` / `PRODUCT_REFINE_API_KEY`（产品精修专用）
- `GEMINI_API_BASE_URL` / `GEMINI_MODEL_NAME` / `GEMINI_API_KEY`（统一的 Gemini API 配置）
- **`COZE_API_BASE_URL`** / **`COZE_ACCESS_TOKEN`** / **`COZE_BOT_DISH_GENERATOR`** / **`COZE_BOT_PROMPT_OPTIMIZER`**（Coze API，用于 Logo 工作室 AI 菜品图生成）
- `STORAGE_ROOT`（默认 `.uploads`，用于临时文件）
- `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_DESCRIPTION`

生产环境需根据部署平台补齐同名变量，并执行 `node scripts/add-runtime-config.js` 以确保 API Route 拥有正确 runtime 设置。

## 存储与文件管理
- 用户上传的原图保存在 `.uploads/`，通过 `/api/files/*` 读取或清理。
- AI 生成的素材默认写入 `public/generated/`，前端可以直接通过静态路径访问。
- `FileManager.saveBuffer` 负责写入文件；`FileManager.cleanup()` 会清理 7 天前的过期素材，可通过 `/api/files/cleanup` 手动触发。

## 统一 Job Queue
- 在业务 API 中调用 `JobQueue.createJob` 创建任务，并注册对应的 `jobRunner.registerProcessor`。
- 前端通过 `startJobPolling`（`src/app/logo-studio/hooks/pollers.ts`）统一轮询任务，展示实时进度。
- Job 默认在完成 15 分钟后自动清理，可通过 `JobQueue.removeJob`/`cleanup` 手动维护。
- 并发限制：`JobQueue.canUserCreateJob` 支持按用户维度限制同时运行的任务数量（默认 2）。

## 代码规范
- 页面文件保持 <200 行，复杂业务拆分为组件与 Hook；重构后的 `logo-studio/page.tsx` 即通过组合式调用维护页面结构。
- 共享 UI 放在 `src/components/ui/`，避免重复实现。跨模块逻辑提炼到 `src/lib/` 或 `src/hooks/`。
- 代码注释、日志、文档全部使用中文；变量与函数命名遵循语言规范。
- 避免引入冗余依赖，提交前运行 `npm run lint`，确保没有 TypeScript 与 ESLint 报错。

## 常用脚本与工具
- `scripts/add-runtime-config.js`：批量为 `/api` Route Handler 补齐 `runtime` 与 `maxDuration`。
- `node migrate-storage.js`：迁移或同步生成文件，适用于本地与部署环境之间的数据对齐。
- `public/generated` 内的素材可通过脚本或手动方式清理，保持仓库体积可控。

## 相关文档
- `README-图像生成基准.md`：图片生成标准与质检要点。
- `VERCEL_405_FIX.md`、`VERCEL_REDEPLOY_STEPS.md`：Vercel 部署排障指南。
- `CLAUDE.md`、`AGENTS.md`：AI 协作流程与历史背景说明。
- `COZE_API_IMPLEMENTATION.md`：Coze API 集成实现详细文档，包含架构设计、SSE 流式实现、错误处理和故障排查。
- `COZE_INTEGRATION_SPEC.md`：Coze API 集成技术规格说明。

---

如需新增业务模块，请遵循以下约定：
1. 在 `src/app/{feature}` 新建目录，保持页面逻辑精简，并将可复用部分移入 `components/` 与 `hooks/`。
2. 新增 API 时放在 `src/app/api/{feature}`，每个 Route Handler 仅处理单一职责。
3. 在 README 中补充功能说明与运行依赖，方便团队成员快速理解架构与使用方式。
