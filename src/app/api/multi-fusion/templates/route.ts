import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    // 使用背景融合工具的模板目录
    const templatesDir = path.join(process.cwd(), 'shiwutihuangongju');

    // 检查目录是否存在
    if (!fs.existsSync(templatesDir)) {
      return NextResponse.json({
        success: true,
        templates: []
      });
    }

    // 读取模板目录中的所有图片文件
    const files = await readdir(templatesDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    const templates = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map((file, index) => ({
        id: index + 1,
        name: path.basename(file, path.extname(file)),
        filename: file,
        url: `/api/background-fusion/templates/${encodeURIComponent(file)}`  // 使用背景融合工具的API路径
      }));

    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Templates API error:', error);
    return NextResponse.json(
      { error: 'Failed to load templates' },
      { status: 500 }
    );
  }
}
