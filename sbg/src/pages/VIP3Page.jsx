import React, { useEffect } from 'react';
import { createPageUrl } from '@/utils';

export default function VIP3Page() {
  useEffect(() => {
    const user = localStorage.getItem('demo_user');
    if (user !== 'VIP3') {
      window.location.href = createPageUrl('DemoLogin');
    }
  }, []);

  return (
    <div className="w-full h-screen">
      <iframe
        src="http://20.174.194.240:8080/app"
        className="w-full h-full border-0"
        title="VIP3 Demo"
      />
    </div>
  );
}