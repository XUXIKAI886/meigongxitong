# Vercel 自动部署配置指南

## 获取Vercel部署所需的令牌和ID

### 1. 安装Vercel CLI（可选）

```bash
npm install -g vercel
```

### 2. 登录Vercel

```bash
vercel login
```

### 3. 链接项目

在项目根目录运行：
```bash
vercel link
```

这将创建 `.vercel` 目录，包含项目配置信息。

### 4. 获取必需的信息

#### 4.1 获取 VERCEL_TOKEN

1. 访问 https://vercel.com/account/tokens
2. 点击 "Create Token"
3. 输入Token名称，如 `github-actions-deploy`
4. 选择Scope: `Full Account`
5. 点击 "Create"
6. **复制生成的Token** (只显示一次！)

#### 4.2 获取 VERCEL_ORG_ID

方式1 - 通过 `.vercel/project.json` 文件：
```bash
cat .vercel/project.json
```
找到 `"orgId"` 字段

方式2 - 通过Vercel CLI：
```bash
vercel whoami
```

方式3 - 通过Vercel Dashboard：
1. 访问 https://vercel.com/dashboard
2. 点击右上角头像 → "Settings"
3. 在URL中查看组织ID: `vercel.com/[org-id]/settings`

#### 4.3 获取 VERCEL_PROJECT_ID

方式1 - 通过 `.vercel/project.json` 文件：
```bash
cat .vercel/project.json
```
找到 `"projectId"` 字段

方式2 - 通过Vercel Dashboard：
1. 访问项目页面
2. 点击 "Settings"
3. 在 "General" 标签下找到 "Project ID"

### 5. 在GitHub添加Secrets

1. 访问GitHub仓库: https://github.com/XUXIKAI886/meigongxitong
2. 点击 "Settings" → "Secrets and variables" → "Actions"
3. 点击 "New repository secret"
4. 添加以下三个Secrets：

   **VERCEL_TOKEN**
   - Name: `VERCEL_TOKEN`
   - Value: 从步骤4.1获取的Token

   **VERCEL_ORG_ID**
   - Name: `VERCEL_ORG_ID`
   - Value: 从步骤4.2获取的组织ID

   **VERCEL_PROJECT_ID**
   - Name: `VERCEL_PROJECT_ID`
   - Value: 从步骤4.3获取的项目ID

### 6. 添加环境变量到Vercel

在Vercel Dashboard中：
1. 进入项目 → Settings → Environment Variables
2. 添加所有必需的环境变量：

```
IMAGE_API_BASE_URL=你的图片API地址
IMAGE_API_KEY=你的图片API密钥
IMAGE_MODEL_NAME=你的图片模型名称
CHAT_API_BASE_URL=你的聊天API地址
CHAT_API_KEY=你的聊天API密钥
CHAT_MODEL_NAME=你的聊天模型名称
PRODUCT_IMAGE_API_KEY=你的产品图片API密钥
PRODUCT_REFINE_API_KEY=你的产品精修API密钥
NEXT_PUBLIC_APP_NAME=美工设计系统
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
STORAGE_ROOT=./.uploads
```

### 7. 测试部署

推送代码到GitHub master分支：
```bash
git push origin master
```

GitHub Actions将自动：
1. 构建项目
2. 运行测试
3. 部署到Vercel
4. 在PR中评论部署URL

## 常见问题

### Q: Token在哪里找？
A: https://vercel.com/account/tokens

### Q: 如何查看组织ID？
A: 运行 `vercel whoami` 或查看 `.vercel/project.json`

### Q: 部署失败怎么办？
A: 检查GitHub Actions日志，确保所有Secrets正确配置

### Q: 如何回滚部署？
A: 在Vercel Dashboard → Deployments → 选择历史版本 → Promote to Production

## 自动部署工作流程

```mermaid
graph LR
    A[推送代码到GitHub] --> B[GitHub Actions触发]
    B --> C[npm ci 安装依赖]
    C --> D[npm run build 构建]
    D --> E[部署到Vercel]
    E --> F[获得部署URL]
```

## 部署架构

- **生产环境**: master分支自动部署到 https://your-project.vercel.app
- **预览环境**: Pull Request自动创建预览部署
- **开发环境**: 本地运行 `npm run dev`

## 注意事项

1. ✅ Vercel Token只显示一次，务必保存
2. ✅ 环境变量需要在Vercel Dashboard中配置
3. ✅ GitHub Secrets区分大小写
4. ✅ 首次部署可能需要3-5分钟
5. ✅ 后续部署约1-2分钟

## 相关资源

- Vercel文档: https://vercel.com/docs
- Next.js部署: https://nextjs.org/docs/deployment
- GitHub Actions: https://docs.github.com/actions
