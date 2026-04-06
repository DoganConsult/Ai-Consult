import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Target, Zap, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function SmartRecommendations() {
  const [recommendations, setRecommendations] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const sessionId = localStorage.getItem('sbg_session_id');
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      // Get user session data
      const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
      if (sessions.length === 0) {
        setIsLoading(false);
        return;
      }

      const session = sessions[0];
      const productsViewed = session.products_viewed || [];
      const interests = session.interests || [];
      const journeyStage = session.journey_stage || 'explorer';

      // Get all products
      const allProducts = await base44.entities.Product.list();
      
      // Build AI recommendation prompt
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `أنت نظام توصيات ذكي. قم بتحليل بيانات المستخدم التالية وقدم توصيات مخصصة:

بيانات المستخدم:
- عدد الزيارات: ${session.visit_count}
- الوقت المستغرق: ${Math.floor((session.time_spent_seconds || 0) / 60)} دقيقة
- المنتجات المشاهدة: ${productsViewed.length}
- الاهتمامات: ${interests.join(', ') || 'غير محدد'}
- مرحلة الرحلة: ${journeyStage}
- نقاط الجودة: ${session.lead_score || 0}/100

المنتجات المتاحة:
${allProducts.map(p => `- ${p.name}: ${p.description}`).join('\n')}

قدم توصيات شخصية تتضمن:
1. أفضل 3 منتجات موصى بها مع السبب
2. الخطوات التالية المقترحة
3. رسالة تحفيزية شخصية
4. مستوى الأولوية (high/medium/low)`,
        response_json_schema: {
          type: 'object',
          properties: {
            recommended_products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product_name: { type: 'string' },
                  reason: { type: 'string' },
                  match_score: { type: 'number' }
                }
              }
            },
            next_actions: { type: 'array', items: { type: 'string' } },
            personalized_message: { type: 'string' },
            priority: { type: 'string' },
            user_segment: { type: 'string' }
          }
        }
      });

      setRecommendations(response);
      setUserProfile(session);
    } catch (error) {
      console.error('Recommendations error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 text-center">
        <Sparkles className="w-8 h-8 text-emerald-500 animate-pulse mx-auto mb-2" />
        <p className="text-slate-600">جاري تحليل تفضيلاتك...</p>
      </Card>
    );
  }

  if (!recommendations) {
    return null;
  }

  const priorityConfig = {
    high: { color: 'bg-red-500', label: 'عاجل', icon: Zap },
    medium: { color: 'bg-yellow-500', label: 'متوسط', icon: TrendingUp },
    low: { color: 'bg-blue-500', label: 'عادي', icon: Target }
  };

  const priority = priorityConfig[recommendations.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <h3 className="text-xl font-bold text-slate-900">توصيات ذكية لك</h3>
          </div>
          <Badge className={`${priority.color} text-white flex items-center gap-1`}>
            <PriorityIcon className="w-3 h-3" />
            {priority.label}
          </Badge>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 border border-emerald-200">
          <p className="text-slate-700 leading-relaxed">{recommendations.personalized_message}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-100 rounded-lg p-3">
            <div className="text-xs text-slate-600 mb-1">التصنيف</div>
            <div className="font-bold text-emerald-700">{recommendations.user_segment}</div>
          </div>
          <div className="bg-teal-100 rounded-lg p-3">
            <div className="text-xs text-slate-600 mb-1">نقاط الجودة</div>
            <div className="font-bold text-teal-700">{userProfile?.lead_score || 0}/100</div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <h4 className="font-semibold text-slate-900">المنتجات الموصى بها:</h4>
          {recommendations.recommended_products.map((product, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-lg p-4 border border-emerald-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-semibold text-slate-900">{product.product_name}</h5>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {Math.round(product.match_score)}% مطابقة
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mb-3">{product.reason}</p>
              <Link to={createPageUrl('Search') + `?q=${encodeURIComponent(product.product_name)}`}>
                <Button size="sm" variant="outline" className="w-full group">
                  اكتشف المزيد
                  <ArrowRight className="w-3 h-3 mr-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-4 border border-emerald-200">
          <h4 className="font-semibold text-slate-900 mb-2">الخطوات التالية المقترحة:</h4>
          <ul className="space-y-2">
            {recommendations.next_actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">{idx + 1}.</span>
                <span className="text-slate-700">{action}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          onClick={loadRecommendations}
          variant="outline"
          className="w-full mt-4"
        >
          تحديث التوصيات
        </Button>
      </Card>
    </motion.div>
  );
}