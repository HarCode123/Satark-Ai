import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  FileText, 
  HeartPulse, 
  Clock, 
  ChevronRight, 
  Eye, 
  Download, 
  ShieldAlert, 
  CheckCircle2, 
  Activity, 
  Pill, 
  Bell, 
  ClipboardList, 
  AlertCircle,
  TrendingUp,
  Stethoscope
} from 'lucide-react';
import { PatientDataStore, PatientProfileData, AppointmentItem, PatientNotificationItem } from '../../services/patientStore';
import { MonitoringAlertService } from '../../services/monitoringAlertService';
import { MedicationAdherenceService } from '../../services/medicationAdherenceService';
import { ClinicalPrescription } from '../../backend/services/PrescriptionService';
import { MonitoringPlan, HealthLogReading, ParameterMonitoringStatus } from '../../types/monitoring';
import { TodayMedicationTask } from '../../types/medication';
import { PrescriptionModal } from './PrescriptionModal';
import { useLanguage } from '../../LanguageContext';
import { RoutePath } from '../../types';
import { AuthService } from '../../services/authService';

interface PatientDashboardViewProps {
  onNavigate: (route: RoutePath) => void;
}

export const PatientDashboardView: React.FC<PatientDashboardViewProps> = ({ onNavigate }) => {
  const { language, isRtl } = useLanguage();

  const [profile, setProfile] = useState<PatientProfileData>(PatientDataStore.getProfile());
  const [appointments, setAppointments] = useState<AppointmentItem[]>(PatientDataStore.getAppointments());
  const [prescriptions, setPrescriptions] = useState<ClinicalPrescription[]>(PatientDataStore.getPrescriptions());
  const [notifications, setNotifications] = useState<PatientNotificationItem[]>(PatientDataStore.getNotifications());
  const [activePlan, setActivePlan] = useState<MonitoringPlan | null>(() => PatientDataStore.getActiveMonitoringPlan());
  const [latestReadings, setLatestReadings] = useState<Record<string, HealthLogReading & { date: string; time: string }>>(() => PatientDataStore.getLatestReadings());
  const [hasLoggedToday, setHasLoggedToday] = useState<boolean>(() => PatientDataStore.hasLoggedToday());
  const [monitoringStatuses, setMonitoringStatuses] = useState<ParameterMonitoringStatus[]>(() => 
    MonitoringAlertService.getTodayMonitoringStatuses()
  );
  const [todayMedTasks, setTodayMedTasks] = useState<TodayMedicationTask[]>(() => 
    MedicationAdherenceService.getTodayMedicationTasks()
  );

  // Modal State
  const [selectedPrescription, setSelectedPrescription] = useState<ClinicalPrescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = () => {
    const activeProfile = PatientDataStore.getProfile();
    const pId = activeProfile?.patientId;

    // Evaluate monitoring and medication reminders proactively (deduplicated)
    MonitoringAlertService.evaluateMonitoringReminders(pId);
    MedicationAdherenceService.evaluateMedicationReminders(pId);
    setProfile(activeProfile);
    setAppointments(PatientDataStore.getAppointments());
    setPrescriptions(PatientDataStore.getPrescriptions(pId));
    setNotifications(PatientDataStore.getNotifications());
    setActivePlan(PatientDataStore.getActiveMonitoringPlan(pId));
    setLatestReadings(PatientDataStore.getLatestReadings(pId));
    setHasLoggedToday(PatientDataStore.hasLoggedToday(pId));
    setMonitoringStatuses(MonitoringAlertService.getTodayMonitoringStatuses(pId));
    setTodayMedTasks(MedicationAdherenceService.getTodayMedicationTasks(pId));
  };

  const syncServerPrescriptions = async () => {
    try {
      const user = AuthService.getUser();
      const p = PatientDataStore.getProfile();
      const pId = user?.patientId || p?.patientId || 'PID-2026-004';

      // Also ensure latest profile demographics from backend DB
      await PatientDataStore.syncProfileFromServer(pId);

      const response = await fetch(`/api/patient/prescriptions?patientId=${encodeURIComponent(pId)}`, {
        headers: AuthService.getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          result.data.forEach((rx: any) => {
            PatientDataStore.addPrescription(rx);
          });
          refreshData();
        }
      }
    } catch (e) {
      console.warn("Could not sync server prescriptions in dashboard:", e);
    }
  };

  useEffect(() => {
    refreshData();
    syncServerPrescriptions();
    window.addEventListener('patient-data-updated', refreshData);
    return () => window.removeEventListener('patient-data-updated', refreshData);
  }, []);

  const upcomingAppointments = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Pending');
  const nextAppointment = upcomingAppointments[0];
  const latestPrescription = prescriptions[0];

  // Extract all active medications from latest prescription
  const currentMedications = latestPrescription?.medications || [];

  const handleOpenPrescription = (rx: ClinicalPrescription) => {
    setSelectedPrescription(rx);
    setIsModalOpen(true);
  };

  const handleDownloadPdf = (rx: ClinicalPrescription) => {
    setSelectedPrescription(rx);
    setIsModalOpen(true);
  };

  const handleQuickMarkTaken = (task: TodayMedicationTask) => {
    MedicationAdherenceService.recordMedicationIntake({
      patientId: profile.patientId,
      prescriptionId: task.medication.prescriptionId,
      medicineName: task.medication.medicineName,
      scheduledOccurrence: task.occurrence,
      status: 'Taken',
      notes: 'Recorded from Dashboard'
    });
  };

  const handleQuickMarkSkipped = (task: TodayMedicationTask) => {
    MedicationAdherenceService.recordMedicationIntake({
      patientId: profile.patientId,
      prescriptionId: task.medication.prescriptionId,
      medicineName: task.medication.medicineName,
      scheduledOccurrence: task.occurrence,
      status: 'Skipped',
      notes: 'Recorded from Dashboard'
    });
  };

  const handleUndoDose = (recordId?: string) => {
    if (recordId) {
      MedicationAdherenceService.deleteMedicationAdherence(recordId);
    }
  };

  return (
    <div id="patient-dashboard-view" className="space-y-8 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right">
      
      {/* 1. PATIENT WELCOME & OVERALL HEALTH SUMMARY */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-brand-text-secondary font-medium mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F4C81] border border-blue-100 font-bold">
              {language === 'ar' ? 'بوابة صحة المريض' : 'Patient Health Portal'}
            </span>
            <span>&bull;</span>
            <span className="text-[#0F4C81] font-mono font-bold">{profile.patientId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? `أهلاً بك، ${profile.name}` : `Welcome, ${profile.name}`}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280]">
            {language === 'ar' 
              ? 'لوحة المتابعة الصحية الشاملة. يمكنك تتبع خطتك الصحية، الأدوية، الوصفات والمواعيد القادمة.' 
              : 'Your central healthcare overview. Track monitoring plans, current medications, prescriptions, and upcoming appointments.'}
          </p>
        </div>

        {/* Overall Health Status Bar */}
        <div className="flex items-center gap-4 shrink-0 bg-[#F8FAFC] p-4 rounded-xl border border-brand-border">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <HeartPulse className="h-6 w-6 text-emerald-600 animate-pulse" />
          </div>
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-[#1F2937]">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>{language === 'ar' ? 'الملف الصحي متصل' : 'Patient Record Active'}</span>
            </div>
            <p className="text-[#6B7280] font-medium">
              {language === 'ar' 
                ? `فصيلة الدم: ${profile.bloodGroup} | العمر: ${profile.age} سنة` 
                : `Blood Group: ${profile.bloodGroup} | Age: ${profile.age} Yrs`}
            </p>
            <p className="text-[#0F4C81] font-mono text-[10px]">
              BMI: {profile.bmi}
            </p>
          </div>
        </div>
      </div>

      {/* 2. HEALTH MONITORING HIGHLIGHT BANNER */}
      <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-white border border-blue-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#0F4C81] text-white rounded-xl shadow-xs shrink-0">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-slate-900">
                {language === 'ar' ? 'خطة المتابعة الصحية الذكية' : 'Smart Health Monitoring'}
              </h2>
              {activePlan && activePlan.parameters.length > 0 ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{language === 'ar' ? 'الخطة نشطة' : 'Plan Active'} ({activePlan.parameters.length} {language === 'ar' ? 'معايير' : 'parameters'})</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-mono">
                  {language === 'ar' ? 'قيد الإعداد' : 'Plan Pending'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {language === 'ar' 
                ? 'استكشف معايير المتابعة المستهدفة وسجل القياسات اليومية لربط قراءاتك بطبيبك.' 
                : 'Track vital signs, daily health logs, and clinical targets as prescribed by your physician.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/patient-health-monitoring')}
          className="px-4 py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>{language === 'ar' ? 'فتح مركز المتابعة' : 'Open Monitoring Center'}</span>
          <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* 3. ROW OF 3 PRIMARY HEALTH CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* CARD 1: TODAY'S MONITORING */}
        <div id="dashboard-todays-monitoring" className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-[#0F4C81] rounded-xl">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-[#1F2937]">
                {language === 'ar' ? 'متابعة اليوم' : "Today's Monitoring"}
              </h3>
            </div>
            {monitoringStatuses.length > 0 && (
              <span className="text-[10px] font-mono font-bold text-[#0F4C81] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {monitoringStatuses.filter(s => s.isRecordedToday).length}/{monitoringStatuses.length} {language === 'ar' ? 'مكتمل' : 'Done'}
              </span>
            )}
          </div>

          {monitoringStatuses.length > 0 ? (
            <div className="space-y-2.5">
              <div className="space-y-2">
                {monitoringStatuses.map((status) => (
                  <div 
                    key={status.parameterId}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/90 bg-[#F8FAFC]/80 text-xs transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      {status.isRecordedToday ? (
                        <span className="text-emerald-700 font-bold flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold flex items-center justify-center h-4 w-4 rounded-full bg-amber-100 text-xs">
                          ○
                        </span>
                      )}
                      <span className="font-semibold text-slate-800">{status.displayName}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      {status.isRecordedToday ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {language === 'ar' ? 'تم التسجيل ✓' : 'Recorded'}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {language === 'ar' ? 'قيد الانتظار ○' : 'Tracking pending'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 pt-1 text-center font-medium">
                {monitoringStatuses.every(s => s.isRecordedToday)
                  ? (language === 'ar' ? 'اكتملت جميع تسجيلات المتابعة لليوم' : 'All scheduled health targets recorded for today')
                  : (language === 'ar' ? 'سجل قراءات اليوم لتحديث ملفك الصحي' : 'Submit daily readings to update your health plan')}
              </p>
            </div>
          ) : (
            <div className="p-5 bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200 text-center space-y-2">
              <Clock className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                {language === 'ar' ? 'لا توجد معايير متابعة نشطة لليوم' : 'No Active Monitoring Tasks'}
              </p>
              <p className="text-[11px] text-[#6B7280]">
                {language === 'ar' 
                  ? 'ستظهر هنا تذكيرات القياس اليومية بمجرد اعتماد خطة المتابعة من الطبيب.' 
                  : 'Tasks will appear once your doctor creates a health monitoring plan.'}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('/patient-health-monitoring')}
              className="w-full py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>{language === 'ar' ? 'عرض المتابعة الصحية' : 'View Health Monitoring'}</span>
              <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => onNavigate('/patient-daily-log')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-[#0F4C81] border border-slate-200 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{language === 'ar' ? 'تسجيل صحة اليوم' : "Record Today's Health"}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: LATEST HEALTH READINGS */}
        <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <HeartPulse className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-[#1F2937]">
                {language === 'ar' ? 'آخر القراءات المسجلة' : 'Latest Health Readings'}
              </h3>
            </div>
            {Object.keys(latestReadings).length > 0 ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono">
                {Object.keys(latestReadings).length} Available
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                {language === 'ar' ? 'لا توجد قراءات' : 'No Readings'}
              </span>
            )}
          </div>

          {Object.keys(latestReadings).length > 0 ? (
            <div className="space-y-2 p-3 bg-rose-50/30 rounded-xl border border-rose-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'ar' ? 'أحدث القيم المسجلة ذاتياً' : 'Recent Self-Logged Values'}
              </span>
              <div className="space-y-1.5">
                {(() => {
                  const readingsList = Object.values(latestReadings) as (HealthLogReading & { date: string; time: string })[];
                  const uniqueNames = Array.from(new Set(readingsList.map(r => r.displayName))).slice(0, 3);
                  return uniqueNames.map((name) => {
                    const r = readingsList.find(x => x.displayName === name);
                    if (!r) return null;
                    return (
                      <div key={name} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                        <div>
                          <span className="font-semibold text-slate-800">{r.displayName}</span>
                          <span className="block text-[9px] font-mono text-slate-400">{r.date}</span>
                        </div>
                        <span className="font-mono text-xs text-[#0F4C81] font-extrabold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {r.value} <span className="text-[10px] text-slate-500 font-normal">{r.unit}</span>
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="text-[10px] text-slate-500 pt-0.5 text-center font-medium">
                {language === 'ar' ? 'سجل القراءات محفوظ في السجل الصحي' : 'Recorded in your permanent health journal'}
              </p>
            </div>
          ) : (
            <div className="p-5 bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200 text-center space-y-2">
              <Activity className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                {language === 'ar' ? 'لا توجد قراءات مسجلة ذاتياً' : 'No Self-Logged Readings'}
              </p>
              <p className="text-[11px] text-[#6B7280]">
                {language === 'ar'
                  ? 'عندما تسجل مؤشراتك الحيوية اليومية، ستظهر أحدث قراءاتك فوراً هنا.'
                  : 'Your recent blood pressure, pulse, and glucose logs will appear here.'}
              </p>
            </div>
          )}

          <button
            onClick={() => onNavigate('/patient-health-monitoring')}
            className="w-full py-2.5 bg-[#F8FAFC] hover:bg-rose-50 text-rose-800 border border-rose-100 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{language === 'ar' ? 'عرض المؤشرات المستهدفة' : 'View Monitoring Targets'}</span>
            <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* CARD 3: UPCOMING APPOINTMENT */}
        <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-[#0F4C81] rounded-xl">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-[#1F2937]">
                {language === 'ar' ? 'الموعد القادم' : 'Upcoming Appointment'}
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {nextAppointment ? nextAppointment.status : (language === 'ar' ? 'لا يوجد' : 'None')}
            </span>
          </div>

          {nextAppointment ? (
            <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-xl border border-brand-border">
              <div>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">{language === 'ar' ? 'اسم الطبيب' : 'Doctor Name'}</p>
                <p className="font-extrabold text-base text-[#0F4C81]">{nextAppointment.doctorName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[#6B7280] font-medium">{language === 'ar' ? 'القسم' : 'Department'}</p>
                  <p className="font-bold text-[#1F2937]">{nextAppointment.department}</p>
                </div>
                <div>
                  <p className="text-[#6B7280] font-medium">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                  <p className="font-bold text-emerald-700">{nextAppointment.status}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <Clock className="h-3.5 w-3.5 text-[#0F4C81]" />
                  <span>{nextAppointment.date} &bull; {nextAppointment.time}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 italic bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200">
              {language === 'ar' ? 'لا توجد مواعيد قادمة' : 'No Upcoming Appointments.'}
            </div>
          )}

          <button
            onClick={() => onNavigate('/patient-appointments')}
            className="w-full py-2.5 bg-[#F8FAFC] hover:bg-blue-50 text-[#0F4C81] border border-blue-100 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{language === 'ar' ? 'عرض وإدارة المواعيد' : 'Manage Appointments'}</span>
            <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>

      </div>

      {/* 4. SECONDARY TWO-COLUMN SECTION: CURRENT MEDICATIONS & LATEST PRESCRIPTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT 6 COLS: TODAY'S MEDICATIONS */}
        <div id="dashboard-todays-medications" className="lg:col-span-6 bg-white border border-brand-border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Pill className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-[#1F2937]">
                  {language === 'ar' ? 'أدوية اليوم' : "Today's Medications"}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#0F4C81] bg-blue-50 px-2 py-0.5 rounded">
                {Array.from(new Set(todayMedTasks.map(t => t.medication.medicineName))).length} {language === 'ar' ? 'أدوية نشطة' : 'active medications'}
              </span>
            </div>

            {/* Tracking Summary */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-600 font-medium">
                {language === 'ar' ? 'تسجيلات اليوم:' : "Today's tracking:"}
              </span>
              <span className="font-bold text-[#0F4C81] font-mono">
                {todayMedTasks.filter(t => t.status !== 'Not Recorded').length} {language === 'ar' ? 'من' : 'of'} {todayMedTasks.length} {language === 'ar' ? 'مسجل' : 'recorded'}
              </span>
            </div>

            {todayMedTasks.length > 0 ? (
              <div className="space-y-2.5">
                {todayMedTasks.slice(0, 4).map((task, idx) => (
                  <div key={idx} className="p-3 bg-[#F8FAFC] hover:bg-slate-50/80 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{task.medication.medicineName}</p>
                        <span className="text-[10px] font-mono text-[#0F4C81] bg-blue-50 px-1.5 py-0.5 rounded font-semibold">
                          {task.occurrence}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {task.medication.dosage} &bull; {task.medication.instructions || 'Take as advised'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === 'Taken' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1">
                            <span>✓</span>
                            <span>{language === 'ar' ? 'تم أخذ الدواء' : 'Taken'}</span>
                            {task.adherenceRecord?.time && (
                              <span className="text-emerald-600 font-normal">({task.adherenceRecord.time})</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUndoDose(task.adherenceRecord?.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                            title="Undo recording"
                          >
                            {language === 'ar' ? 'تراجع' : 'Undo'}
                          </button>
                        </div>
                      ) : task.status === 'Skipped' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 font-medium bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1">
                            <span>✕</span>
                            <span>{language === 'ar' ? 'تم التخطي' : 'Skipped'}</span>
                            {task.adherenceRecord?.time && (
                              <span className="text-slate-500 font-normal">({task.adherenceRecord.time})</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUndoDose(task.adherenceRecord?.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                            title="Undo recording"
                          >
                            {language === 'ar' ? 'تراجع' : 'Undo'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-mono">
                            {language === 'ar' ? 'معلق' : 'Pending'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickMarkTaken(task)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Mark as Taken"
                          >
                            <span>✓</span>
                            <span>{language === 'ar' ? 'أُخذ' : 'Taken'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickMarkSkipped(task)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            title="Mark as Skipped"
                          >
                            <span>✕</span>
                            <span>{language === 'ar' ? 'تخطي' : 'Skip'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 italic bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200">
                {language === 'ar' ? 'لا توجد أدوية مجدولة لليوم. ستظهر الأدوية وجدول الجرعات هنا فور إتمام الاستشارة وإصدار الوصفة الطبية.' : 'No active medications for today. Prescribed medications will appear here once your consultation is completed and authorized.'}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('/patient-medications')}
            className="w-full py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs mt-4"
          >
            <span>{language === 'ar' ? 'عرض الأدوية' : 'View Medications'}</span>
            <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* RIGHT 6 COLS: LATEST PRESCRIPTION */}
        <div className="lg:col-span-6 bg-white border border-brand-border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-[#1F2937]">
                  {language === 'ar' ? 'أحدث وصفة طبية' : 'Latest Digital Prescription'}
                </h3>
              </div>
              <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                {latestPrescription ? latestPrescription.patientDetails.date : 'N/A'}
              </span>
            </div>

            {latestPrescription ? (
              <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-xl border border-brand-border">
                <div>
                  <p className="text-xs text-[#6B7280] font-medium">{language === 'ar' ? 'التشخيص الرئيسي' : 'Primary Diagnosis'}</p>
                  <p className="font-bold text-sm text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                    {latestPrescription.provisionalDiagnosis}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">{latestPrescription.patientDetails.consultingDoctor}</span>
                  <span className="font-mono text-[#0F4C81] font-bold">{latestPrescription.medications?.length || 0} Meds Prescribed</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 italic bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200">
                {language === 'ar' ? 'لا توجد وصفات طبية متاحة' : 'No prescriptions available.'}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => latestPrescription && handleOpenPrescription(latestPrescription)}
              disabled={!latestPrescription}
              className="flex-1 py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{language === 'ar' ? 'عرض الوصفة' : 'View Prescription'}</span>
            </button>

            <button
              onClick={() => latestPrescription && handleDownloadPdf(latestPrescription)}
              disabled={!latestPrescription}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              title={language === 'ar' ? 'تحميل ملف PDF' : 'Download PDF'}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 5. RECENT NOTIFICATIONS & ALLERGIES SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Notifications (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-brand-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#0F4C81]" />
              <h3 className="font-bold text-base text-[#1F2937]">
                {language === 'ar' ? 'آخر الإشعارات والتنبيهات' : 'Recent Notifications & Reminders'}
              </h3>
            </div>
            <button
              onClick={() => onNavigate('/patient-notifications')}
              className="text-xs text-[#0F4C81] font-semibold hover:underline cursor-pointer"
            >
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </button>
          </div>

          <div className="space-y-2.5">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200 text-xs flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-slate-300' : 'bg-blue-600 animate-pulse'}`} />
                <div className="flex-1 space-y-0.5">
                  <p className="font-bold text-slate-900">{n.title}</p>
                  <p className="text-slate-600 line-clamp-1">{n.message}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{n.date} &bull; {n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Drug Allergies Banner (4 Cols) */}
        <div className="lg:col-span-4 bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>{language === 'ar' ? 'الحساسية المسجلة' : 'Recorded Drug Allergies'}</span>
            </div>
            <p className="text-xs font-bold text-amber-950 bg-amber-100 p-3 rounded-xl border border-amber-200">
              {profile.allergies || 'No Known Drug Allergies'}
            </p>
          </div>
          <p className="text-[11px] text-amber-800/80">
            {language === 'ar'
              ? 'تأكد من إبلاغ طبيبك بأي حساسية دوائية جديدة قبل بدء أي بروتوكول علاجي.'
              : 'Always verify drug allergies with your physician before starting new medications.'}
          </p>
        </div>

      </div>

      {/* Prescription Viewer Modal */}
      <PrescriptionModal
        prescription={selectedPrescription}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
};
