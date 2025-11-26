import { drizzle } from "drizzle-orm/mysql2";
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

export const connection = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || 'pirate_user',
  password: process.env.DB_PASSWORD || 'Patate123',
  database: process.env.DB_DATABASE || 'pirate',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export const db = drizzle(connection, {schema, mode: 'default'});

export const testConnection = async (): Promise<{success: boolean; error?: string}> => {
  try {
    await connection.query('SELECT 1');

    const [databases] = await connection.query('SHOW DATABASES LIKE ?', ['pirate']);
    if (Array.isArray(databases) && databases.length === 0) {
      throw new Error(`pirate database does not exist`);
    }

    console.log('Database connection successfull');
    return {success: true};
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error('Database connection failed:', errorMessage);
    return {success: false, error: errorMessage};
  }
}
