import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { X, Send, CheckCircle, Calendar, Building2, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';

const demoFocusOptions = [
  "ERP Integration",
  "AI Automation",
  "Robotics Motion",
  "Business Intelligence",
  "Security Operations",
  "Process Orchestration"
];

export default function DemoRequestForm({ product, isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    company_size: '',
    demo_focus: [],
    preferred_date: '',
    preferred_time: '',
    message: ''
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const demoRequest = await base44.entities.DemoRequest.create({
        ...data,
        product_id: product.id,
        product_name: product.name,
        status: 'pending'
      });
      
      // Trigger automated processing with ERPNext integration
      await base44.functions.invoke('demoAutomation', {
        action: 'process_demo_request',
        demoRequestId: demoRequest.id
      });
    },
    onSuccess: () => setSubmitted(true)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const toggleFocus = (focus) => {
    setFormData(prev => ({
      ...prev,
      demo_focus: prev.demo_focus.includes(focus)
        ? prev.demo_focus.filter(f => f !== focus)
        : [...prev.demo_focus, focus]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        >
          {submitted ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Demo Request Confirmed!</h3>
              <p className="text-slate-600 mb-4">
                Your request has been submitted and synced to our system.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-emerald-800 font-medium mb-2">What happens next?</p>
                <ul className="text-sm text-emerald-700 space-y-1">
                  <li>✓ You'll receive a confirmation email shortly</li>
                  <li>✓ Our team will review your request within 24 hours</li>
                  <li>✓ We'll contact you to schedule your personalized demo</li>
                  <li>✓ A calendar invite will be sent with meeting details</li>
                </ul>
              </div>
              <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">Close</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Request a Demo</h2>
                  <p className="text-sm text-slate-500">{product.name}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4" /> Name *
                    </Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4" /> Email *
                    </Label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4" /> Phone
                    </Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+966..."
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4" /> Company *
                    </Label>
                    <Input
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block">Company Size *</Label>
                  <Select value={formData.company_size} onValueChange={(v) => setFormData({ ...formData, company_size: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Demo Focus Areas</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {demoFocusOptions.map((focus) => (
                      <label key={focus} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <Checkbox
                          checked={formData.demo_focus.includes(focus)}
                          onCheckedChange={() => toggleFocus(focus)}
                        />
                        <span className="text-sm text-slate-700">{focus}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" /> Preferred Date
                    </Label>
                    <Input
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Preferred Time</Label>
                    <Select value={formData.preferred_time} onValueChange={(v) => setFormData({ ...formData, preferred_time: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (9AM-12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12PM-5PM)</SelectItem>
                        <SelectItem value="evening">Evening (5PM-8PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4" /> Additional Message
                  </Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your requirements..."
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Submit Request
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}