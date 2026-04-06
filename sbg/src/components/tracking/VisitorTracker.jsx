import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { sessionQueue } from './sessionQueue';

export default function VisitorTracker() {
  const location = useLocation();
  const sessionIdRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Get or create session ID
  useEffect(() => {
    let sessionId = localStorage.getItem('sbg_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sbg_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;

    // Initialize or update session
    initSession(sessionId);

    // Track time on page
    const interval = setInterval(() => {
      trackTimeSpent(sessionId);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Track page views
  useEffect(() => {
    if (sessionIdRef.current) {
      trackPageView(sessionIdRef.current, location.pathname);
    }
  }, [location.pathname]);

  const initSession = async (sessionId) => {
    try {
      const isAuth = await base44.auth.isAuthenticated().catch(() => false);
      const user = isAuth ? await base44.auth.me().catch(() => null) : null;
      
      // Check if session exists
      const existing = await base44.entities.VisitorSession.filter({ session_id: sessionId });
      
      if (existing.length > 0) {
        // Update existing session
        await base44.entities.VisitorSession.update(existing[0].id, {
          last_visit: new Date().toISOString(),
          visit_count: (existing[0].visit_count || 1) + 1,
          visitor_email: user?.email || existing[0].visitor_email
        });
      } else {
        // Create new session
        const urlParams = new URLSearchParams(window.location.search);
        await base44.entities.VisitorSession.create({
          session_id: sessionId,
          visitor_email: user?.email,
          first_visit: new Date().toISOString(),
          last_visit: new Date().toISOString(),
          visit_count: 1,
          pages_visited: [],
          products_viewed: [],
          conversation_ids: [],
          inquiries_created: [],
          demos_requested: [],
          interests: [],
          device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          referrer: document.referrer,
          utm_source: urlParams.get('utm_source'),
          utm_campaign: urlParams.get('utm_campaign')
        });
      }
    } catch (error) {
      console.error('Session init error:', error);
    }
  };

  const trackPageView = async (sessionId, page) => {
    try {
      const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
      if (sessions.length > 0) {
        const session = sessions[0];
        const pages = Array.isArray(session.pages_visited) ? [...session.pages_visited] : [];
        const pageEntry = `${page}|${new Date().toISOString()}`;
        pages.push(pageEntry);
        
        await sessionQueue.enqueue(sessionId, {
          pages_visited: pages.slice(-50),
          last_visit: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Page tracking error:', error);
    }
  };

  const trackTimeSpent = async (sessionId) => {
    try {
      const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
      if (sessions.length > 0) {
        const session = sessions[0];
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        // Update time and calculate AI insights
        const updatedData = {
          time_spent_seconds: (session.time_spent_seconds || 0) + timeSpent
        };
        
        // Auto-update journey stage and lead score based on behavior
        try {
          const insights = calculateBehaviorInsights(session);
          if (insights.journey_stage !== session.journey_stage) {
            updatedData.journey_stage = insights.journey_stage;
          }
          if (insights.lead_score !== session.lead_score) {
            updatedData.lead_score = insights.lead_score;
          }
          if (insights.interests && insights.interests.length > 0) {
            updatedData.interests = [...new Set([...(session.interests || []), ...insights.interests])];
          }
        } catch (insightError) {
          console.error('Behavior insights error:', insightError);
        }
        
        await sessionQueue.enqueue(sessionId, updatedData);
        
        startTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error('Time tracking error:', error);
    }
  };

  // AI-driven behavior analysis
  const calculateBehaviorInsights = (session) => {
    const totalPages = (session.pages_visited || []).length;
    const productsViewed = (session.products_viewed || []).length;
    const timeMinutes = (session.time_spent_seconds || 0) / 60;
    const visitCount = session.visit_count || 1;
    
    let journey_stage = session.journey_stage || 'explorer';
    let lead_score = session.lead_score || 0;
    let interests = [];
    
    // Analyze pages for interests
    const pages = session.pages_visited || [];
    const pageTypes = pages.map(p => {
      const pagePath = typeof p === 'string' ? p.split('|')[0] : (p.page || '');
      return pagePath.toLowerCase();
    });
    if (pageTypes.some(p => p.includes('product'))) interests.push('Products');
    if (pageTypes.some(p => p.includes('demo'))) interests.push('Demo');
    if (pageTypes.some(p => p.includes('agent') || p.includes('autonomous'))) interests.push('AI Agents');
    if (pageTypes.some(p => p.includes('erp'))) interests.push('ERP Integration');
    if (pageTypes.some(p => p.includes('approval') || p.includes('workflow'))) interests.push('Workflow Automation');
    
    // Calculate lead score
    lead_score = Math.min(100, 
      (productsViewed * 15) + 
      (totalPages * 5) + 
      (visitCount * 10) + 
      (Math.min(timeMinutes, 30) * 2) +
      ((session.inquiries_created?.length || 0) * 30) +
      ((session.demos_requested?.length || 0) * 40)
    );
    
    // Determine journey stage
    if ((session.demos_requested?.length || 0) > 0 || (session.inquiries_created?.length || 0) > 0) {
      journey_stage = 'decision_maker';
    } else if (productsViewed >= 3 || totalPages >= 5 || visitCount >= 2) {
      journey_stage = 'evaluator';
    } else if (totalPages >= 2 || timeMinutes >= 2) {
      journey_stage = 'explorer';
    }
    
    return { journey_stage, lead_score, interests };
  };

  return null;
}

// Helper function to track product views
export async function trackProductView(productId) {
  try {
    const sessionId = localStorage.getItem('sbg_session_id');
    if (!sessionId) return;

    const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
    if (sessions.length > 0) {
      const session = sessions[0];
      const products = session.products_viewed || [];
      if (!products.includes(productId)) {
        products.push(productId);
        await sessionQueue.enqueue(sessionId, {
          products_viewed: products
        });
      }
    }
  } catch (error) {
    console.error('Product tracking error:', error);
  }
}

// Helper to update journey stage
export async function updateJourneyStage(stage) {
  try {
    const sessionId = localStorage.getItem('sbg_session_id');
    if (!sessionId) return;

    const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
    if (sessions.length > 0) {
      await base44.entities.VisitorSession.update(sessions[0].id, {
        journey_stage: stage
      });
    }
  } catch (error) {
    console.error('Stage update error:', error);
  }
}