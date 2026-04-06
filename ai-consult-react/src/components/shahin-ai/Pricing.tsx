import { Check, Zap, Building2, Crown, ArrowLeft } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    nameAr: 'المبتدئ',
    icon: Zap,
    price: '4,999',
    period: 'شهرياً | /month',
    description: 'للشركات الصغيرة والمتوسطة',
    descriptionEn: 'For small and medium businesses',
    color: 'from-blue-600 to-blue-700',
    features: [
      { text: 'Up to 50 users', textAr: 'حتى 50 مستخدم' },
      { text: 'Basic GRC modules', textAr: 'وحدات GRC الأساسية' },
      { text: 'NCA compliance tracking', textAr: 'تتبع امتثال الهيئة الوطنية' },
      { text: '1,000 evidence items/month', textAr: '1000 عنصر دليل شهرياً' },
      { text: 'Standard support', textAr: 'دعم قياسي' },
      { text: 'Monthly reports', textAr: 'تقارير شهرية' }
    ]
  },
  {
    name: 'Professional',
    nameAr: 'المحترف',
    icon: Building2,
    price: '12,999',
    period: 'شهرياً | /month',
    description: 'للشركات المتنامية',
    descriptionEn: 'For growing enterprises',
    color: 'from-green-600 to-green-700',
    featured: true,
    features: [
      { text: 'Up to 200 users', textAr: 'حتى 200 مستخدم' },
      { text: 'Full GRC suite + DGA portal', textAr: 'مجموعة GRC الكاملة + بوابة DGA' },
      { text: 'All compliance frameworks', textAr: 'جميع أطر الامتثال' },
      { text: '10,000 evidence items/month', textAr: '10,000 عنصر دليل شهرياً' },
      { text: 'Priority support 24/7', textAr: 'دعم ذو أولوية 24/7' },
      { text: 'Advanced analytics', textAr: 'تحليلات متقدمة' },
      { text: 'API access', textAr: 'وصول API' },
      { text: 'Custom workflows', textAr: 'سير عمل مخصص' }
    ]
  },
  {
    name: 'Enterprise',
    nameAr: 'المؤسسي',
    icon: Crown,
    price: 'Custom',
    priceAr: 'حسب الطلب',
    period: '',
    description: 'للمؤسسات الكبرى',
    descriptionEn: 'For large organizations',
    color: 'from-purple-600 to-purple-700',
    features: [
      { text: 'Unlimited users', textAr: 'مستخدمون غير محدودين' },
      { text: 'Complete platform access', textAr: 'وصول كامل للمنصة' },
      { text: 'Unlimited evidence storage', textAr: 'تخزين غير محدود للأدلة' },
      { text: 'Dedicated account manager', textAr: 'مدير حساب مخصص' },
      { text: 'Custom integrations', textAr: 'تكاملات مخصصة' },
      { text: 'On-premise deployment option', textAr: 'خيار النشر المحلي' },
      { text: 'Advanced security features', textAr: 'ميزات أمنية متقدمة' },
      { text: 'Dedicated support team', textAr: 'فريق دعم مخصص' },
      { text: 'Training & onboarding', textAr: 'تدريب وإعداد' }
    ]
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200 mb-4">
            <span className="text-green-700">الأسعار | Pricing Plans</span>
          </div>
          <h2 className="text-4xl lg:text-5xl text-gray-900 mb-6">
            <span className="block mb-2">خطط مرنة تناسب احتياجاتك</span>
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Flexible Plans for Every Organization
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            اختر الخطة المناسبة لحجم مؤسستك واحتياجات الامتثال الخاصة بك
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl border-2 ${
                plan.featured ? 'border-green-500 shadow-2xl scale-105' : 'border-gray-100 shadow-lg'
              } p-8 hover:shadow-2xl transition-all duration-300`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm shadow-lg">
                    الأكثر شعبية | Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div className={`inline-flex w-16 h-16 bg-gradient-to-br ${plan.color} rounded-xl items-center justify-center mb-4 shadow-lg`}>
                  <plan.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl text-gray-900 mb-2">{plan.nameAr}</h3>
                <p className="text-sm text-gray-500 mb-1">{plan.name}</p>
                <p className="text-sm text-gray-600 mb-4">{plan.descriptionAr}</p>
                <p className="text-xs text-gray-500 mb-4">{plan.descriptionEn}</p>
                
                <div className="mb-2">
                  {plan.priceAr ? (
                    <div className="text-3xl text-gray-900">{plan.priceAr}</div>
                  ) : (
                    <div className="text-4xl text-gray-900">
                      <span className="text-2xl text-gray-500">SAR</span> {plan.price}
                    </div>
                  )}
                  {plan.period && <p className="text-sm text-gray-500 mt-1">{plan.period}</p>}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 ${plan.featured ? 'text-green-600' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
                    <div>
                      <span className="text-gray-900 block text-sm">{feature.textAr}</span>
                      <span className="text-gray-500 text-xs">{feature.text}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all ${
                  plan.featured
                    ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:shadow-xl'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <span>{plan.price === 'Custom' ? 'اتصل بنا | Contact Us' : 'ابدأ الآن | Get Started'}</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-6">
            جميع الخطط تشمل: ضمان استرداد الأموال لمدة 30 يوماً • ترحيل مجاني • تدريب أولي
          </p>
          <p className="text-sm text-gray-500">
            All plans include: 30-day money-back guarantee • Free migration • Initial training
          </p>
        </div>
      </div>
    </section>
  );
}
