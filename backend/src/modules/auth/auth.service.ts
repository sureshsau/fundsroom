import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../database/prisma';
import { config } from '../../config';
import { queueEmail } from '../../queues/email.queue';
import { ApiError } from '../../middleware/error.middleware';
import { OtpPurpose } from '@prisma/client';

const SALT_ROUNDS = 12;

const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, 10);
};

export const loginService = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
  };
};

export const sendOtpService = async (email: string, purpose: OtpPurpose) => {
  // Check rate limit: max 3 OTPs per hour per email+purpose
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOtps = await prisma.otpVerification.count({
    where: {
      email,
      purpose,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentOtps >= config.otp.maxRequests) {
    throw new ApiError(429, 'Too many OTP requests. Please try again later.', 'OTP_RATE_LIMIT');
  }

  // Invalidate previous OTPs for same email+purpose
  await prisma.otpVerification.updateMany({
    where: { email, purpose, verifiedAt: null },
    data: { expiresAt: new Date(0) }, // expire immediately
  });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  const user = await prisma.user.findUnique({ where: { email } });

  await prisma.otpVerification.create({
    data: {
      userId: user?.id,
      email,
      otpHash,
      purpose,
      expiresAt,
    },
  });

  console.log(`🔑 [OTP CODE] For ${email} (${purpose}): ${otp}`);

  await queueEmail('SEND_OTP', { to: email, otp, purpose });

  return { message: 'OTP sent successfully' };
};

export const verifyOtpService = async (email: string, otp: string, purpose: OtpPurpose) => {
  const latestOtp = await prisma.otpVerification.findFirst({
    where: {
      email,
      purpose,
      verifiedAt: null,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestOtp) {
    throw new ApiError(400, 'OTP expired or not found. Please request a new one.', 'OTP_EXPIRED');
  }

  if (latestOtp.attempts >= config.otp.maxAttempts) {
    throw new ApiError(429, 'Maximum OTP attempts exceeded. Please request a new one.', 'OTP_MAX_ATTEMPTS');
  }

  // Increment attempts
  await prisma.otpVerification.update({
    where: { id: latestOtp.id },
    data: { attempts: { increment: 1 } },
  });

  const isValid = await bcrypt.compare(otp, latestOtp.otpHash);
  if (!isValid) {
    throw new ApiError(400, 'Invalid OTP', 'INVALID_OTP');
  }

  // Mark as verified
  await prisma.otpVerification.update({
    where: { id: latestOtp.id },
    data: { verifiedAt: new Date() },
  });

  // If email verification, mark user as verified
  if (purpose === 'EMAIL_VERIFICATION' && latestOtp.userId) {
    await prisma.user.update({
      where: { id: latestOtp.userId },
      data: { isEmailVerified: true },
    });
  }

  return { message: 'OTP verified successfully', email, purpose };
};

export const forgotPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(404, 'No account found with this email address. Please check your email or contact admin.', 'USER_NOT_FOUND');
  }

  await sendOtpService(email, 'PASSWORD_RESET');
  return { message: 'Password reset OTP sent to your email.' };
};

export const resetPasswordService = async (email: string, otp: string, newPassword: string) => {
  // Verify OTP first
  await verifyOtpService(email, otp, 'PASSWORD_RESET');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  return { message: 'Password reset successfully' };
};

export const createUserService = async (data: {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
}) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      isEmailVerified: true, // Admin-created users are pre-verified
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
};

// Utility to hash a plain password (used in seed)
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};
