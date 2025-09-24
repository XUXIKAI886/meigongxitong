// 测试单品图API是否使用了新的Gemini模型
const fs = require('fs');
const path = require('path');

async function testProductAPI() {
  try {
    // 创建一个简单的测试图片（1x1像素的PNG）
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
    const testImageDataUrl = `data:image/png;base64,${testImageBase64}`;

    // 创建FormData
    const formData = new FormData();

    // 创建一个Blob来模拟文件上传
    const imageBlob = new Blob([Buffer.from(testImageBase64, 'base64')], { type: 'image/png' });
    formData.append('image', imageBlob, 'test.png');
    formData.append('backgroundMode', 'white');
    formData.append('enhance', 'false');
    formData.append('outputSize', '512x512');

    console.log('🧪 测试单品图API...');
    console.log('📝 测试数据:', {
      imageSize: testImageBase64.length,
      backgroundMode: 'white',
      outputSize: '512x512'
    });

    const response = await fetch('http://localhost:3000/api/generate/product', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    console.log('📊 API响应状态:', response.status);
    console.log('📋 API响应内容:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ 单品图API测试成功！');
      console.log('🎯 使用的模型: gemini-2.5-flash-image-preview');
    } else {
      console.log('❌ 单品图API测试失败');
      console.log('🔍 错误信息:', result);
    }

  } catch (error) {
    console.error('💥 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testProductAPI();
