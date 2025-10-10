# 🚀 GitHub Actions 自动部署配置指南

本项目已配置GitHub Actions自动部署，每次推送到`master`分支时会自动触发构建和部署流程。

## 📋 部署流程

1. **代码推送** → 触发GitHub Actions
2. **安装依赖** → npm ci
3. **代码检查** → ESLint
4. **项目构建** → npm run build
5. **自动部署** → Vercel/Netlify

## 🔑 必需的GitHub Secrets配置

在GitHub仓库设置中添加以下Secrets：

### 1. 访问仓库设置
```
GitHub仓库 → Settings → Secrets and variables → Actions → New repository secret
```

### 2. 添加以下Secrets

#### AI API 配置（必需）
```
IMAGE_API_BASE_URL=your_image_api_base_url
IMAGE_API_KEY=your_image_api_key
IMAGE_MODEL_NAME=your_image_model_name
CHAT_API_BASE_URL=your_chat_api_base_url
CHAT_API_KEY=your_chat_api_key
CHAT_MODEL_NAME=your_chat_model_name
```

#### 应用配置（必需）
```
NEXT_PUBLIC_APP_NAME=美工设计系统
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
```

#### Vercel部署配置（推荐）
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

### 3. 如何获取Vercel配置

#### 获取VERCEL_TOKEN
1. 访问 https://vercel.com/account/tokens
2. 点击 "Create Token"
3. 输入token名称（如：github-actions）
4. 复制生成的token

#### 获取VERCEL_ORG_ID和VERCEL_PROJECT_ID
1. 在本地项目中运行：
   ```bash
   npm install -g vercel
   vercel login
   vercel link
   ```
2. 查看 `.vercel/project.json` 文件：
   ```json
   {
     "orgId": "your_org_id",
     "projectId": "your_project_id"
   }
   ```

## 🌐 部署平台选择

### 选项1: Vercel（推荐）
- ✅ 最适合Next.js项目
- ✅ 自动优化和CDN
- ✅ 免费额度充足
- ✅ 支持环境变量管理
- ✅ 自动HTTPS

**配置步骤**：
1. 访问 https://vercel.com
2. 使用GitHub账号登录
3. Import项目
4. 添加环境变量
5. 获取token和ID（见上方）

### 选项2: Netlify
如需使用Netlify，取消注释`.github/workflows/deploy.yml`中的Netlify部分，并添加：
```
NETLIFY_AUTH_TOKEN=your_netlify_auth_token
NETLIFY_SITE_ID=your_netlify_site_id
```

### 选项3: 自托管服务器
可以配置SSH部署到自己的服务器。

## 📊 部署状态查看

### GitHub Actions页面
```
GitHub仓库 → Actions → 查看最新workflow运行状态
```

### 部署日志
- ✅ 绿色勾号：部署成功
- ❌ 红色叉号：部署失败
- 🟡 黄色圆圈：部署进行中

## 🔧 自定义配置

### 修改触发条件
编辑 `.github/workflows/deploy.yml` 的 `on` 部分：
```yaml
on:
  push:
    branches:
      - master      # 推送到master分支触发
      - develop     # 推送到develop分支触发
  pull_request:
    branches:
      - master      # PR到master分支触发
```

### 修改Node.js版本
编辑 `env.NODE_VERSION`:
```yaml
env:
  NODE_VERSION: '18.x'  # 可改为 '20.x' 等
```

### 添加测试步骤
在 `build-and-test` job中添加：
```yaml
- name: Run tests
  run: npm test
```

## 🚨 常见问题

### 1. 构建失败
**原因**：环境变量未配置
**解决**：检查GitHub Secrets是否正确添加

### 2. Vercel部署失败
**原因**：Token或ID配置错误
**解决**：重新生成token和ID

### 3. 文件大小超限
**原因**：上传的图片或模板文件过大
**解决**：检查 `.gitignore` 是否正确配置

## 📝 最佳实践

1. **环境变量安全**
   - 永远不要在代码中硬编码API密钥
   - 使用GitHub Secrets管理敏感信息

2. **部署前测试**
   - 本地运行 `npm run build` 确保构建成功
   - 本地运行 `npm run lint` 确保代码规范

3. **分支策略**
   - `master` 分支：生产环境
   - `develop` 分支：开发环境（可选）
   - `feature/*` 分支：功能开发

4. **回滚机制**
   - Vercel支持一键回滚到上一个版本
   - 保持提交记录清晰，便于追溯

## 🎯 下一步

1. ✅ 创建Vercel账号
2. ✅ 配置GitHub Secrets
3. ✅ 推送代码到master分支
4. ✅ 检查Actions运行状态
5. ✅ 访问部署的网站

## 📞 支持

如遇问题，请查看：
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Vercel文档](https://vercel.com/docs)
- [Next.js部署文档](https://nextjs.org/docs/deployment)
