const https = require('https');
const apiKey = 'AIzaSyDNvnzAPK9gTnTrpHA6dI0QqzZpdSd4eUU';
const model = 'gemini-2.0-flash';
const messages = [{ role: 'user', content: 'hi' }];

const systemParts = messages
  .filter(m => m.role === 'system')
  .map(m => m.content)
  .join('\n\n');

const contents = messages
  .filter(m => m.role !== 'system')
  .map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

const body = JSON.stringify({
  contents,
  systemInstruction: systemParts ? { parts: [{ text: systemParts }] } : undefined,
  generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
});

const path = `/v1beta/models/${model}:generateContent?key=${apiKey}`;

console.log('Sending request to', path);
console.log('Body:', body);

const req = https.request(
  {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout: 45000,
  },
  res => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('RAW RESPONSE:', data);
    });
  }
);
req.on('error', err => console.error('NET ERROR:', err));
req.write(body);
req.end();
