import { Router } from 'express';
import healthCheck from './health-check.js';
import authRouter from './auth.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/auth', authRouter);

    return router;
};