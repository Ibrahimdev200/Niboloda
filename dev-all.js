const { spawn } = require('child_process');

console.log('🚀 Starting NIBOLODA Full-Stack Environment...');
console.log('📡 Starting Express Backend API on http://localhost:5000');
console.log('💻 Starting Vite Frontend on http://localhost:3000\n');

const server = spawn('node', ['src/server/index.js'], { stdio: 'inherit', shell: true });
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

const cleanup = () => {
  server.kill();
  vite.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
