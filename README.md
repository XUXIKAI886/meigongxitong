# 🎨 美工设计系统

> **AI驱动的外卖商家图片智能设计生成系统**

一个基于 Next.js 15 和 AI 技术的专业设计工具，为外卖商家提供一站式视觉营销解决方案。通过先进的人工智能算法，实现从单品图优化、品牌设计、食物替换到背景融合的全流程自动化处理，涵盖7大核心功能模块。

## ✨ 核心功能

### 🖼️ F1 - 单品图抠图换背景
- **智能抠图**：AI自动识别商品轮廓，精准分离前景与背景
- **背景替换**：提供多种专业背景模板，提升商品视觉效果
- **清晰增强**：自动优化图片清晰度和色彩饱和度
- **输出规格**：600×450px 高清输出

### 🎨 F2 - Logo设计工作室
- **Logo分析**：上传参考Logo，AI智能分析设计元素
- **提示词反推**：自动生成精准的设计提示词
- **品牌设计**：生成Logo、店招、海报等全套品牌素材
- **多尺寸输出**：
  - Logo：800×800px
  - 店招：1280×720px
  - 海报：1440×480px

### 🏪 F3 - 门头招牌文字替换
- **文字识别**：智能识别门头招牌中的文字内容
- **透视保持**：保持原图透视效果和空间关系
- **光影匹配**：自动匹配原图光照和阴影效果
- **自然融合**：实现拟真P图效果，无缝文字替换
- **输出规格**：4693×3520px 超高分辨率

### 🖼️ F4 - 图片墙生成
- **风格分析**：上传店铺头像，AI分析设计风格
- **统一设计**：生成风格一致的图片墙素材
- **批量生成**：一次生成3张配套图片
- **品牌一致性**：确保视觉风格统一协调
- **输出规格**：3张 240×330px

### ✨ F5 - 产品精修
- **智能增强**：AI自动优化产品图片质量
- **细节提升**：增强图片清晰度、色彩饱和度和对比度
- **专业效果**：提升商品视觉吸引力和专业度
- **批量处理**：支持多张图片同时精修
- **高质量输出**：保持原始分辨率的高清输出

### 🍽️ F6 - 食物替换工具
- **智能识别**：AI自动识别容器中的食物
- **精准替换**：将新食物完美融入原有容器
- **自然效果**：保持光影、透视和比例的真实感
- **批量模式**：支持多张源图片批量处理
- **模板丰富**：提供多种食物替换模板选择

### 🎨 F7 - 背景融合工具
- **智能融合**：将源图片中的美食完美融合到目标背景
- **场景适配**：AI自动调整光线、阴影和色调匹配
- **批量处理**：支持多张源图片与单个背景融合
- **模板背景**：提供专业的美食展示背景模板
- **自然效果**：创造令人垂涎的视觉营销效果

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- npm、yarn、pnpm 或 bun 包管理器

### 安装依赖
```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 环境配置
创建 `.env.local` 文件并配置以下环境变量：

```env
# AI API 配置
IMAGE_API_BASE_URL=your_api_base_url
IMAGE_API_KEY=your_api_key
IMAGE_MODEL_NAME=your_model_name

# 应用配置
NEXT_PUBLIC_APP_NAME=美工设计系统
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
```

### 启动开发服务器
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本
```bash
npm run build
npm run start
```

## 🛠️ 技术栈

### 前端框架
- **Next.js 15**：React 全栈框架，支持 Turbopack
- **React 19**：最新版本的 React 框架
- **TypeScript**：类型安全的 JavaScript 超集

### UI 组件库
- **Radix UI**：无样式、可访问的 UI 组件
- **Tailwind CSS 4**：实用优先的 CSS 框架
- **Lucide React**：美观的 SVG 图标库
- **Shadcn/ui**：基于 Radix UI 的组件系统

### 状态管理与表单
- **TanStack Query**：强大的数据获取和缓存库
- **React Hook Form**：高性能表单库
- **Zod**：TypeScript 优先的模式验证

### 文件处理
- **React Dropzone**：拖拽上传组件
- **Multer**：文件上传中间件
- **Sharp**：高性能图像处理库

### 开发工具
- **ESLint**：代码质量检查
- **Turbopack**：极速构建工具

## 📁 项目结构

```
design-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由层
│   │   │   ├── files/         # 文件服务
│   │   │   ├── jobs/          # 作业队列管理
│   │   │   ├── product-image/ # 单品图 API
│   │   │   ├── brand-studio/  # Logo设计 API
│   │   │   ├── signboard/     # 门头招牌 API
│   │   │   ├── picture-wall/  # 图片墙 API
│   │   │   ├── product-refine/# 产品精修 API
│   │   │   ├── food-replacement/ # 食物替换 API
│   │   │   ├── background-fusion/ # 背景融合 API
│   │   │   └── templates/     # 模板管理 API
│   │   ├── product-image/     # F1 - 单品图功能页面
│   │   ├── brand-studio/      # F2 - Logo设计工作室
│   │   ├── signboard/         # F3 - 门头招牌替换
│   │   ├── picture-wall/      # F4 - 图片墙生成
│   │   ├── product-refine/    # F5 - 产品精修
│   │   ├── food-replacement/  # F6 - 食物替换工具
│   │   ├── background-fusion/ # F7 - 背景融合工具
│   │   ├── page.tsx          # 首页
│   │   └── layout.tsx        # 根布局
│   ├── components/           # React 组件
│   │   └── ui/              # Shadcn/ui 组件库
│   ├── lib/                 # 核心工具库
│   │   ├── api-client.ts    # 多API客户端管理
│   │   ├── job-queue.ts     # 智能作业队列系统
│   │   ├── upload.ts        # 文件上传管理
│   │   ├── config.ts        # 应用配置
│   │   └── utils.ts         # 通用工具函数
│   └── types/               # TypeScript 类型定义
├── public/                  # 静态资源
│   ├── generated/          # AI生成的图片存储
│   ├── 目标图片模板/        # 背景模板资源
│   └── shiwutihuangongju/  # 食物替换模板
├── package.json            # 项目依赖配置
└── README.md              # 项目文档
```

## 🔧 核心特性

### 🎯 智能作业队列系统
- 异步任务处理，支持高并发
- 实时进度跟踪和状态更新
- 自动错误重试和恢复机制
- 作业历史记录和清理

### 📤 文件管理系统
- 安全的文件上传和存储
- 多格式图片支持（JPEG、PNG、WebP）
- 文件大小和类型验证
- 自动文件清理和垃圾回收

### 🔒 安全特性
- 文件类型严格验证
- 路径遍历攻击防护
- API 请求频率限制
- 错误信息安全处理

### ⚡ 性能优化
- Turbopack 极速构建
- 图片懒加载和优化
- API 响应缓存
- 组件代码分割

## 🆕 最新更新

### v1.2.0 - 2025年1月
- ✅ **修复背景融合工具显示问题**：解决批量模式下图片显示为黑色的CSS样式问题
- ✅ **优化作业队列系统**：改进轮询逻辑和状态管理
- ✅ **完善错误处理**：增强API响应解析和错误提示
- ✅ **提升用户体验**：统一各功能模块的交互逻辑

### 已知问题修复
- 🔧 背景融合工具前端UI显示问题
- 🔧 批量处理结果计数准确性
- 🔧 localStorage数据持久化
- 🔧 CSS样式冲突和遮罩层问题

## 🌟 使用指南

### 1. 单品图抠图换背景
1. 上传商品图片（支持 JPG、PNG 格式）
2. 选择背景模板或上传自定义背景
3. 点击"开始处理"等待 AI 自动抠图
4. 预览效果并下载高清结果图

### 2. Logo设计工作室
1. 上传参考 Logo 图片
2. AI 自动分析设计元素和风格
3. 生成设计提示词
4. 批量生成 Logo、店招、海报素材

### 3. 门头招牌文字替换
1. 上传门头招牌照片
2. 输入原有文字内容
3. 输入要替换的新文字
4. AI 智能替换，保持原有风格和透视

### 4. 图片墙生成
1. 上传店铺头像或参考图
2. AI 分析图片风格特征
3. 自动生成3张风格统一的图片墙
4. 批量下载所有生成结果

### 5. 产品精修
1. 上传需要精修的产品图片
2. 选择精修强度和效果类型
3. AI 自动增强图片质量和视觉效果
4. 预览对比效果并下载高清结果

### 6. 食物替换工具
1. 上传包含容器的源图片（单张或批量）
2. 选择要替换的食物模板
3. AI 智能识别容器并替换食物
4. 保持原有光影和透视效果，下载结果

### 7. 背景融合工具
1. 上传包含美食的源图片（单张或批量）
2. 选择目标背景（上传或选择模板）
3. AI 将美食完美融合到背景中
4. 自动调整光线和色调，创造自然效果

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目！

### 开发流程
1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Radix UI 文档](https://www.radix-ui.com)

---

<div align="center">
  <p>🎨 <strong>美工设计系统</strong> - 让 AI 为您的外卖生意增光添彩</p>
  <p>Made with ❤️ by AI Design Team</p>
</div>
