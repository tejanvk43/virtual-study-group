# 🚀 Virtual Study Group - Setup Guide for Fresh Installation

**Complete step-by-step guide to run the Virtual Study Group project from scratch on any new system.**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Important Notes About .gitignore](#important-notes-about-gitignore)
3. [Clone the Repository](#clone-the-repository)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Database Setup](#database-setup)
7. [SSL Certificate Generation](#ssl-certificate-generation)
8. [Running the Project](#running-the-project)
9. [Seeding Test Data](#seeding-test-data)
10. [Troubleshooting](#troubleshooting)

---

## ⚙️ Prerequisites

Before starting, ensure you have the following installed on your system:

### Required Software:
- **Node.js** v16.0.0 or higher - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **MongoDB Community** v5.0 or higher
  - **Option A**: [Local Installation](https://www.mongodb.com/try/download/community)
  - **Option B**: [MongoDB Atlas (Cloud)](https://www.mongodb.com/atlas) - Recommended for simplicity
- **Git** - [Download](https://git-scm.com/)
- **OpenAI API Key** (optional, for AI features) - [Get here](https://platform.openai.com/api-keys)

### Verify Installation:
```powershell
# Check Node.js
node --version
# Expected: v16.0.0 or higher

# Check npm
npm --version
# Expected: 7.0.0 or higher

# Check Git
git --version

# Check MongoDB (if installed locally)
mongod --version
```

---

## 📌 Important Notes About .gitignore

**The following files/folders are NOT included in the repository** (they're in `.gitignore`):

### ❌ NOT in Repository:
```
node_modules/           # Dependencies (reinstalled with npm install)
.env                    # Environment variables (must be created manually)
.env.local              # Local overrides
dist/                   # Build outputs
build/                  # Build outputs
uploads/                # User uploads
backend/certs/          # SSL certificates (auto-generated)
coverage/               # Test coverage
logs/                   # Application logs
```

### ✅ You MUST Create Manually:
1. **`.env` file** in `backend/` folder
2. **SSL certificates** (auto-generated on first run, OR manually with script)
3. **node_modules** (installed with `npm install`)

### 📂 Directory Structure After Setup:
```
virtual-study-group/
├── backend/
│   ├── node_modules/           ← Created by: npm install
│   ├── .env                    ← Created by: You (copy from .env.example)
│   ├── certs/                  ← Auto-generated
│   │   ├── cert.pem
│   │   └── key.pem
│   ├── .env.example            ✅ In repo
│   ├── seed-march-data.js      ✅ In repo
│   ├── server.js               ✅ In repo
│   └── ...
├── frontend/
│   ├── node_modules/           ← Created by: npm install
│   ├── src/                    ✅ In repo
│   └── ...
└── ...
```

---

## 🔄 Clone the Repository

```powershell
# Clone the repository
git clone https://github.com/yourusername/virtual-study-group.git

# Navigate to project directory
cd virtual-study-group

# Verify project structure
Get-ChildItem -Recurse -Depth 2 | Select-Object -Property FullName
```

**Expected Structure:**
```
virtual-study-group/
├── backend/
├── frontend/
├── README.md
├── package.json
├── .gitignore
├── setup.bat
└── start.bat
```

---

## ⚙️ Backend Setup

### Step 1: Navigate to Backend
```powershell
cd d:\your-path\virtual-study-group\backend
```

### Step 2: Create Environment File
```powershell
# Copy the example file
copy .env.example .env

# Open .env with your text editor and configure:
# Notepad .env
```

**Edit `.env` with these values:**
```env
NODE_ENV=development
PORT=5443
MONGODB_URI=mongodb://localhost:27017/study-group
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CLIENT_URL=https://localhost:3000
OPENAI_API_KEY=sk-your-openai-api-key-here
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Email settings (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**⚠️ Important Settings:**
- `PORT=5443` - HTTPS port (do NOT change)
- `MONGODB_URI` - Set to local MongoDB or MongoDB Atlas connection string
- `CLIENT_URL=https://localhost:3000` - Must be HTTPS for camera/microphone access
- `JWT_SECRET` - Use a strong random string for production

### Step 3: Install Backend Dependencies
```powershell
npm install
```

**What gets installed:**
```
✅ express - Web framework
✅ mongoose - MongoDB ODM
✅ socket.io - Real-time communication
✅ bcryptjs - Password hashing
✅ jsonwebtoken - JWT authentication
✅ openai - AI features
✅ selfsigned - SSL certificate generation
... and 15+ more packages
```

### Step 4: Generate SSL Certificates
```powershell
# This creates self-signed certificates for HTTPS
node generate-certs.js
```

**Expected output:**
```
🔐 Generating self-signed SSL certificates for development...
✅ SSL certificates generated successfully!
Certificate locations:
  - Private Key: .../backend/certs/key.pem
  - Certificate: .../backend/certs/cert.pem
```

**If it fails:**
- Ensure `generate-certs.js` exists in backend folder
- Check Node.js is installed correctly
- Try: `npm install selfsigned` then retry

---

## 🎨 Frontend Setup

### Step 1: Navigate to Frontend
```powershell
cd d:\your-path\virtual-study-group\frontend
```

### Step 2: Install Frontend Dependencies
```powershell
npm install
```

**What gets installed:**
```
✅ react - UI framework
✅ react-router-dom - Routing
✅ axios - HTTP client
✅ socket.io-client - WebSocket client
✅ @mui/material - UI components
✅ typescript - Type checking
... and 20+ more packages
```

### Step 3: Verify Installation
```powershell
# Check if node_modules was created
dir node_modules | Measure-Object
# Should show 100+ folders
```

---

## 🗄️ Database Setup

### Option A: Local MongoDB (Windows)

#### Install MongoDB Community
1. Download from: https://www.mongodb.com/try/download/community
2. Run the installer
3. Choose: "Install MongoDB as a Service"
4. Complete installation

#### Verify Installation
```powershell
# Check MongoDB service status
Get-Service MongoDB | Select-Object Status, Name

# Start MongoDB service
Start-Service MongoDB

# Verify it's running
Get-Service MongoDB | Select-Object Status, Name
```

#### Create Data Directory
```powershell
# Create data directory if it doesn't exist
mkdir "C:\data\db"
```

#### Start MongoDB
```powershell
# Option 1: MongoDB runs as Windows Service
# (Already running after installation)

# Option 2: Manual start with custom path
mongod --dbpath "C:\data\db"
```

### Option B: MongoDB Atlas (Cloud - Recommended)

#### Steps:
1. Go to: https://www.mongodb.com/atlas
2. Create a free account
3. Create a cluster
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/study-group`
5. Update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/study-group
   ```

#### Advantages:
- ✅ No local installation needed
- ✅ Automatic backups
- ✅ Access from anywhere
- ✅ Free tier available (512MB storage)

---

## 🔐 SSL Certificate Generation

### Automatic Generation (Recommended)

Certificates are auto-generated on first backend startup:

```powershell
cd backend
npm run dev

# Watch for:
# 🔐 HTTPS Server initialized with self-signed certificates
# Server running on https://localhost:5443
```

### Manual Generation

```powershell
cd backend
node generate-certs.js
```

**Important Notes:**
- ⚠️ Self-signed certificates are for **development only**
- 🔒 You'll see browser warnings (normal and expected)
- ✅ Click "Advanced" → "Proceed" to continue
- 📋 For production, use proper certificates (Let's Encrypt, AWS, etc.)

---

## 🚀 Running the Project

### Method 1: Using npm scripts (RECOMMENDED)

From **project root** directory:

```powershell
# Terminal 1: Start MongoDB
mongod --dbpath "C:\data\db"

# Terminal 2: Start Backend
cd backend
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm run client
```

**Expected Output:**

Terminal 2 (Backend):
```
🔐 HTTPS Server initialized with self-signed certificates
✅ Server running on https://localhost:5443
🔄 HTTP redirect server on http://localhost:5000
```

Terminal 3 (Frontend):
```
Attempting to bind to HOST environment variable: 0.0.0.0
Compiled successfully!
You can now view study-group-frontend in the browser.
Local: https://localhost:3000
```

### Method 2: Using start scripts

From **project root**:

```powershell
# Windows batch file
start.bat

# This will:
# ✅ Start MongoDB
# ✅ Start Backend on HTTPS port 5443
# ✅ Start Frontend on HTTPS port 3000
```

### Method 3: Manual npm commands

From **project root**:

```powershell
# Install all dependencies
npm run install-deps

# Start both servers
npm run dev

# Or start individually:
npm run server    # Backend only
npm run client    # Frontend only
```

---

## 🌐 Access the Application

After all services are running:

```
Frontend: https://localhost:3000
Backend API: https://localhost:5443/api
```

**First Access:**
1. Go to: `https://localhost:3000`
2. Browser shows "Not Secure" warning (normal)
3. Click: **Advanced** → **Proceed to localhost** (or similar)
4. App loads successfully

**First Login:**
- Default test user created during seeding (see next section)
- Or create a new account

---

## 🌱 Seeding Test Data

### Option 1: General Seed Data

```powershell
cd backend
node seed.js
```

Creates:
- 5 test users
- 5 sample groups
- 8 sample study sessions
- Messages in groups

### Option 2: March-Specific Data

```powershell
cd backend
node seed-march-data.js
```

Creates:
- 1 main user (Prem_Sagar)
- 8 study groups for March 2026
- 32 study sessions (3-4 per group)

### Seeded Credentials

**Test User 1 (General Seed):**
- Email: `alice@example.com`
- Password: `password123`

**Test User 2 (March Seed):**
- Email: `prem.sagar@example.com`
- Username: `prem_sagar`
- Password: `password123`

---

## 🐛 Troubleshooting

### Port Already in Use

```powershell
# Find process using port 5443
netstat -ano | findstr :5443

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in backend/.env
# PORT=5444
```

### MongoDB Connection Failed

```powershell
# Check if MongoDB is running
net start MongoDB

# Or start it manually
mongod --dbpath "C:\data\db"

# Test connection
mongo mongodb://localhost:27017
```

**If using MongoDB Atlas:**
- Verify connection string format: `mongodb+srv://username:password@cluster.mongodb.net/study-group`
- Check IP whitelist in MongoDB Atlas dashboard
- Verify username/password in connection string

### SSL Certificate Errors

```powershell
# Regenerate certificates
cd backend
del certs\cert.pem
del certs\key.pem
node generate-certs.js
npm run dev
```

### Frontend Can't Connect to Backend

**Check:**
1. Backend is running on `https://localhost:5443`
2. Frontend is accessing `https://localhost:5443/api`
3. Browser console shows: `🌐 Using network HTTPS API URL: https://localhost:5443/api`
4. CORS is enabled in backend

### Camera/Microphone Not Working

**Requirements:**
- ✅ Must use HTTPS (not HTTP)
- ✅ Browser permission granted
- ✅ Device plugged in and working
- ✅ Windows settings allow camera/microphone access

**Steps:**
1. Go to: `https://localhost:3000` (HTTP will NOT work)
2. Click camera icon in URL bar → Grant permissions
3. Join a study session
4. Browser should prompt for camera/microphone access
5. Click "Allow"

### npm install Failures

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -r node_modules
rm package-lock.json

# Reinstall
npm install

# If still failing, try:
npm install --legacy-peer-deps
```

### Build/Compilation Errors

```powershell
# Frontend compilation error
cd frontend
npm run build

# Backend syntax error
cd backend
npm run build  # If applicable

# TypeScript errors
npm run type-check  # If applicable
```

---

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] Node.js installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] Git installed: `git --version`
- [ ] MongoDB running: Can connect to `mongodb://localhost:27017`
- [ ] Backend `.env` created with values
- [ ] SSL certificates generated in `backend/certs/`
- [ ] Backend dependencies installed: `npm ls` shows packages
- [ ] Frontend dependencies installed: `npm ls` shows packages
- [ ] Backend running: `https://localhost:5443` accessible
- [ ] Frontend running: `https://localhost:3000` accessible
- [ ] Can login: Credentials work
- [ ] Can see groups: Groups display in UI
- [ ] Can access sessions: Sessions list shows
- [ ] Camera/Microphone: Permission prompt appears

---

## 🎓 Project Structure Reference

```
virtual-study-group/
│
├── backend/
│   ├── models/              # MongoDB schemas
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── StudySession.js
│   │   └── Message.js
│   ├── routes/              # API endpoints
│   │   ├── auth.js
│   │   ├── groups.js
│   │   ├── sessions.js
│   │   └── ai.js
│   ├── middleware/          # Express middleware
│   │   └── auth.js
│   ├── certs/               # SSL certificates (auto-generated)
│   │   ├── cert.pem
│   │   └── key.pem
│   ├── uploads/             # User uploads (auto-created)
│   ├── .env                 # Environment config (CREATE THIS)
│   ├── .env.example         # Example config (in repo)
│   ├── server.js            # Express app
│   ├── generate-certs.js    # Certificate generator
│   ├── seed.js              # Seed test data
│   ├── seed-march-data.js   # Seed March 2026 data
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   │   ├── Groups.tsx
│   │   │   ├── StudySessions.tsx
│   │   │   ├── SessionDetail.tsx
│   │   │   └── AuthPage.tsx
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API calls
│   │   │   ├── api.ts
│   │   │   └── studySessionService.ts
│   │   ├── stores/          # State management (Zustand)
│   │   ├── contexts/        # React contexts
│   │   └── types/           # TypeScript types
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── package.json
│   └── tsconfig.json
│
├── README.md                # Project overview
├── SETUP_GUIDE.md           # This file
├── package.json             # Root package config
├── .gitignore              # Git ignore rules
├── setup.bat               # Windows setup script
└── start.bat               # Windows start script
```

---

## 🆘 Getting Help

If you encounter issues:

1. **Check browser console** (F12) for errors
2. **Check backend terminal** for server errors
3. **Verify all prerequisites** are installed
4. **Check .env file** is configured correctly
5. **Check ports 3000, 5000, 5443** are available
6. **Check MongoDB** is running
7. **Review error messages** carefully
8. **Restart all services** as a last resort

---

## 📝 Summary

**Total Setup Time:** ~15-20 minutes (on first install)

**Quick Reference Commands:**

```powershell
# One-time setup
git clone <repo-url>
cd virtual-study-group
npm run install-deps
cd backend
copy .env.example .env
node generate-certs.js
node seed-march-data.js

# Daily startup (in 3 terminals)
# Terminal 1:
mongod --dbpath "C:\data\db"

# Terminal 2:
cd backend && npm run dev

# Terminal 3:
cd frontend && npm run client

# Access: https://localhost:3000
```

---

**✅ You're all set! Enjoy using Virtual Study Group! 🎉**
