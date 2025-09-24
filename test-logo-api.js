const fs = require('fs');
const path = require('path');

// Create a simple test image buffer (1x1 PNG)
const testImageBuffer = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
  0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x8E, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

async function testLogoStudioAPI() {
  try {
    console.log('Testing Logo Studio API...');
    
    // Create FormData
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('storeName', '美味小厨');
    form.append('originalLogo', testImageBuffer, {
      filename: 'test-logo.png',
      contentType: 'image/png'
    });
    
    // Make request
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3000/api/logo-studio/generate', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 200) {
      const data = JSON.parse(responseText);
      console.log('✅ API call successful!');
      console.log('Job ID:', data.jobId);
    } else {
      console.log('❌ API call failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testLogoStudioAPI();
