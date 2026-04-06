import React from 'react';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Logo({ size = 'default' }) {
  const sizes = {
    small: {
      container: 'w-9 h-9',
      icon: 'w-4 h-4',
      text: 'text-lg',
      showText: true
    },
    default: {
      container: 'w-11 h-11',
      icon: 'w-5 h-5',
      text: 'text-xl',
      showText: true
    },
    large: {
      container: 'w-16 h-16',
      icon: 'w-8 h-8',
      text: 'text-3xl',
      showText: true
    }
  };

  const currentSize = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <motion.div 
        whileHover={{ scale: 1.05 }}
        className="relative"
      >
        <div className={`${currentSize.container} bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20`}>
          <Globe className={`${currentSize.icon} text-white drop-shadow-sm`} />
        </div>
      </motion.div>
      
      {currentSize.showText && (
        <div className="flex flex-col">
          <span className={`font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent ${currentSize.text} tracking-tight`}>
            SBG
          </span>
          {size === 'large' && (
            <span className="text-xs text-emerald-600 font-medium">
              Saudi Business Gate
            </span>
          )}
        </div>
      )}
    </div>
  );
}