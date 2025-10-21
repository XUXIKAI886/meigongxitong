import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), '饿了么产品图模板');

    // 检查模板目录是否存在
    if (!fs.existsSync(templatesDir)) {
      return NextResponse.json({ templates: [] });
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(templatesDir);

    // 过滤出图片文件
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    // 生成模板信息
    const templates = imageFiles.map((file, index) => {
      const filePath = path.join(templatesDir, file);
      const stats = fs.statSync(filePath);

      return {
        id: `eleme-template-${index + 1}`,
        name: path.parse(file).name,
        filename: file,
        url: `/api/eleme-templates/${encodeURIComponent(file)}`,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        platform: 'eleme', // 标记为饿了么模板
      };
    });

    return NextResponse.json({
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('Error reading Eleme templates:', error);
    return NextResponse.json(
      { error: 'Failed to load Eleme templates' },
      { status: 500 }
    );
  }
}
