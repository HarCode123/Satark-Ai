import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  FileText, 
  Clock, 
  Activity, 
  CheckCheck, 
  AlertCircle,
  HeartPulse,
  Filter,
  Pill
} from 'lucide-react';
import { PatientDataStore, PatientNotificationItem } from '../../services/patientStore';
import { MonitoringAlertService } from '../../services/monitoringAlertService';
import { MedicationAdherenceService } from '../../services/medicationAdherenceService';
import { useLanguage } from '../../LanguageContext';

export const PatientNotificationsView: React.FC = () => {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<PatientNotificationItem[]>(PatientDataStore.getNotifications());
  const [activeFilter, setActiveFilter] = useState<'all' | 'medication' | 'monitoring' | 'appointment' | 'prescription'>('all');

  const refreshData = () => {
    // Proactively evaluate monitoring and medication reminders (deduplicated)
    MonitoringAlertService.evaluateMonitoringReminders();
    MedicationAdherenceService.evaluateMedicationReminders();
    setNotifications(PatientDataStore.getNotifications());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('patient-data-updated', refreshData);
    return () => window.removeEventListener('patient-data-updated', refreshData);
  }, []);

  const handleMarkAllRead = () => {
    PatientDataStore.markAllNotificationsRead();
  };

  const handleMarkRead = (id: string) => {
    PatientDataStore.markNotificationRead(id);
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'medication') {
      return n.type === 'medication_reminder';
    }
    if (activeFilter === 'monitoring') {
      return n.type === 'monitoring_reminder' || n.type === 'monitoring_alert';
    }
    if (activeFilter === 'appointment') {
      return n.type === 'appointment' || n.type === 'followup';
    }
    if (activeFilter === 'prescription') {
      return n.type === 'prescription' || n.type === 'lab';
    }
    return true;
  });

  const getNotificationIcon = (type: PatientNotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5" />;
      case 'prescription':
        return <FileText className="h-5 w-5" />;
      case 'medication_reminder':
        return <Pill className="h-5 w-5" />;
      case 'monitoring_reminder':
        return <Bell className="h-5 w-5" />;
      case 'monitoring_alert':
        return <HeartPulse className="h-5 w-5" />;
      case 'followup':
        return <Clock className="h-5 w-5" />;
      case 'lab':
        return <Activity className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getIconWrapperClass = (type: PatientNotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-[#0F4C81]';
      case 'prescription':
        return 'bg-indigo-100 text-indigo-700';
      case 'medication_reminder':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'monitoring_reminder':
        return 'bg-sky-100 text-sky-800 border border-sky-200';
      case 'monitoring_alert':
        return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'followup':
        return 'bg-amber-100 text-amber-700';
      case 'lab':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeBadgeLabel = (type: PatientNotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return language === 'ar' ? 'موعد' : 'Appointment';
      case 'prescription':
        return language === 'ar' ? 'وصفة طبية' : 'Prescription';
      case 'medication_reminder':
        return language === 'ar' ? 'تذكير دوائي' : 'Medication Reminder';
      case 'monitoring_reminder':
        return language === 'ar' ? 'تذكير متابعة' : 'Monitoring Reminder';
      case 'monitoring_alert':
        return language === 'ar' ? 'تنبيه قياس' : 'Monitoring Alert';
      case 'followup':
        return language === 'ar' ? 'متابعة' : 'Follow-up';
      case 'lab':
        return language === 'ar' ? 'تحليل مخبري' : 'Lab Result';
      default:
        return language === 'ar' ? 'إشعار' : 'Notice';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div id="patient-notifications-view" className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right">
      
      {/* Header */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#0F4C81] font-bold uppercase tracking-wider mb-1 font-mono">
            <Bell className="h-4 w-4" />
            <span>{language === 'ar' ? 'التنبيهات والإشعارات الطبية' : 'Patient System Notifications'}</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0F4C81] text-[10px] font-bold">
                {unreadCount} {language === 'ar' ? 'جديد' : 'Unread'}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? 'مركز التنبيهات' : 'Medical Notifications'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            {language === 'ar' 
              ? 'تنبيهات تلقائية بشأن تذكيرات المتابعة الصحية، نطاقات القياسات، المواعيد، والوصفات الطبية.' 
              : 'Real-time alerts regarding daily health monitoring reminders, configured threshold ranges, upcoming appointments, and prescriptions.'}
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-4 py-2.5 bg-[#F8FAFC] hover:bg-blue-50 text-[#0F4C81] border border-blue-100 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <CheckCheck className="h-4 w-4" />
          <span>{language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All as Read'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          {language === 'ar' ? 'الكل' : 'All'} ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('medication')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'medication'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Pill className="h-3.5 w-3.5" />
          <span>{language === 'ar' ? 'تذكيرات الأدوية' : 'Medication Reminders'}</span>
          <span className="font-mono text-[10px] opacity-80">
            ({notifications.filter(n => n.type === 'medication_reminder').length})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('monitoring')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'monitoring'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <HeartPulse className="h-3.5 w-3.5" />
          <span>{language === 'ar' ? 'تنبيهات المتابعة' : 'Monitoring Alerts & Reminders'}</span>
          <span className="font-mono text-[10px] opacity-80">
            ({notifications.filter(n => n.type === 'monitoring_reminder' || n.type === 'monitoring_alert').length})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('appointment')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'appointment'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{language === 'ar' ? 'المواعيد' : 'Appointments'}</span>
          <span className="font-mono text-[10px] opacity-80">
            ({notifications.filter(n => n.type === 'appointment' || n.type === 'followup').length})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('prescription')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'prescription'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>{language === 'ar' ? 'الوصفات والتحاليل' : 'Prescriptions & Labs'}</span>
          <span className="font-mono text-[10px] opacity-80">
            ({notifications.filter(n => n.type === 'prescription' || n.type === 'lab').length})
          </span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkRead(notif.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                !notif.read
                  ? notif.type === 'monitoring_alert'
                    ? 'bg-amber-50/50 border-amber-200 shadow-2xs'
                    : 'bg-blue-50/40 border-blue-200 shadow-2xs'
                  : 'bg-white border-brand-border'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-xl shrink-0 mt-0.5 ${getIconWrapperClass(notif.type)}`}>
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-slate-900">{notif.title}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono bg-slate-100 text-slate-600">
                      {getTypeBadgeLabel(notif.type)}
                    </span>
                    {!notif.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{notif.message}</p>
                  <p className="text-[10px] text-slate-400 font-mono pt-1">
                    {notif.date} &bull; {notif.time}
                  </p>
                </div>
              </div>

              {!notif.read && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded uppercase font-mono shrink-0">
                  New
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white border border-brand-border rounded-2xl p-12 text-center text-slate-400 italic">
            {language === 'ar' ? 'لا توجد تنبيهات تطابق الفلتر المحدد.' : 'No notifications found for the selected category.'}
          </div>
        )}
      </div>

    </div>
  );
};
