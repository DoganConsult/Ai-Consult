import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const ERPNEXT_URL = Deno.env.get("ERPNEXT_URL");
const ERPNEXT_API_KEY = Deno.env.get("ERPNEXT_API_KEY");
const ERPNEXT_API_SECRET = Deno.env.get("ERPNEXT_API_SECRET");

const erpHeaders = {
  'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Helper: ERPNext API call
async function erpFetch(endpoint, options = {}) {
  const url = `${ERPNEXT_URL}/api/resource/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...erpHeaders, ...options.headers }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ERPNext API Error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

// Helper: ERPNext Method call
async function erpMethod(method, data = {}) {
  const url = `${ERPNEXT_URL}/api/method/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: erpHeaders,
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ERPNext Method Error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await req.json();

    switch (action) {
      // ============ CUSTOMER SYNC ============
      case 'sync_customer_to_erp': {
        // Create/Update customer in ERPNext
        const { customer } = data;
        const erpCustomer = {
          doctype: 'Customer',
          customer_name: customer.name,
          customer_type: customer.type || 'Company',
          customer_group: customer.group || 'Commercial',
          territory: customer.territory || 'Saudi Arabia',
          email_id: customer.email,
          mobile_no: customer.phone,
          tax_id: customer.tax_id,
          custom_sbg_id: customer.id // Link back to SBG
        };

        let result;
        if (customer.erp_customer_id) {
          // Update existing
          result = await erpFetch(`Customer/${customer.erp_customer_id}`, {
            method: 'PUT',
            body: JSON.stringify(erpCustomer)
          });
        } else {
          // Create new
          result = await erpFetch('Customer', {
            method: 'POST',
            body: JSON.stringify(erpCustomer)
          });
        }

        return Response.json({ 
          success: true, 
          erp_customer_id: result.data.name,
          message: 'Customer synced to ERPNext'
        });
      }

      case 'sync_customer_from_erp': {
        // Fetch customer from ERPNext and update SBG
        const { erp_customer_id } = data;
        const erpData = await erpFetch(`Customer/${erp_customer_id}`);
        
        return Response.json({
          success: true,
          customer: {
            name: erpData.data.customer_name,
            email: erpData.data.email_id,
            phone: erpData.data.mobile_no,
            tax_id: erpData.data.tax_id,
            territory: erpData.data.territory,
            type: erpData.data.customer_type
          }
        });
      }

      // ============ QUOTATION SYNC ============
      case 'sync_quotation_to_erp': {
        const { inquiry, items } = data;
        
        const erpQuotation = {
          doctype: 'Quotation',
          quotation_to: 'Customer',
          party_name: inquiry.erp_customer_id || inquiry.company,
          transaction_date: new Date().toISOString().split('T')[0],
          valid_till: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          currency: 'SAR',
          custom_sbg_inquiry_id: inquiry.id,
          items: items.map(item => ({
            item_code: item.erp_item_code || item.name,
            item_name: item.name,
            description: item.description,
            qty: item.quantity || 1,
            rate: item.price,
            uom: 'Nos'
          }))
        };

        const result = await erpFetch('Quotation', {
          method: 'POST',
          body: JSON.stringify(erpQuotation)
        });

        return Response.json({
          success: true,
          erp_quotation_id: result.data.name,
          message: 'Quotation created in ERPNext'
        });
      }

      // ============ CREATE INVOICE FROM QUOTATION ============
      case 'create_invoice_from_quotation': {
        const { erp_quotation_id } = data;
        
        // First, create Sales Order from Quotation
        const soResult = await erpMethod('erpnext.selling.doctype.quotation.quotation.make_sales_order', {
          source_name: erp_quotation_id
        });
        
        // Submit Sales Order
        await erpFetch(`Sales Order/${soResult.message.name}`, {
          method: 'PUT',
          body: JSON.stringify({ docstatus: 1 })
        });

        // Create Sales Invoice from Sales Order
        const siResult = await erpMethod('erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice', {
          source_name: soResult.message.name
        });

        // Submit Sales Invoice
        await erpFetch(`Sales Invoice/${siResult.message.name}`, {
          method: 'PUT',
          body: JSON.stringify({ docstatus: 1 })
        });

        return Response.json({
          success: true,
          sales_order_id: soResult.message.name,
          invoice_id: siResult.message.name,
          message: 'Sales Invoice created and submitted'
        });
      }

      // ============ FETCH CUSTOMER RECORDS ============
      case 'get_customer_records': {
        const { erp_customer_id } = data;
        
        // Fetch all related documents in parallel
        const [quotations, salesOrders, invoices, payments] = await Promise.all([
          erpFetch(`Quotation?filters=[["party_name","=","${erp_customer_id}"]]&fields=["name","transaction_date","grand_total","status"]`),
          erpFetch(`Sales Order?filters=[["customer","=","${erp_customer_id}"]]&fields=["name","transaction_date","grand_total","status","delivery_status","billing_status"]`),
          erpFetch(`Sales Invoice?filters=[["customer","=","${erp_customer_id}"]]&fields=["name","posting_date","grand_total","status","outstanding_amount"]`),
          erpFetch(`Payment Entry?filters=[["party","=","${erp_customer_id}"]]&fields=["name","posting_date","paid_amount","payment_type","reference_no"]`)
        ]);

        return Response.json({
          success: true,
          records: {
            quotations: quotations.data || [],
            sales_orders: salesOrders.data || [],
            invoices: invoices.data || [],
            payments: payments.data || []
          }
        });
      }

      // ============ FETCH SINGLE INVOICE DETAILS ============
      case 'get_invoice_details': {
        const { invoice_id } = data;
        const invoice = await erpFetch(`Sales Invoice/${invoice_id}`);
        
        return Response.json({
          success: true,
          invoice: invoice.data
        });
      }

      // ============ SYNC PRODUCTS/ITEMS ============
      case 'sync_product_to_erp': {
        const { product } = data;
        
        const erpItem = {
          doctype: 'Item',
          item_code: product.sku || `SBG-${product.id}`,
          item_name: product.name,
          description: product.description,
          item_group: product.category || 'Products',
          stock_uom: 'Nos',
          is_sales_item: 1,
          standard_rate: product.price,
          custom_sbg_product_id: product.id
        };

        let result;
        if (product.erp_item_code) {
          result = await erpFetch(`Item/${product.erp_item_code}`, {
            method: 'PUT',
            body: JSON.stringify(erpItem)
          });
        } else {
          result = await erpFetch('Item', {
            method: 'POST',
            body: JSON.stringify(erpItem)
          });
        }

        return Response.json({
          success: true,
          erp_item_code: result.data.name,
          message: 'Product synced to ERPNext'
        });
      }

      // ============ BIDIRECTIONAL FULL SYNC ============
      case 'full_sync': {
        const { entity_type, entity_id, direction } = data;
        
        if (direction === 'to_erp') {
          // Push to ERPNext
          if (entity_type === 'customer') {
            const customers = await base44.entities.Inquiry.filter({ id: entity_id });
            if (customers.length > 0) {
              // Trigger customer sync
              return Response.json({ 
                success: true, 
                action: 'sync_customer_to_erp',
                message: 'Ready to sync customer to ERPNext'
              });
            }
          }
        } else if (direction === 'from_erp') {
          // Pull from ERPNext
          if (entity_type === 'customer') {
            const erpData = await erpFetch(`Customer/${entity_id}`);
            return Response.json({
              success: true,
              data: erpData.data,
              message: 'Data fetched from ERPNext'
            });
          }
        }
        
        return Response.json({ success: false, error: 'Invalid sync parameters' });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

  } catch (error) {
    console.error('ERPNext Sync Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});