import './platform/dos/http/error-handling/async-error-patch';

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

import { configureMiddleware } from './server-middleware';
import { mountRoutes, mountFinalHandlers } from './server-routes';
import { startServer } from './server-startup';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3010;

configureMiddleware(app);
mountRoutes(app);
mountFinalHandlers(app);
startServer(app, PORT);
