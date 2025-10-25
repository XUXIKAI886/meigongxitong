import { NextRequest, NextResponse } from 'next/server';
import { createCozeApiClient } from '@/lib/api';
import type { CutoutImageRequest, CutoutImageResponse } from '@/types/coze';

/**
 * POST /api/coze/cutout-image
 * 功能：调用Coze API进行图片抠图（移除背景，保留食物主体）
 *
 * 请求体：
 * {
 *   imageBase64: string;  // 原图的base64编码（不含data:image前缀）
 * }
 *
 * 响应：Server-Sent Events (SSE) 流式响应
 * data: { imageUrl: string } 或 { imageBase64: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await request.json();
    const { imageBase64 } = body as CutoutImageRequest;

    console.log('[Coze Cutout] 收到抠图请求');

    // 2. 参数验证
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({
        ok: false,
        error: '缺少图片数据或格式错误'
      }, { status: 400 });
    }

    console.log('[Coze Cutout] 参数验证通过，图片base64长度:', imageBase64.length);

    // 3. 创建Coze客户端
    const cozeClient = createCozeApiClient();

    // 4. 将base64转换为Blob并上传到Coze获取file_id
    console.log('[Coze Cutout] 开始上传图片到Coze...');
    const buffer = Buffer.from(imageBase64, 'base64');
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const fileId = await cozeClient.uploadFile(blob);
    console.log('[Coze Cutout] 图片上传成功，file_id:', fileId);

    // 5. 构造抠图提示词
    const CUTOUT_PROMPT = `请对这张图片进行精确抠图处理，要求如下：
1. 识别并保留图片中的所有食物主体
2. 完全移除背景，包括盘子、餐具、桌面、装饰物等非食物元素
3. 精确处理食物边缘，保持自然的轮廓和细节
4. 保留食物的完整质感、光影和色彩
5. 对于有汤汁、酱料的食物，保留与食物紧密相连的部分
6. 输出透明背景的PNG格式图片
7. 确保抠图边缘干净、无毛边、无残留背景

请以最高精度处理，让食物主体清晰完整地呈现在透明背景上。`;

    // 6. 调用抠图API（SSE流式响应）
    const stream = await cozeClient.cutoutImageStream(fileId, CUTOUT_PROMPT);
    console.log('[Coze Cutout] SSE流已建立');

    // 7. 转换为前端可用的SSE格式
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        console.log('[Coze Cutout] 开始读取SSE流');

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('[Coze Cutout] SSE流读取完成');
              controller.close();
              break;
            }

            // 解码数据
            buffer += decoder.decode(value, { stream: true });

            // 按行分割
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              // 空行表示事件边界
              if (line.trim() === '') {
                if (currentData) {
                  try {
                    const data = JSON.parse(currentData);
                    console.log('[Coze Cutout] 解析到完整事件:', {
                      event: currentEvent,
                      dataPreview: JSON.stringify(data).substring(0, 100)
                    });

                    // 仅处理conversation.message.completed事件
                    if (currentEvent === 'conversation.message.completed') {
                      console.log('[Coze Cutout] 收到message.completed事件:', {
                        type: data.type,
                        role: data.role,
                        contentPreview: data.content?.substring(0, 100)
                      });

                      if (data.type === 'answer') {
                        console.log('[Coze Cutout] 收到answer类型消息');
                        const content = data.content;

                        let imageResult: any = {};

                        // 提取图片URL（支持多种格式）
                        // 1. Markdown链接：[文本](URL)
                        const markdownLinkMatch = content.match(/\[.*?\]\((https?:\/\/[^\)]+)\)/);
                        if (markdownLinkMatch && markdownLinkMatch[1]) {
                          console.log('[Coze Cutout] 从Markdown提取URL:', markdownLinkMatch[1]);
                          imageResult.imageUrl = markdownLinkMatch[1];
                        }
                        // 2. 文本中的URL（最常见）
                        else {
                          const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
                          if (urlMatch && urlMatch[1]) {
                            console.log('[Coze Cutout] 从文本中提取URL:', urlMatch[1]);
                            imageResult.imageUrl = urlMatch[1];
                          }
                          // 3. base64 Data URI
                          else if (content.includes('data:image')) {
                            const dataUriMatch = content.match(/(data:image[^"'\s]+)/);
                            if (dataUriMatch && dataUriMatch[1]) {
                              console.log('[Coze Cutout] 提取到base64 Data URI');
                              imageResult.imageBase64 = dataUriMatch[1];
                            }
                          }
                        }

                        // 转发给前端
                        if (imageResult.imageUrl || imageResult.imageBase64) {
                          const sseMessage = `data: ${JSON.stringify(imageResult)}\n\n`;
                          controller.enqueue(new TextEncoder().encode(sseMessage));
                          console.log('[Coze Cutout] 已转发图片数据给前端');
                        }
                      } else if (data.type === 'verbose') {
                        console.log('[Coze Cutout] 收到verbose类型消息（已忽略）');
                      }
                    }

                  } catch (parseError) {
                    console.warn('[Coze Cutout] JSON解析失败:', currentData.substring(0, 100), parseError);
                  }

                  // 重置状态
                  currentEvent = '';
                  currentData = '';
                }
              }
              // 解析event行
              else if (line.startsWith('event:')) {
                currentEvent = line.substring(6).trim();
              }
              // 解析data行（累积多行JSON）
              else if (line.startsWith('data:')) {
                currentData += line.substring(5).trim();
              }
            }
          }
        } catch (error) {
          console.error('[Coze Cutout] SSE流处理错误:', error);
          controller.error(error);
        }
      },
    });

    console.log('[Coze Cutout] 返回转换后的SSE流给前端');

    // 8. 返回SSE流
    return new NextResponse(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[Coze Cutout] 抠图处理失败:', error);
    return NextResponse.json({
      ok: false,
      error: error.message || '抠图处理失败',
    }, { status: 500 });
  }
}

// 配置Route Segment - 增加超时时间以支持SSE流式响应和文件上传
export const maxDuration = 300; // 5分钟
