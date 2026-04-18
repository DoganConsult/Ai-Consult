import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rateLimiter.js';
import { requireBearer } from './middleware/requireBearer.js';
import { runMigrations } from './db/migrate.js';
import { connectRedis } from './db/redis.js';
import { getGraphClient } from './services/graph.js';
import healthRouter from './routes/health.js';
import graphRouter from './routes/graph.js';
import mailboxRouter from './routes/mailbox.js';
import chatRouter from './routes/chat.js';
import labProductsRouter from './routes/lab/products.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8001'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '200kb' }));
app.use('/api', apiLimiter);

app.use('/uploads', express.static('uploads'));

app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/lab/products', labProductsRouter);

app.use('/api/graph', requireBearer, graphRouter);
app.use('/api/mailbox', requireBearer, mailboxRouter);

app.use((req, res) => res.status(404).json({ error: 'not found', path: req.originalUrl }));

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'internal error' });
});

async function start() {
  await connectRedis();
  await runMigrations();
  if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
    try { getGraphClient(); } catch (e) { console.warn('Graph client init skipped:', e.message); }
  }
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Backend running on 127.0.0.1:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
