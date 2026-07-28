const fs = require('fs');
const https = require('https');
const path = require('path');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (Status Code: ${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

const run = async () => {
  const base = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/';
  const outDir = path.join(__dirname, '../assets/exercises');
  
  console.log('Downloading pullup images...');
  try {
    await download(base + '0.jpg', path.join(outDir, 'traction_1.png'));
    console.log('Downloaded traction_1.png successfully!');
    await download(base + '1.jpg', path.join(outDir, 'traction_2.png'));
    console.log('Downloaded traction_2.png successfully!');
  } catch (err) {
    console.error('Download failed:', err.message);
  }
};

run();
