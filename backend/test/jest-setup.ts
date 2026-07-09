// Load environment variables for E2E tests
require('dotenv').config({
  path: require('path').resolve(__dirname, '..', '.env'),
});

global.crypto = require('crypto');
