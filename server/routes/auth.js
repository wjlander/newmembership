const express = require('express');
const bcrypt = require('bcryptjs');
const { SignJWT, jwtVerify } = require('jose');
const crypto = require('crypto');
const { db } = require('../db');
const { users, userRoles, roles, communicationLog, memberTags, memberTagAssignments } = require('../../src/lib/db/schema');
const { eq, and } = require('drizzle-orm');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../services/email');
const { generateReferralCode } = require('../utils/referrals');
const router = express.Router();

// Configuration
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');
const REFRESH_SECRET = new TextEncoder().encode(process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production');
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// Helper functions
const generateTokens = async (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    roles: user.roles || [],
  };

  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  const refreshToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES_IN)
    .sign(REFRESH_SECRET);

  return { accessToken, refreshToken };
};

const verifyRefreshToken = async (token) => {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
};

// Routes

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, bio, language, referredBy } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate referral code
    const referralCode = await generateReferralCode();

    // Create user
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      bio,
      language: language || 'en',
      referralCode,
      referredBy,
      emailVerificationToken: crypto.randomBytes(32).toString('hex'),
    }).returning();

    // Assign default role (member)
    const memberRole = await db.select().from(roles).where(eq(roles.name, 'member')).limit(1);
    if (memberRole.length > 0) {
      await db.insert(userRoles).values({
        userId: user.id,
        roleId: memberRole[0].id,
      });
    }

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Welcome! Please verify your email',
      template: 'email-verification',
      data: {
        firstName,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}`,
      },
    });

    // Log communication
    await db.insert(communicationLog).values({
      userId: user.id,
      type: 'email',
      direction: 'outbound',
      subject: 'Email Verification',
      status: 'sent',
    });

    // Handle referral if applicable
    if (referredBy) {
      const referrer = await db.select().from(users).where(eq(users.referralCode, referredBy)).limit(1);
      if (referrer.length > 0) {
        await db.insert(users).values({
          referredBy: referrer[0].id,
        });
        
        // Send referral notification email
        await sendEmail({
          to: referrer[0].email,
          subject: 'Someone joined using your referral code!',
          template: 'referral-notification',
          data: {
            firstName: referrer[0].firstName,
            referredUserName: `${firstName} ${lastName}`,
          },
        });
      }
    }

    // Generate tokens
    const tokens = await generateTokens(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tokens,
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userData = user[0];

    // Check if user is active
    if (!userData.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check 2FA if enabled
    if (userData.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(400).json({ error: 'Two-factor authentication code is required' });
      }
      
      // Verify 2FA code (implementation depends on your 2FA library)
      const isValid2FA = await verifyTwoFactorCode(userData.id, twoFactorCode);
      if (!isValid2FA) {
        return res.status(401).json({ error: 'Invalid two-factor authentication code' });
      }
    }

    // Get user roles
    const userRoleData = await db
      .select({
        roleName: roles.name,
        permissions: roles.permissions,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userData.id));

    const userRolesList = userRoleData.map(ur => ur.roleName);

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userData.id));

    // Generate tokens
    const tokens = await generateTokens({
      ...userData,
      roles: userRolesList,
    });

    // Log successful login
    await db.insert(communicationLog).values({
      userId: userData.id,
      type: 'in_app',
      direction: 'inbound',
      subject: 'Login',
      status: 'delivered',
    });

    res.json({
      message: 'Login successful',
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        roles: userRolesList,
        language: userData.language,
        timezone: userData.timezone,
      },
      tokens,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Find user
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (user.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get user roles
    const userRoleData = await db
      .select({
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user[0].id));

    const userRolesList = userRoleData.map(ur => ur.roleName);

    // Generate new tokens
    const tokens = await generateTokens({
      ...user[0],
      roles: userRolesList,
    });

    res.json(tokens);

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we'll just return success
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user roles
    const userRoleData = await db
      .select({
        roleName: roles.name,
        permissions: roles.permissions,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const userRolesList = userRoleData.map(ur => ({
      name: ur.roleName,
      permissions: ur.permissions,
    }));

    // Get user tags
    const userTags = await db
      .select({
        tagId: memberTagAssignments.tagId,
        tagName: memberTags.name,
        tagColor: memberTags.color,
      })
      .from(memberTagAssignments)
      .innerJoin(memberTags, eq(memberTagAssignments.tagId, memberTags.id))
      .where(eq(memberTagAssignments.userId, userId));

    // Get current membership
    const currentMembership = await db
      .select()
      .from(memberships)
      .innerJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))
      .where(and(
        eq(memberships.userId, userId),
        eq(memberships.status, 'active')
      ))
      .orderBy(memberships.endDate)
      .limit(1);

    res.json({
      user: {
        id: user[0].id,
        email: user[0].email,
        firstName: user[0].firstName,
        lastName: user[0].lastName,
        avatar: user[0].avatar,
        phone: user[0].phone,
        bio: user[0].bio,
        isPublic: user[0].isPublic,
        language: user[0].language,
        timezone: user[0].timezone,
        twoFactorEnabled: user[0].twoFactorEnabled,
        referralCode: user[0].referralCode,
        lastLoginAt: user[0].lastLoginAt,
        emailVerified: user[0].emailVerified,
        onboardingCompleted: user[0].onboardingCompleted,
        isActive: user[0].isActive,
        createdAt: user[0].createdAt,
      },
      roles: userRolesList,
      tags: userTags,
      membership: currentMembership.length > 0 ? currentMembership[0] : null,
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await db.select().from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    if (user.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    await db.update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
      })
      .where(eq(users.id, user[0].id));

    res.json({ message: 'Email verified successfully' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request password reset
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) {
      // Don't reveal whether user exists
      return res.json({ message: 'If an account exists with this email, a password reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await db.update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      })
      .where(eq(users.id, user[0].id));

    // Send reset email
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        firstName: user[0].firstName,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
      },
    });

    res.json({ message: 'If an account exists with this email, a password reset link has been sent' });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await db.select().from(users)
      .where(and(
        eq(users.passwordResetToken, token),
        eq(users.passwordResetExpires, new Date())
      ))
      .limit(1);

    if (user.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(users.id, user[0].id));

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;