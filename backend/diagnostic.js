require('dotenv').config();

console.log('🔍 AI Assistant Diagnostic Report');
console.log('================================\n');

// Check 1: API Key
console.log('1️⃣ OpenAI API Key Check:');
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.log('   ❌ NO API KEY FOUND in .env');
} else if (apiKey.includes('"') || apiKey.includes("'")) {
  console.log('   ⚠️  API KEY HAS QUOTES (might cause issues)');
  console.log('      First 10 chars:', apiKey.substring(0, 10));
} else {
  console.log('   ✅ API KEY FOUND AND PROPERLY FORMATTED');
  console.log('      Format: ' + apiKey.substring(0, 7) + '...' + apiKey.substring(-10));
  console.log('      Length:', apiKey.length, 'characters');
}

// Check 2: MongoDB
console.log('\n2️⃣ MongoDB Connection:');
const mongoUri = process.env.MONGODB_URI;
console.log('   📍 URI:', mongoUri || 'DEFAULT (mongo://localhost:27017/study-group)');

// Check 3: Ports
console.log('\n3️⃣ Server Configuration:');
console.log('   🔌 Backend Port:', process.env.PORT || '5000 → 5443 (HTTPS)');
console.log('   📱 Frontend URL:', process.env.CLIENT_URL || 'http://localhost:3000');

// Check 4: Environment
console.log('\n4️⃣ Environment:');
console.log('   🌍 NODE_ENV:', process.env.NODE_ENV || 'not set');

console.log('\n================================');
console.log('✅ Configuration Check Complete');
