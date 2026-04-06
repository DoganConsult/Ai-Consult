import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Search, Filter, Users, Clock, CheckCircle, Phone, MessageSquare, 
  FileText, Calendar, Plus, Save, X, ChevronDown, ChevronUp, Mail, Building,
  DollarSign, AlertCircle, TrendingUp, Package, RefreshCw, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import ERPSyncButton from '@/components/erp/ERPSyncButton';
import ERPCustomerRecords from '@/components/erp/ERPCustomerRecords';
import CreateInvoiceButton from '@/components/erp/CreateInvoiceButton';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Phone },
  in_progress: { label: 'In Progress', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: MessageSquare },
  quoted: { label: 'Quote Sent', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: FileText },
  closed_won: { label: 'Won', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
  closed_lost: { label: 'Lost', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: X }
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', color: 'bg-rose-100 text-rose-700' }
};

export default function SalesCRM() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [editingNote, setEditingNote] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['crm-inquiries'],
    queryFn: () => base44.entities.Inquiry.list('-created_date')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inquiry.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['crm-inquiries'])
  });

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = !searchQuery || 
      inq.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || inq.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === 'pending').length,
    inProgress: inquiries.filter(i => ['contacted', 'in_progress', 'quoted'].includes(i.status)).length,
    won: inquiries.filter(i => i.status === 'closed_won').length,
    totalValue: inquiries.reduce((sum, i) => sum + (i.total_value || 0), 0)
  };

  const handleStatusChange = (inquiry, newStatus) => {
    updateMutation.mutate({ id: inquiry.id, data: { status: newStatus } });
  };

  const handlePriorityChange = (inquiry, newPriority) => {
    updateMutation.mutate({ id: inquiry.id, data: { priority: newPriority } });
  };

  const handleAddNote = (inquiry) => {
    if (!editingNote.trim()) return;
    const newNote = {
      text: editingNote,
      author: user?.email || 'Unknown',
      date: new Date().toISOString()
    };
    const notes = [...(inquiry.notes || []), newNote];
    updateMutation.mutate({ id: inquiry.id, data: { notes } });
    setEditingNote('');
  };

  const handleFollowUpChange = (inquiry, date) => {
    updateMutation.mutate({ id: inquiry.id, data: { next_follow_up: date } });
  };

  const handleCustomerNoteChange = (inquiry, note) => {
    updateMutation.mutate({ id: inquiry.id, data: { customer_notes: note } });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sales CRM Access</h2>
            <p className="text-slate-500 mb-6">Please sign in to access the CRM</p>
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-emerald-600 hover:bg-emerald-700">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2 text-slate-600 hover:text-emerald-600">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Sales CRM</h1>
                <p className="text-xs text-slate-500">Manage inquiries & leads</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">{user?.email}</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-xs text-slate-500">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.won}</p>
                  <p className="text-xs text-slate-500">Won</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{(stats.totalValue / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-slate-500">Pipeline (SAR)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, company, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {Object.entries(priorityConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-slate-500 mt-3">Showing {filteredInquiries.length} of {inquiries.length} inquiries</p>
        </div>

        {/* Inquiries List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredInquiries.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No inquiries found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInquiries.map((inquiry) => {
              const status = statusConfig[inquiry.status] || statusConfig.pending;
              const priority = priorityConfig[inquiry.priority] || priorityConfig.medium;
              const isExpanded = expandedId === inquiry.id;

              return (
                <Card key={inquiry.id} className="bg-white border-slate-200">
                  <CardContent className="p-0">
                    {/* Header Row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : inquiry.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-emerald-700 font-bold text-sm">
                            {inquiry.contact_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{inquiry.contact_name}</p>
                          <p className="text-sm text-slate-500 truncate">{inquiry.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={priority.color}>{priority.label}</Badge>
                        <Badge className={`${status.color} border`}>{status.label}</Badge>
                        <span className="font-bold text-emerald-600 hidden sm:block">
                          {(inquiry.total_value || 0).toLocaleString()} SAR
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
                            {/* Contact Info */}
                            <div className="grid sm:grid-cols-3 gap-4">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <a href={`mailto:${inquiry.contact_email}`} className="text-emerald-600 hover:underline">{inquiry.contact_email}</a>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span>{inquiry.phone || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span>{new Date(inquiry.created_date).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Products */}
                            <div>
                              <Label className="text-xs text-slate-500">Products ({inquiry.product_names?.length || 0})</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {(inquiry.product_names || []).map((name, i) => (
                                  <Badge key={i} variant="outline">{name}</Badge>
                                ))}
                              </div>
                            </div>

                            {/* Message */}
                            {inquiry.message && (
                              <div>
                                <Label className="text-xs text-slate-500">Customer Message</Label>
                                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 mt-1">{inquiry.message}</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="grid sm:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs text-slate-500">Status</Label>
                                <Select value={inquiry.status} onValueChange={(v) => handleStatusChange(inquiry, v)}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(statusConfig).map(([key, val]) => (
                                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-slate-500">Priority</Label>
                                <Select value={inquiry.priority || 'medium'} onValueChange={(v) => handlePriorityChange(inquiry, v)}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(priorityConfig).map(([key, val]) => (
                                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-slate-500">Next Follow-up</Label>
                                <Input 
                                  type="date" 
                                  value={inquiry.next_follow_up || ''} 
                                  onChange={(e) => handleFollowUpChange(inquiry, e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                            </div>

                            {/* Customer Note */}
                            <div>
                              <Label className="text-xs text-slate-500">Note for Customer (visible to them)</Label>
                              <Textarea
                                value={inquiry.customer_notes || ''}
                                onChange={(e) => handleCustomerNoteChange(inquiry, e.target.value)}
                                placeholder="Add a note the customer can see..."
                                rows={2}
                                className="mt-1"
                              />
                            </div>

                            {/* Internal Notes */}
                            <div>
                              <Label className="text-xs text-slate-500">Internal Notes</Label>
                              <div className="space-y-2 mt-1">
                                {(inquiry.notes || []).map((note, i) => (
                                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-sm text-slate-700">{note.text}</p>
                                    <p className="text-xs text-slate-500 mt-1">{note.author} • {new Date(note.date).toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  value={editingNote}
                                  onChange={(e) => setEditingNote(e.target.value)}
                                  placeholder="Add internal note..."
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote(inquiry)}
                                />
                                <Button onClick={() => handleAddNote(inquiry)} size="sm">
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* ERPNext Integration Section */}
                            <div className="border-t border-slate-200 pt-4 mt-4">
                              <div className="flex items-center justify-between mb-4">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                  <Receipt className="w-4 h-4 text-emerald-600" />
                                  تكامل ERPNext
                                </Label>
                                <div className="flex gap-2">
                                  <ERPSyncButton 
                                    entityType="customer"
                                    entityData={{
                                      id: inquiry.id,
                                      name: inquiry.company,
                                      email: inquiry.contact_email,
                                      phone: inquiry.phone,
                                      erp_customer_id: inquiry.erp_customer_id
                                    }}
                                    onSyncComplete={(data) => {
                                      if (data.erp_customer_id) {
                                        updateMutation.mutate({ 
                                          id: inquiry.id, 
                                          data: { 
                                            erp_customer_id: data.erp_customer_id,
                                            erp_last_sync: new Date().toISOString()
                                          } 
                                        });
                                      }
                                    }}
                                  />
                                  {inquiry.erp_quotation_id && (
                                    <CreateInvoiceButton 
                                      erpQuotationId={inquiry.erp_quotation_id}
                                      quotationTitle={inquiry.product_names?.join(', ')}
                                      onInvoiceCreated={() => queryClient.invalidateQueries(['crm-inquiries'])}
                                    />
                                  )}
                                </div>
                              </div>

                              {/* ERP Status Badges */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {inquiry.erp_customer_id ? (
                                  <Badge className="bg-emerald-100 text-emerald-700">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    عميل ERPNext: {inquiry.erp_customer_id}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-500">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    غير مرتبط بـ ERPNext
                                  </Badge>
                                )}
                                {inquiry.erp_quotation_id && (
                                  <Badge className="bg-blue-100 text-blue-700">
                                    <FileText className="w-3 h-3 mr-1" />
                                    عرض سعر: {inquiry.erp_quotation_id}
                                  </Badge>
                                )}
                                {inquiry.erp_last_sync && (
                                  <Badge variant="outline" className="text-slate-500">
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    آخر مزامنة: {new Date(inquiry.erp_last_sync).toLocaleString('ar-SA')}
                                  </Badge>
                                )}
                              </div>

                              {/* ERPNext Records */}
                              {inquiry.erp_customer_id && (
                                <ERPCustomerRecords 
                                  erpCustomerId={inquiry.erp_customer_id}
                                  onCreateInvoice={() => {}}
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}