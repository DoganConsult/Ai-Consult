import { Code, Cloud, Database, Lock, Zap, Users, ArrowRight } from 'lucide-react';

const services = [
  {
    icon: Code,
    title: 'Custom Development',
    description: 'Tailored software solutions built to meet your specific business requirements.'
  },
  {
    icon: Cloud,
    title: 'Cloud Migration',
    description: 'Seamless migration to cloud infrastructure with minimal downtime and maximum efficiency.'
  },
  {
    icon: Database,
    title: 'Data Integration',
    description: 'Connect all your systems with our robust integration services using enterprise-grade architecture.'
  },
  {
    icon: Lock,
    title: 'Security Audit',
    description: 'Comprehensive security assessment and implementation of best practices.'
  },
  {
    icon: Zap,
    title: 'Performance Optimization',
    description: 'Optimize your systems for peak performance and scalability.'
  },
  {
    icon: Users,
    title: 'Consulting & Training',
    description: 'Expert guidance and training programs for your team.'
  }
];

export function Services() {
  return (
    <section id="services" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 mb-4 shadow-sm">
            <span className="text-gray-900">Professional Services</span>
          </div>
          <h2 className="text-gray-900 mb-4">
            Enterprise-Grade Consulting Services
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Expert engineering and consulting services to accelerate your digital transformation journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <service.icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-gray-900 mb-3">{service.title}</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
              
              <button className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2">
                Learn More
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Infrastructure Highlight */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-white mb-4">
                Enterprise Infrastructure
              </h3>
              <p className="text-blue-100 mb-6 leading-relaxed">
                Built on robust enterprise technology stack with advanced security, 
                high-performance databases, intelligent caching, and secure payment processing.
              </p>
              <button className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-lg">
                View Architecture
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Database className="w-8 h-8 text-blue-200 mb-2" />
                <div className="text-white">Database</div>
                <div className="text-blue-200 text-sm">Enterprise Grade</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Zap className="w-8 h-8 text-blue-200 mb-2" />
                <div className="text-white">Fast Cache</div>
                <div className="text-blue-200 text-sm">Real-time</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Lock className="w-8 h-8 text-blue-200 mb-2" />
                <div className="text-white">Secure Gateway</div>
                <div className="text-blue-200 text-sm">Protected</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Cloud className="w-8 h-8 text-blue-200 mb-2" />
                <div className="text-white">Load Balancer</div>
                <div className="text-blue-200 text-sm">Scalable</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
