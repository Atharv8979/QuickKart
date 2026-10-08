import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'quickkart_jwt_secret_key_2026_super_secure';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
      }

      const decoded = jwt.verify(token, getJwtSecret());

      if (!decoded || !decoded.id) {
        return res.status(401).json({ success: false, message: 'Not authorized, invalid token payload' });
      }

      if (supabase) {
        const { data: user, error } = await supabase
          .from('users')
          .select('id, name, email, role, phone, address, status')
          .eq('id', decoded.id)
          .single();

        if (error || !user) {
          return res.status(401).json({ success: false, message: 'User not found or unauthorized' });
        }

        if (user.status === 'suspended') {
          return res.status(403).json({ success: false, message: 'Account has been suspended by administration' });
        }

        req.user = {
          ...user,
          _id: user.id,
        };
      } else {
        // Fallback user context when operating without direct database connection
        req.user = {
          id: decoded.id,
          _id: decoded.id,
          role: decoded.role || 'customer',
          name: 'QuickKart User',
          email: 'user@quickkart.com',
          status: 'active',
        };
      }

      return next();
    } catch (error) {
      console.error('JWT Auth Error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Optional auth for PUBLIC routes that behave differently for signed-in users
// (e.g. GET /api/products: a shopkeeper must only ever see their own shop's
// catalog). Populates req.user when a valid token is present, but NEVER blocks
// the request — anonymous callers just continue without a user context.
export const optionalProtect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer')) return next();

  const token = header.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || !decoded.id) return next();

    if (supabase) {
      const { data: user } = await supabase
        .from('users')
        .select('id, name, email, role, phone, address, status')
        .eq('id', decoded.id)
        .single();
      if (user && user.status !== 'suspended') {
        req.user = { ...user, _id: user.id };
      }
    } else {
      req.user = {
        id: decoded.id,
        _id: decoded.id,
        role: decoded.role || 'customer',
        name: 'QuickKart User',
        email: 'user@quickkart.com',
        status: 'active',
      };
    }
  } catch {
    // Invalid/expired token on an optional route: continue anonymously.
  }
  return next();
};
