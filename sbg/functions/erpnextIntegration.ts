/**
 * ERPNext Integration Module
 * --------------------------
 * Comprehensive integration for ERPNext doctypes
 * Supports: Customer, Supplier, Item, Sales Invoice, Purchase Order, etc.
 * Auth: API Key + Secret
 * Compliance: Audit logging, error handling, retry logic
 * 
 * SBG Saudi Business Gate - Powered by Dogan Consult
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Environment Configuration
const ERPNEXT_URL = Deno.env.get("ERPNEXT_URL");
const ERPNEXT_API_KEY = Deno.env.get("ERPNEXT_API_KEY");
const ERPNEXT_API_SECRET = Deno.env.get("ERPNEXT_API_SECRET");

// Logging utility for compliance
const logger = {
  info: (action, data) => console.log(`[INFO] ${new Date().toISOString()} | ${action}`, JSON.stringify(data)),
  error: (action, error) => console.error(`[ERROR] ${new Date().toISOString()} | ${action}`, error.message),
  audit: (action, user, data) => console.log(`[AUDIT] ${new Date().toISOString()} | ${action} | User: ${user}`, JSON.stringify(data))
};

// Retry configuration
const RETRY_CONFIG = { maxRetries: 3, delayMs: 1000 };

// API Headers
const getHeaders = () => ({
  'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
});

// Retry wrapper with exponential backoff
async function withRetry(fn, context = 'operation') {
  let lastError;
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.error(`${context} attempt ${attempt}`, error);
      if (attempt < RETRY_CONFIG.maxRetries) {
        await new Promise(r => setTimeout(r, RETRY_CONFIG.delayMs * attempt));
      }
    }
  }
  throw lastError;
}

// Generic ERPNext Resource API
async function erpResource(doctype, method = 'GET', name = null, data = null, filters = null) {
  let url = `${ERPNEXT_URL}/api/resource/${doctype}`;
  
  if (name) url += `/${encodeURIComponent(name)}`;
  if (filters) url += `?filters=${encodeURIComponent(JSON.stringify(filters))}`;
  
  const options = {
    method,
    headers: getHeaders()
  };
  
  if (data && ['POST', 'PUT'].includes(method)) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ERPNext API Error [${response.status}]: ${errorText}`);
  }
  
  return response.json();
}

// ERPNext Method API (for custom methods)
async function erpMethod(method, data = {}) {
  const url = `${ERPNEXT_URL}/api/method/${method}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ERPNext Method Error [${response.status}]: ${errorText}`);
  }
  
  return response.json();
}

// ==================== DOCTYPE HANDLERS ====================

const doctypeHandlers = {
  // ---------- CUSTOMER ----------
  Customer: {
    async create(data, user) {
      logger.audit('Customer.create', user, data);
      return withRetry(async () => {
        const result = await erpResource('Customer', 'POST', null, {
          doctype: 'Customer',
          customer_name: data.name,
          customer_type: data.type || 'Company',
          customer_group: data.group || 'Commercial',
          territory: data.territory || 'Saudi Arabia',
          email_id: data.email,
          mobile_no: data.phone,
          tax_id: data.tax_id,
          custom_sbg_id: data.sbg_id
        });
        logger.info('Customer.created', { id: result.data.name });
        return result;
      }, 'Customer.create');
    },
    
    async update(name, data, user) {
      logger.audit('Customer.update', user, { name, ...data });
      return withRetry(() => erpResource('Customer', 'PUT', name, data), 'Customer.update');
    },
    
    async get(name) {
      return withRetry(() => erpResource('Customer', 'GET', name), 'Customer.get');
    },
    
    async list(filters = {}) {
      return withRetry(() => erpResource('Customer', 'GET', null, null, filters), 'Customer.list');
    },
    
    async delete(name, user) {
      logger.audit('Customer.delete', user, { name });
      return withRetry(() => erpResource('Customer', 'DELETE', name), 'Customer.delete');
    }
  },

  // ---------- SUPPLIER ----------
  Supplier: {
    async create(data, user) {
      logger.audit('Supplier.create', user, data);
      return withRetry(async () => {
        const result = await erpResource('Supplier', 'POST', null, {
          doctype: 'Supplier',
          supplier_name: data.name,
          supplier_type: data.type || 'Company',
          supplier_group: data.group || 'Services',
          country: data.country || 'Saudi Arabia',
          email_id: data.email,
          mobile_no: data.phone,
          tax_id: data.tax_id
        });
        return result;
      }, 'Supplier.create');
    },
    
    async update(name, data, user) {
      logger.audit('Supplier.update', user, { name, ...data });
      return withRetry(() => erpResource('Supplier', 'PUT', name, data), 'Supplier.update');
    },
    
    async get(name) {
      return withRetry(() => erpResource('Supplier', 'GET', name), 'Supplier.get');
    },
    
    async list(filters = {}) {
      return withRetry(() => erpResource('Supplier', 'GET', null, null, filters), 'Supplier.list');
    }
  },

  // ---------- ITEM ----------
  Item: {
    async create(data, user) {
      logger.audit('Item.create', user, data);
      return withRetry(async () => {
        const result = await erpResource('Item', 'POST', null, {
          doctype: 'Item',
          item_code: data.code || `SBG-${Date.now()}`,
          item_name: data.name,
          description: data.description,
          item_group: data.group || 'Products',
          stock_uom: data.uom || 'Nos',
          is_sales_item: data.is_sales_item ?? 1,
          is_purchase_item: data.is_purchase_item ?? 1,
          standard_rate: data.price,
          custom_sbg_product_id: data.sbg_id
        });
        return result;
      }, 'Item.create');
    },
    
    async update(itemCode, data, user) {
      logger.audit('Item.update', user, { itemCode, ...data });
      return withRetry(() => erpResource('Item', 'PUT', itemCode, data), 'Item.update');
    },
    
    async get(itemCode) {
      return withRetry(() => erpResource('Item', 'GET', itemCode), 'Item.get');
    },
    
    async list(filters = {}) {
      return withRetry(() => erpResource('Item', 'GET', null, null, filters), 'Item.list');
    }
  },

  // ---------- SALES INVOICE ----------
  SalesInvoice: {
    async create(data, user) {
      logger.audit('SalesInvoice.create', user, data);
      return withRetry(async () => {
        const result = await erpResource('Sales Invoice', 'POST', null, {
          doctype: 'Sales Invoice',
          customer: data.customer,
          posting_date: data.date || new Date().toISOString().split('T')[0],
          due_date: data.due_date,
          currency: data.currency || 'SAR',
          items: data.items.map(item => ({
            item_code: item.code,
            item_name: item.name,
            qty: item.qty || 1,
            rate: item.rate,
            description: item.description
          })),
          taxes: data.taxes || [],
          custom_sbg_reference: data.sbg_reference
        });
        return result;
      }, 'SalesInvoice.create');
    },
    
    async submit(name, user) {
      logger.audit('SalesInvoice.submit', user, { name });
      return withRetry(() => erpResource('Sales Invoice', 'PUT', name, { docstatus: 1 }), 'SalesInvoice.submit');
    },
    
    async get(name) {
      return withRetry(() => erpResource('Sales Invoice', 'GET', name), 'SalesInvoice.get');
    },
    
    async listByCustomer(customer) {
      return withRetry(() => erpResource('Sales Invoice', 'GET', null, null, [['customer', '=', customer]]), 'SalesInvoice.listByCustomer');
    },
    
    async createFromQuotation(quotationName, user) {
      logger.audit('SalesInvoice.createFromQuotation', user, { quotationName });
      
      // First create Sales Order
      const soResult = await erpMethod('erpnext.selling.doctype.quotation.quotation.make_sales_order', {
        source_name: quotationName
      });
      
      // Submit Sales Order
      await erpResource('Sales Order', 'PUT', soResult.message.name, { docstatus: 1 });
      
      // Create Sales Invoice from Sales Order
      const siResult = await erpMethod('erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice', {
        source_name: soResult.message.name
      });
      
      // Submit Sales Invoice
      await erpResource('Sales Invoice', 'PUT', siResult.message.name, { docstatus: 1 });
      
      return {
        sales_order: soResult.message.name,
        sales_invoice: siResult.message.name
      };
    }
  },

  // ---------- PURCHASE ORDER ----------
  PurchaseOrder: {
    async create(data, user) {
      logger.audit('PurchaseOrder.create', user, data);
      return withRetry(async () => {
        const result = await erpResource('Purchase Order', 'POST', null, {
          doctype: 'Purchase Order',
          supplier: data.supplier,
          transaction_date: data.date || new Date().toISOString().split('T')[0],
          schedule_date: data.schedule_date,
          currency: data.currency || 'SAR',
          items: data.items.map(item => ({
            item_code: item.code,
            item_name: item.name,
            qty: item.qty || 1,
            rate: item.rate,
            schedule_date: item.schedule_date || data.schedule_date
          })),
          custom_sbg_reference: data.sbg_reference
        });
        return result;
      }, 'PurchaseOrder.create');
    },
    
    async submit(name, user) {
      logger.audit('PurchaseOrder.submit', user, { name });
      return withRetry(() => erpResource('Purchase Order', 'PUT', name, { docstatus: 1 }), 'PurchaseOrder.submit');
    },
    
    async get(name) {
      return withRetry(() => erpResource('Purchase Order', 'GET', name), 'PurchaseOrder.get');
    },
    
    async listBySupplier(supplier) {
      return withRetry(() => erpResource('Purchase Order', 'GET', null, null, [['supplier', '=', supplier]]), 'PurchaseOrder.listBySupplier');
    }
  },

  // ---------- QUOTATION ----------
  Quotation: {
    async create(data, user) {
      logger.audit('Quotation.create', user, data);
      return withRetry(async () => {
        const result = await erpResource('Quotation', 'POST', null, {
          doctype: 'Quotation',
          quotation_to: 'Customer',
          party_name: data.customer,
          transaction_date: data.date || new Date().toISOString().split('T')[0],
          valid_till: data.valid_till,
          currency: data.currency || 'SAR',
          items: data.items.map(item => ({
            item_code: item.code,
            item_name: item.name,
            qty: item.qty || 1,
            rate: item.rate,
            description: item.description
          })),
          custom_sbg_inquiry_id: data.sbg_inquiry_id
        });
        return result;
      }, 'Quotation.create');
    },
    
    async submit(name, user) {
      logger.audit('Quotation.submit', user, { name });
      return withRetry(() => erpResource('Quotation', 'PUT', name, { docstatus: 1 }), 'Quotation.submit');
    },
    
    async get(name) {
      return withRetry(() => erpResource('Quotation', 'GET', name), 'Quotation.get');
    }
  },

  // ---------- JOURNAL ENTRY ----------
  JournalEntry: {
    async create(data, user) {
      logger.audit('JournalEntry.create', user, data);
      return withRetry(async () => {
        const result = await erpResource('Journal Entry', 'POST', null, {
          doctype: 'Journal Entry',
          voucher_type: data.voucher_type || 'Journal Entry',
          posting_date: data.date || new Date().toISOString().split('T')[0],
          accounts: data.accounts.map(acc => ({
            account: acc.account,
            debit_in_account_currency: acc.debit || 0,
            credit_in_account_currency: acc.credit || 0,
            party_type: acc.party_type,
            party: acc.party
          })),
          user_remark: data.remark
        });
        return result;
      }, 'JournalEntry.create');
    },
    
    async submit(name, user) {
      logger.audit('JournalEntry.submit', user, { name });
      return withRetry(() => erpResource('Journal Entry', 'PUT', name, { docstatus: 1 }), 'JournalEntry.submit');
    }
  }
};

// ==================== BIDIRECTIONAL SYNC ====================

const syncHandlers = {
  // SBG -> ERPNext
  async pushToERP(doctype, data, user) {
    const handler = doctypeHandlers[doctype];
    if (!handler) throw new Error(`Unsupported doctype: ${doctype}`);
    
    if (data.erp_id) {
      return handler.update(data.erp_id, data, user);
    } else {
      return handler.create(data, user);
    }
  },
  
  // ERPNext -> SBG
  async pullFromERP(doctype, erpId) {
    const handler = doctypeHandlers[doctype];
    if (!handler) throw new Error(`Unsupported doctype: ${doctype}`);
    
    return handler.get(erpId);
  },
  
  // Full bidirectional sync
  async bidirectionalSync(doctype, sbgData, erpId, user) {
    logger.audit('bidirectionalSync', user, { doctype, erpId });
    
    // Get current ERPNext data
    const erpData = erpId ? await this.pullFromERP(doctype, erpId) : null;
    
    // Compare timestamps if both exist
    if (erpData && sbgData.updated_date) {
      const erpModified = new Date(erpData.data.modified);
      const sbgModified = new Date(sbgData.updated_date);
      
      if (erpModified > sbgModified) {
        // ERPNext is newer - pull
        return { direction: 'from_erp', data: erpData.data };
      }
    }
    
    // SBG is newer or no ERP data - push
    const result = await this.pushToERP(doctype, sbgData, user);
    return { direction: 'to_erp', data: result.data };
  }
};

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, doctype, data, erpId, filters } = await req.json();
    
    logger.info('Request', { action, doctype, user: user.email });

    let result;

    switch (action) {
      // CRUD Operations
      case 'create':
        result = await doctypeHandlers[doctype]?.create(data, user.email);
        break;
        
      case 'update':
        result = await doctypeHandlers[doctype]?.update(erpId, data, user.email);
        break;
        
      case 'get':
        result = await doctypeHandlers[doctype]?.get(erpId);
        break;
        
      case 'list':
        result = await doctypeHandlers[doctype]?.list(filters);
        break;
        
      case 'delete':
        result = await doctypeHandlers[doctype]?.delete(erpId, user.email);
        break;
        
      case 'submit':
        result = await doctypeHandlers[doctype]?.submit(erpId, user.email);
        break;

      // Sync Operations
      case 'push_to_erp':
        result = await syncHandlers.pushToERP(doctype, data, user.email);
        break;
        
      case 'pull_from_erp':
        result = await syncHandlers.pullFromERP(doctype, erpId);
        break;
        
      case 'bidirectional_sync':
        result = await syncHandlers.bidirectionalSync(doctype, data, erpId, user.email);
        break;

      // Special Operations
      case 'create_invoice_from_quotation':
        result = await doctypeHandlers.SalesInvoice.createFromQuotation(erpId, user.email);
        break;
        
      case 'get_customer_documents':
        const [quotations, orders, invoices] = await Promise.all([
          erpResource('Quotation', 'GET', null, null, [['party_name', '=', erpId]]),
          erpResource('Sales Order', 'GET', null, null, [['customer', '=', erpId]]),
          erpResource('Sales Invoice', 'GET', null, null, [['customer', '=', erpId]])
        ]);
        result = { quotations: quotations.data, orders: orders.data, invoices: invoices.data };
        break;

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const duration = Date.now() - startTime;
    logger.info('Response', { action, doctype, duration_ms: duration });

    return Response.json({
      success: true,
      data: result?.data || result,
      meta: {
        action,
        doctype,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Handler', error);
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});