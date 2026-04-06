import { GitBranch, FileText, Clock, CheckCircle, Link as LinkIcon, Search, Filter } from 'lucide-react';

const evidenceTimeline = [
  {
    id: 'EV-2024-1247',
    date: '2024-12-01',
    time: '14:23',
    type: 'Policy Document',
    typeAr: 'وثيقة سياسة',
    action: 'Created',
    actionAr: 'تم الإنشاء',
    user: 'Ahmed Al-Rashid',
    control: 'NCA-SEC-001',
    status: 'approved',
    linkedEvidence: 3
  },
  {
    id: 'EV-2024-1246',
    date: '2024-12-01',
    time: '11:15',
    type: 'Security Scan',
    typeAr: 'فحص أمني',
    action: 'Automated',
    actionAr: 'تلقائي',
    user: 'System',
    control: 'NCA-SEC-012',
    status: 'verified',
    linkedEvidence: 5
  },
  {
    id: 'EV-2024-1245',
    date: '2024-11-30',
    time: '16:45',
    type: 'Audit Report',
    typeAr: 'تقرير تدقيق',
    action: 'Submitted',
    actionAr: 'تم التقديم',
    user: 'Sara Mohammed',
    control: 'DGA-GOV-003',
    status: 'pending-review',
    linkedEvidence: 8
  },
  {
    id: 'EV-2024-1244',
    date: '2024-11-30',
    time: '09:30',
    type: 'Training Certificate',
    typeAr: 'شهادة تدريب',
    action: 'Uploaded',
    actionAr: 'تم التحميل',
    user: 'Khalid bin Saleh',
    control: 'PDPL-TR-002',
    status: 'approved',
    linkedEvidence: 2
  }
];

export function EvidenceTraceability() {
  return (
    <section id="evidence" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full border border-purple-200 mb-4">
            <GitBranch className="w-4 h-4 text-purple-600" />
            <span className="text-purple-700">Evidence Traceability | تتبع الأدلة</span>
          </div>
          <h2 className="text-4xl lg:text-5xl text-gray-900 mb-6">
            <span className="block mb-2">نظام تتبع الأدلة الشامل</span>
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Complete Evidence Audit Trail
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            كل دليل، كل تغيير، كل قرار - موثق ومتتبع بالكامل مع سلسلة تدقيق غير قابلة للتغيير
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث في الأدلة | Search evidence..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-5 h-5" />
              <span>فلترة | Filter</span>
            </button>
          </div>
        </div>

        {/* Evidence Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute right-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 via-blue-200 to-green-200 hidden lg:block"></div>

          <div className="space-y-8">
            {evidenceTimeline.map((evidence, index) => (
              <div key={evidence.id} className={`relative grid lg:grid-cols-2 gap-8 items-center ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left lg:flex-row-reverse'}`}>
                {/* Content Card */}
                <div className={`${index % 2 === 0 ? 'lg:col-start-1' : 'lg:col-start-2'}`}>
                  <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 hover:border-purple-300 hover:shadow-xl transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm px-3 py-1 bg-purple-50 text-purple-700 rounded-full">{evidence.id}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            evidence.status === 'approved' ? 'bg-green-50 text-green-700' :
                            evidence.status === 'verified' ? 'bg-blue-50 text-blue-700' :
                            'bg-orange-50 text-orange-700'
                          }`}>
                            {evidence.status === 'approved' ? 'معتمد | Approved' :
                             evidence.status === 'verified' ? 'تم التحقق | Verified' :
                             'قيد المراجعة | Pending'}
                          </span>
                        </div>
                        <h3 className="text-lg text-gray-900 mb-1">{evidence.typeAr}</h3>
                        <p className="text-sm text-gray-500 mb-3">{evidence.type}</p>
                      </div>
                      <FileText className="w-10 h-10 text-purple-600 bg-purple-50 rounded-lg p-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500 block mb-1">Action | الإجراء</span>
                        <span className="text-gray-900">{evidence.actionAr} | {evidence.action}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">User | المستخدم</span>
                        <span className="text-gray-900">{evidence.user}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Control | الضابط</span>
                        <span className="text-blue-600">{evidence.control}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Linked | مرتبط</span>
                        <span className="text-gray-900">{evidence.linkedEvidence} evidence items</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{evidence.date} at {evidence.time}</span>
                      </div>
                      <button className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700">
                        <LinkIcon className="w-4 h-4" />
                        <span>View Trail</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Timeline Dot */}
                <div className="hidden lg:block absolute right-1/2 transform translate-x-1/2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full border-4 border-white shadow-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6">
            <GitBranch className="w-10 h-10 text-purple-600 mb-4" />
            <h3 className="text-lg text-gray-900 mb-2">سلسلة تدقيق كاملة</h3>
            <p className="text-sm text-gray-600 mb-2">Complete audit trail for every evidence item with full version history</p>
            <p className="text-xs text-gray-500">تتبع كامل لكل عنصر دليل مع سجل إصدارات كامل</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
            <LinkIcon className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg text-gray-900 mb-2">ربط تلقائي</h3>
            <p className="text-sm text-gray-600 mb-2">Automatically link evidence to controls, policies, and requirements</p>
            <p className="text-xs text-gray-500">ربط الأدلة تلقائياً بالضوابط والسياسات والمتطلبات</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
            <CheckCircle className="w-10 h-10 text-green-600 mb-4" />
            <h3 className="text-lg text-gray-900 mb-2">تحقق فوري</h3>
            <p className="text-sm text-gray-600 mb-2">Instant verification and approval workflows with notification system</p>
            <p className="text-xs text-gray-500">سير عمل التحقق والموافقة الفورية مع نظام الإشعارات</p>
          </div>
        </div>
      </div>
    </section>
  );
}
