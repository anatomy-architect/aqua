import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';
import { config } from './config';
import { money } from './money';

export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function requestId(): string {
  return crypto.randomUUID();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateReferralCode(fullName: string): string {
  const clean = fullName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'USER';
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `AQ${clean}${rand}`;
}

interface TokenPayload {
  id: number;
  role: string;
  jti: string;
}

export function signToken(user: { id: number; role: string }): string {
  const payload: TokenPayload = { id: user.id, role: user.role, jti: crypto.randomUUID() };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as SignOptions);
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.env === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.cookieName, { httpOnly: true, sameSite: 'lax', path: '/' });
}

function readToken(req: Request): string | null {
  const cookie = req.cookies?.[config.cookieName];
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readToken(req);
    if (!token) throw new AppError(401, 'Authentication required.');
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    const revoked = await prisma.revokedToken.findUnique({ where: { jti: decoded.jti } });
    if (revoked) throw new AppError(401, 'Session has been revoked.');
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) throw new AppError(401, 'User not found.');
    if (user.status === 'suspended') throw new AppError(403, 'Your account is suspended. Please contact support.');
    (req as AuthedRequest).user = user;
    (req as AuthedRequest).tokenPayload = decoded;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message, requestId: req.requestId });
      return;
    }
    res.status(401).json({ error: 'Invalid or expired session.', requestId: req.requestId });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin privileges required.', requestId: req.requestId });
    return;
  }
  next();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function publicUser(user: {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  referralCode: string;
  referredById: number | null;
  availableBalance: unknown;
  heldBalance: unknown;
  totalDeposited: unknown;
  totalPaidOut: unknown;
  totalEarned: unknown;
  totalReferralEarned: unknown;
  bep20Address: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    referralCode: user.referralCode,
    referredById: user.referredById,
    availableBalance: money(String(user.availableBalance)),
    heldBalance: money(String(user.heldBalance)),
    totalDeposited: money(String(user.totalDeposited)),
    totalPaidOut: money(String(user.totalPaidOut)),
    totalEarned: money(String(user.totalEarned)),
    totalReferralEarned: money(String(user.totalReferralEarned)),
    bep20Address: user.bep20Address,
    createdAt: user.createdAt
  };
}

export async function writeAudit(
  actor: { id: number; email: string },
  action: string,
  targetType: string,
  targetId: string | number | null,
  details: string,
  req?: Request
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      targetType,
      targetId: targetId === null ? null : String(targetId),
      details,
      ipAddress: req?.ip || '127.0.0.1'
    }
  });
}

export async function notify(userId: number, title: string, body: string): Promise<void> {
  await prisma.notification.create({ data: { userId, title, body } });
}

export type AuthedRequest = Request & {
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
    status: string;
    referralCode: string;
    referredById: number | null;
    availableBalance: unknown;
    heldBalance: unknown;
    totalDeposited: unknown;
    totalPaidOut: unknown;
    totalEarned: unknown;
    totalReferralEarned: unknown;
    bep20Address: string | null;
    createdAt: Date;
  };
  tokenPayload: TokenPayload;
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
