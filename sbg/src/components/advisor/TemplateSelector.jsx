import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Scale, Briefcase, Shield, Search, 
  FileCheck, Gavel, TrendingUp, Users, Building2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const templates = [
  {
    id: 'contract-review',
    name: 'Contract Review',
    description: 'Analyze and review contracts for risks and improvements',
    icon: FileCheck,
    category: 'legal',
    prompt: 'Please review this contract and identify: 1) Key terms and obligations 2) Potential risks or red flags 3) Missing clauses 4) Recommendations for improvement'
  },
  {
    id: 'case-research',
    name: 'Case Law Research',
    description: 'Find relevant case law and precedents',
    icon: Gavel,
    category: 'legal',
    prompt: 'Help me research case law related to: [Your topic]. Include relevant precedents, key rulings, and how they might apply to my situation.'
  },
  {
    id: 'compliance-check',
    name: 'Compliance Checker',
    description: 'Check regulatory compliance requirements',
    icon: Shield,
    category: 'legal',
    prompt: 'What are the key compliance requirements for [industry/regulation]? Please provide a checklist and identify potential compliance gaps.'
  },
  {
    id: 'legal-memo',
    name: 'Legal Memo Draft',
    description: 'Draft a professional legal memorandum',
    icon: FileText,
    category: 'legal',
    prompt: 'Help me draft a legal memorandum on the following issue: [Your issue]. Include the question presented, brief answer, facts, analysis, and conclusion.'
  },
  {
    id: 'business-plan',
    name: 'Business Strategy',
    description: 'Develop business strategies and plans',
    icon: TrendingUp,
    category: 'business',
    prompt: 'Help me develop a business strategy for [your goal]. Include market analysis, competitive positioning, and actionable steps.'
  },
  {
    id: 'client-acquisition',
    name: 'Client Acquisition',
    description: 'Strategies for growing your client base',
    icon: Users,
    category: 'business',
    prompt: 'What are the most effective client acquisition strategies for a [type of practice/business]? Include both online and offline methods.'
  },
  {
    id: 'firm-operations',
    name: 'Firm Operations',
    description: 'Optimize your practice or business operations',
    icon: Building2,
    category: 'business',
    prompt: 'How can I improve the operational efficiency of my [law firm/business]? Focus on workflow optimization, technology, and team productivity.'
  },
  {
    id: 'market-research',
    name: 'Market Research',
    description: 'Research market trends and opportunities',
    icon: Search,
    category: 'business',
    prompt: 'Provide market research on [your industry/area]. Include trends, opportunities, threats, and competitive landscape.'
  }
];

export default function TemplateSelector({ onSelect, mode }) {
  const filteredTemplates = templates.filter(t => t.category === mode);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {mode === 'legal' ? (
          <Scale className="w-5 h-5 text-blue-600" />
        ) : (
          <Briefcase className="w-5 h-5 text-amber-600" />
        )}
        <h3 className="font-semibold text-slate-900">
          {mode === 'legal' ? 'Legal Templates' : 'Business Templates'}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredTemplates.map((template, index) => {
          const Icon = template.icon;
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-200 group"
                onClick={() => onSelect(template.prompt)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      mode === 'legal' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-900">{template.name}</h4>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}