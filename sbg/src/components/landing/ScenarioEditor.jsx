import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Save, Package, Shield, BarChart3, Users, Cpu, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const iconOptions = [
  { value: 'Package', label: 'Package', Icon: Package },
  { value: 'Shield', label: 'Shield', Icon: Shield },
  { value: 'BarChart3', label: 'Chart', Icon: BarChart3 },
  { value: 'Users', label: 'Users', Icon: Users },
  { value: 'Cpu', label: 'CPU', Icon: Cpu },
  { value: 'Wrench', label: 'Wrench', Icon: Wrench },
];

const colorOptions = [
  { value: 'from-blue-500 to-cyan-500', label: 'Blue' },
  { value: 'from-emerald-500 to-teal-500', label: 'Green' },
  { value: 'from-purple-500 to-pink-500', label: 'Purple' },
  { value: 'from-amber-500 to-orange-500', label: 'Orange' },
  { value: 'from-rose-500 to-red-500', label: 'Red' },
  { value: 'from-indigo-500 to-blue-500', label: 'Indigo' },
];

export default function ScenarioEditor({ scenario, isNew, onSave, onClose }) {
  const [formData, setFormData] = useState(scenario || {
    id: `custom-${Date.now()}`,
    name: '',
    nameEn: '',
    domain: '',
    icon: 'Package',
    color: 'from-blue-500 to-cyan-500',
    oneLiner: '',
    promptExample: '',
    steps: [],
    isCustom: true
  });

  const [newStep, setNewStep] = useState({
    id: '',
    title: '',
    tool: '',
    requiresApproval: false
  });

  const handleAddStep = () => {
    if (!newStep.id || !newStep.title || !newStep.tool) return;
    
    setFormData({
      ...formData,
      steps: [...formData.steps, { ...newStep }]
    });
    
    setNewStep({ id: '', title: '', tool: '', requiresApproval: false });
  };

  const handleRemoveStep = (index) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.domain || formData.steps.length === 0) {
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-slate-900">
            {isNew ? 'إنشاء سيناريو جديد' : 'تعديل السيناريو'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الاسم بالعربية *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="وكيل المشتريات الذكي"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name in English *
              </label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Smart Procurement Agent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                المجال *
              </label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="المشتريات"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الأيقونة
              </label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.Icon className="w-4 h-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                اللون
              </label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded bg-gradient-to-r ${opt.value}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الوصف المختصر *
            </label>
            <Textarea
              value={formData.oneLiner}
              onChange={(e) => setFormData({ ...formData, oneLiner: e.target.value })}
              placeholder="من طلب العروض إلى أمر الشراء — تلقائياً وبحوكمة كاملة"
              rows={2}
              dir="rtl"
            />
          </div>

          {/* Example Prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              مثال على الأمر *
            </label>
            <Textarea
              value={formData.promptExample}
              onChange={(e) => setFormData({ ...formData, promptExample: e.target.value })}
              placeholder="أبغى أفضل مورد سعودي معتمد لـ 50 جهاز خادم Dell..."
              rows={3}
              dir="rtl"
            />
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-4">
              خطوات التنفيذ * ({formData.steps.length})
            </label>

            {/* Existing Steps */}
            <div className="space-y-2 mb-4">
              {formData.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Badge className="shrink-0">{step.id}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{step.title}</p>
                    <p className="text-xs text-slate-500">{step.tool}</p>
                  </div>
                  {step.requiresApproval && (
                    <Badge variant="outline" className="text-xs">موافقة</Badge>
                  )}
                  <button
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Step */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input
                  placeholder="معرّف الخطوة (p1, p2...)"
                  value={newStep.id}
                  onChange={(e) => setNewStep({ ...newStep, id: e.target.value })}
                />
                <Input
                  placeholder="أداة التنفيذ (tool name)"
                  value={newStep.tool}
                  onChange={(e) => setNewStep({ ...newStep, tool: e.target.value })}
                />
              </div>
              <Input
                placeholder="عنوان الخطوة"
                value={newStep.title}
                onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                className="mb-3"
                dir="rtl"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={newStep.requiresApproval}
                    onCheckedChange={(checked) => setNewStep({ ...newStep, requiresApproval: checked })}
                  />
                  <span className="text-sm text-slate-700">تتطلب موافقة</span>
                </label>
                <Button onClick={handleAddStep} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة خطوة
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-2" />
            حفظ السيناريو
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}