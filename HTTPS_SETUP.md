# 🔐 Enable HTTPS & Fix Camera/Microphone Access

## Problem

Camera and microphone access **requires HTTPS** (or localhost). When accessing your app from a network IP (like `192.168.29.158:3000`), the browser **blocks media device access** over HTTP.

## Solution: Enable HTTPS with Self-Signed Certificates

### Step 1: Check if `selfsigned` package is installed

First, check if the `selfsigned` package is available:

```bash
cd backend
npm list selfsigned
```

If NOT installed, install it:

```bash
npm install selfsigned
```

### Step 2: Generate SSL Certificates

Run the certificate generation script:

```bash
cd backend
node generate-certs.js
```

You should see output like:
```
🔐 Generating self-signed SSL certificates for development...

Local IP addresses detected:
  - 127.0.0.1
  - 192.168.29.158
  - 10.0.0.5

✅ SSL certificates generated successfully!

Certificate locations:
  - Private Key: e:\virtual study group\backend\certs\key.pem
  - Certificate: e:\virtual study group\backend\certs\cert.pem
```

The certificates will be created in the `backend/certs/` folder.

### Step 3: Restart the Backend Server

Stop and restart your backend server:

```bash
cd backend
npm run dev
```

You should see:
```
🔐 HTTPS Server initialized with self-signed certificates
```

### Step 4: Access the Frontend via HTTPS

Now access your app using **HTTPS**:

```
https://192.168.29.158:3000
```

⚠️ **Browser Warning**: You'll see a "Not Secure" or "Your connection is not private" warning:
- Click **Advanced**
- Click **Proceed to [IP]** (or similar button)
- This is normal for self-signed certificates in development

### Step 5: Test Camera & Microphone

Once connected:
1. Join a study session
2. You should now get a browser permission prompt for camera/microphone
3. Click **Allow** to enable access

## Troubleshooting

### Still seeing camera/microphone errors?

1. **Clear browser cache**:
   - Chrome: Settings → Privacy → Clear browsing data
   - Or use Incognito/Private mode

2. **Check browser console** (F12):
   - Look for: `Connecting to socket: https://192.168.29.158:5000`
   - If you see `http://`, the protocol wasn't changed

3. **Verify HTTPS is running**:
   - Try accessing `https://192.168.29.158:5000/` in your browser
   - You should see the API response (with certificate warning)

4. **Check permissions**:
   - Browser → Settings → Privacy → Camera/Microphone
   - Make sure `192.168.29.158:3000` is allowed

### Certificate errors?

If you get certificate validation errors:
- These are expected for self-signed certificates
- In development, click "Advanced" and proceed
- For production, use proper SSL certificates (Let's Encrypt, AWS, etc.)

## File Changes Made

The following files were updated to support HTTPS:

1. **backend/server.js** - Now loads HTTPS certificates and creates HTTPS server
2. **backend/generate-certs.js** - Script to generate self-signed certificates
3. **frontend/src/contexts/SocketContext.tsx** - Uses HTTPS protocol when available
4. **frontend/src/services/api.ts** - Uses HTTPS protocol when available

## For Production

For production deployments:
- Use proper SSL certificates from Let's Encrypt or your certificate provider
- Update the backend to use `certbot` or similar for automatic renewal
- Set environment variables for certificate paths if using different locations
