const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Remove scroll animation container
const startMarker = '{/* GLOBAL ANIMATION CONTAINER */}';
const endMarker = '{/* ═══ EL PROBLEMA ═══ */}';
const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
}

// Remove refs
content = content.replace('const beanRef = useRef<HTMLDivElement>(null);', '');
content = content.replace('const pathContainerRef = useRef<HTMLDivElement>(null);', '');

fs.writeFileSync('src/app/page.tsx', content);
