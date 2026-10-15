const http = require('http'),
  fs = require('fs'),
  path = require('path');
const root = process.argv[2],
  port = +process.argv[3] || 8081;
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};
http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      const html = path.join(root, p + '.html');
      f = fs.existsSync(html) ? html : path.join(root, 'index.html');
    }
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  })
  .listen(port, () => console.log('listening', port));
