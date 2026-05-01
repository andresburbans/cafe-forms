const ids = ['2GrRlrLReQc', 'KU7C4W330CY', 'E5yBVJzQx3I', 'H0fYN1-Ps5g', 'UrLsHH6eaIY'];
const fetchIds = async () => {
  for (const id of ids) {
    try {
      const res = await fetch('https://unsplash.com/photos/' + id, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        }
      });
      const html = await res.text();
      const match = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (match) {
        console.log(id + ' -> ' + match[1]);
      } else {
        console.log(id + ' -> not found');
      }
    } catch (e) {
      console.log(id + ' -> error: ' + e.message);
    }
  }
};
fetchIds();
