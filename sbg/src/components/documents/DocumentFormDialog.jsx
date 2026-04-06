import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentFormDialog({ open, onClose, document }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'policy',
    status: 'draft',
    department: '',
    version: '1.0',
    tags: []
  });
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (document) {
      setFormData(document);
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'policy',
        status: 'draft',
        department: '',
        version: '1.0',
        tags: []
      });
    }
  }, [document, open]);

  const mutation = useMutation({
    mutationFn: (data) => document
      ? base44.entities.Document.update(document.id, data)
      : base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(document ? 'تم تحديث المستند' : 'تم إنشاء المستند');
      onClose();
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, file_url });
      toast.success('تم رفع الملف بنجاح');
    } catch (error) {
      toast.error('فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? 'تعديل المستند' : 'مستند جديد'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">العنوان *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="عنوان المستند"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">الوصف</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف المستند"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">الفئة *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="policy">سياسة</option>
                <option value="procedure">إجراء</option>
                <option value="guideline">إرشاد</option>
                <option value="manual">دليل</option>
                <option value="report">تقرير</option>
                <option value="contract">عقد</option>
                <option value="form">نموذج</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="draft">مسودة</option>
                <option value="review">مراجعة</option>
                <option value="approved">معتمد</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">القسم</label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="القسم المسؤول"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الإصدار</label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">رفع الملف</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {uploading ? 'جاري الرفع...' : formData.file_url ? 'تم رفع الملف' : 'انقر لرفع ملف'}
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button
            onClick={() => mutation.mutate(formData)}
            disabled={!formData.title || mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {mutation.isPending ? 'جاري الحفظ...' : document ? 'تحديث' : 'إنشاء'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}