import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Receipt, CreditCard, ShoppingCart, ChevronDown, ChevronUp,
  ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  'Draft': { icon: Clock, color: 'bg-slate-100 text-slate-700' },
  'Open': { icon: Clock, color: 'bg-blue-100 text-blue-700' },
  'Submitted': { icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  'Paid': { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
  'Unpaid': { icon: AlertCircle, color: 'bg-amber-100 text-amber-700' },
  'Overdue': { icon: XCircle, color: 'bg-red-100 text-red-700' },
  'Cancelled': { icon: XCircle, color: 'bg-red-100 text-red-700' },
  'Completed': { icon: CheckCircle, color: 'bg-green-100 text-green-700' },
};

function RecordCard({ record, type, onViewDetails }) {
  const status = statusConfig[record.status] || statusConfig['Draft'];
  const StatusIcon = status.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            {type === 'quotation' && <FileText className="w-5 h-5 text-slate-600" />}
            {type === 'order' && <ShoppingCart className="w-5 h-5 text-blue-600" />}
            {type === 'invoice' && <Receipt className="w-5 h-5 text-emerald-600" />}
            {type === 'payment' && <CreditCard className="w-5 h-5 text-purple-600" />}
          </div>
          <div>
            <div className="font-medium text-slate-900">{record.name}</div>
            <div className="text-sm text-slate-500">
              {record.transaction_date || record.posting_date}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={status.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {record.status}
          </Badge>
          <span className="font-semibold text-slate-900">
            {(record.grand_total || record.paid_amount || 0).toLocaleString()} ر.س
          </span>
        </div>
      </div>
      
      {record.outstanding_amount > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
          <span className="text-slate-500">المبلغ المتبقي: </span>
          <span className="font-medium text-amber-600">{record.outstanding_amount.toLocaleString()} ر.س</span>
        </div>
      )}
      
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onViewDetails(record, type)}>
          عرض التفاصيل
        </Button>
        <Button size="sm" variant="ghost" className="text-slate-500">
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function ERPCustomerRecords({ erpCustomerId, onCreateInvoice }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['erp-customer-records', erpCustomerId],
    queryFn: async () => {
      if (!erpCustomerId) return null;
      const response = await base44.functions.invoke('erpnextSync', {
        action: 'get_customer_records',
        data: { erp_customer_id: erpCustomerId }
      });
      return response.data;
    },
    enabled: !!erpCustomerId
  });

  if (!erpCustomerId) {
    return (
      <Card className="border-dashed border-slate-300">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">لم يتم ربط هذا العميل بـ ERPNext بعد</p>
          <p className="text-sm text-slate-400 mt-1">قم بمزامنة العميل أولاً لعرض السجلات</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-8 text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-600">خطأ في جلب البيانات من ERPNext</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" /> إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  const records = data?.records || {};
  const totalInvoiced = records.invoices?.reduce((sum, inv) => sum + (inv.grand_total || 0), 0) || 0;
  const totalOutstanding = records.invoices?.reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0) || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-600" />
          سجلات ERPNext
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{records.quotations?.length || 0}</div>
            <div className="text-xs text-blue-600">عروض أسعار</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-700">{records.invoices?.length || 0}</div>
            <div className="text-xs text-emerald-600">فواتير</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-700">{totalOutstanding.toLocaleString()}</div>
            <div className="text-xs text-amber-600">مستحق (ر.س)</div>
          </div>
        </div>

        <Tabs defaultValue="invoices" dir="rtl">
          <TabsList className="w-full">
            <TabsTrigger value="quotations" className="flex-1">
              عروض الأسعار ({records.quotations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">
              الطلبات ({records.sales_orders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1">
              الفواتير ({records.invoices?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">
              المدفوعات ({records.payments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotations" className="mt-4 space-y-3">
            {records.quotations?.length === 0 ? (
              <p className="text-center text-slate-500 py-4">لا توجد عروض أسعار</p>
            ) : (
              records.quotations?.map((q) => (
                <RecordCard 
                  key={q.name} 
                  record={q} 
                  type="quotation"
                  onViewDetails={setSelectedRecord}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-4 space-y-3">
            {records.sales_orders?.length === 0 ? (
              <p className="text-center text-slate-500 py-4">لا توجد طلبات بيع</p>
            ) : (
              records.sales_orders?.map((o) => (
                <RecordCard 
                  key={o.name} 
                  record={o} 
                  type="order"
                  onViewDetails={setSelectedRecord}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-4 space-y-3">
            {records.invoices?.length === 0 ? (
              <p className="text-center text-slate-500 py-4">لا توجد فواتير</p>
            ) : (
              records.invoices?.map((inv) => (
                <RecordCard 
                  key={inv.name} 
                  record={inv} 
                  type="invoice"
                  onViewDetails={setSelectedRecord}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4 space-y-3">
            {records.payments?.length === 0 ? (
              <p className="text-center text-slate-500 py-4">لا توجد مدفوعات</p>
            ) : (
              records.payments?.map((p) => (
                <RecordCard 
                  key={p.name} 
                  record={p} 
                  type="payment"
                  onViewDetails={setSelectedRecord}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}