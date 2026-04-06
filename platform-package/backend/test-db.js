const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const config = require('./dist/config/database/platform-db.config').getPlatformConnectionConfig();
console.log(config);
