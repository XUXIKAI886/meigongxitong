import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; filename: string } }
) {
  try {
    const { category, filename } = await params;
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') || 'avatar'; // 默认为头像

    // 解码URL参数
    const decodedCategory = decodeURIComponent(category);
    const decodedFilename = decodeURIComponent(filename);

    // 根据模板类型确定目录
    const templateDirs = {
      avatar: path.join(process.cwd(), 'logo模板'),
      storefront: path.join(process.cwd(), '店招模板'),
      poster: path.join(process.cwd(), '海报模板')
    };

    const templateDir = templateDirs[templateType as keyof typeof templateDirs];
    if (!templateDir) {
      return NextResponse.json(
        { error: '无效的模板类型' },
        { status: 400 }
      );
    }

    // 构建文件路径
    const filePath = path.join(templateDir, decodedCategory, decodedFilename);

    // 安全检查：确保文件路径在对应模板目录内
    const resolvedPath = path.resolve(filePath);
    const resolvedTemplatesDir = path.resolve(templateDir);

    if (!resolvedPath.startsWith(resolvedTemplatesDir)) {
      return NextResponse.json(
        { error: '非法的文件路径' },
        { status: 403 }
      );
    }

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: `${templateType}模板文件不存在` },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = await fs.readFile(filePath);

    // 确定文件类型
    const ext = path.extname(decodedFilename).toLowerCase();
    let contentType = 'image/jpeg'; // 默认

    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    // 设置缓存头
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', contentType);
    response.headers.set('Cache-Control', 'public, max-age=31536000'); // 缓存1年
    response.headers.set('Content-Disposition', `inline; filename="${decodedFilename}"`);

    return response;

  } catch (error) {
    console.error('获取Logo模板文件失败:', error);

    return NextResponse.json(
      {
        error: '获取Logo模板文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}