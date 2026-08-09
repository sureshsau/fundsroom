import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../middleware/auth.middleware';

let io: SocketServer | null = null;

export const initSocket = (server: Server): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as JwtPayload;
      (socket as Socket & { user?: JwtPayload }).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user?: JwtPayload }).user;
    if (!user) return;

    // Join user-specific and role-specific rooms
    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);

    console.log(`[Socket] User ${user.email} (${user.role}) connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${user.email} disconnected: ${socket.id}`);
    });

    // Mark notifications as read via socket
    socket.on('mark-read', (notificationId: string) => {
      console.log(`[Socket] Mark read: ${notificationId} by ${user.userId}`);
    });
  });

  return io;
};

export const getIO = (): SocketServer | null => io;

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToRole = (role: string, event: string, data: unknown): void => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

export const emitToAll = (event: string, data: unknown): void => {
  if (io) {
    io.emit(event, data);
  }
};
