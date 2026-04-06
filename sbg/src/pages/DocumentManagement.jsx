import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Plus, Edit, Trash2, Download, Eye, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PublicHeader from '@/components/shared/PublicHeader';
import DocumentFormDialog from '@/components/documents/DocumentFormDialog';
import { toast } from 'sonner';

export default function DocumentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('تم حذف المستند بنجاح');
    }
  });

  const viewMutation = useMutation({
    mutationFn: ({ id, views }) => base44.entities.Document.update(id, { views_count: views + 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] })
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    review: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-700'
  };

  const categoryIcons = {
    policy: '📋',
    procedure: '📝',
    guideline: '📖',
    manual: '📚',
    report: '📊',
    contract: '📜',
    form: '📄',
    other: '📁'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PublicHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">إدارة المستندات</h1>
            <p className="text-slate-600 mt-1">إدارة وتنظيم مستندات الشركة</p>
          </div>
          <Button onClick={() => { setEditingDocument(null); setDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            مستند جديد
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="بحث في المستندات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="all">جميع الفئات</option>
                <option value="policy">سياسات</option>
                <option value="procedure">إجراءات</option>
                <option value="guideline">إرشادات</option>
                <option value="manual">أدلة</option>
                <option value="report">تقارير</option>
                <option value="contract">عقود</option>
                <option value="form">نماذج</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="draft">مسودة</option>
                <option value="review">مراجعة</option>
                <option value="approved">معتمد</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">لا توجد مستندات</h3>
              <p className="text-slate-500 mb-4">ابدأ بإضافة مستند جديد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{categoryIcons[doc.category] || '📄'}</span>
                        <div>
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          <p className="text-sm text-slate-500 mt-1">الإصدار {doc.version}</p>
                        </div>
                      </div>
                      <Badge className={statusColors[doc.status]}>
                        {doc.status === 'draft' ? 'مسودة' :
                         doc.status === 'review' ? 'مراجعة' :
                         doc.status === 'approved' ? 'معتمد' : 'مؤرشف'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{doc.description}</p>
                    
                    {doc.department && (
                      <p className="text-xs text-slate-500 mb-2">القسم: {doc.department}</p>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-4">
                      <Eye className="w-3 h-3" />
                      {doc.views_count || 0} مشاهدة
                    </div>

                    <div className="flex gap-2">
                      {doc.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            viewMutation.mutate({ id: doc.id, views: doc.views_count || 0 });
                            window.open(doc.file_url, '_blank');
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          تحميل
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingDocument(doc); setDialogOpen(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {(user?.role === 'admin' || user?.email === doc.created_by) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا المستند؟')) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <DocumentFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingDocument(null); }}
        document={editingDocument}
      />
    </div>
  );
}