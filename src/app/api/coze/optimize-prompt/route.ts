import { NextRequest } from 'next/server';
import { createCozeApiClient } from '@/lib/api';

/**
 * POST /api/coze/optimize-prompt
 * 功能：调用Coze机器人2优化提示词（流式响应）
 *
 * 请求体：
 * {
 *   description: string;      // 菜品描述
 *   imageBase64?: string;     // 可选的原图base64（不含data:前缀）
 * }
 *
 * 响应：Server-Sent Events (SSE) 流式文本
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, imageBase64 } = body;

    // 验证必填字段
    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ ok: false, error: '缺少菜品描述或格式错误' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证描述长度
    if (description.length > 500) {
      return new Response(
        JSON.stringify({ ok: false, error: '菜品描述不能超过500字符' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建Coze客户端
    const cozeClient = createCozeApiClient();

    console.log('[API] 开始优化提示词（流式）:', {
      descriptionLength: description.length,
      hasImage: !!imageBase64,
    });

    // 调用流式API
    const stream = await cozeClient.optimizePromptStream({
      description,
      imageBase64,
    });

    // 检查响应头，判断是否真的是SSE流
    // 注意：stream是ReadableStream，我们需要先读取一部分来检查错误

    // 解析SSE流并转发到前端
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let isFirstChunk = true;
        let currentEvent = ''; // 当前事件类型
        let currentData = ''; // 当前事件数据（可能跨多行）

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('[API] SSE流读取完成');
              controller.close();
              break;
            }

            // 解码新数据
            buffer += decoder.decode(value, { stream: true });

            // 处理SSE事件（按行分割）
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后一个不完整的行

            for (const line of lines) {
              // SSE格式：空行表示事件结束
              if (line.trim() === '') {
                // 事件结束，处理累积的数据
                if (currentData) {
                  try {
                    const data = JSON.parse(currentData);

                    // 第一个数据块：检查是否是JSON错误响应
                    if (isFirstChunk) {
                      isFirstChunk = false;
                      if (data.code && data.msg) {
                        console.error('[API] Coze API返回错误:', data);
                        const errorMsg = data.code === 4015
                          ? '机器人未发布到API频道，请在Coze平台发布后重试'
                          : data.msg || '未知错误';
                        controller.error(new Error(errorMsg));
                        return;
                      }
                    }

                    // 记录事件
                    console.log('[API] 完整事件:', currentEvent, '数据:', JSON.stringify(data).substring(0, 200));

                    // 处理不同类型的事件
                    if (currentEvent === 'conversation.message.delta' || data.event === 'conversation.message.delta') {
                      if (data.content) {
                        console.log('[API] 收到增量内容:', data.content.substring(0, 50));
                        const sseMessage = `data: ${JSON.stringify({ content: data.content })}\n\n`;
                        controller.enqueue(new TextEncoder().encode(sseMessage));
                      }
                    } else if (currentEvent === 'conversation.message.completed' || data.event === 'conversation.message.completed') {
                      // conversation.message.completed 事件包含type和content
                      // type="answer"才是真正的回答，type="verbose"是额外信息（如建议问题）
                      if (data.type === 'answer' && data.content) {
                        console.log('[API] 收到完整消息（answer）:', data.content.substring(0, 50));
                        const sseMessage = `data: ${JSON.stringify({ content: data.content })}\n\n`;
                        controller.enqueue(new TextEncoder().encode(sseMessage));
                      } else if (data.type === 'verbose') {
                        console.log('[API] 收到verbose类型消息（已忽略）:', data.content?.substring(0, 50));
                        // 忽略verbose类型的消息，这些是建议问题等额外信息
                      }
                    } else if (currentEvent === 'conversation.chat.completed' || data.event === 'conversation.chat.completed') {
                      console.log('[API] 对话完成');
                      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                      controller.close();
                      return;
                    } else if (currentEvent === 'conversation.chat.failed' || data.event === 'conversation.chat.failed') {
                      console.error('[API] Coze对话失败:', data);
                      console.error('[API] 完整错误:', JSON.stringify(data.last_error, null, 2));
                      const errorMsg = data.last_error?.msg || `错误码: ${data.last_error?.code}` || 'Coze对话失败';
                      controller.error(new Error(errorMsg));
                      return;
                    } else if (currentEvent === 'conversation.chat.created' || data.event === 'conversation.chat.created') {
                      console.log('[API] 对话已创建:', data.id);
                    } else if (currentEvent === 'conversation.chat.in_progress' || data.event === 'conversation.chat.in_progress') {
                      console.log('[API] 对话进行中...');
                    } else if (currentEvent || data.event) {
                      console.log('[API] 其他事件:', currentEvent || data.event);
                    }
                  } catch (parseError) {
                    console.warn('[API] JSON解析失败:', currentData.substring(0, 100), parseError);
                  }

                  // 重置当前事件
                  currentEvent = '';
                  currentData = '';
                }
                continue;
              }

              // 解析事件行
              if (line.startsWith('event:')) {
                currentEvent = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                // 累积data数据（可能跨多行）
                const dataPart = line.substring(5).trim();
                currentData += dataPart;
              }
            }
          }
        } catch (error) {
          console.error('[API] SSE流处理错误:', error);
          controller.error(error);
        }
      },
    });

    // 返回SSE响应
    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[API] 优化提示词失败:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || '优化提示词失败',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 配置Route Segment - 增加超时时间以支持流式响应
export const maxDuration = 120; // 120秒（2分钟）
