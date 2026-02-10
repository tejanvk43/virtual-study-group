const https = require('https');
const fs = require('fs');

const testAIAssistant = async () => {
  // Step 1: Login to get token
  console.log('🔐 Step 1: Logging in to get auth token...');
  
  const loginData = JSON.stringify({
    email: 'premsager@example.com',
    password: 'password123'
  });

  let authToken = '';

  await new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const loginRes = JSON.parse(data);
          authToken = loginRes.token;
          console.log('✅ Login successful! Token obtained');
          resolve();
        } else {
          console.log('❌ Login failed:', res.statusCode, data);
          reject(new Error('Login failed'));
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Login error:', e.message);
      reject(e);
    });

    req.write(loginData);
    req.end();
  });

  // Step 2: Test AI endpoint with auth token
  console.log('\n📤 Step 2: Testing AI endpoint...');
  
  const aiData = JSON.stringify({
    message: 'Hello! Can you help me understand the concept of photosynthesis?',
    groupId: 'default',
    context: 'Personal study session'
  });

  await new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5443,
      path: '/api/ai/study-assistant',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(aiData),
        'Authorization': `Bearer ${authToken}`
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('✅ AI Response received!');
          console.log('📝 Response:', response.response ? response.response.substring(0, 200) + '...' : response);
        } else if (res.statusCode === 503) {
          console.log('⚠️ AI service unavailable (503)');
          console.log('📝 Response:', data);
        } else {
          console.log('❌ Error:', res.statusCode);
          console.log('📝 Response:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('❌ AI request error:', e.message);
      reject(e);
    });

    req.write(aiData);
    req.end();
  });

  console.log('\n✅ Test complete!');
};

testAIAssistant().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
