# Coze API 集成实现文档

## 目录
- [概述](#概述)
- [架构设计](#架构设计)
- [核心组件](#核心组件)
- [API 流程](#api-流程)
- [SSE 流式实现](#sse-流式实现)
- [错误处理](#错误处理)
- [配置说明](#配置说明)
- [代码示例](#代码示例)
- [故障排查](#故障排查)

---

## 概述

本文档详细说明了 Coze API 在 Logo 设计工作室模块中的集成实现，提供 AI 智能生成菜品图功能。

### 功能特性

- **提示词优化**：通过 AI 自动优化用户输入的菜品描述
- **菜品图生成**：基于优化后的提示词生成专业菜品图
- **流式响应**：使用 SSE (Server-Sent Events) 实现实时文本更新
- **图片上传**：支持原图参考上传，辅助 AI 理解需求
- **图片压缩**：自动压缩图片至 800x800，减少传输开销

### 技术栈

- **Coze API v3**：`https://api.coze.cn/v3/chat`
- **文件上传 API**：`https://api.coze.cn/v1/files/upload`
- **Server-Sent Events (SSE)**：流式文本传输
- **Next.js Route Handlers**：API 端点实现
- **React Hooks**：前端状态管理
- **AbortController**：可取消的异步请求

---

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Logo Studio Page                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AIDishGenerator Component                           │   │
│  │  ┌────────────────┐    ┌──────────────────────┐     │   │
│  │  │ User Input     │    │  Image Upload        │     │   │
│  │  │ (Textarea)     │    │  (Optional Ref)      │     │   │
│  │  └────────┬───────┘    └──────────┬───────────┘     │   │
│  │           │                       │                  │   │
│  │           v                       v                  │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │  useCozePromptOptimizer Hook               │     │   │
│  │  │  - 管理优化状态                            │     │   │
│  │  │  - SSE 流式接收                            │     │   │
│  │  │  - 实时更新文本                            │     │   │
│  │  └────────┬───────────────────────────────────┘     │   │
│  │           │                                          │   │
│  │           v                                          │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │  useCozeDishGenerator Hook                 │     │   │
│  │  │  - 管理生成状态                            │     │   │
│  │  │  - SSE 流式接收图片                        │     │   │
│  │  │  - 支持重新生成                            │     │   │
│  │  └────────┬───────────────────────────────────┘     │   │
│  └───────────┼──────────────────────────────────────────┘   │
└──────────────┼──────────────────────────────────────────────┘
               │
               │ HTTP POST
               v
┌─────────────────────────────────────────────────────────────┐
│               API Route Handlers (Next.js)                   │
│  ┌────────────────────────┐  ┌──────────────────────────┐   │
│  │ /api/coze/             │  │ /api/coze/               │   │
│  │ optimize-prompt        │  │ generate-dish            │   │
│  │                        │  │                          │   │
│  │ - 验证请求参数         │  │ - 验证请求参数           │   │
│  │ - 图片转base64         │  │ - 调用生成API            │   │
│  │ - 调用优化API          │  │ - 解析SSE流              │   │
│  │ - 解析SSE流            │  │ - 提取图片URL            │   │
│  │ - 过滤verbose消息      │  │ - 返回SSE流              │   │
│  │ - 返回SSE流            │  │                          │   │
│  └────────┬───────────────┘  └──────────┬───────────────┘   │
└───────────┼──────────────────────────────┼───────────────────┘
            │                              │
            │ HTTP POST                    │ HTTP POST
            v                              v
┌─────────────────────────────────────────────────────────────┐
│                  CozeApiClient (src/lib/api)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  optimizePromptStream(description, imageBase64?)     │   │
│  │  - 上传图片 (可选)                                   │   │
│  │  - 构建消息体                                        │   │
│  │  - 返回SSE流                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  generateDishImageStream(prompt)                     │   │
│  │  - 构建消息体                                        │   │
│  │  - 返回SSE流                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  uploadFile(blob)                                    │   │
│  │  - 上传到/v1/files/upload                            │   │
│  │  - 返回file_id                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  静态方法                                            │   │
│  │  - compressImage(): Canvas压缩                       │   │
│  │  - fileToBase64(): File转base64                      │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────┬──────────────────────────────┬───────────────────┘
            │                              │
            │ HTTPS                        │ HTTPS
            v                              v
┌─────────────────────────────────────────────────────────────┐
│                  Coze API (api.coze.cn)                      │
│  ┌────────────────────┐       ┌──────────────────────┐      │
│  │ Bot 1:             │       │ Bot 2:               │      │
│  │ 提示词优化器       │       │ 菜品图生成器         │      │
│  │ ID: 756394...      │       │ ID: 745682...        │      │
│  └────────────────────┘       └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 数据流向

```
用户输入描述
    ↓
[优化提示词按钮]
    ↓
前端 Hook (useCozePromptOptimizer)
    ↓
API Route (/api/coze/optimize-prompt)
    ↓
CozeApiClient.optimizePromptStream()
    ↓
Coze API (Bot 2: 提示词优化器)
    ↓ SSE Stream
SSE Event: conversation.message.completed
    ↓
API Route 解析 & 过滤 (仅保留type=answer)
    ↓
前端 Hook 实时更新 Textarea
    ↓
用户查看优化结果
    ↓
[生成菜品图按钮]
    ↓
前端 Hook (useCozeDishGenerator)
    ↓
API Route (/api/coze/generate-dish)
    ↓
CozeApiClient.generateDishImageStream()
    ↓
Coze API (Bot 1: 菜品图生成器)
    ↓ SSE Stream
SSE Event: conversation.message.completed
    ↓
API Route 提取 Markdown 中的图片 URL
    ↓
前端 Hook 显示生成结果
    ↓
[应用此图按钮]
    ↓
转换为 File 对象 → 自动切换至手动模式 → 继续后续Logo生成流程
```

---

## 核心组件

### 1. 类型定义 (`src/types/coze.ts`)

定义了所有 Coze API 相关的 TypeScript 接口。

```typescript
// 核心请求接口
export interface CozeChatRequest {
  bot_id: string;
  user_id: string;
  stream: boolean;
  auto_save_history: boolean;
  additional_messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    content_type: 'text' | 'object_string';
  }>;
}

// SSE 事件类型
export interface CozeSSEMessageCompletedEvent {
  event: 'conversation.message.completed';
  id: string;
  conversation_id: string;
  type: 'answer' | 'verbose' | 'follow_up';
  content: string;
}
```

### 2. API 客户端 (`src/lib/api/clients/CozeApiClient.ts`)

核心 API 客户端类，负责与 Coze API 通信。

**关键方法**：

#### `uploadFile(blob: Blob): Promise<string>`
上传图片到 Coze 文件服务。

```typescript
const formData = new FormData();
formData.append('file', blob, 'reference.jpg');

const response = await fetch(`${this.baseUrl}/v1/files/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${this.accessToken}`,
  },
  body: formData,
});

const data = await response.json();
return data.data.id; // 返回 file_id
```

#### `optimizePromptStream(description: string, imageBase64?: string): Promise<ReadableStream>`
流式优化提示词，支持图片参考。

```typescript
let messageContent: string;

if (imageBase64) {
  // 上传图片并使用 file_id
  const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  const fileId = await this.uploadFile(blob);

  messageContent = JSON.stringify([
    { type: 'text', text: `菜品描述：${description}` },
    { type: 'image', file_id: fileId }
  ]);
} else {
  messageContent = description;
}

const requestBody: CozeChatRequest = {
  bot_id: this.promptOptimizerId,
  user_id: 'logo-studio-user',
  stream: true,
  auto_save_history: true, // 关键：stream模式下必须为true
  additional_messages: [
    {
      role: 'user',
      content: messageContent,
      content_type: imageBase64 ? 'object_string' : 'text',
    },
  ],
};

return response.body!;
```

#### `generateDishImageStream(params: { prompt: string }): Promise<ReadableStream>`
流式生成菜品图。

```typescript
const requestBody: CozeChatRequest = {
  bot_id: this.dishGeneratorId,
  user_id: 'logo-studio-user',
  stream: true,
  auto_save_history: true,
  additional_messages: [
    {
      role: 'user',
      content: params.prompt,
      content_type: 'text',
    },
  ],
};

return response.body!;
```

#### 静态工具方法

```typescript
// 压缩图片至指定尺寸
static async compressImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob>

// 将 File 转换为 base64 字符串
static async fileToBase64(file: File): Promise<string>
```

### 3. API 路由处理器

#### `/api/coze/optimize-prompt/route.ts`

处理提示词优化请求，解析 SSE 流并过滤无关消息。

**关键实现：SSE 事件边界解析**

```typescript
const transformedStream = new ReadableStream({
  async start(controller) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let currentData = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        // 空行表示事件边界
        if (line.trim() === '') {
          if (currentData) {
            const data = JSON.parse(currentData);

            // 仅转发 type=answer 的消息
            if (data.event === 'conversation.message.completed' && data.type === 'answer') {
              const sseMessage = `data: ${JSON.stringify({ content: data.content })}\n\n`;
              controller.enqueue(new TextEncoder().encode(sseMessage));
            }

            currentEvent = '';
            currentData = '';
          }
        } else if (line.startsWith('event:')) {
          currentEvent = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          currentData += line.substring(5).trim(); // 累积多行JSON
        }
      }
    }

    controller.close();
  },
});
```

#### `/api/coze/generate-dish/route.ts`

处理菜品图生成请求，提取 Markdown 格式的图片 URL。

**关键实现：Markdown URL 提取**

```typescript
if (data.event === 'conversation.message.completed' && data.type === 'answer') {
  const content = data.content;
  let imageResult: any = {};

  // 提取 Markdown 链接：[文本](URL)
  const markdownLinkMatch = content.match(/\[.*?\]\((https?:\/\/[^\)]+)\)/);
  if (markdownLinkMatch && markdownLinkMatch[1]) {
    imageResult.imageUrl = markdownLinkMatch[1];
  } else if (content.startsWith('http://') || content.startsWith('https://')) {
    imageResult.imageUrl = content;
  } else if (content.startsWith('data:image')) {
    imageResult.imageBase64 = content;
  }

  const sseMessage = `data: ${JSON.stringify(imageResult)}\n\n`;
  controller.enqueue(new TextEncoder().encode(sseMessage));
}
```

### 4. React Hooks

#### `useCozePromptOptimizer`

管理提示词优化的状态和 SSE 流处理。

```typescript
export function useCozePromptOptimizer(params?: {
  onOptimizationComplete?: (optimized: string) => void;
  onError?: (error: string) => void;
}) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedText, setOptimizedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const optimizePrompt = useCallback(async (description: string, imageBase64?: string) => {
    // 取消之前的请求
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsOptimizing(true);
    setError(null);
    setOptimizedText('');

    try {
      const response = await fetch('/api/coze/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, imageBase64 }),
        signal: controller.signal,
      });

      // 读取 SSE 流
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') break;

            const data = JSON.parse(dataStr);
            if (data.content) {
              accumulatedText = data.content;
              setOptimizedText(accumulatedText); // 实时更新
            }
          }
        }
      }

      params?.onOptimizationComplete?.(accumulatedText);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMessage = err.message || '优化失败，请稍后重试';
        setError(errorMessage);
        params?.onError?.(errorMessage);
      }
    } finally {
      setIsOptimizing(false);
      setAbortController(null);
    }
  }, [params, abortController]);

  return {
    isOptimizing,
    optimizedText,
    error,
    optimizePrompt,
    reset: () => {
      abortController?.abort();
      setIsOptimizing(false);
      setOptimizedText('');
      setError(null);
    },
  };
}
```

#### `useCozeDishGenerator`

管理菜品图生成的状态和 SSE 流处理。

```typescript
export function useCozeDishGenerator(params?: {
  onGenerationComplete?: (imageUrl: string, imageBase64?: string) => void;
  onError?: (error: string) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');

  const generateDishImage = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setLastPrompt(prompt);

    try {
      const response = await fetch('/api/coze/generate-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      // 读取 SSE 流
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') break;

            const data = JSON.parse(dataStr);
            if (data.imageUrl || data.imageBase64) {
              const result = {
                imageUrl: data.imageUrl,
                imageBase64: data.imageBase64,
              };
              setGeneratedImage(result);
              params?.onGenerationComplete?.(
                result.imageUrl || result.imageBase64 || '',
                result.imageBase64
              );
            }
          }
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || '生成失败，请稍后重试';
      setError(errorMessage);
      params?.onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [params]);

  const regenerate = useCallback(async () => {
    if (lastPrompt) {
      await generateDishImage(lastPrompt);
    }
  }, [lastPrompt, generateDishImage]);

  const getFinalImageUrl = useCallback((): string | null => {
    if (!generatedImage) return null;
    return generatedImage.imageUrl || generatedImage.imageBase64 || null;
  }, [generatedImage]);

  return {
    isGenerating,
    generatedImage,
    error,
    generateDishImage,
    regenerate,
    getFinalImageUrl,
    reset: () => {
      setIsGenerating(false);
      setGeneratedImage(null);
      setError(null);
      setLastPrompt('');
    },
  };
}
```

### 5. UI 组件

#### `AIDishGenerator.tsx`

主 UI 组件，集成所有功能并提供用户交互界面。

**关键功能实现**：

1. **原图参考上传与压缩**
```typescript
const handleReferenceImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // 验证文件类型和大小
  if (!file.type.startsWith('image/')) {
    toast.error('请上传图片文件');
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.error('图片大小不能超过2MB');
    return;
  }

  // 压缩图片
  const compressedBlob = await CozeApiClient.compressImage(file, 800, 800);
  const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

  setReferenceImage(compressedFile);
  setReferenceImagePreview(URL.createObjectURL(compressedFile));
}, []);
```

2. **优化提示词流程**
```typescript
const handleOptimizePrompt = useCallback(async () => {
  if (!description.trim()) {
    toast.error('请先输入菜品描述');
    return;
  }

  let imageBase64: string | undefined;

  // 如果有原图，转换为base64
  if (referenceImage) {
    imageBase64 = await CozeApiClient.fileToBase64(referenceImage);
  }

  await promptOptimizer.optimizePrompt(description, imageBase64);
}, [description, referenceImage, promptOptimizer]);
```

3. **生成菜品图流程**
```typescript
const handleGenerateDish = useCallback(async () => {
  if (!description.trim()) {
    toast.error('请先输入或优化菜品描述');
    return;
  }

  await dishGenerator.generateDishImage(description);
}, [description, dishGenerator]);
```

4. **应用生成的图片**
```typescript
const handleApplyImage = useCallback(async () => {
  const imageUrl = dishGenerator.getFinalImageUrl();
  if (!imageUrl) {
    toast.error('没有可应用的图片');
    return;
  }

  // 将图片URL转换为File对象
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const file = new File([blob], '生成的菜品图.png', { type: 'image/png' });

  onApplyImage(file);
  toast.success('已应用生成的菜品图');

  // 切换回手动上传模式
  if (onModeChange) {
    onModeChange();
  }

  // 重置状态
  dishGenerator.reset();
  promptOptimizer.reset();
  setDescription('');
  setReferenceImage(null);
  setReferenceImagePreview(null);
}, [dishGenerator, promptOptimizer, onApplyImage, onModeChange]);
```

---

## API 流程

### 1. 提示词优化流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户输入菜品描述 (必填)                                  │
│    + 可选上传原图参考                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 前端处理                                                 │
│    - 验证描述非空                                           │
│    - 如有原图，转换为base64                                 │
│    - 调用 promptOptimizer.optimizePrompt()                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ POST /api/coze/optimize-prompt
┌─────────────────────────────────────────────────────────────┐
│ 3. API Route 处理                                           │
│    - 验证请求参数 (description必填)                         │
│    - 验证描述长度 (5-2000字符)                              │
│    - 调用 cozeClient.optimizePromptStream()                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CozeApiClient 处理                                       │
│    - 如有图片，调用 uploadFile() 获取 file_id               │
│    - 构建请求体 (stream=true, auto_save_history=true)       │
│    - 发送 POST /v3/chat                                     │
│    - 返回 SSE 流                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SSE 流解析 (API Route)                                   │
│    - 按事件边界分割                                         │
│    - 解析 JSON 数据                                         │
│    - 过滤 verbose 消息                                      │
│    - 仅转发 type=answer 的内容                              │
│    - 转换为前端 SSE 格式                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ SSE Stream
┌─────────────────────────────────────────────────────────────┐
│ 6. 前端接收 (useCozePromptOptimizer)                        │
│    - 实时读取 SSE 流                                        │
│    - 累积文本内容                                           │
│    - 更新 optimizedText 状态                                │
│    - 触发 Textarea 重新渲染                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. UI 更新                                                  │
│    - Textarea 显示优化后的文本                              │
│    - 用户可继续编辑                                         │
│    - 可选：再次点击优化                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2. 菜品图生成流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户确认描述内容                                         │
│    - 使用原始输入或优化后的文本                             │
│    - 点击"生成菜品图"按钮                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 前端处理                                                 │
│    - 验证描述非空                                           │
│    - 调用 dishGenerator.generateDishImage(prompt)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ POST /api/coze/generate-dish
┌─────────────────────────────────────────────────────────────┐
│ 3. API Route 处理                                           │
│    - 验证 prompt 参数                                       │
│    - 验证长度 (5-2000字符)                                  │
│    - 调用 cozeClient.generateDishImageStream()              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CozeApiClient 处理                                       │
│    - 构建请求体 (stream=true, auto_save_history=true)       │
│    - 发送 POST /v3/chat                                     │
│    - 返回 SSE 流                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SSE 流解析 (API Route)                                   │
│    - 监听 conversation.message.completed 事件               │
│    - 提取 content 字段                                      │
│    - 判断内容类型：                                         │
│      • Markdown链接 → 正则提取URL                           │
│      • 纯HTTP URL → 直接使用                                │
│      • base64 Data URI → 直接使用                           │
│    - 构建 { imageUrl, imageBase64 } 响应                    │
│    - 转换为前端 SSE 格式                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ SSE Stream
┌─────────────────────────────────────────────────────────────┐
│ 6. 前端接收 (useCozeDishGenerator)                          │
│    - 实时读取 SSE 流                                        │
│    - 解析图片数据                                           │
│    - 更新 generatedImage 状态                               │
│    - 触发 UI 重新渲染                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. UI 显示结果                                              │
│    - 显示生成的图片预览                                     │
│    - 提供"应用此图"按钮                                     │
│    - 提供"重新生成"按钮                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. 应用图片                                                 │
│    - 将URL转换为File对象                                    │
│    - 调用 onApplyImage(file)                                │
│    - 自动切换回手动上传模式                                 │
│    - 重置所有状态                                           │
│    - 用户继续后续Logo生成流程                               │
└─────────────────────────────────────────────────────────────┘
```

---

## SSE 流式实现

### SSE 协议格式

Server-Sent Events (SSE) 是一种基于 HTTP 的单向通信协议，格式如下：

```
event: event-name
data: {"field": "value"}

event: another-event
data: {"more": "data"}

```

关键特点：
- 每个事件由 `event:` 和 `data:` 行组成
- 空行 (`\n\n`) 表示事件边界
- 长 JSON 可能跨多行，需累积后解析

### Coze API SSE 事件类型

#### 1. `conversation.message.delta`
增量文本更新（流式输出）。

```json
event: conversation.message.delta
data: {"type":"answer","delta":"增量文本内容"}
```

#### 2. `conversation.message.completed`
消息完成，包含完整内容。

```json
event: conversation.message.completed
data: {
  "type": "answer",
  "content": "完整的优化后文本",
  "id": "msg-xxx",
  "conversation_id": "conv-xxx"
}
```

**type 字段说明**：
- `answer`：有效回答（需要转发给前端）
- `verbose`：详细调试信息（应忽略）
- `follow_up`：后续建议问题（应忽略）

#### 3. `conversation.chat.completed`
整个对话完成。

```json
event: conversation.chat.completed
data: {"conversation_id":"conv-xxx","status":"success"}
```

#### 4. `conversation.chat.failed`
对话失败，包含错误信息。

```json
event: conversation.chat.failed
data: {
  "last_error": {
    "code": 4000,
    "msg": "Request parameter error"
  }
}
```

### 正确的 SSE 解析实现

**错误示例（会导致 JSON 解析失败）**：

```typescript
// ❌ 错误：立即解析每行 data
for (const line of lines) {
  if (line.startsWith('data: ')) {
    const data = JSON.parse(line.substring(6)); // 如果JSON跨多行会失败！
  }
}
```

**正确示例（累积后解析）**：

```typescript
// ✅ 正确：累积完整 JSON 后再解析
let currentEvent = '';
let currentData = '';

for (const line of lines) {
  if (line.trim() === '') {
    // 空行 = 事件边界，此时 JSON 完整
    if (currentData) {
      try {
        const data = JSON.parse(currentData); // 安全解析

        // 处理事件
        if (currentEvent === 'conversation.message.completed') {
          if (data.type === 'answer') {
            // 处理有效回答
          } else if (data.type === 'verbose') {
            // 忽略详细信息
            console.log('收到verbose消息（已忽略）');
          }
        }
      } catch (error) {
        console.warn('JSON解析失败:', currentData.substring(0, 100));
      }

      // 重置状态
      currentEvent = '';
      currentData = '';
    }
  } else if (line.startsWith('event:')) {
    currentEvent = line.substring(6).trim();
  } else if (line.startsWith('data:')) {
    currentData += line.substring(5).trim(); // 累积多行
  }
}
```

### 前端 SSE 读取实现

```typescript
const response = await fetch('/api/coze/optimize-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description, imageBase64 }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  // 按行分割
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // 保留未完成的行

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const dataStr = line.substring(6).trim();

      if (dataStr === '[DONE]') {
        console.log('SSE流结束');
        break;
      }

      try {
        const data = JSON.parse(dataStr);

        if (data.content) {
          setOptimizedText(data.content); // 更新UI
        }
      } catch (error) {
        console.warn('JSON解析失败:', dataStr);
      }
    }
  }
}
```

---

## 错误处理

### 1. 环境配置错误

**错误代码**: N/A
**症状**: `未配置 Coze API 相关环境变量`

**原因**：
- `.env.local` 缺少 Coze 配置
- 环境变量未正确加载

**解决方案**：
```bash
# 确保 .env.local 包含以下配置
COZE_API_BASE_URL=https://api.coze.cn
COZE_ACCESS_TOKEN=your_access_token
COZE_BOT_DISH_GENERATOR=bot_id_1
COZE_BOT_PROMPT_OPTIMIZER=bot_id_2

# 重启开发服务器
npm run dev
```

### 2. Bot 未发布到 API 频道

**错误代码**: `4015`
**症状**: `The bot_id xxx has not been published to the channel Agent As API`

**原因**：
- Coze 平台上的 Bot 未发布到 "Agent As API" 频道

**解决方案**：
1. 登录 [Coze 平台](https://www.coze.cn)
2. 进入对应 Bot 的设置页面
3. 点击"发布"按钮
4. 选择"Agent As API"频道
5. 确认发布
6. 重启开发服务器

### 3. 请求参数错误

**错误代码**: `4000`
**症状**: `Request parameter error`

**可能原因**：
1. `auto_save_history=false` 但 `stream` 字段缺失
2. 图片上传使用了不支持的格式（如 base64 Data URI）
3. 消息内容格式错误

**解决方案**：

**原因1：auto_save_history 约束**
```typescript
// ❌ 错误
{
  stream: true,
  auto_save_history: false, // 与 stream=true 冲突
}

// ✅ 正确
{
  stream: true,
  auto_save_history: true, // 必须为 true
}
```

**原因2：图片上传格式**
```typescript
// ❌ 错误：不支持 base64 Data URI
{
  content: JSON.stringify([
    { type: 'image', image_url: 'data:image/jpeg;base64,/9j/4AAQ...' }
  ])
}

// ✅ 正确：使用 file_id
const fileId = await cozeClient.uploadFile(imageBlob);
{
  content: JSON.stringify([
    { type: 'image', file_id: fileId }
  ])
}
```

### 4. SSE JSON 解析失败

**错误代码**: N/A
**症状**:
- Console 显示 `JSON解析失败: data:{"id":"...","last_error":{"cod`
- 前端未收到任何内容

**原因**：
- 长 JSON 负载跨多个 TCP 包传输
- 代码尝试立即解析不完整的 `data:` 行

**解决方案**：
参考 [SSE 流式实现](#sse-流式实现) 部分的"正确示例"。

### 5. Verbose 消息污染输入框

**症状**：
- 优化后的文本包含 `{"msg_type":"generate_answer_finish",...}`
- 出现建议问题："怎样让青椒肉丝的图片展示更具食欲？"

**原因**：
- API Route 未过滤 `type=verbose` 消息
- 所有 `conversation.message.completed` 事件都被转发

**解决方案**：
```typescript
// API Route 中添加类型过滤
if (data.event === 'conversation.message.completed') {
  if (data.type === 'answer' && data.content) {
    // ✅ 仅转发 answer 类型
    controller.enqueue(new TextEncoder().encode(
      `data: ${JSON.stringify({ content: data.content })}\n\n`
    ));
  } else if (data.type === 'verbose') {
    // ❌ 忽略 verbose 类型
    console.log('[API] 收到verbose类型消息（已忽略）');
  }
}
```

### 6. 生成图片未显示

**症状**：
- 控制台显示 `ERR_INVALID_URL`
- `imageUrl` 包含 Markdown 文本而非 URL

**原因**：
- Coze API 返回格式：`已为你生成符合描述的图像，图像链接为：[点击查看](https://s.coze.cn/t/xxx/) 。`
- 代码未提取 Markdown 中的 URL

**解决方案**：
```typescript
const content = data.content;
let imageResult: any = {};

// 提取 Markdown 链接：[文本](URL)
const markdownLinkMatch = content.match(/\[.*?\]\((https?:\/\/[^\)]+)\)/);
if (markdownLinkMatch && markdownLinkMatch[1]) {
  console.log('[API] 从Markdown提取URL:', markdownLinkMatch[1]);
  imageResult.imageUrl = markdownLinkMatch[1];
} else if (content.startsWith('http://') || content.startsWith('https://')) {
  // 直接是 URL
  imageResult.imageUrl = content;
} else if (content.startsWith('data:image')) {
  // base64 Data URI
  imageResult.imageBase64 = content;
}
```

### 7. 应用图片后未切换模式

**症状**：
- 点击"应用此图"后页面仍停留在 AI 生成模式
- 用户需手动切换回手动上传

**原因**：
- `AIDishGenerator` 组件缺少 `onModeChange` 回调

**解决方案**：
```typescript
// AIDishGenerator.tsx
const handleApplyImage = useCallback(async () => {
  // ... 应用图片逻辑

  // ✅ 切换回手动上传模式
  if (onModeChange) {
    onModeChange();
  }
}, [onApplyImage, onModeChange]);

// page.tsx
<AIDishGenerator
  onApplyImage={handleAIImageApply}
  onModeChange={() => setUploadMode('manual')} // ✅ 传递回调
/>
```

---

## 配置说明

### 环境变量

在 `.env.local` 中配置以下变量：

```bash
# Coze API 基础配置
COZE_API_BASE_URL=https://api.coze.cn
COZE_ACCESS_TOKEN=your_access_token_here

# Bot ID 配置
COZE_BOT_DISH_GENERATOR=7456823183216459803  # 菜品图生成器
COZE_BOT_PROMPT_OPTIMIZER=7563941488246816808 # 提示词优化器
```

**获取方式**：
1. **Access Token**：
   - 登录 [Coze 开放平台](https://www.coze.cn/open)
   - 进入"个人访问令牌"页面
   - 创建新令牌并复制

2. **Bot ID**：
   - 进入对应 Bot 的设置页面
   - URL 中的数字即为 Bot ID
   - 例如：`https://www.coze.cn/space/xxx/bot/7456823183216459803`

### 配置验证

启动服务器后，检查 Console 输出：

```bash
# ✅ 配置正确
[Config] Coze API 配置已加载:
  baseUrl: https://api.coze.cn
  dishGenerator: 7456823183216459803
  promptOptimizer: 7563941488246816808

# ❌ 配置错误
Error: 未配置 Coze API 相关环境变量
```

### API 客户端初始化

```typescript
// src/lib/api/index.ts
import { config } from '@/lib/config';

export function createCozeApiClient() {
  return new CozeApiClient(
    config.coze.baseUrl,
    config.coze.accessToken,
    config.coze.bots.dishGenerator,
    config.coze.bots.promptOptimizer
  );
}
```

---

## 代码示例

### 完整的优化提示词流程

```typescript
import { useState } from 'react';
import { useCozePromptOptimizer } from '@/app/logo-studio/hooks/useCozePromptOptimizer';
import { CozeApiClient } from '@/lib/api/clients/CozeApiClient';
import { toast } from 'sonner';

function MyComponent() {
  const [description, setDescription] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);

  const optimizer = useCozePromptOptimizer({
    onOptimizationComplete: (optimized) => {
      setDescription(optimized); // 覆盖输入框
      toast.success('提示词优化完成！');
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const handleOptimize = async () => {
    if (!description.trim()) {
      toast.error('请先输入菜品描述');
      return;
    }

    let imageBase64: string | undefined;

    if (referenceImage) {
      imageBase64 = await CozeApiClient.fileToBase64(referenceImage);
    }

    await optimizer.optimizePrompt(description, imageBase64);
  };

  return (
    <div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="输入菜品描述..."
        disabled={optimizer.isOptimizing}
      />

      {optimizer.isOptimizing && (
        <p>🔄 AI正在优化提示词...</p>
      )}

      <button
        onClick={handleOptimize}
        disabled={!description.trim() || optimizer.isOptimizing}
      >
        {optimizer.isOptimizing ? '优化中...' : '优化提示词'}
      </button>
    </div>
  );
}
```

### 完整的生成菜品图流程

```typescript
import { useState } from 'react';
import { useCozeDishGenerator } from '@/app/logo-studio/hooks/useCozeDishGenerator';
import { toast } from 'sonner';

function MyComponent() {
  const [prompt, setPrompt] = useState('');

  const generator = useCozeDishGenerator({
    onGenerationComplete: () => {
      toast.success('菜品图生成成功！');
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('请先输入菜品描述');
      return;
    }

    await generator.generateDishImage(prompt);
  };

  const handleApply = async () => {
    const imageUrl = generator.getFinalImageUrl();
    if (!imageUrl) return;

    // 转换为 File 对象
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], '生成的菜品图.png', { type: 'image/png' });

    // 应用到后续流程
    onApplyImage(file);
  };

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generator.isGenerating}
      >
        {generator.isGenerating ? '生成中...' : '生成菜品图'}
      </button>

      {generator.generatedImage && (
        <div>
          <img src={generator.getFinalImageUrl() || ''} alt="生成的菜品图" />
          <button onClick={handleApply}>应用此图</button>
          <button onClick={generator.regenerate}>重新生成</button>
        </div>
      )}
    </div>
  );
}
```

### 图片压缩工具

```typescript
import { CozeApiClient } from '@/lib/api/clients/CozeApiClient';

async function handleImageUpload(file: File) {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传图片文件');
  }

  // 验证文件大小（2MB）
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('图片大小不能超过2MB');
  }

  // 压缩图片至 800x800
  const compressedBlob = await CozeApiClient.compressImage(file, 800, 800);
  const compressedFile = new File([compressedBlob], file.name, {
    type: 'image/jpeg',
  });

  return compressedFile;
}
```

---

## 故障排查

### 检查清单

#### 1. 环境配置
```bash
# 检查环境变量
cat .env.local | grep COZE

# 预期输出：
COZE_API_BASE_URL=https://api.coze.cn
COZE_ACCESS_TOKEN=sat_xxx...
COZE_BOT_DISH_GENERATOR=745682...
COZE_BOT_PROMPT_OPTIMIZER=756394...
```

#### 2. Bot 发布状态
- [ ] Bot 1 (菜品图生成器) 已发布到 "Agent As API"
- [ ] Bot 2 (提示词优化器) 已发布到 "Agent As API"
- [ ] Access Token 有效且未过期

#### 3. 网络连接
```bash
# 测试 Coze API 连通性
curl -I https://api.coze.cn/v3/chat

# 预期：HTTP/2 401（认证失败，但连接正常）
```

#### 4. 前端 Console 检查
- [ ] 无 CORS 错误
- [ ] SSE 连接建立成功 (Content-Type: text/event-stream)
- [ ] 无 JSON 解析错误
- [ ] 无 ERR_INVALID_URL 错误

#### 5. 后端日志检查
```bash
# 查看开发服务器日志
npm run dev

# 关键日志：
[API] 开始优化提示词（流式）
[API] SSE流已建立
[API] 完整事件: conversation.message.completed
[API] 提示词优化对话完成
```

### 常见问题 FAQ

**Q1: 点击"优化提示词"后无响应？**

A: 检查以下几点：
1. 浏览器 Console 是否有错误
2. Network 选项卡中请求是否成功
3. 服务器日志是否显示 SSE 流建立
4. 检查 Bot 是否已发布

**Q2: 优化后的文本包含乱码或 JSON？**

A: 这是 verbose 消息污染，确认 API Route 中已添加类型过滤：
```typescript
if (data.type === 'answer' && data.content) {
  // 仅转发 answer 类型
}
```

**Q3: 生成的图片无法显示？**

A: 检查以下几点：
1. Console 是否显示 `ERR_INVALID_URL`
2. 检查 `imageUrl` 值是否为 Markdown 文本
3. 确认 API Route 已实现 Markdown URL 提取逻辑

**Q4: 请求返回 4000 错误？**

A: 常见原因：
1. `auto_save_history=false` 但未设置 `stream=true`
2. 图片上传使用了 base64 Data URI（应使用 file_id）
3. 消息内容格式错误

**Q5: 应用图片后未切换模式？**

A: 确认以下代码：
```typescript
// AIDishGenerator 组件
onModeChange?.();

// page.tsx
<AIDishGenerator
  onModeChange={() => setUploadMode('manual')}
/>
```

---

## 总结

本文档详细说明了 Coze API 在 Logo 设计工作室中的集成实现，涵盖：

- ✅ 完整的架构设计和组件关系
- ✅ 详细的 API 流程和数据流向
- ✅ SSE 流式实现的最佳实践
- ✅ 全面的错误处理和解决方案
- ✅ 完整的代码示例和使用指南
- ✅ 详尽的故障排查清单

### 关键技术要点

1. **SSE 流式响应**：按事件边界累积 JSON，避免解析不完整数据
2. **消息类型过滤**：仅转发 `type=answer`，忽略 verbose 和 follow_up
3. **图片上传**：使用 `/v1/files/upload` 获取 file_id，而非 base64
4. **Markdown 提取**：正则提取图片 URL，支持多种返回格式
5. **状态管理**：使用 Custom Hooks 分离业务逻辑
6. **用户体验**：实时文本更新、自动模式切换、智能重试

### 后续优化建议

1. **性能优化**：
   - 实现图片缓存，避免重复下载
   - 添加请求防抖，减少 API 调用

2. **功能增强**：
   - 支持多张原图参考
   - 添加生成历史记录
   - 实现批量生成功能

3. **用户体验**：
   - 添加生成进度条
   - 实现取消生成功能
   - 提供更多提示词模板

---

**文档版本**: v1.0
**更新日期**: 2025-10-24
**维护者**: Claude Code
