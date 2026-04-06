import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useInquiry } from './InquiryContext';
import InquiryDrawer from './InquiryDrawer';
import { motion, AnimatePresence } from 'framer-motion';

export default function InquiryButton() {
  const { itemCount } = useInquiry();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-emerald-100 transition-colors"
      >
        <ShoppingBag className="w-5 h-5 text-emerald-600" />
        <AnimatePresence>
          {itemCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {itemCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <InquiryDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}