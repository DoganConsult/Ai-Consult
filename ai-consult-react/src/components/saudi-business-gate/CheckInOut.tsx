import { LogIn, LogOut, Clock, CheckCircle, AlertCircle, TrendingUp, Calendar, User } from 'lucide-react';
import { useState } from 'react';

const recentActivity = [
  {
    id: 'CHK-2024-1247',
    user: 'Ahmed Al-Rashid',
    userAr: 'أحمد الرشيد',
    action: 'check-in',
    project: 'NCA Compliance Assessment',
    projectAr: 'تقييم امتثال الهيئة الوطنية',
    time: '09:15 AM',
    date: '2024-12-01',
    duration: '4h 23m',
    status: 'active'
  },
  {
    id: 'CHK-2024-1246',
    user: 'Sara Mohammed',
    userAr: 'سارة محمد',
    action: 'check-out',
    project: 'DGA Documentation Pack',
    projectAr: 'حزمة وثائق DGA',
    time: '06:45 PM',
    date: '2024-11-30',
    duration: '8h 15m',
    status: 'completed'
  },
  {
    id: 'CHK-2024-1245',
    user: 'Khalid bin Saleh',
    userAr: 'خالد بن صالح',
    action: 'check-in',
    project: 'RFP Analysis - Ministry Project',
    projectAr: 'تحليل طلب عرض - مشروع وزاري',
    time: '10:30 AM',
    date: '2024-11-30',
    duration: '3h 12m',
    status: 'active'
  },
  {
    id: 'CHK-2024-1244',
    user: 'Fatima Al-Qahtani',
    userAr: 'فاطمة القحطاني',
    action: 'check-out',
    project: 'Pitch Deck Creation',
    projectAr: 'إنشاء عرض تقديمي',
    time: '04:20 PM',
    date: '2024-11-30',
    duration: '5h 45m',
    status: 'completed'
  }
];

const stats = [
  { icon: User, value: '247', label: 'Active Now', labelAr: 'نشط الآن', color: 'from-green-500 to-green-600' },
  { icon: CheckCircle, value: '1,523', label: 'Completed Today', labelAr: 'مكتمل اليوم', color: 'from-blue-500 to-blue-600' },
  { icon: Clock, value: '6.2h', label: 'Avg Duration', labelAr: 'متوسط المدة', color: 'from-purple-500 to-purple-600' },
  { icon: TrendingUp, value: '+18%', label: 'Efficiency', labelAr: 'الكفاءة', color: 'from-orange-500 to-orange-600' }
];

export function CheckInOut() {
  const [activeTab, setActiveTab] = useState<'check-in' | 'check-out' | 'activity'>('activity');

  return (
    <section id="check-in-out" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200 mb-4">
            <LogIn className="w-4 h-4 text-green-700" />
            <span className="text-green-800">Check-In & Check-Out | تسجيل الدخول والخروج</span>
          </div>
          <h2 className="text-4xl lg:text-5xl text-gray-900 mb-6">
            <span className="block mb-2">نظام تتبع الوقت والمشاريع</span>
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Time & Project Tracking System
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            تتبع دقيق لوقت العمل على المشاريع مع إدارة ذكية للموارد والإنتاجية
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl text-gray-900 mb-2">{stat.value}</div>
              <div className="text-sm text-gray-600 mb-1">{stat.labelAr}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('check-in')}
            className={`px-6 py-3 transition-all ${
              activeTab === 'check-in'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-green-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              <span>تسجيل دخول | Check In</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('check-out')}
            className={`px-6 py-3 transition-all ${
              activeTab === 'check-out'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              <span>تسجيل خروج | Check Out</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-3 transition-all ${
              activeTab === 'activity'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>النشاط | Activity</span>
            </div>
          </button>
        </div>

        {/* Check-In Form */}
        {activeTab === 'check-in' && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
            <h3 className="text-2xl text-gray-900 mb-6">تسجيل دخول لمشروع جديد | Check In to Project</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">اسم المشروع | Project Name</label>
                <input
                  type="text"
                  placeholder="أدخل اسم المشروع..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">النوع | Type</label>
                <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-600">
                  <option>RFP Analysis</option>
                  <option>GRC Assessment</option>
                  <option>DGA Documentation</option>
                  <option>Pitch Creation</option>
                  <option>Consultation</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-2">الوصف | Description</label>
                <textarea
                  rows={3}
                  placeholder="وصف مختصر للمهمة..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-600"
                ></textarea>
              </div>
            </div>
            <button className="mt-6 flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg">
              <LogIn className="w-5 h-5" />
              <span>ابدأ العمل | Start Working</span>
            </button>
          </div>
        )}

        {/* Check-Out Form */}
        {activeTab === 'check-out' && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
            <h3 className="text-2xl text-gray-900 mb-6">تسجيل خروج من المشروع | Check Out from Project</h3>
            <div className="bg-white rounded-xl p-6 mb-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg text-gray-900 mb-1">المشروع النشط | Active Project</h4>
                  <p className="text-sm text-gray-600">NCA Compliance Assessment</p>
                  <p className="text-xs text-gray-500">Started: 09:15 AM</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl text-blue-600">4h 23m</div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">الحالة | Status</label>
                <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600">
                  <option>مكتمل | Completed</option>
                  <option>قيد التقدم | In Progress</option>
                  <option>معلق | On Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">نسبة الإنجاز | Progress %</label>
                <input
                  type="number"
                  placeholder="80"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-2">الملاحظات | Notes</label>
                <textarea
                  rows={3}
                  placeholder="ملاحظات ختامية عن المهمة..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600"
                ></textarea>
              </div>
            </div>
            <button className="mt-6 flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg">
              <LogOut className="w-5 h-5" />
              <span>إنهاء العمل | End Session</span>
            </button>
          </div>
        )}

        {/* Activity Feed */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activity.action === 'check-in'
                        ? 'bg-gradient-to-br from-green-500 to-green-600'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      {activity.action === 'check-in' ? (
                        <LogIn className="w-6 h-6 text-white" />
                      ) : (
                        <LogOut className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg text-gray-900">{activity.userAr}</h4>
                        <span className="text-sm text-gray-500">({activity.user})</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          activity.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {activity.status === 'active' ? 'نشط | Active' : 'مكتمل | Completed'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{activity.projectAr}</p>
                      <p className="text-xs text-gray-500 mb-3">{activity.project}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{activity.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{activity.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{activity.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded-full">
                      {activity.id}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}