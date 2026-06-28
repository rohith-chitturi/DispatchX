import { query } from '../config/postgres.js';
import bcrypt from 'bcryptjs';

/**
 * User Model
 * Acts as the Data Access Object (DAO) for the 'users' table.
 * Now upgraded with enterprise-grade bcrypt password hashing.
 */
export class User {
  /**
   * Creates a new user in the database.
   * Automatically hashes the password before insertion to prevent plaintext leaks.
   */
  static async create({ name, email, password, role }) {
    // Hash the password with a computationally expensive salt (cost factor 10)
    // This protects against brute-force and rainbow table attacks.
    const hashedPassword = await bcrypt.hash(password, 10);

    const text = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at;
    `;
    
    const values = [name, email, hashedPassword, role];
    const { rows } = await query(text, values);
    
    // Notice we do NOT return the password hash back to the controller
    return rows[0];
  }

  /**
   * Finds a user by their UUID.
   * Useful for JWT verification and middleware.
   */
  static async findById(id) {
    // Explicitly exclude the password column for security
    const text = `SELECT id, name, email, role, created_at FROM users WHERE id = $1;`;
    const { rows } = await query(text, [id]);
    return rows[0];
  }

  /**
   * Finds a user by their email.
   * Required during the Login flow to verify their password.
   */
  static async findByEmail(email) {
    // We intentionally SELECT * here because AuthController needs the password hash to compare it
    const text = `SELECT * FROM users WHERE email = $1;`;
    const { rows } = await query(text, [email]);
    return rows[0];
  }
}


