const https = require('https');
const fs = require('fs');

// Get auth token from a test
const testAIEndpoint = async () => {
  return new Promise((resolve, reject) => {
    // For testing, we'll use a dummy token
    const token = 'test-token';
    
    const postData = JSON.stringify({
      message: 'Hello, can you help me?',
      groupId: 'default',
      context: 'Testing AI assistant'
    });

    const options = {
      hostname: 'localhost',
      port: 5443,
      path: '/api/ai/study-assistant',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${token}`
      },
      rejectUnauthorized: false // For self-signed certs
    };

    console.log('📤 Sending request to /api/ai/study-assistant');
    
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`);
        console.log('📝 Response:', data);
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

testAIEndpoint().catch(console.error);
