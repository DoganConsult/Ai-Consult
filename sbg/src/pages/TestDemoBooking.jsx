import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Package, Calendar, User, Mail, Phone, Building2, Loader2, ArrowRight, Eye } from 'lucide-react';
import DemoRequestForm from '@/components/DemoRequestForm';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function TestDemoBooking() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [testMode, setTestMode] = useState('real'); // 'real' or 'mock'

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 10)
  });

  // Fetch recent demo requests
  const { data: demoRequests = [], isLoading: requestsLoading, refetch } = useQuery({
    queryKey: ['demo-requests'],
    queryFn: () => base44.entities.DemoRequest.list('-created_date', 20)
  });

  // Test mutation
  const testDemoMutation = useMutation({
    mutationFn: async (productId) => {
      const product = products.find(p => p.id === productId);
      
      const testData = {
        product_id: product.id,
        product_name: product.name,
        name: 'Test User ' + Math.floor(Math.random() * 1000),
        email: `test${Math.floor(Math.random() * 10000)}@saudibusinessgate.com`,
        phone: '+966501234567',
        company: 'Test Company Inc.',
        company_size: '51-200',
        demo_focus: ['ERP Integration', 'AI Automation'],
        preferred_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        preferred_time: 'morning',
        message: 'This is an automated test demo request',
        status: 'pending'
      };

      const demoRequest = await base44.entities.DemoRequest.create(testData);
      
      // Trigger automation
      if (testMode === 'real') {
        await base44.functions.invoke('demoAutomation', {
          action: 'process_demo_request',
          demoRequestId: demoRequest.id
        });
      }
      
      return demoRequest;
    },
    onSuccess: () => {
      toast.success('✅ Test demo request created successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error('❌ Test failed: ' + error.message);
    }
  });

  // Delete test request
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DemoRequest.delete(id),
    onSuccess: () => {
      toast.success('Deleted test request');
      refetch();
    }
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'contacted': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'scheduled': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'contacted': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'scheduled': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">🧪 Demo Booking Test Suite</h1>
          <p className="text-slate-600">Test the complete demo request flow from submission to automation</p>
          
          {/* Test Mode Toggle */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-slate-700">Test Mode:</span>
            <Button
              size="sm"
              variant={testMode === 'real' ? 'default' : 'outline'}
              onClick={() => setTestMode('real')}
              className={testMode === 'real' ? 'bg-emerald-600' : ''}
            >
              Real (with automation)
            </Button>
            <Button
              size="sm"
              variant={testMode === 'mock' ? 'default' : 'outline'}
              onClick={() => setTestMode('mock')}
              className={testMode === 'mock' ? 'bg-blue-600' : ''}
            >
              Mock (no automation)
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Products Section */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                Available Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No products found</p>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1">{product.name}</h3>
                          <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                        </div>
                        {product.badge && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs ml-2">{product.badge}</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowForm(true);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Real Form
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testDemoMutation.mutate(product.id)}
                          disabled={testDemoMutation.isPending}
                          className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          {testDemoMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Quick Test
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Demo Requests Section */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Recent Demo Requests
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              ) : demoRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No demo requests yet</p>
                  <p className="text-xs text-slate-400 mt-1">Create your first test request!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {demoRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(request.status)}
                            <Badge className={`${getStatusColor(request.status)} text-xs`}>
                              {request.status}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-slate-900 text-sm">{request.product_name}</h4>
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(request.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600 text-xs"
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-3 h-3" />
                          {request.name}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-3 h-3" />
                          {request.email}
                        </div>
                        {request.company && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-3 h-3" />
                            {request.company} ({request.company_size})
                          </div>
                        )}
                        {request.preferred_date && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(request.preferred_date).toLocaleDateString()} - {request.preferred_time}
                          </div>
                        )}
                      </div>

                      {request.demo_focus && request.demo_focus.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {request.demo_focus.map((focus, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0">
                              {focus}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                        Created: {new Date(request.created_date).toLocaleString()}
                        {request.erp_opportunity_id && (
                          <span className="ml-2 text-emerald-600">
                            • Synced to ERP
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{demoRequests.length}</div>
              <div className="text-xs text-emerald-600">Total Requests</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">
                {demoRequests.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-xs text-amber-600">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">
                {demoRequests.filter(r => r.status === 'scheduled').length}
              </div>
              <div className="text-xs text-purple-600">Scheduled</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {demoRequests.filter(r => r.status === 'completed').length}
              </div>
              <div className="text-xs text-blue-600">Completed</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Demo Form Modal */}
      {selectedProduct && (
        <DemoRequestForm
          product={selectedProduct}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedProduct(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}