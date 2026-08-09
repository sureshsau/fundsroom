import { Request, Response, NextFunction } from 'express';
import {
  loginService,
  sendOtpService,
  verifyOtpService,
  forgotPasswordService,
  resetPasswordService,
} from './auth.service';
import { createAuditLog } from '../audit/audit.service';
import { OtpPurpose } from '@prisma/client';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);

    await createAuditLog({
      userId: result.user.id,
      action: 'LOGIN',
      ipAddress: req.ip,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, purpose } = req.body;
    const result = await sendOtpService(email, purpose as OtpPurpose);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, purpose } = req.body;
    const result = await verifyOtpService(email, otp, purpose as OtpPurpose);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await forgotPasswordService(email);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await resetPasswordService(email, otp, newPassword);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = (await import('../../database/prisma')).default;
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      await createAuditLog({
        userId: req.user.userId,
        action: 'LOGOUT',
        ipAddress: req.ip,
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};
