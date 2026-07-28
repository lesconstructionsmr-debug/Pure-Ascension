const fs = require('fs');

['index.html', 'public/index.html'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hrefMatches = [...content.matchAll(/href="(#[a-zA-Z0-9_-]+)"/g)].map(m => m[1]);
  const idMatches = [...content.matchAll(/id="([a-zA-Z0-9_-]+)"/g)].map(m => m[1]);
  
  console.log(`=== ${file} ===`);
  const uniqueHrefs = Array.from(new Set(hrefMatches));
  console.log('Unique anchor hrefs:', uniqueHrefs);
  console.log('Total IDs found:', idMatches.length);
  
  uniqueHrefs.forEach(href => {
    const targetId = href.replace('#', '');
    const exists = idMatches.includes(targetId);
    console.log(`  Link ${href} -> ID target exists: ${exists}`);
  });
});
