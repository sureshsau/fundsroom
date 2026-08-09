import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';
import {
  login,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
} from './auth.controller';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.', errorCode: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many OTP requests, please try again later.', errorCode: 'OTP_RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/send-otp', otpLimiter, validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);

export default router;
