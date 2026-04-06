import { Star, TrendingUp, CheckCircle, BarChart3, Zap, Target, FileText, Image } from 'lucide-react';

const autonomousInsights = [
  {
    icon: Zap,
    title: 'Autonomous Workflow Optimization',
    metric: '87% Process Automation',
    story: 'A major enterprise transformed their manual approval processes into intelligent autonomous workflows. The system now makes 10,000+ decisions daily without human intervention, reducing processing time from 48 hours to 15 minutes.',
    valueMetrics: [
      { label: 'Time Saved', value: '95%' },
      { label: 'Error Reduction', value: '99.2%' },
      { label: 'Cost Efficiency', value: '$2.4M/year' }
    ],
    color: 'from-green-500 to-green-700',
    visualSource: 'Saudi Business Gate Analytics',
    referenceType: 'Performance Metrics Report'
  },
  {
    icon: Target,
    title: 'AI-Driven Decision Making',
    metric: '2,500 Decisions/Hour',
    story: 'An energy sector client implemented our autonomous decision engine. The system analyzes real-time data from 500+ sources, makes predictive decisions, and automatically adjusts operations based on market conditions and compliance requirements.',
    valueMetrics: [
      { label: 'Revenue Impact', value: '+32%' },
      { label: 'Response Time', value: '< 2 sec' },
      { label: 'Accuracy Rate', value: '98.7%' }
    ],
    color: 'from-blue-500 to-blue-700',
    visualSource: 'Shahin AI Compliance Engine',
    referenceType: 'Decision Analytics Dashboard'
  },
  {
    icon: CheckCircle,
    title: 'Autonomous Submission System',
    metric: '50K+ Auto-Submissions',
    story: 'A government contractor automated their compliance submission process. Documents are now generated, validated, and submitted automatically with AI-powered quality checks, reducing submission time from weeks to hours.',
    valueMetrics: [
      { label: 'Compliance Rate', value: '100%' },
      { label: 'Processing Speed', value: '48x faster' },
      { label: 'Staff Hours Saved', value: '15,000/year' }
    ],
    color: 'from-orange-500 to-orange-700',
    visualSource: 'DoganLab Automation Reports',
    referenceType: 'Submission Tracking System'
  },
  {
    icon: BarChart3,
    title: 'Command Control Dashboard',
    metric: 'Real-Time Ecosystem Management',
    story: 'A manufacturing client gained complete visibility into operations through DoganHub command center. The system continuously monitors customer engagement, partner collaboration, and ecosystem health with predictive insights.',
    valueMetrics: [
      { label: 'Engagement Rate', value: '99.8%' },
      { label: 'Partner Satisfaction', value: '96%' },
      { label: 'ROI Achievement', value: '340%' }
    ],
    color: 'from-purple-500 to-purple-700',
    visualSource: 'DoganHub Command Center',
    referenceType: 'Ecosystem Analytics Platform'
  }
];

const performanceStories = [
  {
    title: 'From Chaos to Clarity',
    challenge: 'Enterprise drowning in 10,000+ daily transactions with no visibility',
    solution: 'Implemented Saudi Business Gate autonomous workflow with real-time performance tracking',
    outcome: 'Complete operational visibility, 87% reduction in manual work, $3.2M annual savings',
    rating: 5,
    visualRef: 'Workflow Automation Charts',
    platform: 'Saudi Business Gate'
  },
  {
    title: 'Compliance Made Simple',
    challenge: 'Complex regulatory requirements causing delays and penalties',
    solution: 'Deployed Shahin AI compliance clarifier with autonomous submission workflows',
    outcome: 'Zero compliance violations, 95% faster submissions, eliminated penalty costs',
    rating: 5,
    visualRef: 'Compliance Tracking Reports',
    platform: 'Shahin AI'
  },
  {
    title: 'Innovation at Scale',
    challenge: 'Unable to test new ideas without disrupting production systems',
    solution: 'Created isolated sandbox environments in DoganLab for rapid prototyping',
    outcome: '45 innovations deployed, 3x faster time-to-market, $1.8M in new revenue',
    rating: 5,
    visualRef: 'Sandbox Testing Metrics',
    platform: 'DoganLab'
  },
  {
    title: 'Ecosystem Excellence',
    challenge: 'Fragmented customer and partner management across multiple systems',
    solution: 'Deployed DoganHub Command Control Center for unified ecosystem management',
    outcome: 'Unified operations, 2,500+ automated decisions daily, 32% revenue growth',
    rating: 5,
    visualRef: 'Command Center Dashboard',
    platform: 'DoganHub'
  }
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-4">
            <span className="text-blue-600">Real Value, Real Results</span>
          </div>
          <h2 className="text-gray-900 mb-4">
            Autonomous Intelligence Delivering Measurable Impact
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Stories of transformation through autonomous workflows, intelligent decision-making, 
            and performance insights that drive real business value.
          </p>
        </div>

        {/* Autonomous Insights Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {autonomousInsights.map((insight, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-14 h-14 bg-gradient-to-br ${insight.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <insight.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-1">{insight.title}</h3>
                  <p className="text-blue-600">{insight.metric}</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                {insight.story}
              </p>
              
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 mb-4">
                {insight.valueMetrics.map((metric, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-blue-600 mb-1">{metric.value}</div>
                    <div className="text-gray-500 text-xs">{metric.label}</div>
                  </div>
                ))}
              </div>

              {/* Visual Reference */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <FileText className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Data Source:</div>
                  <div className="text-xs text-gray-700">{insight.visualSource}</div>
                </div>
                <div className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                  {insight.referenceType}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Stories */}
        <div className="mb-16">
          <h3 className="text-gray-900 text-center mb-8">
            Transformation Stories: Before & After
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {performanceStories.map((story, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-1">
                    {[...Array(story.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {story.platform}
                  </div>
                </div>
                
                <h4 className="text-gray-900 mb-4">{story.title}</h4>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Challenge</div>
                      <div className="text-gray-700 text-sm">{story.challenge}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Solution</div>
                      <div className="text-gray-700 text-sm">{story.solution}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Outcome</div>
                      <div className="text-gray-900 text-sm">{story.outcome}</div>
                    </div>
                  </div>
                </div>

                {/* Visual Reference */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Image className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Visual Reference:</span>
                  <span className="text-xs text-gray-700">{story.visualRef}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Dashboard Preview */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
                <TrendingUp className="w-4 h-4" />
                <span>Live Performance Insights</span>
              </div>
              <h3 className="text-white mb-4">
                See Your Performance in Real-Time
              </h3>
              <p className="text-blue-100 mb-6">
                Our autonomous intelligence platform provides instant visibility into every aspect 
                of your business. No more waiting for reports - see what's happening now and what's 
                coming next through predictive analytics.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>Real-time KPI monitoring across all operations</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>Predictive alerts before issues impact performance</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>Automated recommendations for optimization</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>Custom dashboards tailored to your role</span>
                </li>
              </ul>
              <button className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                Request Demo Dashboard
              </button>
            </div>
            
            {/* Dashboard Mockup */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-blue-200 text-xs mb-2">Autonomous Decisions</div>
                <div className="text-white text-2xl mb-1">2,847</div>
                <div className="flex items-center gap-1 text-green-300 text-xs">
                  <TrendingUp className="w-3 h-3" />
                  <span>+23% today</span>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-blue-200 text-xs mb-2">Process Efficiency</div>
                <div className="text-white text-2xl mb-1">94.2%</div>
                <div className="flex items-center gap-1 text-green-300 text-xs">
                  <TrendingUp className="w-3 h-3" />
                  <span>+5.3% this week</span>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-blue-200 text-xs mb-2">Cost Savings</div>
                <div className="text-white text-2xl mb-1">$847K</div>
                <div className="flex items-center gap-1 text-green-300 text-xs">
                  <TrendingUp className="w-3 h-3" />
                  <span>This month</span>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-blue-200 text-xs mb-2">Compliance Rate</div>
                <div className="text-white text-2xl mb-1">100%</div>
                <div className="flex items-center gap-1 text-green-300 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  <span>45 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}