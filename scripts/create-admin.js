#!/usr/bin/env node

const { db, pool } = require('../server/db');
const { users, userRoles, roles } = require('../src/lib/db/schema');
const bcrypt = require('bcryptjs');
const { eq } = require('drizzle-orm');
require('dotenv').config();

async function createAdmin() {
  console.log('👑 Creating new administrator account...');
  
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    let email, firstName, lastName, password;
    
    if (args.length === 4) {
      // Arguments provided: email firstName lastName password
      [email, firstName, lastName, password] = args;
    } else {
      // Interactive mode
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const question = (prompt) => new Promise((resolve) => {
        readline.question(prompt, resolve);
      });
      
      email = await question('Email address: ');
      firstName = await question('First name: ');
      lastName = await question('Last name: ');
      password = await question('Password: ');
      
      readline.close();
    }
    
    // Validate input
    if (!email || !firstName || !lastName || !password) {
      console.error('❌ All fields are required');
      process.exit(1);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format');
      process.exit(1);
    }
    
    // Check if password is strong enough
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      console.error('❌ User with this email already exists');
      process.exit(1);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      emailVerified: true,
      isActive: true,
    }).returning();
    
    // Get admin role
    const adminRole = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
    if (adminRole.length === 0) {
      console.error('❌ Admin role not found. Please run setup.js first.');
      process.exit(1);
    }
    
    // Assign admin role
    await db.insert(userRoles).values({
      userId: newUser.id,
      roleId: adminRole[0].id,
    });
    
    console.log('\n✅ Administrator created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Role: Admin`);
    console.log('\n🔗 The new admin can now log in at your system URL');
    
  } catch (error) {
    console.error('❌ Failed to create administrator:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  createAdmin().catch(console.error);
}

module.exports = { createAdmin };