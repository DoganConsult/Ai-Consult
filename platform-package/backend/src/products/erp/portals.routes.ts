import { Router } from 'express';
import { tenantGuard } from '../../platform/dos/http/guards/tenant-guard';
import { SalesService } from '../../../../../packages/dos-erp-sales';
import { safeQuery } from '../../config/database/database';

export const portalRoutes = Router();
const salesService = new SalesService(safeQuery);

// ----------------------------------------------------
// PARTNER PORTAL ENDPOINTS
// ----------------------------------------------------
portalRoutes.post('/partner/opportunities', tenantGuard, async (req: any, res) => {
  try {
    const { customerName, customerEmail, valueExt } = req.body;
    
    // 1. Enter the top of the funnel explicitly tagged as Partner Sourced
    const lead = await salesService.createLead(
      'PARTNER_PORTAL',
      customerName,
      customerEmail,
      valueExt,
      { tenantId: req.tenantId }
    );
    
    return res.status(201).json({ status: 'success', data: lead });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// EMPLOYEE PORTAL ENDPOINTS
// ----------------------------------------------------
portalRoutes.post('/employee/opportunities', tenantGuard, async (req: any, res) => {
  try {
    const { customerName, customerEmail, valueExt } = req.body;
    
    // Enter the top of the funnel explicitly tagged as Employee Internal
    const lead = await salesService.createLead(
      'EMPLOYEE_PORTAL',
      customerName,
      customerEmail,
      valueExt,
      { tenantId: req.tenantId }
    );
    
    return res.status(201).json({ status: 'success', data: lead });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// WORKFLOW TRANSITION ENDPOINT
// ----------------------------------------------------
portalRoutes.post('/workflow/approve', tenantGuard, async (req: any, res) => {
  try {
    const { leadId } = req.body;
    
    // Simulate Employee triggering the XState Machine approval
    await salesService.approveAndWinOpportunity({ 
      leadId, 
      tenantId: req.tenantId 
    });
    
    return res.status(200).json({ status: 'success', message: 'Workflow completed. Deal Won event fired.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
