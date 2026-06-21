import { query } from '../config/postgres.js';

/**
 * User Model
 * Acts as the Data Access Object (DAO) for the 'users' table.
 * By encapsulating SQL queries within this class, our controllers never have to 
 * worry about database syntax, separating the data layer from the business logic.
 */
export class User {
  /**
   * Creates a new user in the database.
   * @param {Object} param0 - User details
   * @param {string} param0.name
   * @param {string} param0.email
   * @param {string} param0.role - 'RIDER' or 'DRIVER'
   */
  static async create({ name, email, role }) {
    const text = `
      INSERT INTO users (name, email, role)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, role, created_at;
    `;
    const values = [name, email, role];
    
    const { rows } = await query(text, values);
    return rows[0];
  }

  /**
   * Finds a user by their UUID.
   * @param {string} id - The user's UUID
   */
  static async findById(id) {
    const text = `SELECT * FROM users WHERE id = $1;`;
    const { rows } = await query(text, [id]);
    return rows[0]; // Returns undefined if not found
  }
}
