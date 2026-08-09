import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { initSocket } from './socket/socket.manager';
import { initQueue } from './queues/email.queue';
import prisma from './database/prisma';

const server = createServer(app);

// Initialize Socket.IO
initSocket(server);

// Initialize BullMQ email queue (with Redis)
initQueue();

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n[Server] ${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[Server] Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${config.port} is already in use.`);
    console.error(`   Please stop the process using port ${config.port} or change PORT in backend/.env\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Server error:', err.message);
  }
});

server.listen(config.port, () => {
  console.log(`\n🚀 ERP Portal Backend running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Health check: http://localhost:${config.port}/health`);
  console.log(`   API base: http://localhost:${config.port}/api\n`);
});

export default server;
