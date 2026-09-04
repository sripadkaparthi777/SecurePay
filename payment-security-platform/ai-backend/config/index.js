import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  port: process.env.PORT || 5002,
  jwtSecret: process.env.JWT_SECRET || 'securepay-jwt-academic-secret-key-2026',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  dbPath: path.join(__dirname, '../database/securepay.db'),
};
