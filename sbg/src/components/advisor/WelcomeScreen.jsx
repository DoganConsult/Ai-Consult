import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Shield, Brain } from 'lucide-react';
import TemplateSelector from './TemplateSelector';

export default function WelcomeScreen({ onSelectPrompt, mode }) {
  const capabilities = [
    { icon: Brain, text: 'Advanced AI trained for legal & business', color: 'text-purple-600 bg-purple-100' },
    { icon: Zap, text: 'Instant responses & document analysis', color: 'text-amber-600 bg-amber-100' },
    { icon: Shield, text: 'Professional-grade accuracy', color: 'text-green-600 bg-green-100' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="relative inline-block mb-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-2xl mx-auto">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/72f2e91e1_B3CACE63-2212-47D8-9A85-A978E4BDF399.png" 
              alt="Star AI"
              className="w-20 h-20 rounded-2xl"
            />
          </div>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-6 h-6 text-amber-400" />
          </motion.div>
        </motion.div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Hello! I'm <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Star</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-md mx-auto">
          Your AI-powered assistant for legal research and business strategy
        </p>

        {/* Capabilities */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {capabilities.map((cap, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-full ${cap.color} text-sm font-medium`}
            >
              <cap.icon className="w-4 h-4" />
              {cap.text}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-2xl"
      >
        <TemplateSelector onSelect={onSelectPrompt} mode={mode} />
      </motion.div>
    </div>
  );
}