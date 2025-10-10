# ⚡ GitHub Actions 快速设置指南

## 🎯 5分钟完成自动部署配置

### 步骤1️⃣: 配置GitHub Secrets（必需）

1. 打开GitHub仓库页面：https://github.com/XUXIKAI886/meigongxitong

2. 点击 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

3. 添加以下Secrets（**必需**）：

```
名称: IMAGE_API_BASE_URL
值: [你的图像API地址]

名称: IMAGE_API_KEY
值: [你的图像API密钥]

名称: IMAGE_MODEL_NAME
值: [你的图像模型名称]

名称: CHAT_API_BASE_URL
值: [你的聊天API地址]

名称: CHAT_API_KEY
值: [你的聊天API密钥]

名称: CHAT_MODEL_NAME
值: [你的聊天模型名称]
```

### 步骤2️⃣: 选择部署平台

#### 选项A: Vercel（推荐，最简单）

1. **访问Vercel**: https://vercel.com
2. **登录**: 使用GitHub账号登录
3. **导入项目**:
   - 点击 "Add New..." → "Project"
   - 选择 `meigongxitong` 仓库
   - 点击 "Import"
4. **配置环境变量**:
   - 在项目设置中添加与GitHub Secrets相同的环境变量
   - `IMAGE_API_BASE_URL`
   - `IMAGE_API_KEY`
   - `IMAGE_MODEL_NAME`
   - `CHAT_API_BASE_URL`
   - `CHAT_API_KEY`
   - `CHAT_MODEL_NAME`
5. **部署**: 点击 "Deploy" 按钮

**获取Vercel集成Token（可选，用于GitHub Actions）:**
```bash
# 访问 https://vercel.com/account/tokens
# 创建新token，命名为 "github-actions"
# 复制token并添加到GitHub Secrets：

名称: VERCEL_TOKEN
值: [刚才复制的token]
```

**获取组织和项目ID:**
```bash
# 在本地运行
npm install -g vercel
vercel login
vercel link

# 查看 .vercel/project.json
# 复制orgId和projectId到GitHub Secrets：

名称: VERCEL_ORG_ID
值: [从project.json复制的orgId]

名称: VERCEL_PROJECT_ID
值: [从project.json复制的projectId]
```

#### 选项B: Netlify（备选方案）

1. 访问 https://www.netlify.com
2. 使用GitHub账号登录
3. "Add new site" → "Import an existing project"
4. 选择GitHub仓库 `meigongxitong`
5. 配置构建设置：
   - Build command: `npm run build`
   - Publish directory: `.next`
6. 添加环境变量（与Vercel相同）
7. 点击 "Deploy site"

### 步骤3️⃣: 验证部署

1. **查看GitHub Actions状态**:
   - 访问 https://github.com/XUXIKAI886/meigongxitong/actions
   - 查看最新的workflow运行状态
   - ✅ 绿色勾号 = 成功
   - ❌ 红色叉号 = 失败（点击查看日志）

2. **访问部署的网站**:
   - Vercel: 在Vercel仪表板查看部署URL
   - Netlify: 在Netlify仪表板查看部署URL

3. **测试功能**:
   - 访问网站首页
   - 测试各个功能模块
   - 确认API连接正常

### 步骤4️⃣: 日常使用

从现在开始，每次你推送代码到`master`分支：

```bash
git add .
git commit -m "你的提交信息"
git push
```

GitHub Actions会自动：
1. ✅ 检查代码质量（ESLint）
2. ✅ 构建项目（Turbopack）
3. ✅ 部署到生产环境

你可以在Actions页面实时查看进度！

## 🚨 常见问题

### Q1: Actions运行失败，显示"secrets未配置"
**A:** 检查GitHub Secrets是否正确添加，名称必须完全匹配

### Q2: 构建成功但部署失败
**A:** 检查Vercel/Netlify的环境变量配置

### Q3: 如何回滚到上一个版本？
**A:**
- Vercel: 在Deployments页面点击上一个版本的"Promote to Production"
- Netlify: 在Deploys页面点击上一个版本的"Publish deploy"

### Q4: 如何查看详细的构建日志？
**A:** 访问 https://github.com/XUXIKAI886/meigongxitong/actions，点击具体的workflow run查看

## 📊 当前配置状态

运行以下命令检查配置：

```bash
# 检查GitHub Actions配置文件
ls -la .github/workflows/

# 查看最近的提交
git log --oneline -5

# 查看远程分支状态
git remote -v
git branch -vv
```

## 🎉 完成！

恭喜！你的项目现在已经配置了自动部署。

每次推送代码后：
1. GitHub Actions自动运行测试和构建
2. 自动部署到Vercel/Netlify
3. 访问部署URL即可看到最新版本

享受自动化带来的便利吧！ 🚀
