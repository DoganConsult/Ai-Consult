import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Settings, Plus, Save, Trash2, ShoppingCart, Shield, Calculator, 
  Users, Bot, HeadphonesIcon, Check,
  Zap, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PublicHeader from '@/components/shared/PublicHeader';
import RuleBuilder from '@/components/agents/RuleBuilder';
import WorkflowEditor from '@/components/agents/WorkflowEditor';

const AGENT_TYPES = [
  { id: 'procurement', name: 'Smart Procurement', nameAr: 'المشتريات الذكية', icon: ShoppingCart, color: 'from-blue-500 to-indigo-600' },
  { id: 'grc', name: 'GRC & Compliance', nameAr: 'الحوكمة والامتثال', icon: Shield, color: 'from-emerald-500 to-teal-600' },
  { id: 'financial', name: 'Financial Close', nameAr: 'الإغلاق المالي', icon: Calculator, color: 'from-amber-500 to-orange-600' },
  { id: 'hr', name: 'HR Operations', nameAr: 'عمليات الموارد البشرية', icon: Users, color: 'from-pink-500 to-rose-600' },
  { id: 'robotics', name: 'Robotics & IoT', nameAr: 'الروبوتات وإنترنت الأشياء', icon: Bot, color: 'from-violet-500 to-purple-600' },
  { id: 'service_desk', name: 'Service Desk', nameAr: 'مكتب الخدمة', icon: HeadphonesIcon, color: 'from-cyan-500 to-sky-600' },
];

const COMPLIANCE_OPTIONS = [
  { id: 'nca', label: 'NCA (الهيئة الوطنية للأمن السيبراني)' },
  { id: 'sama', label: 'SAMA (البنك المركزي السعودي)' },
  { id: 'zatca', label: 'ZATCA (هيئة الزكاة والضريبة والجمارك)' },
  { id: 'nitaqat', label: 'Nitaqat (نطاقات)' },
  { id: 'taqat', label: 'Taqat (طاقات)' },
];

export default function AgentConfiguration() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['agent-configs'],
    queryFn: () => base44.entities.AgentConfig.list('-created_date')
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingConfig?.id 
      ? base44.entities.AgentConfig.update(editingConfig.id, data)
      : base44.entities.AgentConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] });
      setEditingConfig(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-configs'] })
  });

  const handleCreateNew = (agentType) => {
    const agent = AGENT_TYPES.find(a => a.id === agentType);
    setEditingConfig({
      agent_type: agentType,
      name: `${agent.name} Configuration`,
      is_active: true,
      risk_tolerance: 'medium',
      auto_approve_threshold: 10000,
      preferred_vendors: [],
      blocked_vendors: [],
      compliance_checks: ['nca', 'zatca'],
      routing_keywords: [],
      escalation_rules: [],
      custom_workflows: [],
      notification_settings: {
        email_enabled: true,
        in_app_enabled: true,
        critical_only: false
      }
    });
    setSelectedAgent(agentType);
  };

  const agentConfigs = selectedAgent 
    ? configs.filter(c => c.agent_type === selectedAgent)
    : configs;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <PublicHeader showBackButton backLabel="Back to Home" />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-emerald-600" />
              Agent Configuration
            </h1>
            <p className="text-slate-600 mt-1">تخصيص سلوك الوكلاء الأذكياء</p>
          </div>
          <Link to={createPageUrl('AgentAnalytics')}>
            <Button variant="outline" className="border-emerald-200">
              <Zap className="w-4 h-4 mr-2" /> View Analytics
            </Button>
          </Link>
        </div>

        {/* Agent Type Selector */}
        {!selectedAgent && !editingConfig && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {AGENT_TYPES.map((agent) => {
              const configCount = configs.filter(c => c.agent_type === agent.id).length;
              return (
                <motion.div
                  key={agent.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className="cursor-pointer hover:border-emerald-300 transition-all"
                    onClick={() => setSelectedAgent(agent.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 mx-auto bg-gradient-to-br ${agent.color} rounded-xl flex items-center justify-center mb-3`}>
                        <agent.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900">{agent.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{agent.nameAr}</p>
                      {configCount > 0 && (
                        <Badge className="mt-2 bg-emerald-100 text-emerald-700">{configCount} configs</Badge>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Selected Agent View */}
        {selectedAgent && !editingConfig && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" onClick={() => setSelectedAgent(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> All Agents
              </Button>
              <h2 className="text-xl font-semibold">
                {AGENT_TYPES.find(a => a.id === selectedAgent)?.name} Configurations
              </h2>
              <Button onClick={() => handleCreateNew(selectedAgent)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> New Configuration
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentConfigs.map((config) => (
                <Card key={config.id} className="hover:border-emerald-300 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{config.name}</h3>
                        <Badge className={config.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditingConfig(config)}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(config.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>Risk Tolerance: <span className="font-medium">{config.risk_tolerance}</span></p>
                      <p>Auto-approve: <span className="font-medium">{config.auto_approve_threshold?.toLocaleString()} SAR</span></p>
                      <p>Compliance: <span className="font-medium">{config.compliance_checks?.length || 0} checks</span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {agentConfigs.length === 0 && (
                <Card className="col-span-full border-dashed">
                  <CardContent className="p-8 text-center">
                    <p className="text-slate-500">No configurations yet. Create your first one!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Configuration Editor */}
        {editingConfig && (
          <ConfigEditor 
            config={editingConfig}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => { setEditingConfig(null); setSelectedAgent(null); }}
            isLoading={saveMutation.isPending}
          />
        )}
      </main>
    </div>
  );
}

function ConfigEditor({ config, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState(config);
  const [activeTab, setActiveTab] = useState('general');
  const agent = AGENT_TYPES.find(a => a.id === formData.agent_type);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCompliance = (id) => {
    const current = formData.compliance_checks || [];
    const updated = current.includes(id) 
      ? current.filter(c => c !== id)
      : [...current, id];
    updateField('compliance_checks', updated);
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${agent?.color} rounded-xl flex items-center justify-center`}>
              {agent && <agent.icon className="w-5 h-5 text-white" />}
            </div>
            <div>
              <CardTitle>{config.id ? 'Edit Configuration' : 'New Configuration'}</CardTitle>
              <p className="text-sm text-slate-500">{agent?.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(formData)} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="approvals">Approvals & Risk</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="rules">Custom Rules</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Configuration Name</label>
              <Input 
                value={formData.name} 
                onChange={(e) => updateField('name', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Active Status</p>
                <p className="text-sm text-slate-500">Enable or disable this configuration</p>
              </div>
              <Switch checked={formData.is_active} onCheckedChange={(v) => updateField('is_active', v)} />
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-700">Risk Tolerance</label>
              <Select value={formData.risk_tolerance} onValueChange={(v) => updateField('risk_tolerance', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Require approval for most actions</SelectItem>
                  <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                  <SelectItem value="high">High - Auto-approve most actions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Auto-approve Threshold: {formData.auto_approve_threshold?.toLocaleString()} SAR
              </label>
              <Slider
                value={[formData.auto_approve_threshold || 10000]}
                onValueChange={([v]) => updateField('auto_approve_threshold', v)}
                max={500000}
                step={5000}
                className="mt-3"
              />
              <p className="text-xs text-slate-500 mt-1">Transactions below this value will be auto-approved</p>
            </div>
            
            {formData.agent_type === 'procurement' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">Preferred Vendors</label>
                  <Input 
                    placeholder="Enter vendor names separated by commas"
                    value={(formData.preferred_vendors || []).join(', ')}
                    onChange={(e) => updateField('preferred_vendors', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Blocked Vendors</label>
                  <Input 
                    placeholder="Enter vendor names to block"
                    value={(formData.blocked_vendors || []).join(', ')}
                    onChange={(e) => updateField('blocked_vendors', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">Select required compliance checks for this agent:</p>
            <div className="grid md:grid-cols-2 gap-3">
              {COMPLIANCE_OPTIONS.map((option) => (
                <div 
                  key={option.id}
                  onClick={() => toggleCompliance(option.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    (formData.compliance_checks || []).includes(option.id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      (formData.compliance_checks || []).includes(option.id)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200'
                    }`}>
                      {(formData.compliance_checks || []).includes(option.id) && <Check className="w-4 h-4" />}
                    </div>
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rules">
            <RuleBuilder 
              rules={formData.escalation_rules || []}
              onChange={(rules) => updateField('escalation_rules', rules)}
              agentType={formData.agent_type}
            />
          </TabsContent>

          <TabsContent value="workflows">
            <WorkflowEditor 
              workflows={formData.custom_workflows || []}
              onChange={(workflows) => updateField('custom_workflows', workflows)}
              agentType={formData.agent_type}
            />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-slate-500">Send alerts via email</p>
              </div>
              <Switch 
                checked={formData.notification_settings?.email_enabled} 
                onCheckedChange={(v) => updateField('notification_settings', { ...formData.notification_settings, email_enabled: v })} 
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-sm text-slate-500">Show alerts in the application</p>
              </div>
              <Switch 
                checked={formData.notification_settings?.in_app_enabled} 
                onCheckedChange={(v) => updateField('notification_settings', { ...formData.notification_settings, in_app_enabled: v })} 
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Critical Only</p>
                <p className="text-sm text-slate-500">Only notify for critical issues</p>
              </div>
              <Switch 
                checked={formData.notification_settings?.critical_only} 
                onCheckedChange={(v) => updateField('notification_settings', { ...formData.notification_settings, critical_only: v })} 
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}