const OpenAI = require('openai');
require('dotenv').config();

const testOpenAI = async () => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 Checking API Key...');
    
    if (!apiKey) {
      console.log('❌ ERROR: No API key found in .env');
      process.exit(1);
    }
    
    if (apiKey.includes('"')) {
      console.log('⚠️ WARNING: API key contains quotes, might cause issues');
    }
    
    console.log('✅ API Key found (first 10 chars: ' + apiKey.substring(0, 10) + '...)');
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    console.log('📤 Sending test message to OpenAI API...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'Hello! AI Assistant is working!' in exactly this format." }
      ],
      max_tokens: 50,
      temperature: 0.5,
    });

    console.log('✅ SUCCESS! OpenAI API is working!');
    console.log('📝 Response:', completion.choices[0].message.content);
    
  } catch (error) {
    if (error.status === 401) {
      console.log('❌ ERROR: Invalid API key (401 Unauthorized)');
      console.log('❌ Please check your API key in .env file');
    } else if (error.status === 429) {
      console.log('❌ ERROR: Rate limit exceeded (429)');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ ERROR: Cannot connect to OpenAI (network error)');
    } else {
      console.log('❌ ERROR:', error.message);
    }
    console.log('\n📋 Full error:', error);
    process.exit(1);
  }
};

testOpenAI();
