import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Globe, Search, ArrowLeft, User, LogIn, LogOut, ChevronDown, Sparkles, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InquiryButton from '@/components/inquiry/InquiryButton';
import NotificationCenter from '@/components/agents/NotificationCenter';
import NotificationBell from '@/components/approval/NotificationBell';

export default function PublicHeader({ searchQuery = '', showBackButton = false, backLabel = 'Back to Home' }) {
  const [user, setUser] = useState(null);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated()
      .then(isAuth => isAuth ? base44.auth.me() : null)
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      window.location.href = createPageUrl('Search') + `?q=${encodeURIComponent(searchInput)}`;
    }
  };

  const menuPages = [
    { name: 'Home', label: 'الرئيسية', icon: '🏠' },
    { name: 'Sectors', label: 'القطاعات', icon: '🏢' },
    { name: 'Search', label: 'المنتجات', icon: '🔍' },
    { name: 'DocumentManagement', label: 'المستندات', icon: '📄' },
    { name: 'TrainingManagement', label: 'التدريب', icon: '🎓' },
    { name: 'AIStudio', label: 'AI Studio', icon: '✨' },
    { name: 'Advisor', label: 'المستشار الذكي', icon: '🧠' },
    { name: 'InteractiveDemo', label: 'التجربة التفاعلية', icon: '🎮' },
    { name: 'AgentWorkflows', label: 'مسارات الوكيل', icon: '🤖' },
    { name: 'ApprovalGates', label: 'بوابات الموافقة', icon: '✅' },
    { name: 'CustomerPortal', label: 'البوابة', icon: '🚪' },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2"
          >
            {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Logo */}
          {showBackButton ? (
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{backLabel}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="font-bold text-slate-900">SBG</div>
                  <div className="text-xs text-slate-500">Saudi Digital Assets</div>
                </div>
              </Link>

              {/* Partner Links */}
              <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                <a 
                  href="https://www.doganlap.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg hover:shadow-md transition-all group"
                  title="Doganlap - Advanced Solutions"
                >
                  <Sparkles className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-blue-700">Doganlap</span>
                </a>

                <a 
                  href="https://www.doganconsult.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg hover:shadow-md transition-all group"
                  title="Dogan Consult - Consulting Services"
                >
                  <Sparkles className="w-4 h-4 text-violet-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-violet-700">Dogan Consult</span>
                </a>
              </div>
            </div>
          )}
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </form>
          
          {/* Right Navigation */}
          <div className="flex items-center gap-4">
            {user && <NotificationBell userEmail={user.email} />}
            <NotificationCenter />
            <InquiryButton />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{user.full_name || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Dashboard')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> لوحة التحكم
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('CustomerPortal')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Portal
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('DocumentManagement')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> المستندات
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('TrainingManagement')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> التدريب
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('ProductCatalog')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Products
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('AIStudio')} className="cursor-pointer">
                      <Sparkles className="w-4 h-4 mr-2" /> AI Studio
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('InteractiveDemo')} className="cursor-pointer">
                      <Sparkles className="w-4 h-4 mr-2" /> تجربة تفاعلية
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('AgentWorkflows')} className="cursor-pointer">
                    <Sparkles className="w-4 h-4 mr-2" /> مسارات الوكيل
                    </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('APIDocumentation')} className="cursor-pointer">
                        <Sparkles className="w-4 h-4 mr-2" /> API Docs
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('UserManagement')} className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" /> User Management
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('APISettings')} className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" /> API Settings
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Analytics')} className="cursor-pointer">
                          <User className="w-4 h-4 mr-2" /> Analytics
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('CSuiteDashboard')} className="cursor-pointer">
                          <User className="w-4 h-4 mr-2" /> Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                size="sm" 
                onClick={() => base44.auth.redirectToLogin()} 
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Smart Menu Drawer */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-slate-900">SBG</span>
                  </div>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {menuPages.map((page) => (
                    <Link
                      key={page.name}
                      to={createPageUrl(page.name)}
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{page.icon}</span>
                      <span className="font-medium text-slate-700 group-hover:text-emerald-700">{page.label}</span>
                    </Link>
                  ))}
                </nav>

                {user?.role === 'admin' && (
                  <>
                    <div className="my-6 border-t border-slate-200" />
                    <div className="space-y-1">
                      <Link
                        to={createPageUrl('Analytics')}
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors group"
                      >
                        <span className="text-2xl">📊</span>
                        <span className="font-medium text-slate-700 group-hover:text-purple-700">Analytics</span>
                      </Link>
                      <Link
                        to={createPageUrl('UserManagement')}
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors group"
                      >
                        <span className="text-2xl">👥</span>
                        <span className="font-medium text-slate-700 group-hover:text-purple-700">User Management</span>
                      </Link>
                      <Link
                        to={createPageUrl('APISettings')}
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors group"
                      >
                        <span className="text-2xl">🔑</span>
                        <span className="font-medium text-slate-700 group-hover:text-purple-700">API Settings</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}