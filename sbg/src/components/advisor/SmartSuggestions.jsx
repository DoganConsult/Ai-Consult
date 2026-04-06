import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SmartSuggestions({ suggestions, onSelect, isVisible }) {
  if (!isVisible || !suggestions?.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Suggested Follow-ups
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(suggestion)}
                className="text-xs bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200 hover:from-blue-100 hover:to-sky-100 hover:border-blue-300 transition-all duration-300 group"
              >
                <Sparkles className="w-3 h-3 mr-1 text-blue-500 group-hover:text-blue-600" />
                {suggestion}
                <ArrowRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}