/**
 * Script to hash a password using the same parameters as the application
 * Usage: npx ts-node scripts/hash-password.ts <password>
 */

import * as argon2 from 'argon2';

async function hashPassword(password: string): Promise<void> {
  try {
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    console.log('Password:', password);
    console.log('Hashed Password:', hashedPassword);
    console.log('\nCopy the hashed password above to use in your database.');
  } catch (error) {
    console.error('Error hashing password:', error);
    process.exit(1);
  }
}

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.error('Usage: npx ts-node scripts/hash-password.ts <password>');
  process.exit(1);
}

hashPassword(password);

