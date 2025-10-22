import path from 'path';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

/**
 * 解析模板 URL 并返回对应的本地文件路径。
 * @param templateUrl 模板文件的内部访问地址，例如 /api/templates/foo.png
 * @param mappings URL 前缀与本地目录的映射关系
 */
export function resolveTemplateFromUrl(
  templateUrl: string,
  mappings: Array<{ prefix: string; rootDir: string }>
): string {
  if (!templateUrl) {
    throw new Error('模板地址不能为空');
  }

  const normalizedUrl = templateUrl.split('?')[0];
  if (!normalizedUrl.startsWith('/')) {
    throw new Error('模板地址必须是站内路径');
  }

  for (const mapping of mappings) {
    if (normalizedUrl.startsWith(mapping.prefix)) {
      const filenamePart = normalizedUrl.slice(mapping.prefix.length);
      if (!filenamePart) {
        throw new Error('模板文件名缺失');
      }
      const decodedFilename = decodeURIComponent(filenamePart);
      return resolveTemplateFile(mapping.rootDir, decodedFilename);
    }
  }

  throw new Error('未找到匹配的模板目录');
}

/**
 * 根据模板目录和文件名生成安全的绝对路径。
 * @param rootDir 模板所在的根目录
 * @param filename 模板文件名
 */
export function resolveTemplateFile(rootDir: string, filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    throw new Error('模板文件名不能为空');
  }

  if (trimmed.includes('\0')) {
    throw new Error('模板文件名包含非法字符');
  }

  const sanitized = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
  if (sanitized.includes('..')) {
    throw new Error('模板路径不合法');
  }

  const ext = path.extname(sanitized).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error('模板文件类型不受支持');
  }

  const basePath = path.resolve(process.cwd(), rootDir);
  const absolutePath = path.resolve(basePath, sanitized);
  const normalizedBase = basePath.endsWith(path.sep) ? basePath : `${basePath}${path.sep}`;

  if (!absolutePath.startsWith(normalizedBase)) {
    throw new Error('模板路径越界');
  }

  return absolutePath;
}
