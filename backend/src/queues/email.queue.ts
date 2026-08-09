import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import {
  sendOtpEmail,
  sendLowStockEmail,
  sendCriticalStockEmail,
  sendChallanConfirmationEmail,
  sendFollowupReminderEmail,
} from '../utils/email.service';

let emailQueue: Queue | null = null;
let connection: IORedis | null = null;
let queueEnabled = false;

export const getConnection = (): IORedis | null => connection;

export const initQueue = (): void => {
  try {
    const redisHost = config.redis.url || 'redis://localhost:6379';
    const isTls = redisHost.startsWith('rediss://');

    connection = new IORedis(redisHost, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
    });

    connection.on('error', (err) => {
      if (queueEnabled) {
        queueEnabled = false;
        console.warn('[Queue] Redis connection error:', err.message, '- Using direct email fallback.');
      }
    });

    connection.ping().then(() => {
      if (!connection) return;
      queueEnabled = true;
      emailQueue = new Queue('email-notifications', { connection });

      new Worker(
        'email-notifications',
        async (job: Job) => {
          const { type, data } = job.data;
          console.log(`📬 [Queue Worker] Processing email job: ${type} to ${data.to}`);
          switch (type) {
            case 'SEND_OTP':
              await sendOtpEmail(data.to, data.otp, data.purpose);
              break;
            case 'SEND_LOW_STOCK_EMAIL':
              await sendLowStockEmail(data.to, data.productName, data.currentStock, data.minimumStock, data.imageUrl);
              break;
            case 'SEND_CRITICAL_STOCK_EMAIL':
              await sendCriticalStockEmail(data.to, data.productName, data.currentStock, data.minimumStock, data.imageUrl);
              break;
            case 'SEND_CHALLAN_EMAIL':
              await sendChallanConfirmationEmail(data.to, data.challanNumber, data.customerName, data.totalQuantity);
              break;
            case 'SEND_FOLLOWUP_EMAIL':
              await sendFollowupReminderEmail(data.to, data.customerName, new Date(data.followUpDate), data.notes);
              break;
            default:
              console.warn('[Queue] Unknown job type:', type);
          }
        },
        { connection }
      );

      console.log('🚀 [Queue] Upstash Redis email queue initialized successfully!');
    }).catch((err) => {
      console.warn('[Queue] Redis ping failed:', err.message, '- Using direct email fallback.');
      if (connection) {
        try { connection.disconnect(); } catch { /* ignore */ }
        connection = null;
      }
    });
  } catch (err) {
    console.warn('[Queue] Redis init exception:', (err as Error).message, '- Using direct email fallback.');
  }
};

export const queueEmail = async (type: string, data: Record<string, unknown>): Promise<void> => {
  if (emailQueue && queueEnabled) {
    try {
      await emailQueue.add(type, { type, data }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
      console.log(`📥 [Queue] Queued email job: ${type} for ${data.to}`);
      return;
    } catch (err) {
      console.warn('[Queue] Enqueue failed, falling back to direct send:', (err as Error).message);
    }
  }

  // Direct email fallback
  try {
    console.log(`⚡ [Direct Email] Sending ${type} directly to ${data.to}`);
    switch (type) {
      case 'SEND_OTP':
        await sendOtpEmail(data.to as string, data.otp as string, data.purpose as string);
        break;
      case 'SEND_LOW_STOCK_EMAIL':
        await sendLowStockEmail(data.to as string, data.productName as string, data.currentStock as number, data.minimumStock as number, data.imageUrl as string);
        break;
      case 'SEND_CRITICAL_STOCK_EMAIL':
        await sendCriticalStockEmail(data.to as string, data.productName as string, data.currentStock as number, data.minimumStock as number, data.imageUrl as string);
        break;
      case 'SEND_CHALLAN_EMAIL':
        await sendChallanConfirmationEmail(data.to as string, data.challanNumber as string, data.customerName as string, data.totalQuantity as number);
        break;
      case 'SEND_FOLLOWUP_EMAIL':
        await sendFollowupReminderEmail(data.to as string, data.customerName as string, new Date(data.followUpDate as string), data.notes as string);
        break;
    }
  } catch (err) {
    console.error('[Email] Direct send failed:', (err as Error).message);
  }
};
