const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY);
console.log('CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY);
