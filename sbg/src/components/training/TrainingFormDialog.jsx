import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function TrainingFormDialog({ open, onClose, training }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'online',
    category: 'technical',
    duration_hours: 0,
    instructor: '',
    max_participants: 0,
    status: 'planned',
    certificate_issued: false,
    cost: 0
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (training) {
      setFormData(training);
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'online',
        category: 'technical',
        duration_hours: 0,
        instructor: '',
        max_participants: 0,
        status: 'planned',
        certificate_issued: false,
        cost: 0
      });
    }
  }, [training, open]);

  const mutation = useMutation({
    mutationFn: (data) => training
      ? base44.entities.Training.update(training.id, data)
      : base44.entities.Training.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success(training ? 'تم تحديث التدريب' : 'تم إنشاء التدريب');
      onClose();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{training ? 'تعديل التدريب' : 'تدريب جديد'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">العنوان *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="عنوان البرنامج التدريبي"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">الوصف</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف البرنامج"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">النوع *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="online">عبر الإنترنت</option>
                <option value="in-person">حضوري</option>
                <option value="hybrid">مختلط</option>
                <option value="self-paced">ذاتي السرعة</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الفئة *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="technical">تقني</option>
                <option value="soft_skills">مهارات ناعمة</option>
                <option value="compliance">امتثال</option>
                <option value="leadership">قيادة</option>
                <option value="sales">مبيعات</option>
                <option value="operations">عمليات</option>
                <option value="safety">سلامة</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">المدة (ساعات)</label>
              <Input
                type="number"
                value={formData.duration_hours}
                onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الحد الأقصى</label>
              <Input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">التكلفة (ريال)</label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">المدرب</label>
              <Input
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                placeholder="اسم المدرب"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="planned">مخطط</option>
                <option value="open">مفتوح</option>
                <option value="in_progress">جاري</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.certificate_issued}
              onChange={(e) => setFormData({ ...formData, certificate_issued: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm">يصدر شهادة</label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button
            onClick={() => mutation.mutate(formData)}
            disabled={!formData.title || mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {mutation.isPending ? 'جاري الحفظ...' : training ? 'تحديث' : 'إنشاء'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}