import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

function requiredInProd(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (process.env.NODE_ENV === 'production' && !process.env[name]) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value || '';
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: requiredInProd('JWT_SECRET', 'dev-only-change-me-in-production-aquavault'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.SESSION_COOKIE_NAME || 'aqua_session',
  bep20ReceivingAddress:
    process.env.BEP20_PUBLIC_RECEIVING_ADDRESS || '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461',
  logLevel: process.env.LOG_LEVEL || 'info'
};

export function isBep20Address(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function isTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim()) || value.trim().length >= 16;
}
