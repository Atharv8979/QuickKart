const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\itsme\\OneDrive\\Documents\\QuickKart\\backend\\controllers\\shopController.js', 'utf8');
const fixed = content
  .replace(/`shopId`/g, 'shopId')
  .replace(/`shop_id`/g, 'shop_id')
  .replace(/`/g, '')
  .replace(/\uFFFD/g, '');
fs.writeFileSync('C:\\Users\\itsme\\OneDrive\\Documents\\QuickKart\\backend\\controllers\\shopController.js', fixed);
console.log('Fixed');