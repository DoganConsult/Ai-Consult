
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, CreditCard, AlertCircle, Building2, Users } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

export default function FormSection({ activeSection }) {
  const sections = {
    'free-form': {
      title: 'Free AI Assistant',
      icon: FileText,
      description: 'Enter your details below. File upload is not available in the free version.',
      formId: 'YOUR_FREE_FORM_ID',
      height: '500',
      bgColor: 'bg-slate-50',
      theme: {
        icon: 'text-slate-700',
        title: 'text-slate-900',
        ring: ''
      }
    },
    'beta-payment': {
      title: 'Beta Access Payment',
      icon: CreditCard,
      description: 'Subscribe to the Beta version for £5/month to unlock file upload and advanced features.',
      formId: 'YOUR_BETA_PAYMENT_FORM_ID',
      height: '500',
      bgColor: 'bg-blue-50',
      note: 'After payment, you will be redirected to the Beta AI tools.',
      theme: {
        icon: 'text-blue-700',
        title: 'bg-gradient-to-r from-blue-700 to-sky-500 bg-clip-text text-transparent',
        alertBg: 'bg-blue-100 border-blue-300',
        alertText: 'text-blue-800',
        alertIcon: 'text-blue-600'
      }
    },
    'business-payment': {
      title: 'Business Plan Setup',
      icon: Building2,
      description: 'Subscribe to the Business plan for £6.99/month. Perfect for law firms and businesses with multiple users.',
      formId: 'YOUR_BUSINESS_PAYMENT_FORM_ID',
      height: '600',
      bgColor: 'bg-yellow-50',
      note: 'After payment, you can invite team members and access advanced collaboration features.',
      features: [
        'Multiple user accounts for your team',
        'Advanced document processing',
        'Team collaboration tools',
        'Usage analytics and reporting',
        'Priority support'
      ],
      theme: {
        icon: 'text-yellow-700',
        title: 'bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent',
        alertBg: 'bg-yellow-100 border-yellow-300',
        alertText: 'text-yellow-800',
        alertIcon: 'text-yellow-600',
        featureBorder: 'border-yellow-200',
        featureIcon: 'text-yellow-600',
        featureDot: 'bg-yellow-500'
      }
    },
    'beta-form': {
      title: 'Beta AI Tools (Text + Upload)',
      icon: Upload,
      description: 'Upload relevant documents and provide your details below.',
      formId: 'YOUR_BETA_AI_FORM_ID',
      height: '600',
      bgColor: 'bg-green-50'
    }
  };

  const currentSection = sections[activeSection];
  const theme = currentSection.theme || {};

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={activeSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="py-8"
      >
        <Card className={`${currentSection.bgColor} border-none shadow-xl`}>
          <CardHeader className="text-center pb-6">
            <div className={`w-16 h-16 mx-auto mb-4 bg-white rounded-2xl flex items-center justify-center shadow-md`}>
              <currentSection.icon className={`w-8 h-8 ${theme.icon}`} />
            </div>
            <CardTitle className={`text-2xl font-bold ${theme.title}`}>
              {currentSection.title}
            </CardTitle>
            <p className="text-slate-600 max-w-2xl mx-auto">
              {currentSection.description}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentSection.features && (
              <div className={`bg-white/80 rounded-xl p-6 border ${theme.featureBorder}`}>
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className={`w-5 h-5 ${theme.featureIcon}`} />
                  Business Plan Includes:
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {currentSection.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className={`w-2 h-2 ${theme.featureDot} rounded-full`}></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentSection.note && (
              <Alert className={theme.alertBg}>
                <AlertCircle className={`h-4 w-4 ${theme.alertIcon}`} />
                <AlertDescription className={theme.alertText}>
                  <em>{currentSection.note}</em>
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <iframe
                data-tally-src={`https://tally.so/r/${currentSection.formId}`}
                loading="lazy"
                width="100%"
                height={currentSection.height}
                frameBorder="0"
                marginHeight="0"
                marginWidth="0"
                title={currentSection.title}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      </motion.section>
    </AnimatePresence>
  );
}
