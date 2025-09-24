# 图片处理标准化文档

## 📋 概述

本文档规定了美工设计系统中所有图片处理的标准化方案，确保所有功能模块使用统一的base64格式处理图片，避免URL访问问题。

## 🎯 核心原则

### ⚠️ **重要规则：所有图片处理必须使用base64格式**

1. **禁止使用URL方式**：不要将图片保存为文件后使用URL传递给API
2. **统一base64格式**：所有图片都转换为`data:image/type;base64,xxx`格式
3. **直接传递数据**：在Job payload中直接传递base64字符串和MIME类型
4. **API兼容性**：确保所有AI API都能正确处理base64图片数据

## 🔧 标准实现模式

### 1. API路由层 (route.ts)

```typescript
export async function POST(request: NextRequest) {
  // 解析上传的图片文件
  const formData = await request.formData();
  const imageFile = formData.get('image') as File;
  
  // ✅ 正确：转换为base64格式
  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  
  // 创建Job时传递base64数据
  const job = JobQueue.createJob('job-type', {
    sourceImageBuffer: imageBuffer.toString('base64'), // base64字符串
    sourceImageType: imageFile.type, // MIME类型
    // 其他参数...
  }, clientIp);
  
  // ❌ 错误：不要保存文件并使用URL
  // const savedFile = await FileManager.saveBuffer(imageBuffer, imageFile.name, imageFile.type);
  // const job = JobQueue.createJob('job-type', {
  //   imageUrl: `${request.nextUrl.origin}${savedFile.url}`, // 错误！
  // }, clientIp);
}
```

### 2. 处理器层 (Processor)

```typescript
class ImageProcessor {
  async process(job: any): Promise<any> {
    const { sourceImageBuffer, sourceImageType } = job.payload;
    
    // ✅ 正确：从base64恢复Buffer
    const sourceBuffer = Buffer.from(sourceImageBuffer, 'base64');
    const base64Image = this.bufferToBase64(sourceBuffer, sourceImageType);
    
    // 调用AI API
    const response = await this.apiClient.processImage({
      image: base64Image, // 传递完整的data:image/type;base64,xxx格式
      // 其他参数...
    });
    
    return response;
  }
  
  // ✅ 标准base64转换方法
  private bufferToBase64(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}
```

## 📊 各功能模块实现状态

### ✅ 已标准化的功能

#### 1. 单品图抠图换背景 (`/api/generate/product`)
- **路由层**：✅ 使用base64格式
- **处理器**：✅ `ProductGenerationProcessor`
- **API调用**：✅ `imageClient.generateImageWithImage({ image: base64Image })`

#### 2. 门头招牌文字替换 (`/api/signboard/replace-text`)
- **路由层**：✅ 使用base64格式
- **处理器**：✅ `SignboardReplaceProcessor`
- **API调用**：✅ `imageClient.generateImageWithImage({ image: base64Image })`

#### 3. 图片墙生成 (`/api/picture-wall`)
- **路由层**：✅ 使用base64格式（已修复）
- **处理器**：✅ `PictureWallProcessor`
- **反推提示词**：✅ `createReversePromptRequestWithBase64({ url: base64Image })`
- **文生图**：✅ `imageClient.generateImage()`

#### 4. 反推提示词 (`/api/reverse-prompt`)
- **路由层**：✅ 使用base64格式（已修复）
- **处理器**：✅ `ReversePromptProcessor`
- **API调用**：✅ `createReversePromptRequestWithBase64({ url: base64Image })`

### ✅ 不涉及图片输入的功能

#### 5. Logo设计工作室
- **Logo生成** (`/api/generate/logo`)：✅ 纯文生图，无图片输入
- **店招生成** (`/api/generate/storefront`)：✅ 纯文生图，无图片输入
- **海报生成** (`/api/generate/poster`)：✅ 纯文生图，无图片输入

## 📋 完整功能对照表

| 功能模块 | API路径 | 图片处理方式 | 状态 | 备注 |
|---------|---------|-------------|------|------|
| 单品图抠图换背景 | `/api/generate/product` | ✅ base64 | 已标准化 | 图生图API |
| 门头招牌文字替换 | `/api/signboard/replace-text` | ✅ base64 | 已标准化 | 图生图API |
| 图片墙生成 | `/api/picture-wall` | ✅ base64 | 已修复 | 反推提示词+文生图 |
| 反推提示词 | `/api/reverse-prompt` | ✅ base64 | 已修复 | Chat API |
| Logo生成 | `/api/generate/logo` | ➖ 无图片输入 | 无需修改 | 纯文生图 |
| 店招生成 | `/api/generate/storefront` | ➖ 无图片输入 | 无需修改 | 纯文生图 |
| 海报生成 | `/api/generate/poster` | ➖ 无图片输入 | 无需修改 | 纯文生图 |

### 🎯 标准化完成度：100%

所有涉及图片处理的功能模块都已标准化为base64格式，确保：
- ✅ 无URL依赖问题
- ✅ 无文件存储依赖
- ✅ API调用格式统一
- ✅ 错误处理一致

## 🛠️ 标准化检查清单

### 对于每个涉及图片处理的功能，确保：

- [ ] **API路由层**
  - [ ] 使用`Buffer.from(await imageFile.arrayBuffer())`获取图片数据
  - [ ] 使用`imageBuffer.toString('base64')`转换为base64字符串
  - [ ] 在Job payload中传递`sourceImageBuffer`和`sourceImageType`
  - [ ] 不使用`FileManager.saveBuffer()`保存文件
  - [ ] 不传递URL到Job payload

- [ ] **处理器层**
  - [ ] 从payload获取`sourceImageBuffer`和`sourceImageType`
  - [ ] 使用`Buffer.from(sourceImageBuffer, 'base64')`恢复Buffer
  - [ ] 使用`bufferToBase64()`方法生成完整的data URL
  - [ ] 实现标准的`bufferToBase64()`私有方法

- [ ] **API调用**
  - [ ] 图生图API：传递`image: base64Image`参数
  - [ ] 反推提示词API：在messages中使用`image_url: { url: base64Image }`
  - [ ] 文生图API：传递`prompt`参数（不涉及图片）

## 🚨 常见错误及解决方案

### 错误1：使用URL方式传递图片
```typescript
// ❌ 错误
const savedFile = await FileManager.saveBuffer(imageBuffer, fileName, fileType);
const job = JobQueue.createJob('job-type', {
  imageUrl: `${request.nextUrl.origin}${savedFile.url}`
});

// ✅ 正确
const job = JobQueue.createJob('job-type', {
  sourceImageBuffer: imageBuffer.toString('base64'),
  sourceImageType: fileType
});
```

### 错误2：base64格式不完整
```typescript
// ❌ 错误：缺少data URL前缀
const base64 = buffer.toString('base64');

// ✅ 正确：完整的data URL格式
const base64Image = `data:${mimeType};base64,${buffer.toString('base64')}`;
```

### 错误3：API调用格式错误
```typescript
// ❌ 错误：反推提示词API使用URL
const promptRequest = createReversePromptRequest(imageUrl, ...);

// ✅ 正确：反推提示词API使用base64
const promptRequest = createReversePromptRequestWithBase64(base64Image, ...);
```

## 📝 实施计划

### 阶段1：立即修复 ✅
- [x] 图片墙生成功能改为base64格式
- [x] 反推提示词功能改为base64格式

### 阶段2：全面检查 ✅
- [x] 检查反推提示词功能是否需要修改 → 已修复
- [x] 检查Logo设计工作室是否涉及图片处理 → 确认为纯文生图，无需修改
- [x] 验证所有功能的图片处理一致性 → 已完成

### 阶段3：文档完善 ✅
- [x] 为每个功能添加详细的实现说明
- [x] 创建开发者指南
- [x] 建立代码审查检查点

## 🔍 调试技巧

### 1. 添加调试日志
```typescript
console.log('Image processing:', {
  hasBuffer: !!sourceImageBuffer,
  bufferLength: sourceImageBuffer?.length,
  mimeType: sourceImageType,
  base64Preview: base64Image?.substring(0, 50) + '...'
});
```

### 2. 验证base64格式
```typescript
const isValidBase64 = base64Image.startsWith('data:image/') && base64Image.includes(';base64,');
console.log('Base64 format valid:', isValidBase64);
```

### 3. 检查API响应
```typescript
try {
  const response = await apiCall();
  console.log('API success:', { status: response.status, hasData: !!response.data });
} catch (error) {
  console.error('API error:', { status: error.response?.status, message: error.message });
}
```

---

## 📞 联系信息

如有疑问或发现问题，请及时更新此文档并通知团队成员。

**最后更新**：2024年12月
**维护者**：开发团队
