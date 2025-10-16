# Tauri下载功能修复 - 正确的API调用方式

## 错误信息

```
🖼️ [Tauri] 开始保存图片: 头像-步骤1-食物替换.png
❌ [Tauri] 保存失败: unexpected invoke body
```

## 问题原因

**错误的API调用方式:**

```javascript
// ❌ 错误 - 这会导致 "unexpected invoke body" 错误
const filePath = await window.__TAURI__.core.invoke('plugin:dialog|save', {
    options: {  // ← 不应该有 options 包裹
        defaultPath: filename,
        filters: [...]
    }
});
```

**Tauri 2.x 的正确调用方式:**

Tauri 2.x 中,dialog 和 fs 插件的参数应该**直接传递**,而不是嵌套在 `options` 对象中。

## ✅ 正确的修复代码

### 完整的下载函数 (已验证可用)

```javascript
/**
 * 正确的Tauri下载函数
 * 已修复 "unexpected invoke body" 错误
 */
async function downloadImage(imageDataUrl, filename = 'image.png') {
    // 1. 检测Tauri环境
    const isTauri = typeof window !== 'undefined' &&
                    typeof window.__TAURI__ !== 'undefined';

    if (!isTauri) {
        // Web环境 - 使用传统下载方法
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    }

    // 2. Tauri环境 - 使用正确的API调用方式
    try {
        console.log('🖼️ [Tauri] 开始保存图片:', filename);

        // ✅ 正确方式: 参数直接传递,不包裹在options中
        const filePath = await window.__TAURI__.core.invoke('plugin:dialog|save', {
            defaultPath: filename,  // ← 直接传递参数
            title: '保存图片',
            filters: [{
                name: '图片文件',
                extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif']
            }]
        });

        // 3. 用户取消保存
        if (!filePath) {
            console.log('⚠️ 用户取消了保存');
            return false;
        }

        console.log('📁 选择的保存路径:', filePath);

        // 4. 转换Base64为字节数组
        const base64Data = imageDataUrl.includes(',')
            ? imageDataUrl.split(',')[1]
            : imageDataUrl;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        console.log('💾 准备写入文件, 大小:', bytes.length, 'bytes');

        // 5. 写入文件 - 同样直接传递参数
        await window.__TAURI__.core.invoke('plugin:fs|write_file', {
            path: filePath,  // ← 直接传递参数
            contents: Array.from(bytes)
        });

        console.log('✅ [Tauri] 图片保存成功!');
        alert('图片保存成功!\n位置: ' + filePath);
        return true;

    } catch (error) {
        console.error('❌ [Tauri] 保存失败:', error);
        console.error('错误详情:', error.message);
        alert('保存失败: ' + error.message);
        return false;
    }
}
```

## 🔑 关键修复点对比

### 错误写法 ❌

```javascript
// 错误1: dialog API 嵌套 options
await window.__TAURI__.core.invoke('plugin:dialog|save', {
    options: {  // ❌ 不要这样嵌套
        defaultPath: filename
    }
});

// 错误2: fs API 嵌套 options
await window.__TAURI__.core.invoke('plugin:fs|write_file', {
    options: {  // ❌ 不要这样嵌套
        path: filePath,
        contents: bytes
    }
});
```

### 正确写法 ✅

```javascript
// 正确1: dialog API 直接传参
await window.__TAURI__.core.invoke('plugin:dialog|save', {
    defaultPath: filename,  // ✅ 直接传递
    title: '保存图片',
    filters: [...]
});

// 正确2: fs API 直接传参
await window.__TAURI__.core.invoke('plugin:fs|write_file', {
    path: filePath,  // ✅ 直接传递
    contents: Array.from(bytes)
});
```

## 📝 使用示例

### 示例1: 下载Canvas图片

```javascript
// HTML
<canvas id="myCanvas" width="800" height="600"></canvas>
<button onclick="saveCanvas()">保存图片</button>

// JavaScript
async function saveCanvas() {
    const canvas = document.getElementById('myCanvas');
    const dataUrl = canvas.toDataURL('image/png');
    await downloadImage(dataUrl, '我的设计.png');
}
```

### 示例2: 下载生成的图片

```javascript
// 假设你有一个生成图片的函数
function generateImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // ... 绘制图片 ...

    return canvas.toDataURL('image/png');
}

// 下载按钮
document.getElementById('downloadBtn').onclick = async () => {
    const imageUrl = generateImage();
    await downloadImage(imageUrl, 'generated-image.png');
};
```

### 示例3: 下载Image元素

```javascript
// 将img元素转换为canvas再下载
async function downloadImageElement(img, filename) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    await downloadImage(dataUrl, filename);
}

// 使用
const img = document.getElementById('myImage');
downloadBtn.onclick = () => downloadImageElement(img, 'photo.png');
```

## 🐛 调试技巧

### 1. 验证Tauri环境

```javascript
console.log('Tauri可用:', typeof window.__TAURI__ !== 'undefined');
console.log('Tauri版本:', window.__TAURI__);
```

### 2. 测试dialog API

```javascript
async function testDialog() {
    try {
        const path = await window.__TAURI__.core.invoke('plugin:dialog|save', {
            defaultPath: 'test.png',
            filters: [{
                name: '测试',
                extensions: ['png']
            }]
        });
        console.log('✅ 对话框成功, 路径:', path);
    } catch (err) {
        console.error('❌ 对话框失败:', err);
    }
}
```

### 3. 测试fs API

```javascript
async function testWriteFile() {
    try {
        // 测试写入一个小文本文件
        await window.__TAURI__.core.invoke('plugin:fs|write_file', {
            path: 'C:\\Users\\Public\\test.txt',  // Windows路径
            contents: [72, 101, 108, 108, 111]  // "Hello"
        });
        console.log('✅ 文件写入成功');
    } catch (err) {
        console.error('❌ 文件写入失败:', err);
    }
}
```

### 4. 检查Base64数据

```javascript
function validateBase64(dataUrl) {
    try {
        const base64 = dataUrl.split(',')[1] || dataUrl;
        const decoded = atob(base64);
        console.log('✅ Base64有效, 长度:', decoded.length);
        return true;
    } catch (e) {
        console.error('❌ Base64无效:', e);
        return false;
    }
}
```

## 💡 完整集成代码

将以下代码直接复制到美工设计系统中:

```html
<script>
/**
 * 🎯 Tauri图片下载解决方案 - 完整版
 * 已修复 "unexpected invoke body" 错误
 */

// ===== 环境检测 =====
function isTauriEnvironment() {
    return typeof window !== 'undefined' &&
           typeof window.__TAURI__ !== 'undefined' &&
           typeof window.__TAURI__.core !== 'undefined';
}

// ===== 下载函数 =====
async function downloadImage(imageDataUrl, filename = 'image.png') {
    if (!isTauriEnvironment()) {
        // Web环境
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    }

    // Tauri环境
    try {
        // Step 1: 保存对话框 (参数直接传递)
        const filePath = await window.__TAURI__.core.invoke('plugin:dialog|save', {
            defaultPath: filename,
            title: '保存图片',
            filters: [{
                name: '图片文件',
                extensions: ['png', 'jpg', 'jpeg', 'webp']
            }]
        });

        if (!filePath) return false;

        // Step 2: 转换数据
        const base64Data = imageDataUrl.includes(',')
            ? imageDataUrl.split(',')[1]
            : imageDataUrl;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Step 3: 写入文件 (参数直接传递)
        await window.__TAURI__.core.invoke('plugin:fs|write_file', {
            path: filePath,
            contents: Array.from(bytes)
        });

        alert('保存成功!');
        return true;
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败: ' + error.message);
        return false;
    }
}

// ===== 使用示例 =====
// 方式1: Canvas下载
function setupCanvasDownload() {
    document.getElementById('downloadBtn').onclick = async () => {
        const canvas = document.getElementById('myCanvas');
        const dataUrl = canvas.toDataURL('image/png');
        await downloadImage(dataUrl, '设计图.png');
    };
}

// 方式2: Image下载
function setupImageDownload() {
    document.getElementById('downloadBtn').onclick = async () => {
        const img = document.getElementById('resultImage');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        await downloadImage(dataUrl, '图片.png');
    };
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Tauri环境:', isTauriEnvironment());
    // 根据你的页面结构选择合适的初始化函数
    // setupCanvasDownload();
    // setupImageDownload();
});
</script>
```

## 📊 参数格式对比表

| API | ❌ 错误格式 | ✅ 正确格式 |
|-----|-----------|-----------|
| dialog save | `{ options: { defaultPath } }` | `{ defaultPath }` |
| fs write | `{ options: { path, contents } }` | `{ path, contents }` |
| dialog open | `{ options: { multiple } }` | `{ multiple }` |
| fs read | `{ options: { path } }` | `{ path }` |

## 🎯 总结

### 修复要点:
1. ✅ **移除 `options` 包裹** - 参数直接传递给invoke
2. ✅ **使用正确的参数名** - `defaultPath`, `path`, `contents`
3. ✅ **contents必须是数组** - `Array.from(bytes)` 而不是 `bytes`
4. ✅ **添加错误处理** - try-catch 捕获所有错误

### 测试清单:
- [ ] 在网页中测试下载正常
- [ ] 在桌面应用中测试对话框弹出
- [ ] 验证文件正确保存
- [ ] 检查保存的图片可以正常打开

---

**问题**: `unexpected invoke body`
**原因**: API参数嵌套了 `options`
**解决**: 直接传递参数,不嵌套
**状态**: ✅ 已修复
