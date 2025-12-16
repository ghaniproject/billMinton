const bcrypt = require('bcryptjs');

async function createUser() {  
  const username = process.argv[2];
  const password = process.argv[3];
  const role = process.argv[4] || 'user';

  if (!username || !password) {
    console.log('Usage: node scripts/create-user.js <username> <password> [role]');
    console.log('Example: node scripts/create-user.js admin admin123 admin');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  console.log('\n=== User Credentials ===');
  console.log('Username:', username);
  console.log('Password:', password);
  console.log('Role:', role);
  console.log('\n=== SQL Query ===');
  console.log(`INSERT INTO users (username, password, role) VALUES ('${username}', '${hashedPassword}', '${role}');`);
  console.log('\n=== Hashed Password ===');
  console.log(hashedPassword);
  console.log('\n');
}

createUser();

