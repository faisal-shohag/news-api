/**
 * Vercel entry point. Serverless functions export a handler rather than calling
 * `listen`; an Express app is a valid handler, so the app is exported directly.
 * Local development uses `src/server.ts` instead.
 */
import { createApp } from '../src/app';

export default createApp();
