import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, Users, Clock, Target, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function VisitorProblems() {
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analyzeVisitorProblems();
  }, []);

  const analyzeVisitorProblems = async () => {
    try {
      const sessions = await base44.entities.VisitorSession.list();
      const products = await base44.entities.Product.list();
      const inquiries = await base44.entities.Inquiry.list();
      const demos = await base44.entities.DemoRequest.list();
      
      const analysis = {
        // Problem 1: Low engagement / High bounce rate
        lowEngagement: sessions.filter(s => 
          (s.time_spent_seconds || 0) < 120 && // Less than 2 minutes
          (s.pages_visited?.length || 0) <= 1
        ).length,
        
        // Problem 2: Product confusion (viewing many but not converting)
        productConfusion: sessions.filter(s => 
          (s.products_viewed?.length || 0) >= 3 &&
          (s.inquiries_created?.length || 0) === 0 &&
          (s.demos_requested?.length || 0) === 0
        ).length,
        
        // Problem 3: Conversion drop-off
        conversionDropOff: sessions.filter(s => 
          s.journey_stage === 'evaluator' &&
          (s.inquiries_created?.length || 0) === 0 &&
          (s.visit_count || 0) >= 2
        ).length,
        
        // Problem 4: Navigation issues
        navigationIssues: sessions.filter(s => {
          const pages = s.pages_visited || [];
          return pages.length >= 5 && 
                 new Set(pages.map(p => p.page)).size < pages.length * 0.6; // Revisiting same pages
        }).length,
        
        // Problem 5: Lack of demo requests
        lowDemoRequests: ((demos.length / Math.max(sessions.length, 1)) * 100) < 5 // Less than 5% conversion
      };
      
      const totalSessions = sessions.length || 1;
      
      const problemsList = [
        {
          id: 'low_engagement',
          title: 'High Bounce Rate',
          description: 'Visitors leaving too quickly without exploring',
          affected: analysis.lowEngagement,
          percentage: Math.round((analysis.lowEngagement / totalSessions) * 100),
          severity: analysis.lowEngagement / totalSessions > 0.5 ? 'high' : 'medium',
          icon: Clock,
          solutions: [
            'Improve hero section clarity',
            'Add immediate value propositions',
            'Reduce initial load time',
            'Show proactive chat earlier'
          ]
        },
        {
          id: 'product_confusion',
          title: 'Product Selection Confusion',
          description: 'Visitors comparing products but not engaging',
          affected: analysis.productConfusion,
          percentage: Math.round((analysis.productConfusion / totalSessions) * 100),
          severity: analysis.productConfusion / totalSessions > 0.3 ? 'high' : 'medium',
          icon: Target,
          solutions: [
            'Add product comparison tool',
            'Simplify product categories',
            'Provide clearer CTAs',
            'Offer personalized recommendations'
          ]
        },
        {
          id: 'conversion_drop',
          title: 'Conversion Drop-off',
          description: 'Evaluators not taking action despite interest',
          affected: analysis.conversionDropOff,
          percentage: Math.round((analysis.conversionDropOff / totalSessions) * 100),
          severity: analysis.conversionDropOff / totalSessions > 0.25 ? 'high' : 'medium',
          icon: TrendingUp,
          solutions: [
            'Reduce friction in inquiry process',
            'Add trust signals (testimonials)',
            'Offer limited-time incentives',
            'Implement exit-intent offers'
          ]
        },
        {
          id: 'navigation',
          title: 'Navigation Friction',
          description: 'Users repeatedly visiting same pages',
          affected: analysis.navigationIssues,
          percentage: Math.round((analysis.navigationIssues / totalSessions) * 100),
          severity: analysis.navigationIssues / totalSessions > 0.2 ? 'medium' : 'low',
          icon: AlertCircle,
          solutions: [
            'Improve site navigation',
            'Add breadcrumbs',
            'Better internal linking',
            'Clear page hierarchy'
          ]
        },
        {
          id: 'low_demos',
          title: 'Low Demo Conversion',
          description: 'Few visitors requesting demos',
          affected: demos.length,
          percentage: Math.round((demos.length / totalSessions) * 100),
          severity: analysis.lowDemoRequests ? 'high' : 'low',
          icon: Zap,
          solutions: [
            'Make demo CTA more prominent',
            'Reduce demo request form fields',
            'Add demo preview video',
            'Offer instant chat demos'
          ]
        }
      ];
      
      // Sort by severity and affected count
      const sortedProblems = problemsList
        .sort((a, b) => {
          const severityWeight = { high: 3, medium: 2, low: 1 };
          return (severityWeight[b.severity] * b.affected) - (severityWeight[a.severity] * a.affected);
        })
        .slice(0, 3);
      
      setProblems(sortedProblems);
    } catch (error) {
      console.error('Problem analysis error:', error);
      // Fallback to generic problems
      setProblems(getDefaultProblems());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultProblems = () => [
    {
      id: 'engagement',
      title: 'Visitor Engagement',
      description: 'Users need more compelling reasons to stay',
      affected: 0,
      percentage: 0,
      severity: 'medium',
      icon: Users,
      solutions: ['Improve content quality', 'Add interactive elements', 'Personalize experience']
    },
    {
      id: 'clarity',
      title: 'Value Proposition Clarity',
      description: 'Messaging could be clearer',
      affected: 0,
      percentage: 0,
      severity: 'high',
      icon: Target,
      solutions: ['Simplify messaging', 'Add use cases', 'Highlight benefits']
    },
    {
      id: 'conversion',
      title: 'Conversion Optimization',
      description: 'Path to action needs streamlining',
      affected: 0,
      percentage: 0,
      severity: 'high',
      icon: TrendingUp,
      solutions: ['Reduce form fields', 'Add social proof', 'Clarify CTAs']
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Top Visitor Problems
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Top 3 Visitor Problems
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          AI-analyzed issues affecting your visitors based on behavior patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {problems.map((problem, index) => {
          const Icon = problem.icon;
          return (
            <motion.div
              key={problem.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">
                      #{index + 1} {problem.title}
                    </h3>
                    <Badge className={`text-xs ${getSeverityColor(problem.severity)}`}>
                      {problem.severity}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-3">
                    {problem.description}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {problem.affected} affected
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {problem.percentage}% of visitors
                    </span>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-slate-700 mb-2">
                      💡 Recommended Solutions:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {problem.solutions.map((solution, i) => (
                        <span
                          key={i}
                          className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200"
                        >
                          {solution}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}