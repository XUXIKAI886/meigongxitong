/**
 * 通用图片下载工具 - 兼容 Web 和 Tauri 环境
 *
 * 根据文档 MEIGONG_DESIGN_DOWNLOAD_FIX.md 实现
 */

// 扩展 Window 接口以支持 Tauri
declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke: (cmd: string, args?: any) => Promise<any>;
      };
    };
  }
}

/**
 * 检测是否在 Tauri 桌面环境中运行
 */
export function isTauriEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.__TAURI__ !== 'undefined' &&
    typeof window.__TAURI__.core !== 'undefined'
  );
}

/**
 * 通用图片下载函数 - 兼容 Web 和 Tauri 环境
 *
 * @param imageDataUrl - 图片的 Base64 Data URL 或 Blob URL
 * @param filename - 保存的文件名（默认: design.png）
 * @returns Promise<boolean> - 下载是否成功
 */
export async function downloadImage(
  imageDataUrl: string,
  filename: string = 'design.png'
): Promise<boolean> {
  if (isTauriEnvironment()) {
    // Tauri 桌面环境 - 使用原生保存对话框
    try {
      console.log('🖼️ [Tauri] 开始保存图片:', filename);

      // 1. 调用 Tauri 保存文件对话框 - Dialog API 必须使用 options 对象包裹
      const filePath = await (window as any).__TAURI__.core.invoke('plugin:dialog|save', {
        options: {  // ← 关键: Dialog API 必须有 options 包裹
          defaultPath: filename,
          title: '保存图片',
          filters: [{
            name: '图片文件',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
          }]
        }
      });

      if (!filePath) {
        console.log('⚠️ 用户取消了保存');
        return false;
      }

      console.log('📁 选择的保存路径:', filePath);

      // 2. 将 Base64 转换为二进制数据
      let binaryData: string;
      if (imageDataUrl.startsWith('data:image')) {
        // Data URL 格式: data:image/png;base64,xxxxx
        const base64Data = imageDataUrl.split(',')[1];
        binaryData = atob(base64Data);
      } else if (imageDataUrl.startsWith('blob:')) {
        // Blob URL 格式 - 需要先转换
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        binaryData = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(atob(base64));
          };
          reader.readAsDataURL(blob);
        });
      } else {
        throw new Error('不支持的图片格式');
      }

      // 3. 转换为字节数组
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      console.log('💾 准备写入文件, 大小:', bytes.length, 'bytes');

      // 4. 写入文件 - FS API 使用特殊的 3 参数格式!
      // 参数1: 命令名, 参数2: Uint8Array 数据, 参数3: 配置对象
      await (window as any).__TAURI__.core.invoke(
        'plugin:fs|write_file',  // 第1个参数: 命令名
        bytes,                    // 第2个参数: Uint8Array 数据
        {                         // 第3个参数: 配置对象
          headers: {
            path: encodeURIComponent(filePath),
            options: JSON.stringify({})
          }
        }
      );

      console.log('✅ [Tauri] 图片保存成功!');
      alert('图片保存成功!\n保存位置: ' + filePath);
      return true;

    } catch (error) {
      console.error('❌ [Tauri] 保存失败:', error);
      console.error('错误详情:', error instanceof Error ? error.message : String(error));
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
      return false;
    }
  } else {
    // Web 浏览器环境 - 使用传统下载方法
    try {
      const link = document.createElement('a');
      link.href = imageDataUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 如果是 blob URL，需要延迟释放
      if (imageDataUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(imageDataUrl), 100);
      }

      return true;
    } catch (error) {
      console.error('❌ [Web] 下载失败:', error);
      return false;
    }
  }
}

/**
 * 下载远程图片
 *
 * @param imageUrl - 远程图片 URL
 * @param filename - 保存的文件名
 * @returns Promise<boolean> - 下载是否成功
 */
export async function downloadRemoteImage(
  imageUrl: string,
  filename: string
): Promise<boolean> {
  try {
    // 1. 获取图片数据
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // 2. 转换为 Data URL
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    // 3. 使用兼容下载函数
    return await downloadImage(dataUrl, filename);
  } catch (error) {
    console.error('下载远程图片失败:', error);
    alert('下载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    return false;
  }
}

/**
 * 从 Canvas 下载图片
 *
 * @param canvas - HTMLCanvasElement
 * @param filename - 保存的文件名
 * @param mimeType - 图片 MIME 类型（默认: image/png）
 * @returns Promise<boolean> - 下载是否成功
 */
export async function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  filename: string = 'design.png',
  mimeType: string = 'image/png'
): Promise<boolean> {
  const imageUrl = canvas.toDataURL(mimeType);
  return await downloadImage(imageUrl, filename);
}

/**
 * 调整图片尺寸（拉伸缩放，可能变形）
 *
 * @param imageUrl - 原始图片URL
 * @param targetWidth - 目标宽度
 * @param targetHeight - 目标高度
 * @returns Promise<string> - 调整后的图片 Data URL
 */
export async function resizeImage(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 创建图片对象
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 处理跨域问题

    img.onload = () => {
      try {
        // 创建 canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取 Canvas 上下文'));
          return;
        }

        // 绘制调整后的图片
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // 转换为 Data URL
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = imageUrl;
  });
}

/**
 * 居中裁剪图片到指定尺寸（保持比例，不变形）
 *
 * 算法说明：
 * 1. 计算原图和目标的宽高比
 * 2. 按照"覆盖"模式缩放（较大边完全填充目标尺寸）
 * 3. 从中心裁剪出目标尺寸
 *
 * @param imageUrl - 原始图片URL
 * @param targetWidth - 目标宽度
 * @param targetHeight - 目标高度
 * @returns Promise<string> - 裁剪后的图片 Data URL
 */
export async function cropImageCenter(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取 Canvas 上下文'));
          return;
        }

        // 计算缩放比例 - 使用"覆盖"模式（cover）
        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const sourceRatio = sourceWidth / sourceHeight;
        const targetRatio = targetWidth / targetHeight;

        let drawWidth: number;
        let drawHeight: number;
        let offsetX: number;
        let offsetY: number;

        if (sourceRatio > targetRatio) {
          // 原图更宽，按高度缩放，左右裁剪
          drawHeight = targetHeight;
          drawWidth = sourceWidth * (targetHeight / sourceHeight);
          offsetX = (targetWidth - drawWidth) / 2;
          offsetY = 0;
        } else {
          // 原图更高或比例相同，按宽度缩放，上下裁剪
          drawWidth = targetWidth;
          drawHeight = sourceHeight * (targetWidth / sourceWidth);
          offsetX = 0;
          offsetY = (targetHeight - drawHeight) / 2;
        }

        console.log(`🖼️ 居中裁剪参数:`, {
          原图尺寸: `${sourceWidth}×${sourceHeight}`,
          目标尺寸: `${targetWidth}×${targetHeight}`,
          绘制尺寸: `${drawWidth}×${drawHeight}`,
          偏移量: `${offsetX}, ${offsetY}`
        });

        // 绘制图片（居中裁剪）
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // 转换为 Data URL
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = imageUrl;
  });
}

/**
 * 下载并调整图片尺寸（拉伸缩放）
 *
 * @param imageUrl - 原始图片URL
 * @param targetWidth - 目标宽度
 * @param targetHeight - 目标高度
 * @param filename - 保存的文件名
 * @returns Promise<boolean> - 下载是否成功
 */
export async function downloadResizedImage(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number,
  filename: string
): Promise<boolean> {
  try {
    console.log(`📐 调整图片尺寸: ${targetWidth}x${targetHeight}`);

    // 1. 调整图片尺寸
    const resizedDataUrl = await resizeImage(imageUrl, targetWidth, targetHeight);

    // 2. 下载调整后的图片
    return await downloadImage(resizedDataUrl, filename);
  } catch (error) {
    console.error('调整图片尺寸失败:', error);
    alert('图片处理失败: ' + (error instanceof Error ? error.message : '未知错误'));
    return false;
  }
}

/**
 * 下载居中裁剪后的图片（保持比例，不变形）
 *
 * @param imageUrl - 原始图片URL
 * @param targetWidth - 目标宽度
 * @param targetHeight - 目标高度
 * @param filename - 保存的文件名
 * @returns Promise<boolean> - 下载是否成功
 */
export async function downloadCroppedImage(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number,
  filename: string
): Promise<boolean> {
  try {
    console.log(`✂️ 居中裁剪图片: ${targetWidth}x${targetHeight}`);

    // 1. 居中裁剪图片
    const croppedDataUrl = await cropImageCenter(imageUrl, targetWidth, targetHeight);

    // 2. 下载裁剪后的图片
    return await downloadImage(croppedDataUrl, filename);
  } catch (error) {
    console.error('裁剪图片失败:', error);
    alert('图片裁剪失败: ' + (error instanceof Error ? error.message : '未知错误'));
    return false;
  }
}

/**
 * 批量下载远程图片 - 只在第一次选择下载目录
 *
 * @param images - 图片列表 [{url: string, filename: string}]
 * @returns Promise<{success: number, failed: number}> - 下载统计
 */
export async function downloadRemoteImagesBatch(
  images: Array<{ url: string; filename: string }>
): Promise<{ success: number; failed: number }> {
  if (images.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  if (isTauriEnvironment()) {
    // Tauri 环境 - 只在第一次选择保存目录
    try {
      // 1. 第一次选择保存目录（选择文件夹）
      console.log('🖼️ [Tauri 批量下载] 请选择保存目录');

      const folderPath = await (window as any).__TAURI__.core.invoke('plugin:dialog|open', {
        options: {
          title: '选择批量保存目录',
          directory: true,  // 选择文件夹而不是文件
          multiple: false
        }
      });

      if (!folderPath) {
        console.log('⚠️ 用户取消了批量下载');
        return { success: 0, failed: 0 };
      }

      console.log('📁 选择的保存目录:', folderPath);

      // 2. 循环保存所有图片到选定的目录
      for (let i = 0; i < images.length; i++) {
        const { url, filename } = images[i];
        console.log(`📥 [${i + 1}/${images.length}] 下载: ${filename}`);

        try {
          // 2.1 获取图片数据
          const response = await fetch(url);
          const blob = await response.blob();

          // 2.2 转换为 Data URL
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          // 2.3 将 Base64 转换为二进制数据
          let binaryData: string;
          if (dataUrl.startsWith('data:image')) {
            const base64Data = dataUrl.split(',')[1];
            binaryData = atob(base64Data);
          } else {
            throw new Error('不支持的图片格式');
          }

          // 2.4 转换为字节数组
          const bytes = new Uint8Array(binaryData.length);
          for (let j = 0; j < binaryData.length; j++) {
            bytes[j] = binaryData.charCodeAt(j);
          }

          // 2.5 构建完整文件路径（确保路径分隔符正确）
          const fullPath = `${folderPath}\\${filename}`;
          console.log('💾 保存到:', fullPath);

          // 2.6 写入文件
          await (window as any).__TAURI__.core.invoke(
            'plugin:fs|write_file',
            bytes,
            {
              headers: {
                path: encodeURIComponent(fullPath),
                options: JSON.stringify({})
              }
            }
          );

          console.log(`✅ [${i + 1}/${images.length}] 保存成功: ${filename}`);
          success++;

          // 添加小延迟避免过快处理
          if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (error) {
          console.error(`❌ [${i + 1}/${images.length}] 保存失败:`, error);
          failed++;
        }
      }

      // 3. 显示批量下载结果
      alert(
        `批量下载完成!\n` +
        `保存位置: ${folderPath}\n` +
        `成功: ${success}/${images.length}\n` +
        (failed > 0 ? `失败: ${failed}` : '')
      );

      return { success, failed };

    } catch (error) {
      console.error('❌ [Tauri 批量下载] 失败:', error);
      alert('批量下载失败: ' + (error instanceof Error ? error.message : '未知错误'));
      return { success, failed };
    }

  } else {
    // Web 浏览器环境 - 逐个下载
    console.log('🌐 [Web 批量下载] 开始逐个下载');

    for (let i = 0; i < images.length; i++) {
      const { url, filename } = images[i];
      try {
        const result = await downloadRemoteImage(url, filename);
        if (result) {
          success++;
        } else {
          failed++;
        }

        // 添加延迟避免浏览器限制
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`下载失败 [${i + 1}/${images.length}]:`, error);
        failed++;
      }
    }

    return { success, failed };
  }
}

/**
 * 测试 Tauri 保存对话框（用于调试）
 */
export async function testTauriSaveDialog(): Promise<void> {
  if (!isTauriEnvironment()) {
    console.log('当前不在 Tauri 环境中');
    return;
  }

  try {
    const path = await (window as any).__TAURI__.core.invoke('plugin:dialog|save', {
      options: {
        defaultPath: 'test.png',
        filters: [{ name: '图片', extensions: ['png'] }]
      }
    });
    console.log('选择的路径:', path);
  } catch (err) {
    console.error('对话框失败:', err);
  }
}
