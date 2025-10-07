#!/usr/bin/env node

const { db, pool } = require('../server/db');
const { users, roles, userRoles, organizationSettings } = require('../src/lib/db/schema');
const bcrypt = require('bcryptjs');
const { eq } = require('drizzle-orm');
require('dotenv').config();

async function setupSystem() {
  console.log('🚀 Setting up Membership Management System...');
  
  try {
    // Check if setup has already been run
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('⚠️  System appears to already be set up. Use create-admin.js to create additional admin users.');
      return;
    }

    // Create default roles
    console.log('👥 Creating default roles...');
    const defaultRoles = [
      {
        name: 'superuser',
        description: 'Full system access and administration',
        permissions: ['*'], // All permissions
      },
      {
        name: 'admin',
        description: 'Organization administration',
        permissions: [
          'users.read', 'users.create', 'users.update',
          'memberships.read', 'memberships.create', 'memberships.update',
          'events.read', 'events.create', 'events.update', 'events.delete',
          'documents.read', 'documents.create', 'documents.update', 'documents.delete',
          'email.read', 'email.create', 'email.send',
          'analytics.read', 'reports.generate',
          'settings.read', 'settings.update',
        ],
      },
      {
        name: 'member',
        description: 'Standard member access',
        permissions: [
          'profile.read', 'profile.update',
          'events.read', 'events.register',
          'memberships.read',
          'documents.read',
          'communications.read',
        ],
      },
      {
        name: 'guest',
        description: 'Limited read-only access',
        permissions: [
          'events.read',
          'public.documents.read',
          'public.profiles.read',
        ],
      },
    ];

    for (const role of defaultRoles) {
      await db.insert(roles).values(role);
    }
    console.log('✅ Default roles created');

    // Create superuser
    console.log('👑 Creating superuser...');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const [superuser] = await db.insert(users).values({
      email: 'admin@yourdomain.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      emailVerified: true,
      isActive: true,
    }).returning();

    // Assign superuser role
    const superuserRole = await db.select().from(roles).where(eq(roles.name, 'superuser')).limit(1);
    await db.insert(userRoles).values({
      userId: superuser.id,
      roleId: superuserRole[0].id,
    });
    console.log('✅ Superuser created (email: admin@yourdomain.com, password: admin123)');

    // Set up organization settings
    console.log('🏢 Setting up organization settings...');
    await db.insert(organizationSettings).values({
      name: process.env.ORG_NAME || 'Your Organization Name',
      description: 'Welcome to our membership management system',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      fontFamily: 'Inter',
      emailHeader: 'Welcome to our organization!',
      emailFooter: 'Thank you for being a valued member.',
      socialLinks: {
        website: 'https://yourdomain.com',
        email: 'info@yourdomain.com',
      },
      settings: {
        enablePublicProfiles: true,
        enableMemberDirectory: true,
        enableReferrals: true,
        enableSurveys: true,
        enableVolunteer: true,
        enableWorkflows: true,
        defaultLanguage: 'en',
        timezone: process.env.ORG_TIMEZONE || 'UTC',
      },
    });
    console.log('✅ Organization settings configured');

    // Create default member tags
    console.log('🏷️  Creating default member tags...');
    const defaultTags = [
      { name: 'New Member', color: '#10B981', description: 'Recently joined members' },
      { name: 'Active', color: '#3B82F6', description: 'Regularly participating members' },
      { name: 'Volunteer', color: '#F59E0B', description: 'Members who volunteer' },
      { name: 'Committee Member', color: '#8B5CF6', description: 'Members serving on committees' },
      { name: 'Event Organizer', color: '#EF4444', description: 'Members who organize events' },
      { name: 'Donor', color: '#EC4899', description: 'Members who have donated' },
    ];

    for (const tag of defaultTags) {
      await db.insert(memberTags).values(tag);
    }
    console.log('✅ Default member tags created');

    console.log('\n🎉 System setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Change the superuser password immediately');
    console.log('2. Configure your email settings in the admin panel');
    console.log('3. Set up your membership types');
    console.log('4. Customize your organization branding');
    console.log('5. Create your first event or announcement');
    console.log('\n🔗 Access your system at: http://localhost:3000');
    console.log('   Login with: admin@yourdomain.com / admin123');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupSystem().catch(console.error);
}

module.exports = { setupSystem };