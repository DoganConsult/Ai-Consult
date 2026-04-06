import { Users, Handshake, Globe, Award, TrendingUp, CheckCircle } from 'lucide-react';

const partners = [
  {
    name: 'Shahin AI',
    nameAr: 'شاهين',
    logo: 'S',
    category: 'GRC & Compliance',
    categoryAr: 'الحوكمة والامتثال',
    description: 'Enterprise GRC platform for Saudi compliance',
    descriptionAr: 'منصة حوكمة مؤسسية للامتثال السعودي',
    status: 'active',
    projects: 247,
    color: 'from-green-600 to-green-800'
  },
  {
    name: 'DoganLab',
    nameAr: 'مختبر دوغان',
    logo: 'DL',
    category: 'Innovation & R&D',
    categoryAr: 'الابتكار والبحث',
    description: 'AI experimentation and demo platform',
    descriptionAr: 'منصة تجريب الذكاء الاصطناعي والعروض',
    status: 'active',
    projects: 156,
    color: 'from-orange-600 to-orange-800'
  },
  {
    name: 'DoganHub',
    nameAr: 'مركز دوغان',
    logo: 'DH',
    category: 'Customer Engagement',
    categoryAr: 'إشراك العملاء',
    description: 'Command center for ecosystem management',
    descriptionAr: 'مركز القيادة لإدارة النظام البيئي',
    status: 'active',
    projects: 523,
    color: 'from-purple-600 to-purple-800'
  },
  {
    name: 'ERPNext Saudi',
    nameAr: 'ERPNext السعودي',
    logo: 'ER',
    category: 'Enterprise System',
    categoryAr: 'نظام مؤسسي',
    description: 'Integrated business management system',
    descriptionAr: 'نظام إدارة أعمال متكامل',
    status: 'active',
    projects: 892,
    color: 'from-blue-600 to-blue-800'
  },
  {
    name: 'Saudi Tech Partners',
    nameAr: 'شركاء التقنية السعودية',
    logo: 'ST',
    category: 'Ecosystem',
    categoryAr: 'النظام البيئي',
    description: 'Network of technology partners across KSA',
    descriptionAr: 'شبكة شركاء التقنية في المملكة',
    status: 'growing',
    projects: 1247,
    color: 'from-cyan-600 to-cyan-800'
  },
  {
    name: 'Government Entities',
    nameAr: 'الجهات الحكومية',
    logo: 'GE',
    category: 'Public Sector',
    categoryAr: 'القطاع العام',
    description: 'Collaboration with Saudi government agencies',
    descriptionAr: 'التعاون مع الجهات الحكومية السعودية',
    status: 'strategic',
    projects: 78,
    color: 'from-indigo-600 to-indigo-800'
  }
];

const stats = [
  { icon: Users, value: '3,200+', label: 'Active Partners', labelAr: 'شريك نشط', color: 'text-blue-600' },
  { icon: Award, value: '2,847', label: 'Projects Delivered', labelAr: 'مشروع منجز', color: 'text-green-600' },
  { icon: Globe, value: '14', label: 'Countries', labelAr: 'دولة', color: 'text-purple-600' },
  { icon: TrendingUp, value: '98.7%', label: 'Success Rate', labelAr: 'نسبة النجاح', color: 'text-orange-600' }
];

export function CooperationPartners() {
  return (
    <section id="cooperation" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200 mb-4">
            <Handshake className="w-4 h-4 text-blue-700" />
            <span className="text-blue-800">Cooperation & Partners | التعاون والشركاء</span>
          </div>
          <h2 className="text-4xl lg:text-5xl text-gray-900 mb-6">
            <span className="block mb-2">شبكة شركاء متكاملة</span>
            <span className="bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">
              Integrated Partner Ecosystem
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            نتعاون مع أفضل الشركات والجهات لتقديم حلول متكاملة ومبتكرة
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center hover:shadow-xl transition-all">
              <stat.icon className={`w-10 h-10 ${stat.color} mx-auto mb-3`} />
              <div className="text-3xl text-gray-900 mb-2">{stat.value}</div>
              <div className="text-sm text-gray-600 mb-1">{stat.labelAr}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Partners Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 hover:border-blue-300 hover:shadow-2xl transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${partner.color} rounded-xl flex items-center justify-center shadow-md text-white text-xl group-hover:scale-110 transition-transform`}>
                  {partner.logo}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    partner.status === 'active' ? 'bg-green-50 text-green-700' :
                    partner.status === 'growing' ? 'bg-blue-50 text-blue-700' :
                    'bg-purple-50 text-purple-700'
                  }`}>
                    {partner.status === 'active' ? 'نشط | Active' :
                     partner.status === 'growing' ? 'متنامي | Growing' :
                     'استراتيجي | Strategic'}
                  </span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-500">{partner.projects} projects</span>
                  </div>
                </div>
              </div>

              <h3 className="text-xl text-gray-900 mb-1">{partner.nameAr}</h3>
              <h4 className="text-sm text-blue-700 mb-3">{partner.name}</h4>

              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200">
                  {partner.categoryAr} | {partner.category}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-2">{partner.descriptionAr}</p>
              <p className="text-xs text-gray-500">{partner.description}</p>

              <button className="mt-4 w-full py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm">
                عرض التفاصيل | View Details
              </button>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl mb-3">هل تريد الانضمام لشبكة الشركاء؟</h3>
          <p className="text-blue-100 mb-6">Want to join our partner ecosystem?</p>
          <button className="px-8 py-3 bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all">
            تقديم طلب شراكة | Apply for Partnership
          </button>
        </div>
      </div>
    </section>
  );
}