import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Receipt, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CreateInvoiceButton({ 
  erpQuotationId, 
  quotationTitle,
  onInvoiceCreated,
  disabled = false 
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);

  const handleCreateInvoice = async () => {
    setCreating(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke('erpnextSync', {
        action: 'create_invoice_from_quotation',
        data: { erp_quotation_id: erpQuotationId }
      });
      
      if (response.data?.success) {
        setResult({
          success: true,
          sales_order_id: response.data.sales_order_id,
          invoice_id: response.data.invoice_id
        });
        
        toast.success('تم إنشاء الفاتورة بنجاح', {
          description: `رقم الفاتورة: ${response.data.invoice_id}`
        });
        
        onInvoiceCreated?.(response.data);
      } else {
        throw new Error(response.data?.error || 'فشل إنشاء الفاتورة');
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
      toast.error('خطأ في إنشاء الفاتورة', {
        description: error.message
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)} 
        disabled={disabled || !erpQuotationId}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        <Receipt className="w-4 h-4 ml-2" />
        إنشاء فاتورة
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة مبيعات</DialogTitle>
            <DialogDescription>
              سيتم إنشاء أمر بيع وفاتورة مبيعات من عرض السعر في ERPNext
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="py-6">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">عرض السعر:</span>
                  <span className="font-medium">{erpQuotationId}</span>
                </div>
                {quotationTitle && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">الوصف:</span>
                    <span className="font-medium">{quotationTitle}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 inline ml-1" />
                  سيتم إنشاء أمر بيع وفاتورة وإرسالها تلقائياً في ERPNext
                </p>
              </div>
            </div>
          ) : result.success ? (
            <div className="py-6 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">تم إنشاء الفاتورة بنجاح</h3>
              <div className="bg-emerald-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">أمر البيع:</span>
                  <span className="font-medium text-emerald-700">{result.sales_order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الفاتورة:</span>
                  <span className="font-medium text-emerald-700">{result.invoice_id}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">فشل إنشاء الفاتورة</h3>
              <p className="text-sm text-red-600">{result.error}</p>
            </div>
          )}

          <DialogFooter>
            {!result ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
                  إلغاء
                </Button>
                <Button onClick={handleCreateInvoice} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    'تأكيد الإنشاء'
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => { setOpen(false); setResult(null); }}>
                إغلاق
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}