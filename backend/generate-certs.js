#!/usr/bin/env node

/**
 * Generate self-signed certificates for HTTPS development
 * Requires: node-forge or selfsigned npm package
 * Run: npm install node-forge (or: npm install selfsigned)
 * Then: node generate-certs.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const certsDir = path.join(__dirname, 'certs');

// Create certs directory
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');

console.log('🔐 Generating self-signed SSL certificates for development...');
console.log('');

// Get hostname and IPs
const hostname = os.hostname();
const interfaces = os.networkInterfaces();
let ipAddresses = ['localhost', '127.0.0.1'];

Object.values(interfaces).forEach(addrs => {
  addrs?.forEach(addr => {
    if (addr.family === 'IPv4' && !addr.internal) {
      ipAddresses.push(addr.address);
    }
  });
});

ipAddresses = [...new Set(ipAddresses)];

console.log('Detected IP addresses:');
ipAddresses.forEach(ip => console.log(`  - ${ip}`));
console.log('');

try {
  // Try node-forge first
  try {
    const forge = require('node-forge');
    console.log('✓ Using node-forge for certificate generation');
    
    const pki = forge.pki;
    const keys = pki.rsa.generateKeyPair(2048);
    
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
    
    const attrs = [
      { name: 'commonName', value: hostname },
      { name: 'organizationName', value: 'Study Group' },
      { name: 'countryName', value: 'US' }
    ];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        keyEncipherment: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true
      },
      {
        name: 'subjectAltName',
        altNames: ipAddresses.map(ip => ({
          type: 2,
          value: ip
        }))
      }
    ]);
    
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    const certPem = pki.certificateToPem(cert);
    const keyPem = pki.privateKeyToPem(keys.privateKey);
    
    fs.writeFileSync(certPath, certPem);
    fs.writeFileSync(keyPath, keyPem);
    
  } catch (forgeError) {
    // Fallback to selfsigned
    console.log('ℹ node-forge not available, trying selfsigned...');
    
    const selfsigned = require('selfsigned');
    console.log('✓ Using selfsigned for certificate generation');
    
    const { private: privateKeyPem, cert: certPem } = selfsigned.generate(
      [
        { name: 'commonName', value: hostname },
        { name: 'organizationName', value: 'Study Group' },
        { name: 'countryName', value: 'US' }
      ],
      {
        days: 365,
        algorithm: 'sha256',
        keySize: 2048,
        extensions: [
          {
            name: 'basicConstraints',
            cA: false
          },
          {
            name: 'keyUsage',
            keyCertSign: true,
            digitalSignature: true,
            keyEncipherment: true
          },
          {
            name: 'extKeyUsage',
            serverAuth: true
          },
          {
            name: 'subjectAltName',
            altNames: ipAddresses.map(ip => ({
              type: 2,
              value: ip
            }))
          }
        ]
      }
    );
    
    fs.writeFileSync(keyPath, privateKeyPem);
    fs.writeFileSync(certPath, certPem);
  }

  console.log('');
  console.log('✅ Certificates generated successfully!');
  console.log('');
  console.log('📁 Location:');
  console.log(`  - Key:  ${keyPath}`);
  console.log(`  - Cert: ${certPath}`);
  console.log('');
  console.log('🚀 Start backend with: npm run dev');
  console.log('');
  
} catch (error) {
  console.error('❌ Error: Missing required package!');
  console.error('');
  console.error('Please install one of these packages:');
  console.error('');
  console.error('Option 1 (Recommended):');
  console.error('  npm install node-forge');
  console.error('');
  console.error('Option 2:');
  console.error('  npm install selfsigned');
  console.error('');
  console.error('Then run: node generate-certs.js');
  console.error('');
  process.exit(1);
}
