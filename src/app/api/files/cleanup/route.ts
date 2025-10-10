import { NextRequest, NextResponse } from 'next/server';
import { FileManager } from '@/lib/upload';

/**
 * GET /api/files/cleanup - 智能清理过期文件（推荐）
 * 查询参数：
 * - maxAgeDays: 文件保留天数，默认7天
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxAgeDays = parseInt(searchParams.get('maxAgeDays') || '7', 10);

    console.log(`🧹 开始智能清理任务：删除${maxAgeDays}天前的文件...`);

    const result = await FileManager.cleanupOldFiles(maxAgeDays);
    const totalFiles = result.uploadsDeleted + result.generatedDeleted;

    if (totalFiles === 0) {
      return NextResponse.json({
        ok: true,
        message: `没有找到超过${maxAgeDays}天的文件`,
        deletedCount: 0,
        totalSizeMB: 0,
        maxAgeDays,
        details: {
          uploadsDeleted: 0,
          generatedDeleted: 0,
          files: []
        }
      });
    }

    console.log(`✅ 智能清理完成: 从.uploads删除 ${result.uploadsDeleted} 个文件，从public/generated删除 ${result.generatedDeleted} 个文件，共释放 ${result.totalSize}MB 空间`);

    return NextResponse.json({
      ok: true,
      message: `清理完成：删除 ${totalFiles} 个文件，释放 ${result.totalSize}MB 空间`,
      deletedCount: totalFiles,
      totalSizeMB: result.totalSize,
      maxAgeDays,
      details: {
        uploadsDeleted: result.uploadsDeleted,
        generatedDeleted: result.generatedDeleted,
        files: result.details
      }
    });

  } catch (error) {
    console.error('智能清理文件失败:', error);

    return NextResponse.json(
      {
        ok: false,
        error: '清理失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/cleanup - 强制清理所有文件（危险操作）
 * 删除.uploads和public/generated中的所有文件，不考虑文件年龄
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('⚠️ 警告：执行强制清理，将删除所有生成文件...');

    const result = await FileManager.cleanupAllGenerated();
    const totalFiles = result.uploadsDeleted + result.generatedDeleted;

    if (totalFiles === 0) {
      return NextResponse.json({
        ok: true,
        message: '没有找到需要清理的文件',
        deletedCount: 0,
        totalSizeMB: 0,
        details: {
          uploadsDeleted: 0,
          generatedDeleted: 0,
        }
      });
    }

    console.log(`✅ 强制清理完成: 从.uploads删除 ${result.uploadsDeleted} 个文件，从public/generated删除 ${result.generatedDeleted} 个文件，共释放 ${result.totalSize}MB 空间`);

    return NextResponse.json({
      ok: true,
      message: `强制清理完成：删除 ${totalFiles} 个文件，释放 ${result.totalSize}MB 空间`,
      deletedCount: totalFiles,
      totalSizeMB: result.totalSize,
      details: {
        uploadsDeleted: result.uploadsDeleted,
        generatedDeleted: result.generatedDeleted,
      }
    });

  } catch (error) {
    console.error('强制清理文件失败:', error);

    return NextResponse.json(
      {
        ok: false,
        error: '清理失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}