const https = require('https');
https.get('https://images.unsplash.com/photo-2GrRlrLReQc', (res) => {
  console.log('Status Code:', res.statusCode);
}).on('error', (e) => {
  console.error(e);
});
