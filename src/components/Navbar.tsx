import React, { useState, useEffect } from 'react';
import { Hospital, User, LogOut, ArrowLeft, ChevronRight, ChevronLeft, Bell } from 'lucide-react';
import { RoutePath } from '../types';
import { useLanguage } from '../LanguageContext';
import { PatientDataStore } from '../services/patientStore';

import { AuthService } from '../services/authService';

interface NavbarProps {
  id?: string;
  onNavigate: (route: RoutePath) => void;
  currentRoute: RoutePath;
  breadcrumbs?: { label: string; route?: RoutePath }[];
}

export default function Navbar({
  id = "app-navbar",
  onNavigate,
  currentRoute,
  breadcrumbs
}: NavbarProps) {
  const { t, isRtl, language } = useLanguage();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const isPatientRoute = currentRoute.startsWith('/patient-');

  useEffect(() => {
    const updateUnread = () => {
      const notifs = PatientDataStore.getNotifications();
      const unread = notifs.filter(n => !n.read).length;
      setUnreadCount(unread);
    };

    updateUnread();
    window.addEventListener('patient-data-updated', updateUnread);
    return () => window.removeEventListener('patient-data-updated', updateUnread);
  }, []);

  return (
    <header
      id={id}
      className="sticky top-0 z-40 w-full bg-[#0F4C81] text-white shrink-0 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left/Right Side: Logo & Breadcrumbs */}
        <div className="flex items-center space-x-3 sm:space-x-4 rtl:space-x-reverse">
          <button
            id="nav-logo-btn"
            onClick={() => onNavigate('/')}
            className="flex items-center space-x-2.5 rtl:space-x-reverse focus:outline-hidden group text-left rtl:text-right"
            aria-label="Go to Landing Page"
          >
            <div className="bg-white p-1.5 rounded-lg text-[#0F4C81] transition-transform duration-200 group-hover:scale-105">
              <Hospital className="h-5 w-5" id="navbar-logo-icon" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-white block tracking-tight leading-none">
                {t.brandName}
              </span>
              <span className="text-[9px] text-[#2E8BC0] font-sans tracking-widest uppercase font-semibold block mt-0.5">
                {t.appDescription}
              </span>
            </div>
          </button>

          {/* Breadcrumbs for internal pages */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="hidden md:flex items-center space-x-2 rtl:space-x-reverse text-xs text-blue-100 pl-4 rtl:pl-0 rtl:pr-4 border-l rtl:border-l-0 rtl:border-r border-[#2E8BC0]/40">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (isRtl ? <ChevronLeft className="h-3 w-3 text-blue-200" /> : <ChevronRight className="h-3 w-3 text-blue-200" />)}
                  {crumb.route ? (
                    <button
                      id={`breadcrumb-crumb-${idx}`}
                      onClick={() => onNavigate(crumb.route!)}
                      className="hover:text-white hover:underline transition-colors focus:outline-hidden font-medium"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-white font-semibold">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Middle/Right Side: Statistics & Language Switcher & Profile Indicator */}
        <div className="flex items-center space-x-3 sm:space-x-5 rtl:space-x-reverse">
          {/* Landing statistics embedded in Navbar for internal desktop view */}
          <div className="hidden lg:flex items-center space-x-6 rtl:space-x-reverse border-r rtl:border-r-0 rtl:border-l border-[#2E8BC0]/40 pr-6 rtl:pr-0 rtl:pl-6">
            <div className="text-center">
              <div className="text-sm font-bold leading-none text-white">21</div>
              <div className="text-[9px] text-blue-200 uppercase font-medium tracking-wider mt-0.5">{t.doctors}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold leading-none text-white">85+</div>
              <div className="text-[9px] text-blue-200 uppercase font-medium tracking-wider mt-0.5">{t.hospitals}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold leading-none text-white">100+</div>
              <div className="text-[9px] text-blue-200 uppercase font-medium tracking-wider mt-0.5">{t.patients}</div>
            </div>
          </div>


          {currentRoute !== '/' && currentRoute !== '/login' && (
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              {/* Notification Bell for Patient */}
              {isPatientRoute && (
                <button
                  onClick={() => onNavigate('/patient-notifications')}
                  className="relative p-2 text-blue-100 hover:text-white hover:bg-[#2E8BC0]/20 rounded-xl transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* User Profile Info */}
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="hidden sm:block text-right rtl:text-left text-xs">
                  <p className="font-semibold text-white leading-none">
                    {isPatientRoute ? 'Harini Al-Mansoor' : 'Dr. Harini'}
                  </p>
                  <p className="text-[10px] text-blue-200 mt-0.5 leading-none font-mono">
                    {isPatientRoute ? 'harini@satark.ai' : 'doctor@satark.ai'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#2E8BC0] border border-white flex items-center justify-center font-bold text-white shadow-xs text-sm">
                  {isPatientRoute ? 'H' : 'Dr'}
                </div>
              </div>

              {/* Logout button */}
              <button
                id="nav-logout-btn"
                onClick={async () => {
                  await AuthService.logout();
                  onNavigate('/');
                }}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-[#2E8BC0]/20 rounded-lg transition-colors focus:outline-hidden"
                title={t.logout}
                aria-label="Logout from system"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          {(currentRoute === '/' || currentRoute === '/login') && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                id="nav-goto-login-btn"
                onClick={() => onNavigate('/login')}
                className="text-sm font-semibold text-white hover:text-blue-100 transition-colors focus:outline-hidden focus:underline"
              >
                {t.signIn}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
