import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// In production, this MUST be stored securely in the .env file.
// We use a fallback here so the app works seamlessly out of the box during development.
const JWT_SECRET = process.env.JWT_SECRET || 'dispatchx_super_secret_dev_key_2026';

/**
 * AuthController
 * Handles the business logic for user registration and JWT generation.
 */
export class AuthController {
  
  /**
   * Register a new Rider or Driver.
   */
  static async register(req, res) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields: name, email, password, role.' });
      }

      // 1. Check if the user already exists to prevent duplicate emails
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already registered.' });
      }

      // 2. Create the user (Password hashing happens inside the User model)
      const user = await User.create({ name, email, password, role });

      // 3. Generate a JSON Web Token (JWT)
      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' } // Token expires in 24 hours
      );

      // Return the token and user data to the frontend
      res.status(201).json({ token, user });
    } catch (error) {
      console.error('Registration Error:', error);
      res.status(500).json({ error: 'An error occurred during registration.' });
    }
  }

  /**
   * Login an existing user and return a JWT.
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password.' });
      }

      // 1. Fetch the user from the database
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // 2. Compare the plaintext password with the hashed password in PostgreSQL
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // 3. Generate a fresh JWT
      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Remove the password hash from the user object before sending it to the frontend
      delete user.password;

      res.status(200).json({ token, user });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'An error occurred during login.' });
    }
  }
}
