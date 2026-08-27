import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('Нет DATABASE_URL!');
}

export const sql = neon(process.env.DATABASE_URL);
