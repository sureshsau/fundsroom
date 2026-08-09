import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    purpose: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_VERIFICATION']),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
    purpose: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_VERIFICATION']),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});
