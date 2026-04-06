import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  FileText, Download, Search, Filter, Calendar, DollarSign,
  CheckCircle, XCircle, Clock, AlertTriangle, BarChart3, 
  FileSpreadsheet, Building2, ChevronDown, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import PublicHeader from '@/components/shared/PublicHeader';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'معلق', icon: Clock, color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { label: 'موافق عليه', icon: CheckCircle, color: 'green', bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { label: 'مرفوض', icon: XCircle, color: 'red', bg: 'bg-red-100', text: 'text-red-700' },
  escalated: { label: 'مُصعّد', icon: AlertTriangle, color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700' },
};

const operationLabels = {
  purchase_order: 'أوامر الشراء',
  job_offer: 'عروض العمل',
  financial_close: 'الإقفال المالي',
  compliance_report: 'تقارير الامتثال',
  vendor_approval: 'اعتماد الموردين',
  budget_request: 'طلبات الميزانية',
  contract_signing: 'توقيع العقود',
};

function DateRangePicker({ from, to, onFromChange, onToChange }) {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-32 justify-start text-right">
            <Calendar className="w-4 h-4 ml-2" />
            {from ? format(from, 'dd/MM/yyyy') : 'من'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarComponent mode="single" selected={from} onSelect={onFromChange} />
        </PopoverContent>
      </Popover>
      <span className="text-slate-400">—</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-32 justify-start text-right">
            <Calendar className="w-4 h-4 ml-2" />
            {to ? format(to, 'dd/MM/yyyy') : 'إلى'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarComponent mode="single" selected={to} onSelect={onToChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function exportToCSV(data, filename) {
  const headers = ['الرقم', 'العنوان', 'النوع', 'المبلغ', 'الحالة', 'مقدم الطلب', 'تاريخ الإنشاء'];
  const rows = data.map(r => [
    r.id,
    r.title,
    operationLabels[r.operation_type] || r.operation_type,
    r.amount || '-',
    statusConfig[r.status]?.label || r.status,
    r.requester_name || r.requester_email,
    format(new Date(r.created_date), 'yyyy-MM-dd HH:mm')
  ]);

  const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

function exportToPDF(data, stats, filters) {
  const printWindow = window.open('', '_blank');
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير طلبات الموافقة</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; direction: rtl; }
        .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #0f172a; margin: 0; }
        .header p { color: #64748b; margin: 5px 0 0; }
        .stats { display: flex; gap: 20px; margin-bottom: 30px; }
        .stat-card { flex: 1; background: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #0f172a; }
        .stat-label { font-size: 12px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
        th { background: #f1f5f9; font-weight: 600; }
        .status-pending { color: #d97706; }
        .status-approved { color: #16a34a; }
        .status-rejected { color: #dc2626; }
        .status-escalated { color: #9333ea; }
        .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>تقرير طلبات الموافقة</h1>
        <p>SBG Saudi Business Gate - تاريخ التقرير: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      </div>
      
      <div class="stats">
        <div class="stat-card"><div class="stat-value">${stats.total}</div><div class="stat-label">إجمالي الطلبات</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#16a34a">${stats.approved}</div><div class="stat-label">موافق عليها</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#d97706">${stats.pending}</div><div class="stat-label">معلقة</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#dc2626">${stats.rejected}</div><div class="stat-label">مرفوضة</div></div>
      </div>

      <table>
        <thead>
          <tr><th>#</th><th>العنوان</th><th>النوع</th><th>المبلغ</th><th>الحالة</th><th>مقدم الطلب</th><th>التاريخ</th></tr>
        </thead>
        <tbody>
          ${data.map((r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r.title}</td>
              <td>${operationLabels[r.operation_type] || r.operation_type}</td>
              <td>${r.amount ? r.amount.toLocaleString() + ' ر.س' : '-'}</td>
              <td class="status-${r.status}">${statusConfig[r.status]?.label || r.status}</td>
              <td>${r.requester_name || r.requester_email}</td>
              <td>${format(new Date(r.created_date), 'dd/MM/yyyy')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>SBG Saudi Business Gate - www.saudibusinessgate.com</p>
        <p>Powered by Dogan Consult - www.doganconsult.com</p>
      </div>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

export default function ApprovalReports() {
  const [filters, setFilters] = useState({
    status: 'all',
    operationType: 'all',
    fromDate: null,
    toDate: null,
    minAmount: '',
    maxAmount: '',
    search: '',
    department: 'all'
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['approval-requests-all'],
    queryFn: () => base44.entities.ApprovalRequest.list('-created_date', 500)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Get unique departments from users
  const departments = [...new Set(users.filter(u => u.department).map(u => u.department))];

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (filters.status !== 'all' && r.status !== filters.status) return false;
    if (filters.operationType !== 'all' && r.operation_type !== filters.operationType) return false;
    if (filters.fromDate && new Date(r.created_date) < filters.fromDate) return false;
    if (filters.toDate && new Date(r.created_date) > filters.toDate) return false;
    if (filters.minAmount && (r.amount || 0) < parseFloat(filters.minAmount)) return false;
    if (filters.maxAmount && (r.amount || 0) > parseFloat(filters.maxAmount)) return false;
    if (filters.search && !r.title.includes(filters.search) && !r.requester_email?.includes(filters.search)) return false;
    if (filters.department !== 'all') {
      const user = users.find(u => u.email === r.requester_email);
      if (!user || user.department !== filters.department) return false;
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: filteredRequests.length,
    pending: filteredRequests.filter(r => r.status === 'pending').length,
    approved: filteredRequests.filter(r => r.status === 'approved').length,
    rejected: filteredRequests.filter(r => r.status === 'rejected').length,
    escalated: filteredRequests.filter(r => r.status === 'escalated').length,
    totalAmount: filteredRequests.reduce((sum, r) => sum + (r.amount || 0), 0),
  };

  const clearFilters = () => {
    setFilters({
      status: 'all', operationType: 'all', fromDate: null, toDate: null,
      minAmount: '', maxAmount: '', search: '', department: 'all'
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.operationType !== 'all' || 
    filters.fromDate || filters.toDate || filters.minAmount || filters.maxAmount || 
    filters.search || filters.department !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      <PublicHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-600" />
              تقارير طلبات الموافقة
            </h1>
            <p className="text-slate-600 mt-1">تحليل وتصدير البيانات</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCSV(filteredRequests, 'approval-requests')}>
              <FileSpreadsheet className="w-4 h-4 ml-2" />
              تصدير CSV
            </Button>
            <Button onClick={() => exportToPDF(filteredRequests, stats, filters)} className="bg-emerald-600 hover:bg-emerald-700">
              <FileText className="w-4 h-4 ml-2" />
              تصدير PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-sm text-slate-500">إجمالي الطلبات</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-slate-500">موافق عليها</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-sm text-slate-500">معلقة</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-slate-500">مرفوضة</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-emerald-600">{stats.totalAmount.toLocaleString()}</div>
              <div className="text-sm text-slate-500">إجمالي المبالغ (ر.س)</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" /> الفلاتر
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-600">
                  <X className="w-4 h-4 ml-1" /> مسح الفلاتر
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="بحث..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pr-10"
                />
              </div>

              {/* Status */}
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operation Type */}
              <Select value={filters.operationType} onValueChange={(v) => setFilters({ ...filters, operationType: v })}>
                <SelectTrigger><SelectValue placeholder="نوع العملية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {Object.entries(operationLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department */}
              <Select value={filters.department} onValueChange={(v) => setFilters({ ...filters, department: v })}>
                <SelectTrigger><SelectValue placeholder="القسم" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mt-4">
              {/* Date Range */}
              <div className="md:col-span-2">
                <DateRangePicker
                  from={filters.fromDate}
                  to={filters.toDate}
                  onFromChange={(d) => setFilters({ ...filters, fromDate: d })}
                  onToChange={(d) => setFilters({ ...filters, toDate: d })}
                />
              </div>

              {/* Amount Range */}
              <Input
                type="number"
                placeholder="الحد الأدنى للمبلغ"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
              />
              <Input
                type="number"
                placeholder="الحد الأقصى للمبلغ"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">مقدم الطلب</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      لا توجد نتائج مطابقة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map(r => {
                    const status = statusConfig[r.status] || {};
                    const StatusIcon = status.icon || Clock;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell>{operationLabels[r.operation_type] || r.operation_type}</TableCell>
                        <TableCell>{r.amount ? `${r.amount.toLocaleString()} ر.س` : '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${status.bg} ${status.text}`}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.requester_name || r.requester_email}</TableCell>
                        <TableCell>{format(new Date(r.created_date), 'dd/MM/yyyy', { locale: ar })}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>SBG Saudi Business Gate - www.saudibusinessgate.com</p>
          <p>Powered by Dogan Consult - www.doganconsult.com</p>
        </div>
      </div>
    </div>
  );
}