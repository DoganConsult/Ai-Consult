import { Brain, Shield, Zap, Network, Cpu, Globe, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';

const technologyAreas = [
  {
    icon: Brain,
    title: 'AI & Machine Learning',
    timeline: '2025-2027',
    description: 'Advanced AI integration for intelligent automation, predictive analytics, and decision support systems.',
    technologies: ['Neural Networks', 'NLP', 'Computer Vision', 'Predictive Analytics'],
    color: 'from-purple-500 to-purple-700'
  },
  {
    icon: Shield,
    title: 'Security & Compliance',
    timeline: '2025-2028',
    description: 'Enterprise-grade security architecture with real-time threat detection and compliance automation.',
    technologies: ['Zero Trust', 'AI Security', 'Blockchain Audit', 'ISO Compliance'],
    color: 'from-blue-500 to-blue-700'
  },
  {
    icon: Network,
    title: 'Cloud Architecture',
    timeline: '2025-2027',
    description: 'Scalable cloud infrastructure with multi-region deployment and high-availability systems.',
    technologies: ['Microservices', 'Kubernetes', 'Edge Computing', 'CDN'],
    color: 'from-green-500 to-green-700'
  },
  {
    icon: Zap,
    title: 'Performance Optimization',
    timeline: '2025-2026',
    description: 'High-performance computing with advanced caching, load balancing, and real-time processing.',
    technologies: ['Distributed Cache', 'Load Balancer', 'Stream Processing', 'GPU Acceleration'],
    color: 'from-orange-500 to-orange-700'
  },
  {
    icon: Cpu,
    title: 'IoT & Edge Intelligence',
    timeline: '2026-2028',
    description: 'Smart IoT integration with edge computing for real-time data processing and automation.',
    technologies: ['Edge AI', 'IoT Sensors', 'Real-time Analytics', 'Smart Devices'],
    color: 'from-cyan-500 to-cyan-700'
  },
  {
    icon: Globe,
    title: 'Digital Transformation',
    timeline: '2025-2030',
    description: 'Complete digital transformation solutions aligned with Saudi Vision 2030 objectives.',
    technologies: ['API Gateway', 'Data Lakes', 'Business Intelligence', 'Workflow Automation'],
    color: 'from-pink-500 to-pink-700'
  }
];

const roadmapPhases = [
  {
    phase: 'Phase 1: Foundation',
    years: '2025-2026',
    focus: 'ERP Modernization & AI Integration',
    milestones: ['Platform Upgrade', 'AI Modules Deployment', 'Cloud Migration', 'Team Training']
  },
  {
    phase: 'Phase 2: Automation',
    years: '2026-2027',
    focus: 'Process Automation & Intelligence',
    milestones: ['Workflow Automation', 'Smart Analytics', 'Intelligent Workflows', 'IoT Integration']
  },
  {
    phase: 'Phase 3: Excellence',
    years: '2027-2030',
    focus: 'Autonomous Operations & Innovation',
    milestones: ['Predictive Systems', 'Self-healing Infrastructure', 'Advanced AI', 'Market Leadership']
  }
];

export function TechnologyVision() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-6" variant="secondary">
            Technology Vision 2025-2030
          </Badge>
          <h2 className="text-white mb-4">
            Leading the Future of Digital Innovation
          </h2>
          <p className="text-blue-100 text-lg max-w-3xl mx-auto">
            Advancing enterprise technology with cutting-edge solutions aligned with Saudi Vision 2030 objectives.
          </p>
        </div>

        {/* Technology Areas Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {technologyAreas.map((area, index) => (
            <Card 
              key={index}
              className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 group"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${area.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <area.icon className="w-7 h-7 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {area.timeline}
                  </Badge>
                </div>
                <CardTitle className="text-white">{area.title}</CardTitle>
                <CardDescription className="text-blue-200">
                  {area.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {area.technologies.map((tech, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-white/10 text-blue-100 rounded-full text-xs border border-white/20"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Transformation Timeline */}
        <div className="mb-16">
          <h3 className="text-white text-center mb-12">
            Smart Transformation Journey
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {roadmapPhases.map((phase, index) => (
              <div key={index} className="relative">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-white">{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-white">{phase.phase}</div>
                      <div className="text-blue-300 text-xs">{phase.years}</div>
                    </div>
                  </div>
                  <div className="text-blue-100 mb-4">
                    {phase.focus}
                  </div>
                  <ul className="space-y-2">
                    {phase.milestones.map((milestone, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-white/70 text-xs">
                        <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{milestone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Excellence Showcase */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg border border-white/10 rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 mb-6">
                <Cpu className="w-5 h-5 text-blue-300" />
                <span className="text-white">Technical Excellence</span>
              </div>
              <h3 className="text-white mb-4">
                Enterprise-Grade Technology Stack
                <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Built for Scale & Performance
                </span>
              </h3>
              <p className="text-blue-100 mb-6 leading-relaxed">
                Our infrastructure delivers enterprise-level reliability, security, and performance 
                with cutting-edge technology solutions designed for the demands of modern business.
              </p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <span className="text-white">High-availability distributed architecture</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <span className="text-white">Real-time data processing & analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <span className="text-white">AI-powered intelligent automation</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <span className="text-white">Multi-layer security & compliance</span>
                </li>
              </ul>
            </div>
            
            {/* Technology Visualization */}
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 p-8 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* Central Core */}
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center animate-pulse">
                    <Cpu className="w-12 h-12 text-white" />
                  </div>
                  
                  {/* Orbiting Tech Elements */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-blue-300" />
                  </div>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-green-300" />
                  </div>
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <Network className="w-8 h-8 text-purple-300" />
                  </div>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-orange-300" />
                  </div>
                  
                  {/* Connection Lines */}
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
                    <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                    <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                    <line x1="50%" y1="50%" x2="20%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                    <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Future Vision */}
        <div className="text-center mt-16">
          <h3 className="text-white mb-4">
            Building the Future of Saudi Technology
          </h3>
          <p className="text-blue-200 max-w-2xl mx-auto">
            Partner with us to navigate the future of smart technology and digital innovation, 
            ensuring your business stays ahead in the Saudi market for the next 5+ years and beyond.
          </p>
        </div>
      </div>
    </section>
  );
}