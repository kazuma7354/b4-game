const fs = require('fs');
const path = require('path');
const config = `
window.env = {
  SUPABASE_URL: '${process.env.SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY}'
};
`;
fs.writeFileSync(path.join(__dirname, 'config.js'), config);