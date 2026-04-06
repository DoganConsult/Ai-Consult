import { base44 } from '@/api/base44Client';

/**
 * Get personalized product recommendations based on visitor behavior
 */
export async function getPersonalizedRecommendations(sessionId) {
  try {
    if (!sessionId) return null;

    // Fetch session data
    const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
    if (sessions.length === 0) return null;

    const session = sessions[0];

    // Fetch all products
    const products = await base44.entities.Product.filter({ is_active: true });
    if (products.length === 0) return null;

    // Analyze visitor behavior
    const behavior = analyzeBehavior(session);

    // Match products to visitor interests
    const matchedProducts = matchProductsToInterests(products, session.interests || [], behavior);

    // Generate recommendations
    return {
      products: matchedProducts.slice(0, 3),
      nextActions: generateNextActions(session, behavior),
      urgency: behavior.urgency,
      userMessage: generateUserMessage(session, behavior)
    };
  } catch (error) {
    console.error('Recommendation engine error:', error);
    return null;
  }
}

/**
 * Get proactive chat suggestions based on visitor activity
 */
export async function getProactiveChatSuggestions(sessionId) {
  try {
    if (!sessionId) return [];

    const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
    if (sessions.length === 0) return [];

    const session = sessions[0];
    const suggestions = [];

    // Time spent trigger
    const timeMinutes = (session.time_spent_seconds || 0) / 60;
    if (timeMinutes > 3 && timeMinutes < 5 && (session.conversation_ids || []).length === 0) {
      suggestions.push({
        message: 'مرحباً! يبدو أنك مهتم بمنتجاتنا. هل تحتاج مساعدة في شيء معين؟',
        priority: 'medium',
        trigger: 'time_spent'
      });
    }

    // Product interest trigger
    const productsViewed = (session.products_viewed || []).length;
    if (productsViewed >= 2 && (session.inquiries_created || []).length === 0) {
      suggestions.push({
        message: 'شاهدت عدة منتجات! هل ترغب في مقارنة أو معرفة المزيد عن أي منها؟',
        priority: 'high',
        trigger: 'product_interest'
      });
    }

    // Return visitor trigger
    if ((session.visit_count || 1) >= 2 && (session.demos_requested || []).length === 0) {
      suggestions.push({
        message: 'نراك مرة أخرى! 👋 هل ترغب في جدولة عرض توضيحي مخصص؟',
        priority: 'high',
        trigger: 'return_visitor'
      });
    }

    // Sort by priority
    return suggestions.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });
  } catch (error) {
    console.error('Proactive suggestions error:', error);
    return [];
  }
}

// Helper functions

function analyzeBehavior(session) {
  const timeMinutes = (session.time_spent_seconds || 0) / 60;
  const pagesCount = (session.pages_visited || []).length;
  const productsViewed = (session.products_viewed || []).length;

  return {
    browsingIntensity: pagesCount > 5 ? 'high' : pagesCount > 2 ? 'medium' : 'low',
    productFocus: productsViewed > 3 ? 'high' : productsViewed > 1 ? 'medium' : 'low',
    engagement: timeMinutes > 5 ? 'high' : timeMinutes > 2 ? 'medium' : 'low',
    urgency: (session.demos_requested || []).length > 0 || (session.inquiries_created || []).length > 0 ? 'high' : 'medium'
  };
}

function matchProductsToInterests(products, interests, behavior) {
  if (interests.length === 0) {
    return products.slice(0, 3);
  }

  // Score products based on interest match
  const scored = products.map(product => {
    let score = 0;
    const text = `${product.name} ${product.description} ${(product.features || []).join(' ')}`.toLowerCase();

    interests.forEach(interest => {
      const keywords = interest.toLowerCase().split(' ');
      keywords.forEach(keyword => {
        if (text.includes(keyword)) score += 10;
      });
    });

    return { ...product, score };
  });

  // Sort by score and return top matches
  return scored.sort((a, b) => b.score - a.score);
}

function generateNextActions(session, behavior) {
  const actions = [];

  if (behavior.engagement === 'high' && (session.demos_requested || []).length === 0) {
    actions.push('جدولة عرض توضيحي');
  }

  if (behavior.productFocus === 'high' && (session.inquiries_created || []).length === 0) {
    actions.push('طلب عرض أسعار');
  }

  if ((session.products_viewed || []).length > 0) {
    actions.push('معرفة المزيد');
  }

  return actions;
}

function generateUserMessage(session, behavior) {
  const stage = session.journey_stage || 'explorer';

  const messages = {
    explorer: 'اكتشف حلول الذكاء الاصطناعي المناسبة لعملك',
    evaluator: 'مرحباً! لاحظنا اهتمامك. كيف يمكننا مساعدتك؟',
    decision_maker: 'دعنا نساعدك في اتخاذ القرار الصحيح',
    customer: 'مرحباً بك مجدداً! كيف يمكننا خدمتك؟'
  };

  return messages[stage] || messages.explorer;
}