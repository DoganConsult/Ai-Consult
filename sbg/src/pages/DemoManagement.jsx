import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PublicHeader from '@/components/shared/PublicHeader';
import { Calendar, Clock, User, Building2, Mail, Phone, MessageSquare, CheckCircle2, XCircle, Video, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-800', icon: MessageSquare },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-800', icon: Calendar },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function DemoManagement() {
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    meeting_link: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: demoRequests = [], isLoading } = useQuery({
    queryKey: ['demo-requests'],
    queryFn: () => base44.entities.DemoRequest.list('-created_date')
  });

  const scheduleDemo = useMutation({
    mutationFn: async ({ demoRequestId, data }) => {
      await base44.functions.invoke('demoAutomation', {
        action: 'schedule_demo',
        demoRequestId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['demo-requests']);
      toast.success('Demo scheduled successfully');
      setSelectedDemo(null);
      setScheduleData({ scheduled_date: '', scheduled_time: '', meeting_link: '', notes: '' });
    },
    onError: () => {
      toast.error('Failed to schedule demo');
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DemoRequest.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['demo-requests']);
      toast.success('Status updated');
    }
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <p className="text-slate-600">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <PublicHeader showBackButton backLabel="Back to Home" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Demo Management</h1>
          <p className="text-slate-600">Manage demo requests and schedule meetings</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = demoRequests.filter(d => d.status === status).length;
            const Icon = config.icon;
            return (
              <Card key={status}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">{config.label}</p>
                      <p className="text-2xl font-bold text-slate-900">{count}</p>
                    </div>
                    <Icon className="w-8 h-8 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Demo Requests */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {demoRequests.map((demo) => {
              const StatusIcon = statusConfig[demo.status]?.icon || Clock;
              
              return (
                <Card key={demo.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{demo.product_name}</CardTitle>
                          <Badge className={statusConfig[demo.status]?.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[demo.status]?.label}
                          </Badge>
                          {demo.erp_opportunity_id && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                              ERPNext Synced
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">
                          Requested on {new Date(demo.created_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Contact Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-slate-900 mb-2">Contact Information</h4>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">{demo.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">{demo.email}</span>
                        </div>
                        {demo.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{demo.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">{demo.company} ({demo.company_size})</span>
                        </div>
                      </div>

                      {/* Demo Details */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-slate-900 mb-2">Demo Details</h4>
                        {demo.demo_focus && demo.demo_focus.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Focus Areas:</p>
                            <div className="flex flex-wrap gap-1">
                              {demo.demo_focus.map((focus, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {focus}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {demo.preferred_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">
                              Preferred: {new Date(demo.preferred_date).toLocaleDateString()} ({demo.preferred_time})
                            </span>
                          </div>
                        )}
                        {demo.message && (
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Message:</p>
                            <p className="text-sm text-slate-700">{demo.message}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Scheduled Info */}
                    {demo.status === 'scheduled' && (
                      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-2">Scheduled Demo</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <span>{new Date(demo.scheduled_date).toLocaleDateString()} at {demo.scheduled_time}</span>
                          </div>
                          {demo.meeting_link && (
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-purple-600" />
                              <a href={demo.meeting_link} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline">
                                Join Meeting <ExternalLink className="w-3 h-3 inline" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                      {demo.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: demo.id, status: 'contacted' })}
                          >
                            Mark as Contacted
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDemo(demo)}
                          >
                            Schedule Demo
                          </Button>
                        </>
                      )}
                      {demo.status === 'contacted' && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedDemo(demo)}
                        >
                          Schedule Demo
                        </Button>
                      )}
                      {demo.status === 'scheduled' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: demo.id, status: 'completed' })}
                        >
                          Mark as Completed
                        </Button>
                      )}
                      {demo.erp_opportunity_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`${Deno.env.get('ERPNEXT_URL')}/app/opportunity/${demo.erp_opportunity_id}`, '_blank')}
                        >
                          View in ERPNext <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Schedule Dialog */}
        {selectedDemo && (
          <Dialog open onOpenChange={() => setSelectedDemo(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Demo - {selectedDemo.company}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={scheduleData.scheduled_date}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={scheduleData.scheduled_time}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduled_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Meeting Link *</Label>
                  <Input
                    placeholder="https://meet.google.com/..."
                    value={scheduleData.meeting_link}
                    onChange={(e) => setScheduleData({ ...scheduleData, meeting_link: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={scheduleData.notes}
                    onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                    placeholder="Any special instructions..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedDemo(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => scheduleDemo.mutate({ 
                      demoRequestId: selectedDemo.id, 
                      data: scheduleData 
                    })}
                    disabled={!scheduleData.scheduled_date || !scheduleData.scheduled_time || !scheduleData.meeting_link || scheduleDemo.isPending}
                  >
                    {scheduleDemo.isPending ? 'Scheduling...' : 'Schedule & Notify'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}