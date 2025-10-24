# Coze 接口(Coze API) 调用流程说明

本文档整理当前项目内的 Coze 接口调用链路，便于在新项目中快速复用或移植。内容基于 `src/hooks/useChat.ts`, `src/lib/api.ts`, `src/config/api.ts`, `src/config/models.ts` 等文件的实际实现。

## 1. 模块职责总览

- `src/hooks/useChat.ts`：封装聊天交互逻辑，负责调度不同模型提供方的接口，Coze 流程在此被选中并传入流式回调。
- `src/lib/api.ts`：提供 Coze 请求的全部实现，包括消息格式转换、文件上传、HTTP 请求、流式解析以及轮询兜底。
- `src/config/api.ts`：维护 Coze 服务端点、密钥、用户标识等基础配置。
- `src/config/models.ts`：定义各业务机器人与模型的对应关系，通过 `provider: 'coze'` 标记使用 Coze 接口。
- `src/components/sidebar/BotSelector.tsx`：列出可选机器人，切换时更新 `useChatStore` 中的 `selectedModelId`，由 `useChat` 读取后决定调用 Coze。

## 2. 前置配置

| 配置项 | 说明 | 位置 |
| --- | --- | --- |
| `NEXT_PUBLIC_COZE_API_KEY` | Coze 密钥，需替换为真实值 | `.env.example` |
| `COZE_CONFIG.baseUrl` | 默认为 `https://api.coze.cn/v3` | `src/config/api.ts` |
| `COZE_CONFIG.userId` | 随机生成 `user_***` 的临时用户 ID | `src/config/api.ts` |
| `COZE_ENDPOINTS` | 聊天、会话轮询、消息列表端点 | `src/config/api.ts` |
| `getBotIdByModel` | 从模型 ID 映射到具体 Bot ID | `src/lib/api.ts` |

> ⚠️ 当前项目在 `src/config/api.ts` 内硬编码了默认密钥，仅用于开发演示，生产环境必须通过环境变量注入。

## 3. 调用链路概述

1. 用户在 `MessageInput` 触发发送，`useChat.sendMessage` 会：
   - 将用户消息追加到 `useChatStore`。
   - 添加一个空的助手消息占位并记录其 ID。
   - 根据 `selectedModelId` 查找模型信息，若 `provider === 'coze'`，选择 `callCozeAPIStream`。
2. `callCozeAPIStream` 负责以下步骤：
   - 如有图片文件，先调用 `uploadFileToCoze` 上传，收集返回的 `file_id`。
   - 使用 `convertToCozeFormat` 将消息转换为 Coze 期望结构。
   - 组装 `CozeChatRequest`，通过 `fetch` 调用 `COZE_ENDPOINTS.CHAT`，请求头携带 `Bearer` 令牌，`Accept: text/event-stream` 以获取流式响应。
   - 解析服务端发回的 Server-Sent Events(SSE)，按事件类型增量组合文本，并调用外部的 `onChunk`、`onComplete`、`onError`。
3. `useChat` 在回调内通过 `updateMessage` 更新占位消息，实现前端的实时渲染。

下图展示关键调用顺序（伪序列）：

```
MessageInput -> useChat.sendMessage
  -> useChatStore.addMessage (user)
  -> useChatStore.addMessage (assistant placeholder)
  -> callCozeAPIStream(messages, modelId, onChunk, onComplete, onError, files)
       -> uploadFileToCoze(files?)
       -> convertToCozeFormat(messages, fileIds)
       -> fetch(COZE_ENDPOINTS.CHAT, SSE)
            -> onChunk(cleanMarkdownSyntax(accumulatedContent))
            -> onComplete()
```

## 4. 消息与文件处理

- `convertToCozeFormat` 过滤掉 `system` 角色，仅保留 `user` / `assistant`。
- 若末尾的用户消息附带文件，则组合成 `object_string`，结构示例：

```json
[
  { "type": "text", "text": "请分析这些图片" },
  { "type": "image", "file_id": "12345" },
  { "type": "image", "file_id": "67890" }
]
```

- 纯文本消息保持 `content_type: "text"`。

文件上传流程：

1. `uploadFileToCoze` 使用 `FormData` 调用 `https://api.coze.cn/v1/files/upload`。
2. 校验响应 `code === 0`，返回 `data.id` 作为 `file_id`。
3. 上传失败会中断流程并向 `useChat` 反馈错误。

## 5. 请求结构与字段

`CozeChatRequest` 核心字段如下：

| 字段 | 含义 |
| --- | --- |
| `bot_id` | 业务机器人 ID，由 `getBotIdByModel` 根据模型映射获得 |
| `user_id` | 会话用户标识，当前实现为随机前缀 |
| `stream` | 是否使用流式响应，项目中入口使用 `true` |
| `auto_save_history` | 是否在 Coze 侧保留会话历史 |
| `additional_messages` | 转换后的消息数组 |

若想在新项目中追踪上下文，可将 `conversation_id` 持久化并传入 Coze 以复用历史。

## 6. 流式响应解析

Coze 返回的 SSE 事件中，项目关注以下类型：

- `conversation.message.delta`：携带增量文本，字段 `content` 为本次追加内容，`id` 标识消息，逻辑会合并为完整回答并清洗 Markdown。
- `conversation.message.completed`：给出最终答案，触发一次 `onChunk` 补齐完整内容。
- `conversation.chat.completed` / `done`：对话结束，调用 `onComplete`。
- `conversation.chat.failed`：表示生成失败，抛出错误信息。

解析过程中通过 `cleanMarkdownSyntax` 去除标题、代码块等复杂标记，以便在文本输入框内实时展示。若需要保留 Markdown，可移除这一处理。

## 7. 非流式兜底

`callCozeAPI` 提供非流式实现，流程与流式版本相同，但：

- 请求头改为 `Accept: application/json`。
- 返回值为字符串，若响应状态为 `in_progress`，通过 `pollCozeResult` 轮询 `COZE_ENDPOINTS.RETRIEVE_CHAT`，随后使用 `getCozeMessages` 拉取最终消息列表。

当前主流程默认使用流式接口，如需快速验证可调用 `testCozeAPIConnection`。

## 8. 前端状态更新

- `useChatStore.updateMessage` 会在 `onChunk` 中写入最新内容，并把 `isStreaming` 标记为 `true`。
- `onComplete` 将 `isStreaming` 置为 `false` 并清理 `streamingMessageId`，`MessageInput` 根据 `isLoading` / `error` 控制发送按钮与错误提示。
- 侧边栏切换机器人后，下次发送会立即走新的 `bot_id`。

## 9. 集成建议

1. **环境安全**：生产环境必须依赖 `.env` 配置密钥，避免硬编码；同时为上传接口配置单独的权限控制。
2. **Bot 映射**：整理一份机器人清单并封装在配置层，保持 `id` 与 `bot_id` 一致性。
3. **错误兜底**：保留 `callCozeAPI` 和 `pollCozeResult` 以防止流式接口不可用时回退。
4. **Markdown 渲染**：若目标项目需要保留富文本，考虑在 `onChunk` 中直接透传，并在前端使用 `react-markdown` 渲染。
5. **日志裁剪**：目前实现包含大量调试日志，上线前应移除或降级为可控的调试开关。

## 10. 参考代码清单

- `src/hooks/useChat.ts`：发送消息与回调绑定。
- `src/lib/api.ts`：`callCozeAPIStream`、`callCozeAPI`、`uploadFileToCoze`、`convertToCozeFormat`、`pollCozeResult`、`getCozeMessages`。
- `src/config/api.ts`：Coze 端点与默认配置。
- `src/config/models.ts`：模型到 Bot 的映射信息。
- `src/components/sidebar/BotSelector.tsx`：可用机器人列表及 UI。

如需进一步扩展，如增加会话创建接口或自定义用户 ID，可在现有 `CozeChatRequest` 基础上添加对应字段。
