import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PublicHeader from '@/components/shared/PublicHeader';
import { User, Package, FileText, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Edit, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ERPCustomerRecords from '@/components/erp/ERPCustomerRecords';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: Package },
  quoted: { label: 'Quoted', color: 'bg-indigo-100 text-indigo-800', icon: FileText },
  closed_won: { label: 'Closed Won', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  closed_lost: { label: 'Closed Lost', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function CustomerPortal() {
  const [expandedInquiry, setExpandedInquiry] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const u = await base44.auth.me();
      setProfileData({
        full_name: u.full_name || '',
        email: u.email || '',
        phone: u.phone || ''
      });
      return u;
    }
  });

  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery({
    queryKey: ['customer-inquiries', user?.email],
    queryFn: () => base44.entities.Inquiry.filter({ contact_email: user.email }, '-created_date'),
    enabled: !!user?.email
  });

  const updateProfile = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      toast.success('Profile updated successfully');
      setEditingProfile(false);
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <PublicHeader />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    base44.auth.redirectToLogin();
    return null;
  }

  const handleSaveProfile = () => {
    updateProfile.mutate({
      full_name: profileData.full_name,
      phone: profileData.phone
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <PublicHeader showBackButton backLabel="Back to Home" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Customer Portal</h1>
          <p className="text-slate-600">Manage your inquiries and profile</p>
        </div>

        <Tabs defaultValue="inquiries" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="inquiries" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              My Inquiries
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Inquiries Tab */}
          <TabsContent value="inquiries">
            {inquiriesLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : inquiries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg mb-2">No inquiries yet</p>
                  <p className="text-slate-500 text-sm">Your inquiries will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {inquiries.map((inquiry) => {
                  const StatusIcon = statusConfig[inquiry.status]?.icon || Clock;
                  const isExpanded = expandedInquiry === inquiry.id;
                  
                  return (
                    <Card key={inquiry.id} className="overflow-hidden">
                      <CardHeader 
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedInquiry(isExpanded ? null : inquiry.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-lg">
                                Inquiry #{inquiry.id.slice(0, 8)}
                              </CardTitle>
                              <Badge className={statusConfig[inquiry.status]?.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig[inquiry.status]?.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span>{inquiry.product_names?.length || 0} products</span>
                              <span>•</span>
                              <span className="font-semibold text-emerald-600">
                                {inquiry.total_value?.toLocaleString()} SAR
                              </span>
                              <span>•</span>
                              <span>{new Date(inquiry.created_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </Button>
                        </div>
                      </CardHeader>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <CardContent className="border-t border-slate-200 pt-4">
                              {/* Products */}
                              <div className="mb-4">
                                <h4 className="font-semibold text-slate-900 mb-2">Products:</h4>
                                <ul className="space-y-1">
                                  {inquiry.product_names?.map((name, idx) => (
                                    <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                      {name}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Company Info */}
                              <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-slate-500">Company</p>
                                  <p className="font-medium text-slate-900">{inquiry.company}</p>
                                </div>
                                {inquiry.phone && (
                                  <div>
                                    <p className="text-sm text-slate-500">Phone</p>
                                    <p className="font-medium text-slate-900">{inquiry.phone}</p>
                                  </div>
                                )}
                              </div>

                              {/* Message */}
                              {inquiry.message && (
                                <div className="mb-4">
                                  <p className="text-sm text-slate-500 mb-1">Your Message:</p>
                                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                                    {inquiry.message}
                                  </p>
                                </div>
                              )}

                              {/* Customer Notes */}
                              {inquiry.customer_notes && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-sm font-medium text-blue-900 mb-1">Update from Sales Team:</p>
                                  <p className="text-sm text-blue-700">{inquiry.customer_notes}</p>
                                </div>
                              )}

                              {/* Next Follow Up */}
                              {inquiry.next_follow_up && (
                                <div className="mb-4">
                                  <p className="text-sm text-slate-500">Next Follow-up:</p>
                                  <p className="font-medium text-slate-900">
                                    {new Date(inquiry.next_follow_up).toLocaleDateString()}
                                  </p>
                                </div>
                              )}

                              {/* ERP Records */}
                              {inquiry.erp_customer_id && (
                                <div className="mt-6">
                                  <h4 className="font-semibold text-slate-900 mb-3">Order History & Documents</h4>
                                  <ERPCustomerRecords customerId={inquiry.erp_customer_id} />
                                </div>
                              )}
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profile Information</CardTitle>
                  {!editingProfile ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingProfile(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileData({
                            full_name: user.full_name || '',
                            email: user.email || '',
                            phone: user.phone || ''
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfile.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    disabled={!editingProfile}
                    className={!editingProfile ? 'bg-slate-50' : ''}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    disabled={!editingProfile}
                    placeholder="+966 xxx xxx xxxx"
                    className={!editingProfile ? 'bg-slate-50' : ''}
                  />
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500">
                    Member since: {new Date(user.created_date).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}