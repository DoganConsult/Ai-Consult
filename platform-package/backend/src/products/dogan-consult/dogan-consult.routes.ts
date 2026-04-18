import { Router, Request, Response } from 'express';
// Relying on native workspace resolution pointing to @dos/platform-core extraction
import { CoreConsultationService, CoreContactService } from '../../../../packages/dos-platform-core';
import { SalesService } from '@dos/erp-sales';
import { asyncHandler } from '../../platform/dos/http/error-handling/async-handler';
import { safeQuery } from '../../config/database/database';
import { authenticate } from '../../platform/dauth';

const router = Router();
const consultationService = new CoreConsultationService(safeQuery);
const contactService = new CoreContactService(safeQuery);
const erpSales = new SalesService(safeQuery);

// Bounded context: Consultations
router.post(
  '/consultations',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant boundary omitted.' });
      return;
    }

    const payload = req.body;
    const result = await consultationService.submit(payload, { tenantId });
    
    try {
      await erpSales.createLead('DOGAN_CONSULT', payload.name || payload.company || 'Unknown', payload.email || 'unknown@domain.com', 5000, { tenantId });
    } catch (e) {
      console.warn('ERP Lead Sync failed (Consultation):', e);
    }

    res.status(201).json(result);
  })
);

router.get(
  '/consultations/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Identity boundary violation.' });
      return;
    }

    const stats = await consultationService.getStats({ tenantId });
    res.json(stats);
  })
);

// Bounded context: Contacts
router.post(
  '/contacts',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant boundary omitted.' });
      return;
    }

    const payload = req.body;
    const result = await contactService.submit(payload, { tenantId });

    try {
      await erpSales.createLead('DOGAN_CONSULT', payload.name || 'Unknown', payload.email || 'unknown@domain.com', 1000, { tenantId });
    } catch (e) {
      console.warn('ERP Lead Sync failed (Contact):', e);
    }

    res.status(201).json(result);
  })
);

export default router;
