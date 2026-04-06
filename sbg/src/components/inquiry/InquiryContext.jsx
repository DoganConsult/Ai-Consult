import React, { createContext, useContext, useState, useEffect } from 'react';

const InquiryContext = createContext();

const STORAGE_KEY = 'sbg_inquiry_list';

export function InquiryProvider({ children }) {
  const [inquiryItems, setInquiryItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiryItems));
  }, [inquiryItems]);

  const addToInquiry = (product) => {
    setInquiryItems(prev => {
      if (prev.some(item => item.id === product.id)) return prev;
      return [...prev, { 
        id: product.id, 
        name: product.name, 
        price: product.price,
        icon: product.icon,
        gradient: product.gradient,
        addedAt: new Date().toISOString()
      }];
    });
  };

  const removeFromInquiry = (productId) => {
    setInquiryItems(prev => prev.filter(item => item.id !== productId));
  };

  const isInInquiry = (productId) => {
    return inquiryItems.some(item => item.id === productId);
  };

  const clearInquiry = () => {
    setInquiryItems([]);
  };

  const itemCount = inquiryItems.length;

  return (
    <InquiryContext.Provider value={{ 
      inquiryItems, 
      addToInquiry, 
      removeFromInquiry, 
      isInInquiry, 
      clearInquiry,
      itemCount 
    }}>
      {children}
    </InquiryContext.Provider>
  );
}

export function useInquiry() {
  const context = useContext(InquiryContext);
  if (!context) {
    throw new Error('useInquiry must be used within InquiryProvider');
  }
  return context;
}