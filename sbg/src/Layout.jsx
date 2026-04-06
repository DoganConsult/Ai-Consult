import React, { Suspense, lazy, useState, useEffect } from 'react';
import { InquiryProvider } from '@/components/inquiry/InquiryContext';
import VisitorTracker from '@/components/tracking/VisitorTracker';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import { base44 } from '@/api/base44Client';
import { Toaster } from 'sonner';

// Lazy load ChatWidget for better initial load performance
const ChatWidget = lazy(() => import('@/components/chat/ChatWidget'));

export default function Layout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated()
      .then(isAuth => isAuth ? base44.auth.me() : null)
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return (
    <InquiryProvider>
      <Toaster position="top-right" richColors />
      <VisitorTracker />
      <NotificationSystem userId={user?.id} />
      {/* SEO Meta - handled by index.html but adding semantic structure */}
      <main id="main-content" role="main">
        {children}
      </main>
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </InquiryProvider>
  );
}