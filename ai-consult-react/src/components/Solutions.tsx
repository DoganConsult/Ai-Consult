import { motion } from 'framer-motion';
import { Shield, Lightbulb, FlaskConical, Users, Handshake, ArrowRight, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from './shared/constants';

const solutions = [
  {
    icon: Handshake,
    title: 'Saudi Business Gate',
    subtitle: 'Leading Tech Cooperation',
    description: 'Innovation platform leading new technology cooperation with innovators and pioneers. Gateway for business excellence in the Saudi market.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    gradient: 'from-blue-600 to-indigo-600',
    features: ['Tech Cooperation', 'Innovation Hub', 'Business Gateway'],
    route: ROUTES.saudiBusinessGate
  },
  {
    icon: Shield,
    title: 'Shahin AI',
    subtitle: 'Clarifier of Compliance',
    description: 'Advanced compliance management system ensuring adherence to regulations, risk assessment, and policy enforcement.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    gradient: 'from-emerald-500 to-green-600',
    features: ['Risk Management', 'Policy Automation', 'Compliance Tracking'],
    route: ROUTES.shahinAI
  },
  {
    icon: FlaskConical,
    title: 'DoganLab',
    subtitle: 'Innovation Laboratory',
    description: 'Collaborative innovation laboratory with sandbox environments, demo capabilities, and rapid prototyping tools.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    gradient: 'from-purple-600 to-pink-600',
    features: ['Sandbox Testing', 'Demo Environment', 'Rapid Development'],
    route: ROUTES.doganLab
  },
  {
    icon: LayoutGrid,
    title: 'DoganHub',
    subtitle: 'Command Control Center',
    description: 'Central command center for customer engagement, partner collaboration, and ecosystem management. Orchestrating all business operations.',
    color: 'text-slate-800',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    gradient: 'from-slate-700 to-black',
    features: ['Customer Engagement', 'Partner Management', 'Ecosystem Control'],
    route: ROUTES.doganHub
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Solutions() {
  return (
    <section id="solutions" className="py-24 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gray-50/50 skew-x-12 transform origin-top-right -z-10" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-gray-600 font-medium text-sm">Integrated Ecosystem</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight"
          >
            Four Platforms. <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">One Vision.</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Seamlessly integrated platforms working together through a unified core to deliver end-to-end business transformation.
          </motion.p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 gap-8"
        >
          {solutions.map((solution, index) => (
            <motion.div key={index} variants={item}>
              <Link to={solution.route} className="block h-full">
                <div className="group h-full relative bg-white rounded-3xl p-1 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                  {/* Gradient Border Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${solution.gradient} rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  <div className="relative h-full bg-white rounded-[22px] p-8 border border-gray-100 overflow-hidden">
                    {/* Hover Glow */}
                    <div className={`absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br ${solution.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none`} />

                    <div className="flex items-start gap-6 relative z-10">
                      <div className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 
                        bg-gradient-to-br ${solution.gradient} text-white shadow-lg
                        group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500
                      `}>
                        <solution.icon className="w-8 h-8" />
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                              {solution.title}
                            </h3>
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className={`text-sm font-medium bg-gradient-to-r ${solution.gradient} bg-clip-text text-transparent`}>
                            {solution.subtitle}
                          </p>
                        </div>
                        
                        <p className="text-gray-500 leading-relaxed text-sm">
                          {solution.description}
                        </p>
    
                        <div className="flex flex-wrap gap-2 pt-2">
                          {solution.features.map((feature, idx) => (
                            <span 
                              key={idx}
                              className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-100 group-hover:border-gray-200 transition-colors"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Integration Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-block relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 blur opacity-20 group-hover:opacity-40 transition-opacity rounded-2xl" />
            <div className="relative px-8 py-4 bg-white rounded-2xl border border-gray-100 shadow-lg flex items-center gap-4">
              <div className="flex -space-x-3">
                {solutions.map((s, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                ))}
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <p className="text-sm font-medium text-gray-700">
                Unified by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold">ERPNext</span> Core
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
