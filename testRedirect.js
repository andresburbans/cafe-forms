const https = require('https');
https.get('https://unsplash.com/photos/2GrRlrLReQc/download?force=true&w=800', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers.location);
}).on('error', (e) => {
  console.error(e);
});
