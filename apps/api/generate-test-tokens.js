const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super-secret-change-in-production';

const testUsers = {
  AGATHA_OWNER: {
    id: 'agatha-001',
    email: 'agatha.harkness@test.com',
    tier: 'sovereign_circle'
  },
  RIO_COLLABORATOR: {
    id: 'rio-002', 
    email: 'rio.vidal@test.com',
    tier: 'individual_pro'
  },
  ALICE_OBSERVER: {
    id: 'alice-003',
    email: 'alice.wu-gulliver@test.com', 
    tier: 'individual_pro'
  },
  BILLY_ADMIN: {
    id: 'billy-004',
    email: 'billy.maximoff@test.com',
    tier: 'sovereign_circle'
  },
  JEN_POTIONS: {
    id: 'jen-005',
    email: 'jennifer.kale@test.com',
    tier: 'individual_pro'
  }
};

console.log('Generated JWT tokens for test users:');
console.log('');

for (const [userKey, userData] of Object.entries(testUsers)) {
  const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });
  console.log(`${userKey}: ${token}`);
  console.log('');
}