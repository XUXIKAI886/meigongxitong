# 🔐 环境变量配置完整指南

本文档提供了在Vercel部署时需要配置的所有环境变量的详细说明和当前项目的具体值。

## 📋 环境变量清单（共13个）

### 1️⃣ 图片生成API配置（通用图片生成）

#### `IMAGE_API_BASE_URL`
- **说明**: 通用图片生成API的基础URL
- **当前值**: `https://jeniya.top/v1/images/generations`
- **用途**: Logo生成、门头招牌、图片墙等功能
- **必填**: ✅ 是

#### `IMAGE_MODEL_NAME`
- **说明**: 通用图片生成使用的AI模型名称
- **当前值**: `doubao-seedream-4-0-250828`
- **用途**: 指定使用的图片生成模型
- **必填**: ✅ 是

#### `IMAGE_API_KEY`
- **说明**: 通用图片生成API的认证密钥
- **当前值**: `sk-qNMLqt90BOryg38Ey21HI4QWQl2SObYybMli28qginQolPaE`
- **用途**: API身份验证
- **必填**: ✅ 是
- **安全提示**: ⚠️ 这是敏感信息，不要公开分享

---

### 2️⃣ 单品图API配置（F1功能专用）

#### `PRODUCT_IMAGE_API_BASE_URL`
- **说明**: 单品图换背景功能的API基础URL
- **当前值**: `https://jeniya.top/v1/images/generations`
- **用途**: F1-单品图换背景功能
- **必填**: ✅ 是

#### `PRODUCT_IMAGE_MODEL_NAME`
- **说明**: 单品图功能使用的AI模型名称
- **当前值**: `gemini-2.5-flash-image-preview`
- **用途**: 单品图抠图和背景生成
- **必填**: ✅ 是

#### `PRODUCT_IMAGE_API_KEY`
- **说明**: 单品图API的认证密钥
- **当前值**: `sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos`
- **用途**: 单品图API身份验证
- **必填**: ✅ 是
- **安全提示**: ⚠️ 这是敏感信息，不要公开分享

---

### 3️⃣ 产品精修API配置（F5/F6/F7/F8功能专用）

#### `PRODUCT_REFINE_API_BASE_URL`
- **说明**: 产品精修、食物替换、背景融合、多图融合功能的API基础URL
- **当前值**: `http://jeniya.top/v1beta/models/gemini-2.5-flash-image-preview:generateContent`
- **用途**: F5-产品精修、F6-食物替换、F7-背景融合、F8-多图融合
- **必填**: ✅ 是

#### `PRODUCT_REFINE_MODEL_NAME`
- **说明**: 产品精修功能使用的AI模型名称
- **当前值**: `gemini-2.5-flash-lite`
- **用途**: 图片增强和融合处理
- **必填**: ✅ 是

#### `PRODUCT_REFINE_API_KEY`
- **说明**: 产品精修API的认证密钥
- **当前值**: `sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos`
- **用途**: 精修API身份验证
- **必填**: ✅ 是
- **安全提示**: ⚠️ 这是敏感信息，不要公开分享

---

### 4️⃣ 聊天API配置（提示词生成）

#### `CHAT_API_BASE_URL`
- **说明**: 聊天API的基础URL，用于AI提示词生成
- **当前值**: `https://jeniya.top/v1/chat/completions`
- **用途**: F2-Logo设计的提示词反推功能
- **必填**: ✅ 是

#### `CHAT_MODEL_NAME`
- **说明**: 聊天功能使用的AI模型名称
- **当前值**: `gemini-2.5-flash-lite`
- **用途**: 提示词优化和生成
- **必填**: ✅ 是

#### `CHAT_API_KEY`
- **说明**: 聊天API的认证密钥
- **当前值**: `sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos`
- **用途**: 聊天API身份验证
- **必填**: ✅ 是
- **安全提示**: ⚠️ 这是敏感信息，不要公开分享

---

### 5️⃣ 应用配置（公开变量）

#### `NEXT_PUBLIC_APP_NAME`
- **说明**: 应用的显示名称
- **当前值**: `美工设计系统`
- **用途**: 页面标题、导航栏等UI显示
- **必填**: ✅ 是
- **注意**: `NEXT_PUBLIC_` 前缀的变量会暴露给浏览器端

#### `NEXT_PUBLIC_APP_DESCRIPTION`
- **说明**: 应用的描述信息
- **当前值**: `外卖商家图片智能设计生成系统`
- **用途**: SEO元数据、页面描述
- **必填**: ⚠️ 可选（建议填写）

---

### 6️⃣ 存储配置

#### `STORAGE_ROOT`
- **说明**: 文件上传存储的根目录
- **当前值**: `./.uploads`
- **用途**: 临时文件和生成结果的存储位置
- **必填**: ✅ 是
- **Vercel注意**: Vercel是无服务器环境，文件存储在临时目录，建议配合OSS使用

---

## 📝 Vercel配置步骤

### 方法1: 通过Vercel Dashboard配置（推荐）

1. **登录Vercel**: https://vercel.com
2. **进入项目**: 选择您的项目 → Settings → Environment Variables
3. **逐个添加变量**:

```
变量名: IMAGE_API_BASE_URL
值: https://jeniya.top/v1/images/generations
环境: Production, Preview, Development (全选)
---
变量名: IMAGE_MODEL_NAME
值: doubao-seedream-4-0-250828
环境: Production, Preview, Development (全选)
---
变量名: IMAGE_API_KEY
值: sk-qNMLqt90BOryg38Ey21HI4QWQl2SObYybMli28qginQolPaE
环境: Production, Preview, Development (全选)
---
变量名: PRODUCT_IMAGE_API_BASE_URL
值: https://jeniya.top/v1/images/generations
环境: Production, Preview, Development (全选)
---
变量名: PRODUCT_IMAGE_MODEL_NAME
值: gemini-2.5-flash-image-preview
环境: Production, Preview, Development (全选)
---
变量名: PRODUCT_IMAGE_API_KEY
值: sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos
环境: Production, Preview, Development (全选)
---
变量名: PRODUCT_REFINE_API_BASE_URL
值: http://jeniya.top/v1beta/models/gemini-2.5-flash-image-preview:generateContent
环境: Production, Preview, Development (全选)
---
变量名: PRODUCT_REFINE_MODEL_NAME
值: gemini-2.5-flash-lite
环境: Production, Preview, Development (全选)
---
变量名: PRODUCT_REFINE_API_KEY
值: sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos
环境: Production, Preview, Development (全选)
---
变量名: CHAT_API_BASE_URL
值: https://jeniya.top/v1/chat/completions
环境: Production, Preview, Development (全选)
---
变量名: CHAT_MODEL_NAME
值: gemini-2.5-flash-lite
环境: Production, Preview, Development (全选)
---
变量名: CHAT_API_KEY
值: sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos
环境: Production, Preview, Development (全选)
---
变量名: NEXT_PUBLIC_APP_NAME
值: 美工设计系统
环境: Production, Preview, Development (全选)
---
变量名: STORAGE_ROOT
值: ./.uploads
环境: Production, Preview, Development (全选)
```

4. **保存并重新部署**: 添加完所有变量后，点击 "Redeploy" 重新部署项目

---

### 方法2: 通过Vercel CLI配置

```bash
# 安装Vercel CLI
npm install -g vercel

# 登录
vercel login

# 链接项目
vercel link

# 添加环境变量
vercel env add IMAGE_API_BASE_URL
# 输入值: https://jeniya.top/v1/images/generations
# 选择环境: Production, Preview, Development

# 重复以上步骤添加所有13个变量...

# 拉取环境变量到本地（可选）
vercel env pull
```

---

### 方法3: 导入.env文件（最快）

1. 在项目根目录创建 `.env.production` 文件
2. 复制以下内容：

```env
# AI API Configuration
IMAGE_API_BASE_URL=https://jeniya.top/v1/images/generations
IMAGE_MODEL_NAME=doubao-seedream-4-0-250828
IMAGE_API_KEY=sk-qNMLqt90BOryg38Ey21HI4QWQl2SObYybMli28qginQolPaE

# Product Image API Configuration
PRODUCT_IMAGE_API_BASE_URL=https://jeniya.top/v1/images/generations
PRODUCT_IMAGE_MODEL_NAME=gemini-2.5-flash-image-preview
PRODUCT_IMAGE_API_KEY=sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos

# Product Refine API Configuration
PRODUCT_REFINE_API_BASE_URL=http://jeniya.top/v1beta/models/gemini-2.5-flash-image-preview:generateContent
PRODUCT_REFINE_MODEL_NAME=gemini-2.5-flash-lite
PRODUCT_REFINE_API_KEY=sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos

# Chat API Configuration
CHAT_API_BASE_URL=https://jeniya.top/v1/chat/completions
CHAT_MODEL_NAME=gemini-2.5-flash-lite
CHAT_API_KEY=sk-AHP64E0ntf5VEltYLSV17wTLYeV4WZ3ucJzf72u0UHXf0Hos

# Storage Configuration
STORAGE_ROOT=./.uploads

# Application Configuration
NEXT_PUBLIC_APP_NAME=美工设计系统
```

3. 使用Vercel CLI导入：
```bash
vercel env pull .env.production
```

---

## ✅ 验证配置

### 1. 检查环境变量是否生效

部署完成后，访问：
```
https://your-app.vercel.app/api/debug/jobs
```

如果返回正常数据，说明环境变量配置成功。

### 2. 测试各个功能

- F1: 单品图换背景 → 需要 `PRODUCT_IMAGE_*` 变量
- F2: Logo设计 → 需要 `IMAGE_*` 和 `CHAT_*` 变量
- F3: 门头招牌 → 需要 `IMAGE_*` 变量
- F4: 图片墙 → 需要 `IMAGE_*` 变量
- F5: 产品精修 → 需要 `PRODUCT_REFINE_*` 变量
- F6: 食物替换 → 需要 `PRODUCT_REFINE_*` 变量
- F7: 背景融合 → 需要 `PRODUCT_REFINE_*` 变量
- F8: 多图融合 → 需要 `PRODUCT_REFINE_*` 变量

---

## ⚠️ 安全注意事项

1. **API密钥保护**
   - ❌ 不要将 `.env.local` 提交到Git
   - ❌ 不要在前端代码中暴露API密钥
   - ✅ 只在服务器端使用敏感密钥
   - ✅ 定期更换API密钥

2. **环境分离**
   - 生产环境(Production)：正式API密钥
   - 预览环境(Preview)：测试API密钥
   - 开发环境(Development)：开发API密钥

3. **密钥泄露处理**
   - 如果密钥泄露，立即在API提供商处撤销
   - 生成新密钥并更新Vercel环境变量
   - 重新部署应用

---

## 🔧 常见问题

### Q1: 添加环境变量后不生效？
**A**: 需要重新部署。Vercel → Deployments → 最新部署 → Redeploy

### Q2: 如何修改已有的环境变量？
**A**: Settings → Environment Variables → 找到变量 → Edit → 保存 → Redeploy

### Q3: 环境变量太多，有快捷方式吗？
**A**: 使用 `.env.production` 文件 + `vercel env pull` 命令批量导入

### Q4: API密钥在哪里获取？
**A**:
- 当前使用的是 `jeniya.top` 提供的API
- 联系API服务提供商获取密钥
- 或使用OpenAI官方API（需修改BASE_URL）

### Q5: STORAGE_ROOT在Vercel上如何工作？
**A**:
- Vercel是无服务器环境，文件存储在 `/tmp` 临时目录
- 临时文件在函数执行后会被清理
- 建议使用云存储服务（如AWS S3、阿里云OSS）持久化存储

---

## 📚 相关文档

- [Vercel环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js环境变量](https://nextjs.org/docs/basic-features/environment-variables)
- [项目部署指南](./.github/DEPLOYMENT.md)
- [Vercel配置指南](./.github/VERCEL_SETUP.md)

---

## 📞 技术支持

如遇到配置问题：
1. 检查Vercel部署日志
2. 查看浏览器开发者工具Console
3. 参考本文档的常见问题部分
4. 联系项目维护者

---

**最后更新**: 2025-10-10
**文档版本**: v1.0.0
