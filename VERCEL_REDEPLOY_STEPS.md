# 🔄 Vercel 重新部署步骤（清除缓存）

## 🎯 目标
清除Vercel的构建缓存并重新部署，修复405错误

## ⚡ 快速步骤（2分钟）

### 步骤 1: 访问Vercel Dashboard
```
https://vercel.com/dashboard
```

### 步骤 2: 进入您的项目
点击项目名称: `meigongxitong`（或您的项目名）

### 步骤 3: 进入Deployments标签
- 点击顶部导航栏的 "Deployments"

### 步骤 4: 找到最新部署
- 第一个deployment就是最新的
- 点击它旁边的 **三个点** (···) 按钮

### 步骤 5: 重新部署并清除缓存
在弹出菜单中：
1. 选择 **"Redeploy"**
2. ✅ **勾选** "Clear Build Cache and Redeploy"
3. 点击 **"Redeploy"** 按钮确认

### 步骤 6: 等待部署完成
- 进度条显示构建状态
- 通常需要 2-3 分钟
- 状态变为 "Ready" 即完成

### 步骤 7: 测试修复
部署完成后：
1. 访问您的Vercel应用URL
2. 进入Logo设计工作室
3. 尝试生成头像
4. 检查是否还有405错误

---

## 🔍 如果仍然有405错误

### 方法A: 检查Function Runtime
1. 在Vercel Dashboard → Functions
2. 找到 `api/logo-studio/generate`
3. 检查 "Runtime" 列是否显示 **"Node.js 20.x"**
4. 如果不是，说明runtime配置未生效

### 方法B: 检查部署日志
1. 点击最新部署
2. 查看 "Build Logs"
3. 搜索关键词: "runtime"
4. 确认是否有错误信息

### 方法C: 强制使用默认区域
如果hkg1区域有问题，尝试使用默认区域：

1. 编辑 `vercel.json`:
   ```json
   {
     "framework": "nextjs"
   }
   ```
   删除 "regions" 配置

2. 提交并推送:
   ```bash
   git add vercel.json
   git commit -m "fix: 移除regions配置测试"
   git push
   ```

3. 等待自动部署完成

### 方法D: 查看Function日志
1. Vercel Dashboard → Functions标签
2. 点击 `api/logo-studio/generate`
3. 查看 "Invocations" 日志
4. 检查是否有错误堆栈信息

---

## 📊 验证修复成功的标志

### ✅ 正常情况
- HTTP状态码: **200 OK**
- 返回JSON: `{ ok: true, jobId: "..." }`
- Console无405错误
- Function Runtime显示: **Node.js 20.x**

### ❌ 异常情况
- HTTP状态码: **405 Method Not Allowed**
- 返回HTML错误页面
- Function Runtime显示: **Edge** 或空白

---

## 🆘 紧急联系方式

如果以上所有方法都失败：

### 选项1: Vercel Support
- https://vercel.com/help
- 说明情况: "Next.js 15 App Router API返回405错误"
- 提供部署URL和错误截图

### 选项2: 使用本地环境
临时方案：
```bash
npm run dev
# 访问 http://localhost:3000
```

### 选项3: 切换部署平台
考虑使用其他平台：
- Netlify
- Railway
- Render
- Fly.io

---

## 💡 Pro Tips

1. **清除浏览器缓存**: Ctrl+Shift+Delete
2. **使用无痕模式**: 避免浏览器缓存影响
3. **检查网络**: 确保不是网络问题
4. **查看Console**: F12开发者工具查看详细错误

---

**最后更新**: 2025-10-10
**预计修复时间**: 5-10分钟
