const { jwtVerify } = require('jose');
const { db } = require('../db');
const { users, userRoles, roles } = require('../../src/lib/db/schema');
const { eq } = require('drizzle-orm');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await db.select().from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user.length === 0 || !user[0].isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles || [],
    };

    next();
  } catch (error) {
    if (error.name === 'JWTExpired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ error: 'No roles assigned' });
    }

    const hasRequiredRole = requiredRoles.some(role => 
      req.user.roles.includes(role)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Get user roles with permissions
      const userRoleData = await db
        .select({
          permissions: roles.permissions,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, req.user.userId));

      const allPermissions = userRoleData.flatMap(ur => ur.permissions || []);
      
      if (!allPermissions.includes(requiredPermission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check if user exists and is active
    const user = await db.select().from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user.length > 0 && user[0].isActive) {
      req.user = {
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles || [],
      };
    }

    next();
  } catch (error) {
    // Invalid token, but we don't fail - just continue without auth
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  optionalAuth,
};