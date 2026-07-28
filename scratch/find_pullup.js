const https = require('https');

const url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
console.log('Downloading database...');

https.get(url, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log(`Total exercises: ${data.length}`);
      data.forEach((ex) => {
        const name = ex.name || '';
        if (name.toLowerCase().includes('pull-up') || name.toLowerCase().includes('pullup') || name.toLowerCase().includes('pull up')) {
          console.log(`Name: ${name}`);
          console.log(`Images:`, ex.images || []);
          console.log('-'.repeat(40));
        }
      });
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('Error fetching data:', e.message);
});
