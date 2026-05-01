const fs = require('fs');
let content = fs.readFileSync('src/app/globals.css', 'utf8');

content = content.replace(/\.home-reveal \{[^}]+\}/g, '');
content = content.replace(/\.home-reveal\.home-visible \{[^}]+\}/g, '');
content = content.replace(/\.home-path-container \{[^}]+\}/g, '');
content = content.replace(/\.home-path-svg \{[^}]+\}/g, '');
content = content.replace(/\.home-path-line \{[^}]+\}/g, '');
content = content.replace(/\.home-bean-icon \{[^}]+\}/g, '');
content = content.replace(/\.home-btn-pulse \{[^}]+\}/g, '');

fs.writeFileSync('src/app/globals.css', content);
