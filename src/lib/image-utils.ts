// ⚠️ Sharp 延迟加载: 避免在Vercel部署时立即加载Sharp模块
// Sharp是可选依赖,只在实际使用图片处理功能时才加载
let sharp: typeof import('sharp') | null = null;

async function getSharp() {
  if (!sharp) {
    try {
      sharp = (await import('sharp')).default;
    } catch (error) {
      throw new Error('Sharp module not available. Please install sharp or use alternative image processing.');
    }
  }
  return sharp;
}

// Size parsing and validation
export function parseSize(sizeString: string): { width: number; height: number } {
  const [width, height] = sizeString.split('x').map(Number);
  if (!width || !height || width <= 0 || height <= 0) {
    throw new Error(`Invalid size format: ${sizeString}`);
  }
  return { width, height };
}

export function formatSize(width: number, height: number): string {
  return `${width}x${height}`;
}

// Image processing utilities
export async function resizeImage(
  inputBuffer: Buffer,
  targetWidth: number,
  targetHeight: number,
  options: {
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    background?: { r: number; g: number; b: number; alpha?: number };
  } = {}
): Promise<Buffer> {
  const { fit = 'cover', background = { r: 255, g: 255, b: 255, alpha: 1 } } = options;
  const sharpInstance = await getSharp();

  return await sharpInstance(inputBuffer)
    .resize(targetWidth, targetHeight, { fit, background })
    .png()
    .toBuffer();
}

export async function cropImage(
  inputBuffer: Buffer,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Buffer> {
  const sharpInstance = await getSharp();
  return await sharpInstance(inputBuffer)
    .extract({ left: x, top: y, width, height })
    .png()
    .toBuffer();
}

export async function removeBackground(inputBuffer: Buffer): Promise<Buffer> {
  // This is a placeholder - in a real implementation, you would use
  // a background removal service or library
  // For now, we'll just return the original image
  return inputBuffer;
}

export async function addBackground(
  foregroundBuffer: Buffer,
  backgroundBuffer: Buffer
): Promise<Buffer> {
  const sharpInstance = await getSharp();
  return await sharpInstance(backgroundBuffer)
    .composite([{ input: foregroundBuffer }])
    .png()
    .toBuffer();
}

export async function enhanceImage(
  inputBuffer: Buffer,
  options: { sharpen?: boolean; denoise?: boolean } = {}
): Promise<Buffer> {
  const sharpInstance = await getSharp();
  let image = sharpInstance(inputBuffer);

  if (options.sharpen) {
    image = image.sharpen();
  }

  if (options.denoise) {
    // Basic noise reduction using blur and unsharp mask
    image = image.blur(0.5).sharpen();
  }

  return await image.png().toBuffer();
}

// File validation
export function validateImageFile(file: Express.Multer.File): void {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
}

// Convert image to base64
export function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Convert base64 to buffer
export function base64ToBuffer(base64String: string): Buffer {
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Get image dimensions
export async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  const sharpInstance = await getSharp();
  const metadata = await sharpInstance(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not determine image dimensions');
  }
  return { width: metadata.width, height: metadata.height };
}

// Validate image dimensions
export function validateImageDimensions(
  actual: { width: number; height: number },
  expected: { width: number; height: number },
  tolerance: number = 0.02
): boolean {
  const widthDiff = Math.abs(actual.width - expected.width) / expected.width;
  const heightDiff = Math.abs(actual.height - expected.height) / expected.height;
  
  return widthDiff <= tolerance && heightDiff <= tolerance;
}
