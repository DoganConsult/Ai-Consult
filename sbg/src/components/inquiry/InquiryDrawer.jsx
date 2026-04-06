import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Trash2, Send, ShoppingBag, Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe, CheckCircle, Plus } from 'lucide-react';
import ProductSelector from '@/components/products/ProductSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useInquiry } from './InquiryContext';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };

export default function InquiryDrawer({ isOpen, onClose }) {
  const { inquiryItems, removeFromInquiry, clearInquiry } = useInquiry();
  const [step, setStep] = useState('list'); // 'list' | 'form' | 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  });
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setFormData(prev => ({
        ...prev,
        name: u.full_name || prev.name,
        email: u.email || prev.email
      }));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Combine catalog products and inquiry cart products
      const allProducts = [...selectedProducts, ...inquiryItems];
      const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());
      const finalTotal = uniqueProducts.reduce((sum, p) => sum + (p.price || 0), 0);

      // Create inquiry record in database
      await base44.entities.Inquiry.create({
        products: uniqueProducts.map(p => p.id),
        product_names: uniqueProducts.map(p => p.name),
        total_value: finalTotal,
        contact_name: formData.name,
        contact_email: formData.email,
        company: formData.company,
        phone: formData.phone,
        message: formData.message,
        status: 'pending',
        priority: finalTotal > 100000 ? 'high' : finalTotal > 50000 ? 'medium' : 'low',
        notes: []
      });

      // Send notification email
      await base44.integrations.Core.SendEmail({
        to: 'info@saudibusinessgate.com',
        subject: `New Inquiry: ${inquiryItems.length} Product(s) - ${formData.company}`,
        body: `
New Inquiry Request

Contact Information:
- Name: ${formData.name}
- Email: ${formData.email}
- Company: ${formData.company}
- Phone: ${formData.phone}

Products of Interest:
${[...selectedProducts, ...inquiryItems].map(p => `- ${p.name} (${(p.price || 0).toLocaleString()} SAR)`).join('\n')}

Total Value: ${([...selectedProducts, ...inquiryItems].reduce((sum, p) => sum + (p.price || 0), 0)).toLocaleString()} SAR

Message:
${formData.message || 'No additional message'}

View in CRM: ${window.location.origin}${createPageUrl('SalesCRM')}
        `
      });

      setStep('success');
      setTimeout(() => {
        clearInquiry();
        setSelectedProducts([]);
        onClose();
        setStep('list');
        setFormData({ name: user?.full_name || '', email: user?.email || '', company: '', phone: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValue = [...selectedProducts, ...inquiryItems].reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-lg text-slate-900">
                  {step === 'list' && 'Inquiry List'}
                  {step === 'form' && 'Contact Information'}
                  {step === 'success' && 'Inquiry Sent!'}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {step === 'list' && (
                <>
                  {/* Add from Catalog Button */}
                  <div className="mb-4">
                    <Button
                      onClick={() => setShowProductSelector(true)}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Products from Catalog
                    </Button>
                  </div>

                  {/* Selected Catalog Products */}
                  {selectedProducts.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-600 mb-2">From Catalog:</p>
                      <div className="space-y-2">
                        {selectedProducts.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{item.name}</p>
                              <p className="text-sm text-emerald-600 font-semibold">{(item.price || 0).toLocaleString()} {item.currency || 'SAR'}</p>
                            </div>
                            <button 
                              onClick={() => setSelectedProducts(selectedProducts.filter(p => p.id !== item.id))}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Homepage Cart Products */}
                  {inquiryItems.length === 0 && selectedProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500">Your inquiry list is empty</p>
                      <p className="text-sm text-slate-400 mt-1">Add products to start an inquiry</p>
                    </div>
                  ) : inquiryItems.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">From Homepage:</p>
                      <div className="space-y-2">
                        {inquiryItems.map((item) => {
                          const IconComponent = iconMap[item.icon] || Bot;
                          return (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                              <div className={`w-10 h-10 bg-gradient-to-br ${item.gradient || 'from-emerald-600 to-teal-600'} rounded-lg flex items-center justify-center shrink-0`}>
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{item.name}</p>
                                <p className="text-sm text-emerald-600 font-semibold">{(item.price || 0).toLocaleString()} SAR</p>
                              </div>
                              <button 
                                onClick={() => removeFromInquiry(item.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {step === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <Label>Company *</Label>
                    <Input
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Company Name"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+966 xxx xxx xxxx"
                    />
                  </div>
                  <div>
                    <Label>Additional Message</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your requirements..."
                      rows={3}
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4">
                    <h4 className="font-semibold text-emerald-800 mb-2">Inquiry Summary</h4>
                    <p className="text-sm text-emerald-700">{selectedProducts.length + inquiryItems.length} product(s) selected</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">Total: {totalValue.toLocaleString()} SAR</p>
                  </div>
                </form>
              )}

              {step === 'success' && (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Inquiry Submitted!</h3>
                  <p className="text-slate-500">We'll get back to you within 24 hours.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {step === 'list' && (selectedProducts.length > 0 || inquiryItems.length > 0) && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-600">{selectedProducts.length + inquiryItems.length} item(s)</span>
                  <span className="text-xl font-bold text-emerald-600">{totalValue.toLocaleString()} SAR</span>
                </div>
                <Button onClick={() => setStep('form')} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Send className="w-4 h-4 mr-2" />
                  Proceed to Inquiry
                </Button>
              </div>
            )}

            {step === 'form' && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
                <Button variant="outline" onClick={() => setStep('list')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? 'Sending...' : 'Submit Inquiry'}
                </Button>
              </div>
            )}
          </motion.div>

          {/* Product Selector Modal */}
          {showProductSelector && (
            <ProductSelector
              selectedProducts={selectedProducts}
              onProductsChange={(products) => setSelectedProducts(products)}
              onClose={() => setShowProductSelector(false)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}