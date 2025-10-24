# Coze API 集成开发文档 - Logo设计工作室菜品图AI生成功能

## 📋 需求概述

在Logo设计工作室的菜品图上传环节，新增AI生成模式，通过Coze API的两个机器人实现智能菜品图生成：

### 功能流程
1. **用户选择上传方式**
   - 方式1：手动上传菜品图片（现有功能）
   - 方式2：AI智能生成菜品图（新增功能）

2. **AI生成模式流程**
   ```
   用户输入菜品描述
   ↓
   上传原始参考图（可选）
   ↓
   点击"优化提示词"按钮 → 调用机器人2（流式响应）
   ↓
   优化后的提示词实时覆盖输入框
   ↓
   点击"生成菜品图"按钮 → 调用机器人1
   ↓
   展示生成的菜品图（base64或URL）
   ↓
   用户操作：应用此图 | 重新生成
   ```

---

## 🤖 Coze API 配置信息

### 机器人1：菜品图生成器
- **Bot ID**: `7456823183216459803`
- **访问令牌**: `sat_7S2wJIRzYUoAKPaMAQzTfG8BVv3kqd8OB8Do3xzVnHIlyVk6SfgZPoQ8mzfViWp2`
- **功能**: 根据文字描述生成菜品图
- **输入**: 文字提示词（优化后的详细描述）
- **输出**: 图片（base64或URL格式）
- **响应模式**: 非流式

### 机器人2：提示词优化器
- **Bot ID**: `7563941488246816808`
- **访问令牌**: `sat_7S2wJIRzYUoAKPaMAQzTfG8BVv3kqd8OB8Do3xzVnHIlyVk6SfgZPoQ8mzfViWp2`
- **功能**: 根据简单菜品名称+原图生成详细提示词
- **输入**:
  - 文字：简单菜品名称/描述
  - 图片：原菜品图（base64格式）
- **输出**: 优化后的详细提示词文本
- **响应模式**: 流式（Server-Sent Events）

---

## 🌐 Coze API 技术规范

### API 基础信息
- **Base URL**: `https://api.coze.cn`
- **Chat API 端点**: `/v3/chat`
- **HTTP 方法**: `POST`
- **Content-Type**: `application/json`

### 请求头配置
```json
{
  "Authorization": "Bearer {access_token}",
  "Content-Type": "application/json",
  "Accept": "application/json" // 或 "text/event-stream" (流式)
}
```

### 请求体结构
```typescript
interface CozeChantRequest {
  bot_id: string;              // 机器人ID
  user_id: string;             // 用户唯一标识（可用IP或UUID）
  stream: boolean;             // 是否流式响应
  auto_save_history: boolean;  // 是否保存历史（建议false）
  additional_messages: Array<{
    role: 'user';
    content: string;           // 文字内容
    content_type: 'text' | 'object_string';
  }>;
  custom_variables?: Record<string, string>; // 自定义变量
}
```

### 图片上传格式（通过content字段）
```typescript
// 方式1：直接在文本中嵌入base64
{
  role: 'user',
  content: '这是菜品图：<img>{base64_data}</img>\n菜品描述：{description}',
  content_type: 'text'
}

// 方式2：使用对象字符串格式（推荐）
{
  role: 'user',
  content: JSON.stringify([
    { type: 'text', text: '菜品描述：' + description },
    { type: 'image', image_url: 'data:image/jpeg;base64,' + base64Data }
  ]),
  content_type: 'object_string'
}
```

### 流式响应处理（SSE）
```
事件流格式：
event: conversation.message.delta
data: {"role":"assistant","type":"answer","content":"优化后的"}

event: conversation.message.delta
data: {"role":"assistant","type":"answer","content":"提示词内容"}

event: done
data: [DONE]
```

### 非流式响应格式
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "conversation_id": "xxx",
    "id": "xxx",
    "messages": [
      {
        "role": "assistant",
        "type": "answer",
        "content": "生成的文本或图片URL",
        "content_type": "text"
      }
    ]
  }
}
```

---

## 🏗️ 技术架构设计

### 1. API客户端层 (`src/lib/api/clients/CozeApiClient.ts`)

```typescript
export class CozeApiClient extends BaseApiClient {
  // 机器人2：流式提示词优化
  async optimizePromptStream(params: {
    description: string;
    imageBase64?: string;
  }): Promise<ReadableStream>

  // 机器人1：生成菜品图
  async generateDishImage(params: {
    prompt: string;
  }): Promise<{ imageUrl: string } | { imageBase64: string }>
}
```

### 2. API路由层 (`src/app/api/coze/`)

#### `/api/coze/optimize-prompt` (POST)
- 功能：调用机器人2优化提示词
- 输入：`{ description: string, imageBase64?: string }`
- 输出：流式文本响应（SSE）

#### `/api/coze/generate-dish` (POST)
- 功能：调用机器人1生成菜品图
- 输入：`{ prompt: string }`
- 输出：`{ ok: boolean, imageUrl?: string, imageBase64?: string }`

### 3. UI组件层 (`src/app/logo-studio/components/`)

#### `DishUploadModeSelector.tsx`
- 上传模式选择组件（手动上传 / AI生成）

#### `AIDishGenerator.tsx`
- AI生成模式主组件，包含：
  - 菜品描述输入框（支持实时更新）
  - 原图上传区域（可选）
  - 优化提示词按钮
  - 生成菜品图按钮
  - 生成结果预览
  - 操作按钮（应用此图 / 重新生成）

### 4. 自定义Hooks (`src/app/logo-studio/hooks/`)

#### `useCozePromptOptimizer.ts`
- 管理提示词优化流程
- 处理SSE流式响应
- 实时更新输入框内容

#### `useCozeDishGenerator.ts`
- 管理菜品图生成流程
- 处理生成结果展示
- 支持重新生成功能

---

## 📐 数据流设计

### 流程1：提示词优化
```
用户输入描述 + 上传原图
  ↓
前端调用 POST /api/coze/optimize-prompt
  ↓
API Route调用 CozeApiClient.optimizePromptStream()
  ↓
CozeApiClient发送请求到 Coze API (stream=true)
  ↓
SSE事件流返回到前端
  ↓
useCozePromptOptimizer监听事件流
  ↓
实时更新输入框内容（覆盖原文本）
```

### 流程2：菜品图生成
```
用户点击"生成菜品图"
  ↓
前端调用 POST /api/coze/generate-dish
  ↓
API Route调用 CozeApiClient.generateDishImage()
  ↓
CozeApiClient发送请求到 Coze API (stream=false)
  ↓
返回图片URL或base64
  ↓
前端展示生成的图片
  ↓
用户选择"应用此图" → 将图片传递给Logo Studio主流程
```

---

## 🎨 UI/UX 设计规范

### 上传模式选择器
```
┌────────────────────────────────────┐
│ 请选择菜品图上传方式：              │
│ ○ 手动上传图片                      │
│ ● AI智能生成 ✨                     │
└────────────────────────────────────┘
```

### AI生成面板布局
```
┌──────────────────────────────────────┐
│ 🤖 AI智能生成菜品图                   │
├──────────────────────────────────────┤
│ 菜品描述（越详细越好）                │
│ ┌────────────────────────────────┐   │
│ │ 请输入菜品名称或详细描述...     │   │
│ └────────────────────────────────┘   │
│                                      │
│ 原图参考（可选）                      │
│ ┌─────────────────���──────────────┐   │
│ │  [拖拽或点击上传原菜品图]       │   │
│ └────────────────────────────────┘   │
│                                      │
│ [🔄 优化提示词] [⚡ 生成菜品图]       │
├──────────────────────────────────────┤
│ 生成结果预览：                        │
│ ┌────────────────────────────────┐   │
│ │     [生成的菜品图展示区]        │   │
│ └────────────────────────────────┘   │
│ [✅ 应用此图] [🔄 重新生成]           │
└──────────────────────────────────────┘
```

### 状态提示
- **优化中**: "🔄 AI正在优化提示词..."（流式文本实时显示）
- **生成中**: "⚡ AI正在生成菜品图，请稍候..."（加载动画）
- **成功**: "✅ 生成成功！"
- **失败**: "❌ 生成失败：{错误信息}"

---

## 🔧 环境变量配置

在 `.env.local` 中新增：

```bash
# Coze API 配置
COZE_API_BASE_URL=https://api.coze.cn
COZE_ACCESS_TOKEN=sat_7S2wJIRzYUoAKPaMAQzTfG8BVv3kqd8OB8Do3xzVnHIlyVk6SfgZPoQ8mzfViWp2

# 机器人配置
COZE_BOT_DISH_GENERATOR=7456823183216459803  # 机器人1
COZE_BOT_PROMPT_OPTIMIZER=7563941488246816808 # 机器人2
```

---

## 📝 开发任务清单

### 阶段1：基础架构（1-2小时）
- [ ] 创建 `CozeApiClient.ts` 基础客户端类
- [ ] 添加环境变量配置到 `src/lib/config.ts`
- [ ] 创建类型定义 `src/types/coze.ts`

### 阶段2：API路由（1小时）
- [ ] 实现 `/api/coze/optimize-prompt` (流式响应)
- [ ] 实现 `/api/coze/generate-dish` (非流式响应)

### 阶段3：提示词优化功能（2小时）
- [ ] 实现流式响应处理逻辑
- [ ] 创建 `useCozePromptOptimizer.ts` Hook
- [ ] SSE事件流解析和文本拼接

### 阶段4：菜品图生成功能（1.5小时）
- [ ] 实现非流式API调用
- [ ] 创建 `useCozeDishGenerator.ts` Hook
- [ ] 图片格式处理（URL/base64转换）

### 阶段5：UI组件开发（3小时）
- [ ] 创建 `DishUploadModeSelector.tsx`
- [ ] 创建 `AIDishGenerator.tsx` 主组件
- [ ] 实现原图上传功能（base64转换）
- [ ] 实现生成结果预览
- [ ] 添加"应用此图"和"重新生成"按钮

### 阶段6：集成到Logo Studio（1小时）
- [ ] 修改 `logo-studio/page.tsx` 集成上传模式选择
- [ ] 添加AI生成模式到菜品图上传流程
- [ ] 确保"应用此图"后正确传递到下一步

### 阶段7：测试与优化（1.5小时）
- [ ] 测试完整流程（优化→生成→应用）
- [ ] 错误处理和边界情况测试
- [ ] 用户体验优化（加载状态、提示信息）
- [ ] 响应式布局调整

**预计总工时：11-12小时**

---

## 🚨 技术难点与解决方案

### 难点1：SSE流式响应处理
**解决方案**：
- 使用 `EventSource` API（浏览器原生）
- 或使用 `fetch` + `ReadableStream` 手动解析SSE

### 难点2：base64图片大小限制
**解决方案**：
- 前端压缩图片到合理尺寸（如800x800px）
- 限制文件大小（如2MB）

### 难点3：流式文本覆盖输入框
**解决方案**：
- 使用受控组件，通过state管理输入框值
- 流式响应时逐字追加到state

### 难点4：生成失败重试机制
**解决方案**：
- 保存最后一次的请求参数
- "重新生成"按钮复用相同参数重新调用API

---

## 📊 性能与优化

1. **请求优化**
   - 防抖处理（避免频繁点击）
   - 请求取消机制（用户中断操作）

2. **图片优化**
   - 上传前压缩（使用canvas）
   - 生成结果缓存（避免重复生成）

3. **用��体验**
   - 加载骨架屏
   - 进度提示
   - 流式响应实时反馈

---

## 🔒 安全考虑

1. **访问令牌保护**
   - 仅在服务端存储和使用
   - 不暴露到前端代码

2. **用户输入验证**
   - 菜品描述长度限制
   - 图片格式和大小验证

3. **速率限制**
   - 单用户请求频率限制
   - 防止恶意调用

---

## 📚 参考资料

- Coze API官方文档：https://www.coze.cn/open/docs/developer_guides/chat_v3
- Server-Sent Events MDN：https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Next.js Route Handlers：https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

## ✅ 验收标准

1. ✅ 用户可以选择"手动上传"或"AI生成"两种模式
2. ✅ AI生成模式下可输入菜品描述并上传原图
3. ✅ 点击"优化提示词"后，流式文本实时覆盖输入框
4. ✅ 点击"生成菜品图"后，成功展示生成的图片
5. ✅ 点击"应用此图"后，图片正确传递到Logo Studio主流程
6. ✅ 点击"重新生成"后，可重新生成新图片
7. ✅ 所有错误情况都有友好提示
8. ✅ 加载状态清晰可见
9. ✅ 响应式布局适配移动端

---

**文档版本**: v1.0
**创建时间**: 2025-01-24
**最后更新**: 2025-01-24
