import React, { useState } from 'react';
import PublicHeader from '@/components/shared/PublicHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Network, Bell, Play } from 'lucide-react';
import WorkflowDesigner from '@/components/agents/WorkflowDesigner';
import ProactiveTriggerConfig from '@/components/agents/ProactiveTriggerConfig';
import MultiStepExecutor from '@/components/agents/MultiStepExecutor';
import { toast } from 'sonner';

export default function AgentWorkflows() {
  const [activeTab, setActiveTab] = useState('designer');
  const [workflow, setWorkflow] = useState({ nodes: [], connections: [] });
  const [triggers, setTriggers] = useState([]);

  const handleSaveWorkflow = (updatedWorkflow) => {
    setWorkflow(updatedWorkflow);
    toast.success('تم حفظ المسار بنجاح');
  };

  const handleUpdateTriggers = (updatedTriggers) => {
    setTriggers(updatedTriggers);
    toast.success('تم تحديث المحفزات');
  };

  const handleWorkflowComplete = (results) => {
    toast.success('اكتمل تنفيذ المسار بنجاح');
    console.log('Workflow results:', results);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PublicHeader showBackButton backLabel="العودة للرئيسية" />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Network className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            مسارات الوكيل الذكي
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            صمم وأتمت مسارات عمل متقدمة مع محفزات استباقية وإجراءات متعددة الخطوات
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 bg-white border border-slate-200 p-1">
            <TabsTrigger value="designer" className="gap-2">
              <Network className="w-4 h-4" />
              المصمم
            </TabsTrigger>
            <TabsTrigger value="triggers" className="gap-2">
              <Bell className="w-4 h-4" />
              المحفزات
            </TabsTrigger>
            <TabsTrigger value="executor" className="gap-2">
              <Play className="w-4 h-4" />
              التنفيذ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="designer">
            <WorkflowDesigner workflow={workflow} onSave={handleSaveWorkflow} />
          </TabsContent>

          <TabsContent value="triggers">
            <ProactiveTriggerConfig
              agentId="visitor_guide"
              triggers={triggers}
              onUpdate={handleUpdateTriggers}
            />
            
            <Card className="p-6 mt-6">
              <h3 className="font-bold text-slate-900 mb-4">كيف تعمل المحفزات الاستباقية</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <p>• <strong>سلوك المستخدم:</strong> تفعيل تلقائي بناءً على تصرفات الزائر</p>
                <p>• <strong>وقت محدد:</strong> إرسال رسائل في أوقات معينة</p>
                <p>• <strong>حدث معين:</strong> التفاعل عند وقوع حدث محدد</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="executor">
            <MultiStepExecutor workflow={workflow} onComplete={handleWorkflowComplete} />
            
            <Card className="p-6 mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <h3 className="font-bold text-slate-900 mb-4">الإجراءات المدعومة</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">عمليات الكيانات</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• قراءة وإنشاء السجلات</li>
                    <li>• تحديث وحذف البيانات</li>
                    <li>• الاستعلامات المعقدة</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">التكاملات الخارجية</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• استدعاء APIs خارجية</li>
                    <li>• إرسال الإشعارات والبريد</li>
                    <li>• معالجة البيانات المعقدة</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}