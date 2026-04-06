import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Trash2, Zap, Clock, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TRIGGER_TYPES = {
  behavior: { label: 'سلوك المستخدم', icon: Target },
  time: { label: 'وقت محدد', icon: Clock },
  event: { label: 'حدث معين', icon: Zap }
};

const BEHAVIOR_CONDITIONS = [
  { value: 'page_visits', label: 'عدد الصفحات المزارة', threshold: true },
  { value: 'time_spent', label: 'الوقت المستغرق', threshold: true },
  { value: 'product_views', label: 'المنتجات المشاهدة', threshold: true },
  { value: 'cart_abandonment', label: 'ترك السلة', threshold: false },
  { value: 'idle_time', label: 'عدم النشاط', threshold: true }
];

export default function ProactiveTriggerConfig({ agentId, triggers = [], onUpdate }) {
  const [newTrigger, setNewTrigger] = useState({
    type: 'behavior',
    condition: 'page_visits',
    threshold: 3,
    action: 'send_message',
    message: '',
    delay: 0
  });

  const addTrigger = () => {
    if (!newTrigger.message) return;
    onUpdate([...triggers, { ...newTrigger, id: Date.now() }]);
    setNewTrigger({
      type: 'behavior',
      condition: 'page_visits',
      threshold: 3,
      action: 'send_message',
      message: '',
      delay: 0
    });
  };

  const removeTrigger = (id) => {
    onUpdate(triggers.filter(t => t.id !== id));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-bold text-slate-900">المحفزات الاستباقية</h3>
      </div>

      {/* Existing Triggers */}
      <div className="space-y-3 mb-6">
        {triggers.map((trigger) => {
          const TriggerIcon = TRIGGER_TYPES[trigger.type].icon;
          return (
            <div key={trigger.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TriggerIcon className="w-4 h-4 text-purple-600" />
                  <Badge className="bg-purple-100 text-purple-700">
                    {TRIGGER_TYPES[trigger.type].label}
                  </Badge>
                </div>
                <button
                  onClick={() => removeTrigger(trigger.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-700 mb-1">
                <span className="font-medium">الشرط:</span> {trigger.condition} {trigger.threshold && `>= ${trigger.threshold}`}
              </p>
              <p className="text-sm text-slate-600 italic">"{trigger.message}"</p>
              {trigger.delay > 0 && (
                <p className="text-xs text-slate-500 mt-1">تأخير: {trigger.delay} ثانية</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Trigger */}
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-semibold text-slate-900">إضافة محفز جديد</h4>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>نوع المحفز</Label>
            <Select value={newTrigger.type} onValueChange={(v) => setNewTrigger({...newTrigger, type: v})}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_TYPES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newTrigger.type === 'behavior' && (
            <>
              <div>
                <Label>الشرط</Label>
                <Select value={newTrigger.condition} onValueChange={(v) => setNewTrigger({...newTrigger, condition: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BEHAVIOR_CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>الحد الأدنى</Label>
                <Input
                  type="number"
                  value={newTrigger.threshold}
                  onChange={(e) => setNewTrigger({...newTrigger, threshold: parseInt(e.target.value)})}
                  className="mt-1"
                />
              </div>
            </>
          )}

          <div>
            <Label>التأخير (ثواني)</Label>
            <Input
              type="number"
              value={newTrigger.delay}
              onChange={(e) => setNewTrigger({...newTrigger, delay: parseInt(e.target.value)})}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>الرسالة</Label>
          <Input
            value={newTrigger.message}
            onChange={(e) => setNewTrigger({...newTrigger, message: e.target.value})}
            placeholder="مثال: هل تحتاج مساعدة في اختيار المنتج المناسب؟"
            className="mt-1"
          />
        </div>

        <Button onClick={addTrigger} disabled={!newTrigger.message} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          إضافة المحفز
        </Button>
      </div>
    </Card>
  );
}