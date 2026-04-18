import { Router } from 'express';
// We mount native DAuth boundaries internally
import { SalesService } from '@dos/erp-sales';
import { FinanceService } from '@dos/erp-finance';
import { HrService } from '@dos/erp-hr';
import { MarketingService } from '@dos/erp-marketing';
import { ProcurementService } from '@dos/erp-procurement';

export const erpRoutes = Router();

// DB runner mock for IoC structure
const dbRunner = async (query: string, values: any[]) => { return { rows: [] }; };

const salesService = new SalesService(dbRunner);
const financeService = new FinanceService(dbRunner);
const hrService = new HrService(dbRunner);
const marketingService = new MarketingService(dbRunner);
const procurementService = new ProcurementService(dbRunner);

// Pre-auth assumed bound by server-routes.ts
const authenticate = (req: any, res: any, next: any) => next();
const tenantGuard = (req: any, res: any, next: any) => {
  req.tenancyBounds = {
    tenantId: req.header('x-tenant-id') || 'default-tenant',
    userId: req.user?.id || 'anonymous' // Auth
  };
  next();
};

erpRoutes.use(authenticate);
erpRoutes.use(tenantGuard);

// SALES CRM
erpRoutes.post('/sales/leads', async (req: any, res: any) => {
  try {
    const { source, customerName, customerEmail, value } = req.body;
    const result = await salesService.createLead(source, customerName, customerEmail, value, req.tenancyBounds);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

erpRoutes.get('/sales/leads', async (req: any, res: any) => {
  try {
    const result = await salesService.getLeads(req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

erpRoutes.patch('/sales/leads/:id', async (req: any, res: any) => {
  try {
    const result = await salesService.updateLeadStatus(req.params.id, req.body.status, req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FINANCE
erpRoutes.post('/finance/invoices', async (req: any, res: any) => {
  try {
    const { amount, currency, dueDate, leadId } = req.body;
    const result = await financeService.generateInvoice(amount, currency, dueDate, leadId, req.tenancyBounds);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

erpRoutes.get('/finance/invoices', async (req: any, res: any) => {
  try {
    const result = await financeService.getInvoices(req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

erpRoutes.patch('/finance/invoices/:id/pay', async (req: any, res: any) => {
  try {
    const result = await financeService.markPaid(req.params.id, req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// HR
erpRoutes.post('/hr/onboard', async (req: any, res: any) => {
  try {
    const result = await hrService.onboardEmployee(req.body.firstName, req.body.lastName, req.body.department, req.tenancyBounds);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// MARKETING
erpRoutes.post('/marketing/campaigns', async (req: any, res: any) => {
  try {
    const result = await marketingService.launchCampaign(req.body.name, req.body.budget, req.tenancyBounds);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PROCUREMENT
erpRoutes.post('/procurement/pos', async (req: any, res: any) => {
  try {
    const result = await procurementService.createPurchaseOrder(req.body.vendorId, req.body.totalCost, req.tenancyBounds);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
