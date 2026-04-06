import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rateLimiter.js';
import { runMigrations } from './db/migrate.js';
import { runSbgMigrations } from './db/migrate-sbg.js';
import { connectRedis } from './db/redis.js';
import { getGraphClient } from './services/graph.js';
import { startInboxPoller } from './services/inboxPoller.js';
import healthRouter from './routes/health.js';
import consultationsRouter from './routes/consultations.js';
import contactsRouter from './routes/contacts.js';
import graphRouter from './routes/graph.js';
import mailboxRouter from './routes/mailbox.js';
import agentRouter from './routes/agent.js';
import chatRouter from './routes/chat.js';
import labProductsRouter from './routes/lab/products.js';
import sbgEntitiesRouter from './routes/sbg/entities.js';
import sbgAuthRouter, { verifyToken } from './routes/sbg/auth.js';
import sbgIntegrationsRouter from './routes/sbg/integrations.js';
import sbgAgentsRouter from './routes/sbg/agents.js';
import sbgFunctionsRouter from './routes/sbg/functions.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8001'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '200kb' }));
app.use('/api', apiLimiter);

app.use('/uploads', express.static('uploads'));

app.use('/api/health', healthRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/graph', graphRouter);
app.use('/api/mailbox', mailboxRouter);
app.use('/api/agent', agentRouter);
app.use('/api/chat', chatRouter);
app.use('/api/lab/products', labProductsRouter);

app.use('/api/sbg', verifyToken);
app.use('/api/sbg/entities', sbgEntitiesRouter);
app.use('/api/sbg/auth', sbgAuthRouter);
app.use('/api/sbg/integrations', sbgIntegrationsRouter);
app.use('/api/sbg/agents', sbgAgentsRouter);
app.use('/api/sbg/functions', sbgFunctionsRouter);

async function start() {
  await connectRedis();
  await runMigrations();
  await runSbgMigrations();
  getGraphClient();
  startInboxPoller();
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
