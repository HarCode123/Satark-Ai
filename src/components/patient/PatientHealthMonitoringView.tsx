import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Activity, 
  Calendar, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  ChevronRight, 
  ShieldCheck, 
  ListOrdered,
  Thermometer,
  Wind,
  Droplet,
  Scale,
  ClipboardList,
  CheckCircle2,
  Stethoscope,
  Info,
  Plus,
  History,
  ArrowUpRight,
  ChevronDown
} from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { RoutePath } from '../../types';
import { PatientDataStore, PatientNotificationItem } from '../../services/patientStore';
import { MonitoringAlertService } from '../../services/monitoringAlertService';
import { 
  MonitoringPlan, 
  MonitoringParameter, 
  MonitoringParameterType, 
  HealthLogEntry,
  HealthLogReading,
  ParameterMonitoringStatus 
} from '../../types/monitoring';
import { HealthTrendChart, ChartDataPoint } from './HealthTrendChart';

interface PatientHealthMonitoringViewProps {
  onNavigate?: (route: RoutePath) => void;
}

export const PatientHealthMonitoringView: React.FC<PatientHealthMonitoringViewProps> = ({ onNavigate }) => {
  const { language, isRtl } = useLanguage();

  const [activePlan, setActivePlan] = useState<MonitoringPlan | null>(() => PatientDataStore.getActiveMonitoringPlan());
  const [allPlans, setAllPlans] = useState<MonitoringPlan[]>(() => PatientDataStore.getMonitoringPlans());
  const [logs, setLogs] = useState<HealthLogEntry[]>(() => PatientDataStore.getHealthLogs());
  const [latestReadings, setLatestReadings] = useState<Record<string, HealthLogReading & { date: string; time: string }>>(() => PatientDataStore.getLatestReadings());

  // Trend Controls State
  const [selectedParamId, setSelectedParamId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('7');

  // Step 5: Monitoring Status and Notifications
  const [monitoringStatuses, setMonitoringStatuses] = useState<ParameterMonitoringStatus[]>(() => 
    MonitoringAlertService.getTodayMonitoringStatuses()
  );
  const [monitoringNotifications, setMonitoringNotifications] = useState<PatientNotificationItem[]>(() => {
    return PatientDataStore.getNotifications().filter(n => n.type === 'monitoring_reminder' || n.type === 'monitoring_alert');
  });

  const refreshData = () => {
    // Proactively evaluate monitoring reminders (deduplicated)
    MonitoringAlertService.evaluateMonitoringReminders();

    const plan = PatientDataStore.getActiveMonitoringPlan();
    setActivePlan(plan);
    setAllPlans(PatientDataStore.getMonitoringPlans());
    const currentLogs = PatientDataStore.getHealthLogs();
    setLogs(currentLogs);
    setLatestReadings(PatientDataStore.getLatestReadings());
    setMonitoringStatuses(MonitoringAlertService.getTodayMonitoringStatuses());
    setMonitoringNotifications(
      PatientDataStore.getNotifications().filter(n => n.type === 'monitoring_reminder' || n.type === 'monitoring_alert')
    );
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('patient-data-updated', refreshData);
    return () => window.removeEventListener('patient-data-updated', refreshData);
  }, []);

  // Compute available parameters
  const activeParams = (activePlan?.parameters || []).filter(p => p.isActive);
  const paramMap = new Map<string, MonitoringParameter>();
  activeParams.forEach(p => paramMap.set(p.id, p));

  // Include parameters that have historical readings even if plan changed
  logs.forEach(log => {
    log.readings.forEach(r => {
      if (!paramMap.has(r.parameterId)) {
        paramMap.set(r.parameterId, {
          id: r.parameterId,
          patientId: log.patientId,
          parameterType: r.parameterType,
          displayName: r.displayName,
          unit: r.unit,
          reasonForMonitoring: 'Recorded in patient log',
          isActive: true,
          startDate: log.date,
          frequency: 'As needed'
        });
      }
    });
  });

  const availableParameters = Array.from(paramMap.values());

  // Initialize or maintain selected parameter ID
  useEffect(() => {
    if (!selectedParamId && availableParameters.length > 0) {
      setSelectedParamId(availableParameters[0].id);
    } else if (selectedParamId && !availableParameters.some(p => p.id === selectedParamId) && availableParameters.length > 0) {
      setSelectedParamId(availableParameters[0].id);
    }
  }, [availableParameters, selectedParamId]);

  // Build map of readings by parameter ID and parameter type
  const readingsByParam: Record<string, ChartDataPoint[]> = {};
  logs.forEach(log => {
    log.readings.forEach(reading => {
      const pt: ChartDataPoint = {
        id: `${log.id}-${reading.parameterId}`,
        date: log.date,
        time: log.time,
        timestamp: log.timestamp || new Date(`${log.date}T${log.time || '12:00'}`).getTime() || 0,
        value: reading.value,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        numericValue: reading.numericValue
      };

      if (!readingsByParam[reading.parameterId]) {
        readingsByParam[reading.parameterId] = [];
      }
      readingsByParam[reading.parameterId].push(pt);

      if (!readingsByParam[reading.parameterType]) {
        readingsByParam[reading.parameterType] = [];
      }
      readingsByParam[reading.parameterType].push(pt);
    });
  });

  const getParameterIcon = (type: MonitoringParameterType) => {
    switch (type) {
      case 'blood_pressure':
        return <HeartPulse className="h-5 w-5 text-rose-500" />;
      case 'heart_rate':
        return <Activity className="h-5 w-5 text-indigo-500" />;
      case 'temperature':
        return <Thermometer className="h-5 w-5 text-amber-500" />;
      case 'oxygen_saturation':
        return <Wind className="h-5 w-5 text-sky-500" />;
      case 'blood_glucose':
        return <Droplet className="h-5 w-5 text-purple-500" />;
      case 'weight':
        return <Scale className="h-5 w-5 text-emerald-500" />;
      default:
        return <ClipboardList className="h-5 w-5 text-[#0F4C81]" />;
    }
  };

  const hasPlan = activePlan && activePlan.parameters && activePlan.parameters.length > 0;

  return (
    <div id="patient-health-monitoring-view" className="space-y-8 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right">
      
      {/* 1. Header Banner / Monitoring Overview */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1 font-mono">
            {hasPlan ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                <span>{language === 'ar' ? 'المتابعة الصحية: نشطة' : 'Active Monitoring'}</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                <span>{language === 'ar' ? 'بانتظار الخطة' : 'Awaiting Plan'}</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? 'المتابعة الصحية الذكية' : 'Health Monitoring'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] max-w-3xl leading-relaxed">
            {language === 'ar' 
              ? 'تتبع خطتك الصحية الشخصية والمعايير السريرية المعتمدة المستخرجة مباشرة من وصفتك الطبية ومراجعة تطور القراءات عبر الرسوم البيانية.' 
              : 'Track your personalized health plan, active clinical parameters derived from your prescription, and view historical trend charts.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {onNavigate && (
            <button
              id="header-record-health-btn"
              onClick={() => onNavigate('/patient-daily-log')}
              className="px-4 py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{language === 'ar' ? 'تسجيل صحة اليوم' : "Record Today's Health"}</span>
            </button>
          )}

          {/* Status Pill */}
          <div className="bg-[#F8FAFC] border border-brand-border p-4 rounded-xl flex items-center gap-3 shrink-0">
            <div className={`h-3 w-3 rounded-full ${hasPlan ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <div className="text-xs">
              <p className="font-bold text-[#1F2937]">
                {language === 'ar' ? 'حالة بروتوكول المتابعة' : 'Protocol Status'}
              </p>
              <p className="text-[#6B7280] font-medium">
                {hasPlan 
                  ? (language === 'ar' ? 'الخطة الطبية نشطة ومفعلة' : 'Monitoring Plan Active')
                  : (language === 'ar' ? 'لا توجد خطة متابعة نشطة' : 'No Active Health Plan')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasPlan ? (
        <div className="space-y-8">
          
          {/* Active Plan Metadata Card */}
          <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-white border border-blue-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold font-mono text-[#0F4C81] bg-white px-2 py-0.5 rounded border border-blue-100 shadow-2xs">
                  {activePlan.id}
                </span>
                <span className="text-slate-400 text-xs">&bull;</span>
                <span className="text-xs font-semibold text-slate-700">
                  {activePlan.diagnosis || activePlan.title}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {activePlan.title}
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Stethoscope className="h-3.5 w-3.5 text-[#0F4C81]" />
                  <span>{activePlan.doctorName || 'Dr. Harini, MD'}</span>
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{language === 'ar' ? 'تاريخ البدء:' : 'Start Date:'} {activePlan.createdDate}</span>
                </span>
                {activePlan.sourcePrescriptionId && (
                  <>
                    <span>&bull;</span>
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {language === 'ar' ? 'الوصفة المصدر:' : 'Source Rx:'} {activePlan.sourcePrescriptionId}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right rtl:text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {language === 'ar' ? 'إجمالي المعايير' : 'Total Parameters'}
                </span>
                <span className="text-lg font-extrabold text-[#0F4C81]">
                  {activePlan.parameters.length} {language === 'ar' ? 'معايير' : 'Parameters'}
                </span>
              </div>
              <div className="p-3 bg-white text-[#0F4C81] border border-blue-200 rounded-xl shadow-2xs">
                <FileCheck className="h-6 w-6 text-[#0F4C81]" />
              </div>
            </div>
          </div>

          {/* SECTION: TODAY'S MONITORING STATUS & TASKS (Step 5) */}
          <div id="monitoring-status-section" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#0F4C81]" />
                  <span>{language === 'ar' ? 'حالة المتابعة ومهام اليوم' : "TODAY'S MONITORING STATUS & TASKS"}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar'
                    ? 'الجدول المتوقع وحالة تسجيل كل معيار صحي لليوم الحالي بناءً على تردد المتابعة المعتمد.'
                    : "Expected tracking schedule and today's recording progress based on your physician's plan."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0F4C81] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full font-mono">
                  {monitoringStatuses.filter(s => s.isRecordedToday).length} / {monitoringStatuses.length} {language === 'ar' ? 'مكتمل لليوم' : 'Completed Today'}
                </span>
              </div>
            </div>

            {/* Status Grid for Active Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monitoringStatuses.map((status) => (
                <div 
                  key={status.parameterId}
                  className={`p-4 rounded-xl border transition-all space-y-3 flex flex-col justify-between ${
                    status.isRecordedToday
                      ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300'
                      : 'bg-[#F8FAFC] border-slate-200 hover:border-blue-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header: Name, Icon, Frequency */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                          {getParameterIcon(status.parameterType)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-tight">
                            {status.displayName}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {status.unit}
                          </span>
                        </div>
                      </div>

                      {/* Today's Recording Status Badge */}
                      {status.isRecordedToday ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-mono shrink-0">
                          <span>✓</span>
                          <span>{language === 'ar' ? 'تم التسجيل' : 'Recorded'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-mono shrink-0">
                          <span>○</span>
                          <span>{language === 'ar' ? 'قيد الانتظار' : 'Tracking pending'}</span>
                        </span>
                      )}
                    </div>

                    {/* Expected Frequency */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">
                          {language === 'ar' ? 'التردد المتوقع:' : 'Expected frequency:'}
                        </span>
                        <span className="font-bold text-slate-800 font-mono">
                          {status.frequency}
                        </span>
                      </div>
                      
                      {/* Last Recorded Value & Date/Time */}
                      <div className="border-t border-slate-100 pt-1.5 mt-1 text-[11px] flex items-center justify-between">
                        <span className="text-slate-400 font-medium">
                          {language === 'ar' ? 'آخر قراءة مسجلة:' : 'Last recorded:'}
                        </span>
                        {status.lastRecordedValue ? (
                          <span className="font-bold text-[#0F4C81] font-mono">
                            {status.lastRecordedValue} {status.unit}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            {language === 'ar' ? 'لم تسجل بعد' : 'Not recorded yet'}
                          </span>
                        )}
                      </div>

                      {status.lastRecordedDate && (
                        <div className="text-[10px] text-slate-400 font-mono text-right rtl:text-left">
                          {status.lastRecordedDate} &bull; {status.lastRecordedTime || ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  {!status.isRecordedToday && onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('/patient-daily-log')}
                      className="w-full py-2 bg-white hover:bg-blue-50 text-[#0F4C81] border border-blue-200 hover:border-blue-300 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{language === 'ar' ? 'تسجيل قراءة اليوم' : "Record Today's Reading"}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: RECENT MONITORING NOTIFICATIONS (Step 5) */}
          {monitoringNotifications.length > 0 && (
            <div id="monitoring-notifications-section" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="font-bold text-base text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-[#0F4C81]" />
                    <span>{language === 'ar' ? 'إشعارات وتنبيهات المتابعة الأخيرة' : 'RECENT MONITORING NOTIFICATIONS'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'ar'
                      ? 'تذكيرات بمهام القياس المطلوبة وتنبيهات النطاقات المحددة لمعايير المتابعة.'
                      : 'Scheduled tracking reminders and configured threshold notifications.'}
                  </p>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('/patient-notifications')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0F4C81] hover:underline cursor-pointer"
                  >
                    <span>{language === 'ar' ? 'عرض جميع الإشعارات' : 'View All Notifications'}</span>
                    <ArrowUpRight className={`h-3.5 w-3.5 ${isRtl ? 'rotate-[-90deg]' : ''}`} />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {monitoringNotifications.slice(0, 3).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => PatientDataStore.markNotificationRead(notif.id)}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      !notif.read
                        ? notif.type === 'monitoring_alert'
                          ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                          : 'bg-blue-50/50 border-blue-200 shadow-2xs'
                        : 'bg-[#F8FAFC] border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        notif.type === 'monitoring_alert' 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}>
                        {notif.type === 'monitoring_alert' ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{notif.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider font-mono bg-white border border-slate-200 text-slate-600">
                            {notif.type === 'monitoring_alert' ? (language === 'ar' ? 'تنبيه نطاق' : 'Range Alert') : (language === 'ar' ? 'تذكير متابعة' : 'Reminder')}
                          </span>
                          {!notif.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {notif.date} &bull; {notif.time}
                        </p>
                      </div>
                    </div>

                    {!notif.read && (
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono uppercase shrink-0">
                        New
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. ACTIVE MONITORING PARAMETERS & LATEST READINGS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-bold text-base text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-[#0F4C81]" />
                  <span>{language === 'ar' ? 'المعايير المحددة وقيمها الأخيرة' : 'ACTIVE MONITORING & LATEST READINGS'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar'
                    ? 'المعايير المستخرجة من وصفتك الطبية مع أحدث قراءة مسجلة لكل معيار.'
                    : 'Target clinical parameters from your prescription with the latest verified reading for each.'}
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-mono">
                {activePlan.parameters.filter(p => p.isActive).length} {language === 'ar' ? 'نشطة' : 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activePlan.parameters.map((param) => {
                const latestReading = latestReadings[param.id] || latestReadings[param.parameterType];

                return (
                  <div 
                    key={param.id}
                    className="bg-white border border-brand-border hover:border-blue-300 rounded-2xl p-5 shadow-xs transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Icon, Name & Status */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            {getParameterIcon(param.parameterType)}
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-slate-900 leading-snug">
                              {param.displayName}
                            </h4>
                            <span className="inline-block mt-0.5 font-mono text-[11px] font-bold text-[#0F4C81] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {language === 'ar' ? 'الوحدة:' : 'Unit:'} {param.unit}
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          <span>{language === 'ar' ? 'نشط' : 'Active'}</span>
                        </span>
                      </div>

                      {/* Frequency & Reason */}
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                            {language === 'ar' ? 'التكرار / الجدول' : 'Frequency'}
                          </span>
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-[#0F4C81]" />
                            <span>{param.frequency}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                            {language === 'ar' ? 'سبب المتابعة السريرية' : 'Monitoring Reason'}
                          </span>
                          <p className="text-slate-700 font-medium leading-relaxed">
                            {param.reasonForMonitoring}
                          </p>
                        </div>

                        {/* LATEST RECORDED READING */}
                        {latestReading ? (
                          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[#0F4C81] text-[10px] uppercase font-bold tracking-wider block">
                                {language === 'ar' ? 'آخر قراءة مسجلة' : 'Latest Reading'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {latestReading.date} &bull; {latestReading.time}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5 pt-0.5">
                              <span className="text-lg font-extrabold text-[#0F4C81] font-mono">
                                {latestReading.value}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-600">
                                {param.unit}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-xs">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                              {language === 'ar' ? 'آخر قراءة مسجلة' : 'Latest Reading'}
                            </span>
                            <p className="text-slate-500 italic mt-0.5 text-xs">
                              {language === 'ar' ? 'لا توجد قراءة مسجلة بعد.' : 'No reading recorded yet.'}
                            </p>
                          </div>
                        )}

                        {/* Consultation Baseline Reading */}
                        {param.baselineValue && (
                          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs font-mono">
                            <span className="text-slate-500 text-[11px]">
                              {language === 'ar' ? 'القراءة المرجعية بالعيادة:' : 'Consultation Baseline:'}
                            </span>
                            <span className="font-semibold text-slate-700">
                              {param.baselineValue}
                            </span>
                          </div>
                        )}

                        {param.instructions && (
                          <p className="text-[11px] text-slate-500 italic pt-0.5">
                            <span className="font-semibold">{language === 'ar' ? 'إرشاد القياس:' : 'Instruction:'} </span>
                            {param.instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action & Footer metadata */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => onNavigate('/patient-daily-log')}
                          className="w-full py-2 bg-[#F8FAFC] hover:bg-blue-50 text-[#0F4C81] border border-blue-100 hover:border-blue-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{language === 'ar' ? 'تسجيل قراءة في السجل اليومي' : "Record Reading in Daily Log"}</span>
                        </button>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{language === 'ar' ? 'تاريخ البدء:' : 'Start:'} {param.startDate}</span>
                        <span>ID: {param.id.slice(-8)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. HEALTH TRENDS AND HISTORICAL CHARTS (Step 4) */}
          <div className="pt-2">
            <HealthTrendChart
              parameters={availableParameters}
              readingsByParam={readingsByParam}
              selectedParamId={selectedParamId}
              onSelectParam={setSelectedParamId}
              timeRange={timeRange}
              onChangeTimeRange={setTimeRange}
              onRecordReading={() => onNavigate && onNavigate('/patient-daily-log')}
              language={language}
              isRtl={isRtl}
            />
          </div>

          {/* 4. RECENT HEALTH READING HISTORY (Summarized View) */}
          <div id="health-history-section" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <History className="h-4 w-4 text-[#0F4C81]" />
                  <span>{language === 'ar' ? 'سجل القراءات الأخير' : 'RECENT HEALTH READING HISTORY'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar'
                    ? 'قائمة بالقراءات المسجلة حديثاً مع الأعراض والملاحظات المرفقة.'
                    : 'Summarized chronological archive of verified patient health entries.'}
                </p>
              </div>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/patient-daily-log')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C81] hover:text-[#0c3c66] hover:underline cursor-pointer"
                >
                  <span>{language === 'ar' ? 'فتح السجل اليومي الكامل' : 'Open Full Daily Health Log'}</span>
                  <ArrowUpRight className={`h-4 w-4 ${isRtl ? 'rotate-[-90deg]' : ''}`} />
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
                <ClipboardList className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  {language === 'ar' 
                    ? 'لم يتم تسجيل أي قراءات صحية بعد في سجلك.' 
                    : 'No health reading records submitted yet.'}
                </p>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('/patient-daily-log')}
                    className="px-3.5 py-1.5 bg-[#0F4C81] text-white text-xs font-semibold rounded-lg shadow-2xs hover:bg-[#0c3c66] transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'تسجيل أول قراءة الآن' : 'Record First Reading Now'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 5).map((log) => (
                  <div 
                    key={log.id} 
                    className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all space-y-3"
                  >
                    {/* Header Row: Date & Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#0F4C81]" />
                          <span>{log.date}</span>
                        </span>
                        <span className="text-slate-300 text-xs">&bull;</span>
                        <span className="text-xs text-slate-600 font-mono flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{log.time}</span>
                        </span>
                      </div>

                      <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {log.id.slice(-10)}
                      </span>
                    </div>

                    {/* Parameter Values Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
                      {log.readings.map((r, rIdx) => (
                        <div key={rIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                            {r.displayName}
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="font-bold font-mono text-sm text-slate-800">
                              {r.value}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {r.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Symptoms Tags */}
                    {log.symptoms && log.symptoms.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                        <span className="text-[11px] font-bold text-slate-500">
                          {language === 'ar' ? 'الأعراض:' : 'Symptoms:'}
                        </span>
                        {log.symptoms.map((sym, sIdx) => (
                          <span 
                            key={sIdx}
                            className="text-[11px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-md font-medium"
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Patient Notes */}
                    {log.notes && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 italic">
                        <span className="font-semibold text-slate-700 not-italic">
                          {language === 'ar' ? 'ملاحظة:' : 'Note:'}
                        </span>{' '}
                        {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prospective Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600">
            <Info className="h-4 w-4 text-[#0F4C81] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-slate-800">
                {language === 'ar' ? 'نظام المتابعة والمؤشرات الزمنية متصل بالوصفة' : 'Health Monitoring Trends & History Active'}
              </p>
              <p className="leading-relaxed">
                {language === 'ar'
                  ? 'يتم تحديث الرسوم البيانية وسجل القراءات تلقائياً فور حفظ أي قراءة جديدة في السجل اليومي. تعتمد جميع البيانات على القراءات الفعلية للمريض دون أي توليد اصطناعي.'
                  : 'Trends and history update automatically upon submission of each daily health log. All charts and chronological records are derived solely from actual stored patient entries without artificial interpolation.'}
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* NO ACTIVE MONITORING PLAN EMPTY STATE */
        <div className="bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-100 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 bg-white text-[#0F4C81] rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center mx-auto">
            <Activity className="h-8 w-8 text-[#0F4C81]" />
          </div>
          
          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-xl font-bold text-[#1F2937]">
              {language === 'ar' ? 'لا توجد خطة متابعة صحية نشطة حالياً.' : 'No active health monitoring plan.'}
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
              {language === 'ar' 
                ? 'عندما يصدر طبيبك المعالج بروتوكول متابعة سريرية (مثل قياس ضغط الدم الدوري، تتبع مستوى السكر، أو مراقبة الأعراض)، ستظهر المعايير المحددة ومهام التتبع اليومية تلقائياً في هذه الصفحة.'
                : 'When your consulting doctor assigns an active clinical monitoring protocol (such as blood pressure tracking, glucose logs, or symptom check-ins), your targets and scheduled tasks will automatically appear here.'}
            </p>
          </div>

          {onNavigate && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('/patient-prescriptions')}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0F4C81] border border-blue-200 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
              >
                <span>{language === 'ar' ? 'استعراض الوصفات الطبية' : 'Review Prescriptions'}</span>
                <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => onNavigate('/patient-appointments')}
                className="px-4 py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
              >
                <span>{language === 'ar' ? 'طلب موعد متابعة' : 'Book Follow-Up'}</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
