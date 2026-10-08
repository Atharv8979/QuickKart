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
