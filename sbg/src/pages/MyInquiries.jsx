import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Package, Clock, CheckCircle, MessageSquare, Phone, Mail, Building, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import PublicHeader from '@/components/shared/PublicHeader';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Phone },
  in_progress: { label: 'In Progress', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: MessageSquare },
  quoted: { label: 'Quote Sent', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: FileText },
  closed_won: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
  closed_lost: { label: 'Closed', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: CheckCircle }
};

export default function MyInquiries() {
  const [user, setUser] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['my-inquiries', user?.email],
    queryFn: () => base44.entities.Inquiry.filter({ contact_email: user.email }, '-created_date'),
    enabled: !!user?.email
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <PublicHeader showBackButton backLabel="Back to Home" />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h2>
          <p className="text-slate-500 mb-6">Please sign in to view your inquiries</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-emerald-600 hover:bg-emerald-700">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <PublicHeader showBackButton backLabel="Back to Home" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Inquiries</h1>
          <p className="text-slate-500">Track the status of your product inquiries</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : inquiries.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No inquiries yet</h3>
              <p className="text-slate-500 mb-6">Browse our products and submit an inquiry to get started</p>
              <Link to={createPageUrl('Search')}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">Browse Products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inquiry) => {
              const status = statusConfig[inquiry.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const isExpanded = expandedId === inquiry.id;

              return (
                <motion.div
                  key={inquiry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-white border-slate-200 hover:border-emerald-200 transition-colors">
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : inquiry.id)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {inquiry.product_names?.length || 0} Product(s)
                            </p>
                            <p className="text-sm text-slate-500">
                              {new Date(inquiry.created_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${status.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                              {/* Products */}
                              <div className="mb-4">
                                <p className="text-xs font-medium text-slate-500 mb-2">Products</p>
                                <div className="flex flex-wrap gap-2">
                                  {(inquiry.product_names || []).map((name, i) => (
                                    <Badge key={i} variant="outline" className="border-slate-200">{name}</Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Value */}
                              <div className="mb-4">
                                <p className="text-xs font-medium text-slate-500 mb-1">Total Value</p>
                                <p className="text-lg font-bold text-emerald-600">{(inquiry.total_value || 0).toLocaleString()} SAR</p>
                              </div>

                              {/* Timeline */}
                              {inquiry.next_follow_up && (
                                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 text-blue-700">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm font-medium">Next follow-up: {new Date(inquiry.next_follow_up).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              )}

                              {/* Customer Notes */}
                              {inquiry.customer_notes && (
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <p className="text-xs font-medium text-slate-500 mb-1">Notes from our team</p>
                                  <p className="text-sm text-slate-700">{inquiry.customer_notes}</p>
                                </div>
                              )}

                              {/* Contact Info */}
                              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {inquiry.company}</span>
                                <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {inquiry.contact_email}</span>
                                {inquiry.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {inquiry.phone}</span>}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}