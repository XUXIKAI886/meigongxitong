import { NextRequest } from 'next/server';
import { createCozeApiClient } from '@/lib/api';

/**
 * POST /api/coze/generate-dish
 * 功能：调用Coze机器人1生成菜品图（流式响应）
 *
 * 请求体：
 * {
 *   prompt: string;  // 优化后的提示词
 * }
 *
 * 响应：Server-Sent Events (SSE) 流式响应
 * - data: { imageUrl?: string; imageBase64?: string } // 图片生成完成
 * - data: [DONE] // 流结束
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    // 验证必填字段
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ ok: false, error: '缺少提示词或格式错误' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证提示词长度
    if (prompt.length < 5) {
      return new Response(
        JSON.stringify({ ok: false, error: '提示词过短，请提供更详细的描述' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (prompt.length > 2000) {
      return new Response(
        JSON.stringify({ ok: false, error: '提示词过长，请控制在2000字符以内' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建Coze客户端
    const cozeClient = createCozeApiClient();

    console.log('[API] 开始生成菜品图（流式）:', {
      promptLength: prompt.length,
      preview: prompt.substring(0, 100) + '...',
    });

    // 调用流式API
    const stream = await cozeClient.generateDishImageStream({ prompt });

    // 解析SSE流并提取图片
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let isFirstChunk = true;
        let currentEvent = '';
        let currentData = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('[API] 菜品图生成SSE流读取完成');
              controller.close();
              break;
            }

            // 解码新数据
            buffer += decoder.decode(value, { stream: true });

            // 处理SSE事件（按行分割）
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              // 空行表示事件结束
              if (line.trim() === '') {
                if (currentData) {
                  try {
                    const data = JSON.parse(currentData);

                    // 第一个数据块：检查错误
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

                    console.log('[API] 完整事件:', currentEvent, '数据类型:', data.type || data.event);

                    // 处理消息完成事件（包含图片）
                    if (currentEvent === 'conversation.message.completed' || data.event === 'conversation.message.completed') {
                      if (data.type === 'answer' && data.content) {
                        console.log('[API] 收到图片内容（前100字符）:', data.content.substring(0, 100));

                        // 判断内容类型
                        const content = data.content;
                        let imageResult: any = {};

                        // 提取Markdown链接中的URL：[文本](URL)
                        const markdownLinkMatch = content.match(/\[.*?\]\((https?:\/\/[^\)]+)\)/);
                        if (markdownLinkMatch && markdownLinkMatch[1]) {
                          console.log('[API] 从Markdown提取URL:', markdownLinkMatch[1]);
                          imageResult.imageUrl = markdownLinkMatch[1];
                        } else if (content.startsWith('http://') || content.startsWith('https://')) {
                          // 直接是URL
                          imageResult.imageUrl = content;
                        } else if (content.startsWith('data:image')) {
                          // base64 Data URI
                          imageResult.imageBase64 = content;
                        } else if (content.length > 100 && !content.includes('http')) {
                          // 可能是纯base64（长度>100且不含http）
                          imageResult.imageBase64 = `data:image/png;base64,${content}`;
                        } else {
                          // 未知格式，记录并跳过
                          console.warn('[API] 未知的内容格式:', content.substring(0, 200));
                          return; // 跳过这个事件
                        }

                        const sseMessage = `data: ${JSON.stringify(imageResult)}\n\n`;
                        controller.enqueue(new TextEncoder().encode(sseMessage));
                      }
                    } else if (currentEvent === 'conversation.chat.completed' || data.event === 'conversation.chat.completed') {
                      console.log('[API] 菜品图生成对话完成');
                      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                      controller.close();
                      return;
                    } else if (currentEvent === 'conversation.chat.failed' || data.event === 'conversation.chat.failed') {
                      console.error('[API] Coze对话失败:', data);
                      console.error('[API] 完整错误:', JSON.stringify(data.last_error, null, 2));
                      const errorMsg = data.last_error?.msg || `错误码: ${data.last_error?.code}` || 'Coze对话失败';
                      controller.error(new Error(errorMsg));
                      return;
                    }
                  } catch (parseError) {
                    console.warn('[API] JSON解析失败:', currentData.substring(0, 100), parseError);
                  }

                  currentEvent = '';
                  currentData = '';
                }
                continue;
              }

              // 解析事件行
              if (line.startsWith('event:')) {
                currentEvent = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                currentData += line.substring(5).trim();
              }
            }
          }
        } catch (error) {
          console.error('[API] 菜品图生成SSE流处理错误:', error);
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
    console.error('[API] 生成菜品图失败:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || '生成菜品图失败，请稍后重试',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 配置Route Segment - 设置超时时间
export const maxDuration = 120; // 120秒（2分钟）
