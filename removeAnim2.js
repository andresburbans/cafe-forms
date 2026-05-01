const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Remove handleScroll block
const startMarker = '// Scroll Anim';
const endMarker = 'return () => {';
const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
}

// Remove window.removeEventListener('scroll', handleScroll);
content = content.replace("window.removeEventListener('scroll', handleScroll);", "");

fs.writeFileSync('src/app/page.tsx', content);
