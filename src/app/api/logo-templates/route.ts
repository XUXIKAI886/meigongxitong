import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface LogoTemplate {
  category: string;
  categoryDisplayName: string;
  templates: Array<{
    id: string;
    name: string;
    path: string;
    url: string;
  }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') || 'avatar'; // 默认为头像

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

    // 检查模板目录是否存在
    try {
      await fs.access(templateDir);
    } catch {
      return NextResponse.json(
        { error: `${templateType}模板目录不存在` },
        { status: 404 }
      );
    }

    const categories = await fs.readdir(templateDir);
    const logoTemplates: LogoTemplate[] = [];

    for (const category of categories) {
      const categoryPath = path.join(templateDir, category);
      const stats = await fs.stat(categoryPath);

      if (stats.isDirectory()) {
        try {
          const files = await fs.readdir(categoryPath);
          const templates = files
            .filter(file => /\.(png|jpg|jpeg)$/i.test(file))
            .map(file => ({
              id: `${templateType}-${category}-${file}`,
              name: path.parse(file).name,
              path: path.join(categoryPath, file),
              url: `/api/logo-templates/${encodeURIComponent(category)}/${encodeURIComponent(file)}?type=${templateType}`
            }));

          if (templates.length > 0) {
            logoTemplates.push({
              category,
              categoryDisplayName: category,
              templates
            });
          }
        } catch (error) {
          console.error(`读取分类 ${category} 失败:`, error);
        }
      }
    }

    console.log(`成功加载 ${logoTemplates.length} 个${templateType}模板分类`);

    return NextResponse.json({
      success: true,
      templateType,
      categories: logoTemplates,
      total: logoTemplates.reduce((sum, cat) => sum + cat.templates.length, 0)
    });

  } catch (error) {
    console.error('获取模板列表失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: '获取模板列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}