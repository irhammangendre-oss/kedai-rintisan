// Merakit src/ menjadi satu berkas index.html yang bisa dibuka langsung.
const fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const out = r('template.html').replace('/*STYLE*/', () => r('style.css')).replace('/*ENGINE*/', () => r('engine.js')).replace('/*UI*/', () => r('ui.js'));
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
console.log('index.html', (out.length / 1024).toFixed(1) + ' KB');
