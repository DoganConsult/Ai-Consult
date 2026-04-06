import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Upload, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const AGENT_TYPES = [
  { id: 'procurement', name: 'Procurement' },
  { id: 'grc', name: 'GRC & Compliance' },
  { id: 'financial', name: 'Financial' },
  { id: 'hr', name: 'HR Operations' },
  { id: 'robotics', name: 'Robotics & IoT' },
  { id: 'service_desk', name: 'Service Desk' },
];

const CATEGORIES = [
  { id: 'compliance', name: 'Compliance & Regulatory' },
  { id: 'finance', name: 'Finance & Banking' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'retail', name: 'Retail & E-commerce' },
  { id: 'manufacturing', name: 'Manufacturing' },
  { id: 'government', name: 'Government' },
  { id: 'telecom', name: 'Telecom' },
  { id: 'energy', name: 'Energy & Utilities' },
  { id: 'general', name: 'General' },
];

export default function PublishConfigModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    category: 'general',
    tags: [],
    price: 0
  });
  const [tagInput, setTagInput] = useState('');
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: configs = [] } = useQuery({
    queryKey: ['agent-configs'],
    queryFn: () => base44.entities.AgentConfig.list('-created_date')
  });

  const publishMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketplaceItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
      setStep(3);
    }
  });

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handlePublish = () => {
    publishMutation.mutate({
      ...formData,
      agent_type: selectedConfig.agent_type,
      config_data: {
        risk_tolerance: selectedConfig.risk_tolerance,
        auto_approve_threshold: selectedConfig.auto_approve_threshold,
        preferred_vendors: selectedConfig.preferred_vendors,
        blocked_vendors: selectedConfig.blocked_vendors,
        compliance_checks: selectedConfig.compliance_checks,
        routing_keywords: selectedConfig.routing_keywords,
        escalation_rules: selectedConfig.escalation_rules,
        custom_workflows: selectedConfig.custom_workflows,
        notification_settings: selectedConfig.notification_settings
      },
      author_name: user?.full_name || 'Anonymous',
      author_email: user?.email || ''
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-4 md:inset-x-auto md:inset-y-10 md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-white rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Publish Configuration</h2>
            <p className="text-sm text-slate-500">Share your agent setup with the community</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Select Config */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">Select a configuration to publish:</h3>
              {configs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-slate-500">
                    No configurations found. Create one first in Agent Configuration.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {configs.map((config) => (
                    <Card 
                      key={config.id}
                      className={`cursor-pointer transition-all ${
                        selectedConfig?.id === config.id ? 'border-emerald-500 bg-emerald-50' : 'hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedConfig(config)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{config.name}</p>
                          <p className="text-sm text-slate-500">{config.agent_type} • {(config.escalation_rules || []).length} rules</p>
                        </div>
                        {selectedConfig?.id === config.id && (
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <Input
                placeholder="Title (English) *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <Input
                placeholder="العنوان (عربي)"
                value={formData.title_ar}
                onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                dir="rtl"
              />
              <Textarea
                placeholder="Description - explain what this configuration does and who it's for..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div>
                <label className="text-sm text-slate-500 mb-1 block">Tags</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag (e.g., NCA, Sharia, ZATCA)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button variant="outline" onClick={handleAddTag}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, j) => j !== i) })}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-500 mb-1 block">Price (SAR) - Leave 0 for free</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Published Successfully!</h3>
              <p className="text-slate-500">Your configuration is now available in the marketplace.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-between">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedConfig}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Next
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button 
                onClick={handlePublish} 
                disabled={!formData.title || !formData.description || publishMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Publish
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-700">Done</Button>
          )}
        </div>
      </motion.div>
    </>
  );
}