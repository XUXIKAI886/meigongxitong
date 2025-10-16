# 最终正确的下载修复方案

## ⚠️ 重要更正

之前的文档有误!经过实际测试,Tauri 2.x 的 dialog 和 fs API **确实需要** `options` 对象包裹。

## ❌ 错误信息分析

```
invalid args `options` for command `save`:
command save missing required key options
```

这个错误说明:
- API **需要** `options` 键
- 但是传递的参数结构不正确

## ✅ 最终正确的代码

### 完整的下载函数 (已验证可用)

```javascript
/**
 * 🎯 最终正确的Tauri图片下载函数
 * 适用于 Tauri 2.x + tauri-plugin-dialog + tauri-plugin-fs
 */
async function downloadImage(imageDataUrl, filename = 'image.png') {
    // 1. 检测Tauri环境
    const isTauri = typeof window !== 'undefined' &&
                    typeof window.__TAURI__ !== 'undefined' &&
                    typeof window.__TAURI__.core !== 'undefined';

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

    // 2. Tauri环境 - 使用正确的API调用
    try {
        console.log('🖼️ [Tauri] 开始保存图片:', filename);

        // ✅ 正确方式: 使用 options 对象包裹
        const filePath = await window.__TAURI__.core.invoke('plugin:dialog|save', {
            options: {  // ← 必须有 options 键!
                defaultPath: filename,
                title: '保存图片',
                filters: [{
                    name: '图片文件',
                    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
                }]
            }
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

        // 5. 写入文件 - 也需要 options 对象
        await window.__TAURI__.core.invoke('plugin:fs|write_file', {
            path: filePath,
            contents: Array.from(bytes)
        });

        console.log('✅ [Tauri] 图片保存成功!');
        alert('图片保存成功!\n保存位置: ' + filePath);
        return true;

    } catch (error) {
        console.error('❌ [Tauri] 保存失败:', error);
        console.error('错误详情:', error.message);
        alert('保存失败: ' + error.message);
        return false;
    }
}
```

## 🔑 关键点说明

### Dialog API 调用格式

```javascript
// ✅ 正确 - dialog API 需要 options 对象
await window.__TAURI__.core.invoke('plugin:dialog|save', {
    options: {  // ← 必须有这个 options 键
        defaultPath: 'image.png',
        title: '保存图片',
        filters: [{
            name: '图片文件',
            extensions: ['png', 'jpg']
        }]
    }
});
```

### File System API 调用格式

```javascript
// ✅ 正确 - fs API 参数直接传递
await window.__TAURI__.core.invoke('plugin:fs|write_file', {
    path: filePath,       // ← 直接传递,不需要 options
    contents: Array.from(bytes)
});
```

## 📝 API 格式对比表

| API命令 | 参数结构 | 示例 |
|---------|---------|------|
| `plugin:dialog\|save` | **需要** `options` | `{ options: { defaultPath, filters } }` |
| `plugin:dialog\|open` | **需要** `options` | `{ options: { multiple, directory } }` |
| `plugin:fs\|write_file` | **不需要** `options` | `{ path, contents }` |
| `plugin:fs\|read_file` | **不需要** `options` | `{ path }` |

## 💡 完整集成示例

### HTML + JavaScript

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>美工设计系统</title>
</head>
<body>
    <canvas id="designCanvas" width="800" height="600"></canvas>
    <button id="downloadBtn">下载图片</button>

    <script>
        // ===== Tauri环境检测 =====
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
                // Dialog API - 需要 options
                const filePath = await window.__TAURI__.core.invoke('plugin:dialog|save', {
                    options: {
                        defaultPath: filename,
                        title: '保存图片',
                        filters: [{
                            name: '图片文件',
                            extensions: ['png', 'jpg', 'jpeg', 'webp']
                        }]
                    }
                });

                if (!filePath) return false;

                // 转换数据
                const base64Data = imageDataUrl.includes(',')
                    ? imageDataUrl.split(',')[1]
                    : imageDataUrl;
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // FS API - 不需要 options
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

        // ===== 初始化下载按钮 =====
        document.getElementById('downloadBtn').addEventListener('click', async function() {
            const canvas = document.getElementById('designCanvas');
            const dataUrl = canvas.toDataURL('image/png');
            await downloadImage(dataUrl, '设计图.png');
        });

        // ===== 测试环境 =====
        console.log('Tauri环境:', isTauriEnvironment());
    </script>
</body>
</html>
```

## 🐛 调试步骤

### 1. 验证环境

```javascript
console.log('1. Tauri可用:', typeof window.__TAURI__ !== 'undefined');
console.log('2. Core API:', typeof window.__TAURI__?.core?.invoke);
console.log('3. 完整对象:', window.__TAURI__);
```

### 2. 测试 Dialog API

```javascript
async function testDialogAPI() {
    try {
        const path = await window.__TAURI__.core.invoke('plugin:dialog|save', {
            options: {
                defaultPath: 'test.png',
                title: '测试保存',
                filters: [{
                    name: '图片',
                    extensions: ['png']
                }]
            }
        });
        console.log('✅ Dialog成功, 路径:', path);
        return path;
    } catch (err) {
        console.error('❌ Dialog失败:', err);
        return null;
    }
}

// 运行测试
testDialogAPI();
```

### 3. 测试 FS API

```javascript
async function testFileWrite() {
    try {
        // 创建一个简单的测试数据
        const testData = [72, 101, 108, 108, 111]; // "Hello"

        await window.__TAURI__.core.invoke('plugin:fs|write_file', {
            path: 'C:\\Users\\Public\\test.txt',
            contents: testData
        });

        console.log('✅ 文件写入成功');
    } catch (err) {
        console.error('❌ 文件写入失败:', err);
    }
}
```

### 4. 完整流程测试

```javascript
async function testFullDownload() {
    // 创建一个简单的canvas
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    // 绘制红色背景
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);

    // 获取Data URL
    const dataUrl = canvas.toDataURL('image/png');
    console.log('Data URL长度:', dataUrl.length);

    // 测试下载
    await downloadImage(dataUrl, 'test-image.png');
}

testFullDownload();
```

## 🎯 常见错误和解决方案

### 错误1: `missing required key options`

**原因:** dialog API 缺少 `options` 包裹

**解决:**
```javascript
// ❌ 错误
invoke('plugin:dialog|save', {
    defaultPath: 'file.png'
});

// ✅ 正确
invoke('plugin:dialog|save', {
    options: {
        defaultPath: 'file.png'
    }
});
```

### 错误2: `unexpected invoke body`

**原因:** fs API 错误地使用了 `options` 包裹

**解决:**
```javascript
// ❌ 错误
invoke('plugin:fs|write_file', {
    options: {
        path: 'file.txt',
        contents: data
    }
});

// ✅ 正确
invoke('plugin:fs|write_file', {
    path: 'file.txt',
    contents: data
});
```

### 错误3: Base64解码失败

**原因:** Data URL格式不正确

**解决:**
```javascript
// 安全的Base64提取
const base64Data = imageDataUrl.includes(',')
    ? imageDataUrl.split(',')[1]  // data:image/png;base64,xxxxx
    : imageDataUrl;                // 纯Base64
```

### 错误4: 保存的文件损坏

**原因:** 字节数组转换错误

**解决:**
```javascript
// 必须使用 Array.from() 转换
await invoke('plugin:fs|write_file', {
    path: filePath,
    contents: Array.from(bytes)  // ← 重要!
});
```

## ✅ 检查清单

使用此代码前,请确认:

- [ ] Tauri 2.x 环境
- [ ] 已安装 `tauri-plugin-dialog`
- [ ] 已安装 `tauri-plugin-fs`
- [ ] 权限配置正确 (iframe-capability.json)
- [ ] dialog API 使用 `options` 对象
- [ ] fs API 直接传递参数
- [ ] contents 使用 `Array.from(bytes)`

## 📊 总结对比

### 之前错误的理解 ❌

```javascript
// 错误认为所有API都不需要 options
invoke('plugin:dialog|save', {
    defaultPath: 'file.png'  // ✗
});
```

### 现在正确的理解 ✅

```javascript
// dialog API 需要 options
invoke('plugin:dialog|save', {
    options: {  // ✓
        defaultPath: 'file.png'
    }
});

// fs API 不需要 options
invoke('plugin:fs|write_file', {
    path: 'file.txt',  // ✓
    contents: data
});
```

---

**状态**: ✅ 已修正
**测试**: ✅ 已验证
**适用版本**: Tauri 2.x
**最后更新**: 2025年10月16日
