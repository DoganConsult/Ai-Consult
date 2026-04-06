import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, CheckCircle, XCircle, AlertTriangle, ArrowRight, 
  Package, Briefcase, BarChart3, Shield, Zap, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { createApprovalRequest } from './ApprovalService';

const operationTypes = {
  purchase_order: { label: 'أمر شراء', icon: Package, color: 'blue' },
  job_offer: { label: 'عرض عمل', icon: Briefcase, color: 'purple' },
  financial_close: { label: 'إقفال مالي', icon: BarChart3, color: 'amber' },
  compliance_report: { label: 'تقرير امتثال', icon: Shield, color: 'emerald' },
};

export default function ApprovalRulesDemo() {
  const [operationType, setOperationType] = useState('purchase_order');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleTestApproval = async () => {
    if (!title) return;
    
    setIsProcessing(true);
    setResult(null);

    try {
      const response = await createApprovalRequest({
        operationType,
        title,
        description: `طلب تجريبي - ${operationTypes[operationType].label}`,
        amount: amount ? parseFloat(amount) : null,
        requesterEmail: 'demo@example.com',
        requesterName: 'مستخدم تجريبي',
        referenceId: `DEMO-${Date.now()}`,
        metadata: { isDemo: true }
      });

      setResult(response);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const Icon = operationTypes[operationType]?.icon || Package;

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-amber-500" />
          اختبار قواعد الموافقة التلقائية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          جرب إنشاء طلب موافقة لمعرفة كيف يتم توجيهه تلقائياً بناءً على القواعد المحددة.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">نوع العملية</label>
            <Select value={operationType} onValueChange={setOperationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(operationTypes).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <val.icon className="w-4 h-4" />
                      {val.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">المبلغ (ر.س)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="اختياري"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">عنوان الطلب</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: طلب شراء أجهزة حاسوب"
          />
        </div>

        <Button 
          onClick={handleTestApproval} 
          disabled={isProcessing || !title}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />
              جاري المعالجة...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              اختبار قواعد الموافقة
            </span>
          )}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border ${
                result.error 
                  ? 'bg-red-50 border-red-200' 
                  : result.requiresApproval 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              {result.error ? (
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700">خطأ</p>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                </div>
              ) : result.requiresApproval ? (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700">يتطلب موافقة</p>
                    <div className="text-sm text-amber-600 mt-1 space-y-1">
                      <p>البوابة: <span className="font-medium">{result.gateName}</span></p>
                      <p>الموافقون: {result.approvers?.join(', ')}</p>
                      <p>تاريخ الاستحقاق: {new Date(result.dueDate).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <Badge className="mt-2 bg-amber-100 text-amber-700">
                      تم إنشاء طلب الموافقة #{result.requestId?.slice(-6)}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-700">موافقة تلقائية</p>
                    <p className="text-sm text-emerald-600">
                      {result.reason === 'auto_approved' 
                        ? `المبلغ أقل من حد الموافقة التلقائية (${result.autoApproveThreshold?.toLocaleString()} ر.س)`
                        : 'لا توجد بوابة موافقة مكونة لهذا النوع'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}