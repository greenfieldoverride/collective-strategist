require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('USE_MOCK_DATA:', process.env.USE_MOCK_DATA);
