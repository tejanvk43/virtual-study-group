# Network Access Troubleshooting Guide

## Problem: Frontend loads but can't connect to backend API

If the frontend loads on your mobile device but you get "Cannot connect to server" errors, follow these steps:

## Step 1: Verify Backend is Running

1. On your computer, check that the backend server is running:
   ```
   Server running on http://0.0.0.0:5000
   ```
   If you see `localhost:5000` instead, the server won't accept network connections.

## Step 2: Find Your Computer's IP Address

### Windows:
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

Example: `192.168.1.100`

## Step 3: Test Backend from Mobile Browser

1. On your mobile device (same Wi-Fi network), open a browser
2. Go to: `http://YOUR_IP_ADDRESS:5000/api/test-network`
   - Example: `http://192.168.29.158:5000/api/test-network`
3. You should see a JSON response with connection info

**If this fails**, Windows Firewall is likely blocking port 5000.

## Step 4: Configure Windows Firewall

### Option A: Allow Port 5000 Through Firewall (Recommended)

1. Open Windows Defender Firewall:
   - Press `Win + R`, type `wf.msc`, press Enter
   - OR: Control Panel → System and Security → Windows Defender Firewall → Advanced Settings

2. Create Inbound Rule:
   - Click "Inbound Rules" → "New Rule"
   - Select "Port" → Next
   - Select "TCP" → Enter "5000" in "Specific local ports" → Next
   - Select "Allow the connection" → Next
   - Check all profiles (Domain, Private, Public) → Next
   - Name: "Node.js Backend Port 5000" → Finish

3. Create Outbound Rule (same steps, but select "Outbound Rules")

### Option B: Temporarily Disable Firewall (For Testing Only)

⚠️ **Warning**: Only for testing! Re-enable after testing.

1. Control Panel → System and Security → Windows Defender Firewall
2. Click "Turn Windows Defender Firewall on or off"
3. Turn off for Private networks (temporarily)
4. Test your connection
5. **Re-enable firewall after testing**

## Step 5: Verify Network Connection

### Test from Command Prompt (on your computer):
```cmd
netstat -an | findstr :5000
```

You should see:
```
TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING
```

If you see `127.0.0.1:5000` instead, the server is only listening on localhost.

### Test from Mobile Browser:
1. Open browser on mobile
2. Go to: `http://YOUR_IP:5000/api/test-network`
3. Check browser console (F12 or Developer Tools) for errors

## Step 6: Check Browser Console on Mobile

1. On mobile browser, open Developer Tools (if available)
2. Or use Chrome Remote Debugging:
   - Connect phone via USB
   - Enable USB debugging
   - Open `chrome://inspect` on desktop Chrome
   - Select your device

3. Look for:
   - Network errors (ERR_CONNECTION_REFUSED, ERR_NETWORK_CHANGED)
   - CORS errors
   - API URL being used

## Step 7: Verify API URL Configuration

The frontend should automatically detect the network IP. Check browser console:

1. On mobile, open browser console
2. Look for: `API Base URL: http://YOUR_IP:5000/api`
3. If it shows `localhost:5000`, the hostname detection isn't working

## Common Issues and Solutions

### Issue 1: "ERR_CONNECTION_REFUSED"
**Solution**: Windows Firewall is blocking port 5000. Follow Step 4.

### Issue 2: "CORS error"
**Solution**: Backend CORS is configured to allow all origins. If you still see CORS errors, check backend console logs.

### Issue 3: "Network Error" or timeout
**Solution**: 
- Verify both devices are on the same Wi-Fi network
- Check if your router has AP isolation enabled (disable it)
- Try using your computer's IP address directly

### Issue 4: Frontend shows localhost in API calls
**Solution**: Clear browser cache and reload. The API URL should be detected automatically.

## Quick Test Commands

### On Computer (PowerShell):
```powershell
# Test if port is listening
Test-NetConnection -ComputerName localhost -Port 5000

# Get your IP address
ipconfig | findstr IPv4
```

### On Mobile:
1. Open browser
2. Navigate to: `http://YOUR_COMPUTER_IP:5000/api/test-network`
3. Should return JSON with connection info

## Still Not Working?

1. **Check backend logs**: Look for incoming connection attempts
2. **Try different port**: Change backend port to 3001 and update firewall rules
3. **Check router settings**: Some routers block device-to-device communication
4. **Try hotspot**: Create mobile hotspot and connect computer to it

## Security Note

For production, you should:
- Use HTTPS
- Configure proper CORS origins
- Use authentication
- Don't expose backend directly to internet (use reverse proxy)
