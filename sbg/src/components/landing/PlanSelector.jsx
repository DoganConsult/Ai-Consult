
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Upload, CreditCard, Users, Building2, Scale } from 'lucide-react';
import { motion } from "framer-motion";

export default function PlanSelector({ activeSection, onSectionChange }) {
  const plans = [
    {
      id: 'free-form',
      name: 'Free Version',
      price: 'Free',
      description: 'Perfect for trying out our AI assistant',
      features: [
        'Text input only',
        'Basic AI assistance',
        'LAW MODE ⚖️ - Legal research & advice',
        'Prompt suggestions',
        'No account required',
        'Sessions not saved'
      ],
      limitations: ['No file upload', 'Sessions not saved'],
      buttonText: 'Use Free Version',
      popular: false,
      icon: Star,
      theme: {
        iconBg: 'from-slate-400 to-slate-600',
        button: 'bg-slate-900 hover:bg-slate-800 text-white',
        badge: '',
        price: 'text-slate-900',
        activeRing: 'ring-slate-300'
      }
    },
    {
      id: 'beta-payment',
      name: 'Beta Access',
      price: '£5/month',
      originalPrice: 'After 3-day free trial',
      description: 'Unlock advanced features with document upload',
      features: [
        'Everything in Free',
        'Document upload capability',
        'Advanced LAW MODE ⚖️ - Case analysis',
        'Advanced AI learning',
        'Saved conversations',
        'Priority support',
        '3-day free trial'
      ],
      buttonText: 'Start Free Trial',
      popular: true,
      icon: Upload,
      theme: {
        iconBg: 'from-blue-600 to-sky-500',
        button: 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white',
        badge: 'bg-gradient-to-r from-blue-600 to-sky-500 text-white',
        price: 'bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent',
        activeRing: 'ring-blue-300'
      }
    },
    {
      id: 'business-payment',
      name: 'Business Plan',
      price: '£6.99/month',
      originalPrice: 'After 3-day free trial',
      description: 'Complete solution for law firms and businesses',
      features: [
        'Everything in Beta',
        'Multiple user accounts',
        'Team collaboration',
        'Premium LAW MODE ⚖️ - Multi-case research',
        'Advanced document processing',
        'Priority support',
        '3-day free trial'
      ],
      buttonText: 'Start Free Trial',
      popular: false,
      icon: Building2,
      highlight: true,
      theme: {
        iconBg: 'from-yellow-500 to-amber-500',
        button: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white',
        badge: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
        price: 'bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent',
        activeRing: 'ring-yellow-300'
      }
    }
  ];

  return (
    <section id="plan-selector" className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          All plans include <span className="font-semibold text-blue-700">LAW MODE ⚖️</span> for specialized legal research and advice.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={plan.highlight ? 'lg:scale-105' : ''}
          >
            <Card className={`relative h-full transition-all duration-300 hover:shadow-xl ${
              activeSection === plan.id 
                ? `shadow-lg ring-2 ${plan.theme.activeRing}` 
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              
              {(plan.popular || plan.highlight) && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className={`${plan.theme.badge} px-4 py-1`}>
                    {plan.popular && <Star className="w-3 h-3 mr-1 fill-white" />}
                    {plan.highlight && <Building2 className="w-3 h-3 mr-1" />}
                    {plan.popular ? 'Most Popular' : 'For Teams'}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${plan.theme.iconBg} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <plan.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {plan.name}
                </CardTitle>
                <div className={`text-3xl font-bold mt-2 ${plan.theme.price}`}>
                  {plan.price}
                </div>
                {plan.originalPrice && (
                  <p className="text-sm text-slate-500 mt-1">
                    {plan.originalPrice}
                  </p>
                )}
                <p className="text-slate-600 mt-2">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-5 h-5 ${feature.includes('LAW MODE') ? 'bg-blue-100' : feature.includes('trial') ? 'bg-green-100' : 'bg-green-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                        {feature.includes('LAW MODE') ? 
                          <Scale className="w-3 h-3 text-blue-600" /> :
                          <Check className="w-3 h-3 text-green-600" />
                        }
                      </div>
                      <span className={`text-slate-700 text-sm ${feature.includes('LAW MODE') ? 'font-medium text-blue-800' : feature.includes('trial') ? 'font-medium text-green-800' : ''}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => onSectionChange(plan.id)}
                  className={`w-full py-6 text-lg font-semibold rounded-xl transition-all duration-300 ${
                    activeSection === plan.id
                      ? `${plan.theme.button} shadow-lg`
                      : plan.theme.button
                  }`}
                >
                  {plan.id.includes('payment') && <CreditCard className="w-5 h-5 mr-2" />}
                  {plan.id === 'business-payment' && <Users className="w-5 h-5 mr-2" />}
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
