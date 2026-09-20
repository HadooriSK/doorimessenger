const fs = require('fs');
const app = fs.readFileSync('C:\\Users\\hidis\\.gemini\\antigravity\\scratch\\web-messenger\\app.js', 'utf8');
const lines = app.split('\n');
let out = 'APP.JS:\n';
lines.forEach((line, i) => {
    if (line.includes('.set(') || line.includes('.update(') || line.includes('.add(')) {
        out += `${i+1}: ${line.trim()}\n`;
    }
});
const webrtc = fs.readFileSync('C:\\Users\\hidis\\.gemini\\antigravity\\scratch\\web-messenger\\webrtc.js', 'utf8');
const wLines = webrtc.split('\n');
out += '\nWEBRTC.JS:\n';
wLines.forEach((line, i) => {
    if (line.includes('.set(') || line.includes('.update(') || line.includes('.add(')) {
        out += `${i+1}: ${line.trim()}\n`;
    }
});
fs.writeFileSync('C:\\Users\\hidis\\.gemini\\antigravity\\scratch\\web-messenger\\writes.txt', out);
