# How to Run Virtual Study Group - Simple Steps

## What You Need First
1. Download Node.js from nodejs.org
2. Download MongoDB from mongodb.com (or use MongoDB Atlas online)
3. Have Git installed

## Step 1: Clone the Project
```
git clone <your-repo-url>
cd virtual-study-group
```

## Step 2: Setup Backend

### Create .env file
Go to: `backend/` folder
- Copy `.env.example` and rename it to `.env`
- Open `.env` and update these values:

```
NODE_ENV=development
PORT=5443
MONGODB_URI=mongodb://localhost:27017/study-group
JWT_SECRET=your-secret-key-here
CLIENT_URL=https://localhost:3000
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

**Getting an OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the API key and paste it in `.env` as `OPENAI_API_KEY=`

### Install Backend
```
cd backend
npm install
```

### Generate SSL Certificates
```
node generate-certs.js
```

## Step 3: Setup Frontend

```
cd frontend
npm install
```

## Step 4: Start MongoDB

### If using local MongoDB:
```
mongod --dbpath "C:\data\db"
```

### If using MongoDB Atlas:
- Just update MONGODB_URI in .env with your Atlas connection string

## Step 5: Run Everything

Open 3 separate terminals/PowerShell windows:

### Terminal 1: MongoDB
```
mongod --dbpath "C:\data\db"
```

### Terminal 2: Backend
```
cd backend
npm run dev
```
Should show: `Server running on https://localhost:5443`

### Terminal 3: Frontend
```
cd frontend
npm run client
```

## Step 6: Open in Browser
```
https://localhost:3000
```

Browser will warn about certificate (normal) - click Advanced -> Proceed

## Step 7: Add Test Data (Optional)

```
cd backend
node seed-march-data.js
```

Then login with: `prem.sagar@example.com` password `password123`

---

## That's It!

The app should now be running. You can:
- Create groups
- Schedule sessions
- Join a session and test video/microphone
- Chat with others
- **Use AI features** (with OpenAI API):
  - Chat with AI Study Assistant
  - Generate quizzes on any topic
  - Get concept explanations
  - Create study plans

## Quick Fixes

**AI service shows "rate limit" or "insufficient_quota"?**
- Check your OpenAI usage and billing limits in the OpenAI dashboard
- Make sure your API key is active and has access to the selected model
- You can set a smaller/cheaper model in `.env` via `OPENAI_MODEL`

**Port already in use?**
```
netstat -ano | findstr :5443
taskkill /PID <number> /F
```

**Can't connect to MongoDB?**
- Check if mongod is running
- Or setup MongoDB Atlas instead

**Camera/Microphone not working?**
- Must be on HTTPS (not HTTP)
- Browser needs permission
- Go to browser settings and allow camera/mic

**Frontend can't find backend?**
- Make sure backend is running on port 5443
- Check backend terminal for errors

---

That's all you need to know!
