import React from 'react';
import { Zap, Upload, Brain, Scale, Briefcase, MessageSquare, Sparkles } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const features = [
  {
    icon: Brain,
    title: "Autonomous AI Engine",
    description: "Self-learning AI that adapts to your practice style and preferences over time",
    gradient: "from-purple-500 to-indigo-500"
  },
  {
    icon: Scale,
    title: "Legal Research Mode",
    description: "Deep case law analysis, statutory interpretation, and precedent research",
    gradient: "from-blue-500 to-sky-500"
  },
  {
    icon: Briefcase,
    title: "Business Strategy Mode",
    description: "Market insights, competitive analysis, and growth strategies on demand",
    gradient: "from-amber-500 to-orange-500"
  },
  {
    icon: Upload,
    title: "Document Intelligence",
    description: "Upload contracts, briefs, or documents for instant AI-powered analysis",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: MessageSquare,
    title: "Smart Conversations",
    description: "Context-aware chat with intelligent follow-up suggestions",
    gradient: "from-pink-500 to-rose-500"
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get professional-grade analysis in seconds, not hours",
    gradient: "from-yellow-500 to-amber-500"
  }
];

export default function Features() {
  return (
    <section className="py-20">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Powered by Advanced AI
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Built for <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Professionals</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Every feature designed to amplify your expertise and accelerate your work.
          </p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="group h-full border-slate-200 hover:border-transparent transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              <CardContent className="p-6 relative">
                <div className="flex flex-col gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}