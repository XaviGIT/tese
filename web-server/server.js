const http = require('http')
const fs = require('fs')

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' })
  fs.createReadStream('example.html').pipe(res)
})

console.log("Starting server...");
console.log('URL: http://localhost:3000/');
server.listen(process.env.PORT || 3000)