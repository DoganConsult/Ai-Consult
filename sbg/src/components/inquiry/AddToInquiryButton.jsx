import React from 'react';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInquiry } from './InquiryContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddToInquiryButton({ product, size = 'default', variant = 'default' }) {
  const { addToInquiry, removeFromInquiry, isInInquiry } = useInquiry();
  const isAdded = isInInquiry(product.id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded) {
      removeFromInquiry(product.id);
    } else {
      addToInquiry(product);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isAdded 
            ? 'bg-emerald-500 text-white' 
            : 'bg-white/80 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 border border-slate-200'
        }`}
      >
        <AnimatePresence mode="wait">
          {isAdded ? (
            <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Plus className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      size={size}
      className={isAdded 
        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300' 
        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
      }
    >
      {isAdded ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Added to Inquiry
        </>
      ) : (
        <>
          <Plus className="w-4 h-4 mr-2" />
          Add to Inquiry
        </>
      )}
    </Button>
  );
}