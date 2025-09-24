import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), 'shiwutihuangongju');
    
    // 检查目录是否存在
    if (!fs.existsSync(templatesDir)) {
      return NextResponse.json({ templates: [] });
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(templatesDir);
    
    // 过滤图片文件
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    // 生成模板数据
    const templates = imageFiles.map(file => ({
      name: path.parse(file).name,
      filename: file,
      url: `/api/background-fusion/templates/${encodeURIComponent(file)}`
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to load background fusion templates:', error);
    return NextResponse.json(
      { error: 'Failed to load templates' },
      { status: 500 }
    );
  }
}
