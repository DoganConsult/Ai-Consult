const { spawn } = require('child_process');
const child = spawn('node', ['dist/server.js'], { env: { ...process.env, NODE_ENV: 'production', PORT: '3050' } });
child.stdout.on('data', d => process.stdout.write(d));
child.stderr.on('data', d => process.stderr.write(d));
child.on('close', code => console.log('CHILD EXITED WITH CODE:', code));
