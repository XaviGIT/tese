const http = require('http')
const fs = require('fs')

const server = http.createServer((req, res) => {
  if (req.url === '/data.json') {
    res.writeHead(200, { 'content-type': 'application/json' })
    fs.createReadStream('data.json').pipe(res)
  } else {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('checkpoints.html').pipe(res)
  }
});

console.log("Starting server...");
console.log('URL: http://localhost:4000/');
server.listen(process.env.PORT || 4000)