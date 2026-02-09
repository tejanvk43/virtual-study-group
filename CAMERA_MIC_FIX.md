# 📷 Camera & Microphone Not Working - Quick Fix

## Root Cause

**Camera/Microphone access requires HTTPS or localhost. You're accessing from a network IP over HTTP, which browsers block for security.**

- ❌ `http://192.168.29.158:3000` ← Browser blocks media access
- ✅ `https://192.168.29.158:3000` ← Camera/mic works
- ✅ `http://localhost:3000` ← Camera/mic works (special exception)

## Quick Fix (3 Steps)

### 1️⃣ Install `selfsigned` package
```bash
cd backend
npm install selfsigned
```

### 2️⃣ Generate HTTPS certificates
```bash
node generate-certs.js
```

### 3️⃣ Restart backend & access via HTTPS
```bash
npm run dev
```

Then go to: `https://192.168.29.158:3000` (note: **https://** not http://)

## Browser Certificate Warning

You'll see "Not Secure" - this is **normal**:
1. Click **Advanced**
2. Click **Proceed to 192.168.29.158**
3. App will work fine

## What Was Changed

| File | Change |
|------|--------|
| `backend/server.js` | Added HTTPS support with self-signed certificates |
| `backend/generate-certs.js` | New: Script to generate certificates |
| `frontend/SocketContext.tsx` | Now uses `https://` instead of `http://` |
| `frontend/api.ts` | Now uses `https://` instead of `http://` |

## If It Still Doesn't Work

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Check browser console** (F12) - look for warnings
3. **Verify HTTPS is running** - go to `https://192.168.29.158:5000/`
4. **Check permissions** - Settings → Privacy → Camera/Microphone

That's it! 🎉
