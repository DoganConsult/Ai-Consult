import { Router } from 'express';
import dnocRoutes from './dnoc.routes';
import dsocRoutes from './dsoc.routes';
import dauthRoutes from './dauth.routes';
import dosRoutes from './dos.routes';

const router = Router();

router.use('/dnoc', dnocRoutes);
router.use('/dsoc', dsocRoutes);
router.use('/dauth', dauthRoutes);
router.use('/dos', dosRoutes);

export default router;
