import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Search, 
  Calendar, 
  FileText, 
  Info, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Check, 
  X, 
  AlertCircle, 
  ArrowUpRight, 
  Filter, 
  ChevronDown, 
  Sparkles, 
  Plus, 
  Trash2, 
  RotateCcw, 
  ChevronRight,
  ShieldCheck,
  History,
  Activity
} from 'lucide-react';
import { PatientDataStore } from '../../services/patientStore';
import { ClinicalPrescription } from '../../backend/services/PrescriptionService';
import { PrescriptionModal } from './PrescriptionModal';
import { useLanguage } from '../../LanguageContext';
import { getMedicationPurpose } from '../PrescriptionPDF';
import { MedicationAdherenceService } from '../../services/medicationAdherenceService';
import { AuthService } from '../../services/authService';
import { 
  PrescribedMedicationWithSchedule, 
  TodayMedicationTask, 
  MedicationAdherenceRecord 
} from '../../types/medication';

interface PatientMedicationsViewProps {
  onNavigate?: (path: string) => void;
}

export const PatientMedicationsView: React.FC<PatientMedicationsViewProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  // Data Store States
  const [prescriptions, setPrescriptions] = useState<ClinicalPrescription[]>(() => {
    const profile = PatientDataStore.getProfile();
    return PatientDataStore.getPrescriptions(profile?.patientId);
  });
  const [prescribedMeds, setPrescribedMeds] = useState<PrescribedMedicationWithSchedule[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayMedicationTask[]>([]);
  const [adherenceHistory, setAdherenceHistory] = useState<MedicationAdherenceRecord[]>([]);
  const [adherenceStats, setAdherenceStats] = useState({ totalRecords: 0, takenCount: 0, skippedCount: 0, adherenceRate: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [historyMedFilter, setHistoryMedFilter] = useState<string>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'Taken' | 'Skipped'>('all');

  // Modal States
  const [selectedPrescription, setSelectedPrescription] = useState<ClinicalPrescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detailed Dose Logging Popover / Modal
  const [activeLoggingTask, setActiveLoggingTask] = useState<TodayMedicationTask | null>(null);
  const [logStatus, setLogStatus] = useState<'Taken' | 'Skipped'>('Taken');
  const [logTime, setLogTime] = useState<string>('');
  const [logNotes, setLogNotes] = useState<string>('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  const refreshData = () => {
    const profile = PatientDataStore.getProfile();
    const pId = profile?.patientId;

    // Proactively evaluate reminders for active patient
    MedicationAdherenceService.evaluateMedicationReminders(pId);
    
    const rxList = PatientDataStore.getPrescriptions(pId);
    const medsWithSchedule = MedicationAdherenceService.getPrescribedMedicationsWithSchedule(pId);
    const tasks = MedicationAdherenceService.getTodayMedicationTasks(pId);
    const history = PatientDataStore.getMedicationAdherence(pId);
    const stats = MedicationAdherenceService.getAdherenceStats(pId);

    setPrescriptions(rxList);
    setPrescribedMeds(medsWithSchedule);
    setTodayTasks(tasks);
    setAdherenceHistory(history);
    setAdherenceStats(stats);
  };

  const syncServerPrescriptions = async () => {
    try {
      const user = AuthService.getUser();
      const profile = PatientDataStore.getProfile();
      const pId = user?.patientId || profile?.patientId || 'PID-2026-004';

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
      console.warn("Could not sync server prescriptions:", e);
    }
  };

  useEffect(() => {
    refreshData();
    syncServerPrescriptions();
    window.addEventListener('patient-data-updated', refreshData);
    return () => window.removeEventListener('patient-data-updated', refreshData);
  }, []);

  // Quick Action Handlers
  const handleQuickMarkTaken = (task: TodayMedicationTask) => {
    const profile = PatientDataStore.getProfile();
    MedicationAdherenceService.recordMedicationIntake({
      patientId: profile?.patientId,
      prescriptionId: task.medication.prescriptionId,
      medicineName: task.medication.medicineName,
      scheduledOccurrence: task.occurrence,
      status: 'Taken',
      notes: 'Recorded via quick-action'
    });
  };

  const handleQuickMarkSkipped = (task: TodayMedicationTask) => {
    const profile = PatientDataStore.getProfile();
    MedicationAdherenceService.recordMedicationIntake({
      patientId: profile?.patientId,
      prescriptionId: task.medication.prescriptionId,
      medicineName: task.medication.medicineName,
      scheduledOccurrence: task.occurrence,
      status: 'Skipped',
      notes: 'Marked skipped via quick-action'
    });
  };

  const handleOpenDetailedLog = (task: TodayMedicationTask, defaultStatus: 'Taken' | 'Skipped' = 'Taken') => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    setActiveLoggingTask(task);
    setLogStatus(defaultStatus);
    setLogTime(task.adherenceRecord?.time || nowTime);
    setLogNotes(task.adherenceRecord?.notes || '');
  };

  const handleSaveDetailedLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoggingTask) return;

    setIsSavingLog(true);
    const profile = PatientDataStore.getProfile();
    MedicationAdherenceService.recordMedicationIntake({
      patientId: profile?.patientId,
      prescriptionId: activeLoggingTask.medication.prescriptionId,
      medicineName: activeLoggingTask.medication.medicineName,
      scheduledOccurrence: activeLoggingTask.occurrence,
      status: logStatus,
      time: logTime || undefined,
      notes: logNotes || undefined
    });

    setIsSavingLog(false);
    setActiveLoggingTask(null);
  };

  const handleDeleteAdherenceRecord = (id: string) => {
    MedicationAdherenceService.deleteMedicationAdherence(id);
  };

  const handleOpenPrescriptionModal = (rx: ClinicalPrescription) => {
    setSelectedPrescription(rx);
    setIsModalOpen(true);
  };

  // Filtered medications
  const filteredMeds = prescribedMeds.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (m.medicineName || '').toLowerCase().includes(q) ||
      (m.instructions || '').toLowerCase().includes(q) ||
      (m.diagnosis || '').toLowerCase().includes(q) ||
      (m.purpose || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return m.status === 'Active';
    if (statusFilter === 'completed') return m.status === 'Completed';
    return true;
  });

  // Filtered history
  const filteredHistory = adherenceHistory.filter((item) => {
    if (historyMedFilter !== 'all' && item.medicineName.toLowerCase() !== historyMedFilter.toLowerCase()) {
      return false;
    }
    if (historyStatusFilter !== 'all' && item.status !== historyStatusFilter) {
      return false;
    }
    return true;
  });

  const todayFormatted = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const uniqueMedNames = Array.from(new Set(prescribedMeds.map(m => m.medicineName)));

  return (
    <div id="patient-medications-view" className="space-y-8 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right pb-12">
      
      {/* 1. HEADER & SEARCH */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#0F4C81] font-bold uppercase tracking-wider mb-1 font-mono">
            <Pill className="h-4 w-4" />
            <span>{language === 'ar' ? 'الأدوية المعتمدة ومتابعة الالتزام' : 'Medication Monitoring & Adherence'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? 'الأدوية الموصوفة وجدول الجرعات' : 'Prescribed Medications'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1 max-w-2xl">
            {language === 'ar' 
              ? 'تتبع أدوية استشاراتك السريرية، جدول أخذ الجرعات اليومي، وسجل التزامك الشخصي دون تعديل الوصفة الأصلية.' 
              : 'Direct from your clinical prescriptions. Track daily intake schedules, record doses taken or skipped, and review complete adherence history.'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالاسم، الجرعة، أو الغرض...' : 'Search medicine, purpose, or dose...'}
            className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-4 py-2.5 bg-[#F8FAFC] border border-brand-border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Awaiting Consultation Banner */}
      {prescriptions.length === 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
              <Pill className="h-5 w-5 text-amber-800" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-900">
                {language === 'ar' ? 'بانتظار إتمام الاستشارة السريرية' : 'Awaiting Clinical Consultation'}
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 max-w-3xl">
                {language === 'ar'
                  ? 'لا توجد أدوية مصروفة حالياً. يتم إصدار الوصفات الدوائية، جدول الجرعات، ومتابعة الالتزام تلقائياً فقط بعد أن يُكمل الطبيب جلسة الاستشارة السريرية ويصدر الوصفة الطبية المعتمدة.'
                  : 'No medicines have been prescribed yet. Medication regimens, dose schedules, and adherence records will only be generated after your doctor completes a consultation session and authorizes a clinical prescription.'}
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/patient-appointments')}
              className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-semibold text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              {language === 'ar' ? 'حجز موعد استشارة' : 'Book Consultation'}
            </button>
          )}
        </div>
      )}

      {/* 2. STATS SUMMARY BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#0F4C81] rounded-xl">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {language === 'ar' ? 'إجمالي الأدوية' : 'Prescribed Medicines'}
            </span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {prescribedMeds.length}
            </span>
          </div>
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {language === 'ar' ? 'البروتوكولات النشطة' : 'Active Courses'}
            </span>
            <span className="text-lg font-bold text-emerald-700 font-mono">
              {prescribedMeds.filter(m => m.status === 'Active').length}
            </span>
          </div>
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {language === 'ar' ? 'تسجيلات اليوم' : "Today's Intake"}
            </span>
            <span className="text-lg font-bold text-[#0F4C81] font-mono">
              {todayTasks.filter(t => t.status !== 'Not Recorded').length} / {todayTasks.length}
            </span>
          </div>
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {language === 'ar' ? 'معدل الالتزام العام' : 'Overall Adherence'}
            </span>
            <span className="text-lg font-bold text-purple-700 font-mono">
              {adherenceStats.totalRecords > 0 ? `${adherenceStats.adherenceRate}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TODAY'S MEDICATION SCHEDULE & TRACKING SECTION */}
      <div id="todays-medication-schedule-section" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {language === 'ar' ? 'جدول جرعات اليوم' : "Today's Medication Schedule"}
                </h2>
                <span className="text-[11px] font-mono font-bold text-[#0F4C81] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  {todayFormatted}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ar'
                  ? 'سجل الجرعات التي تم أخذها أو تخطيها اليوم لمتابعة خطتك العلاجية بدقة.'
                  : 'Record whether you took or skipped each scheduled dose today to maintain your therapeutic routine.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {language === 'ar' ? 'الإنجاز اليومي:' : 'Daily Progress:'}
            </span>
            <span className="text-xs font-bold text-[#0F4C81] font-mono bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
              {todayTasks.filter(t => t.status === 'Taken').length} {language === 'ar' ? 'أُخذ' : 'taken'} / {todayTasks.length} {language === 'ar' ? 'جرعات' : 'doses'}
            </span>
          </div>
        </div>

        {/* Tasks List */}
        {todayTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayTasks.map((task, idx) => {
              const isRecorded = task.status !== 'Not Recorded';
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    task.status === 'Taken' 
                      ? 'bg-emerald-50/40 border-emerald-200' 
                      : task.status === 'Skipped' 
                      ? 'bg-slate-50 border-slate-300' 
                      : 'bg-[#F8FAFC] border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-[#0F4C81] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-blue-100">
                            {task.medication.strength || 'Standard'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {task.occurrence}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 mt-1">
                          {task.medication.medicineName}
                        </h3>
                      </div>

                      {/* Status indicator pill */}
                      {task.status === 'Taken' ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                          <Check className="h-3 w-3" />
                          <span>{language === 'ar' ? 'تم أخذ الجرعة' : 'Taken'}</span>
                        </span>
                      ) : task.status === 'Skipped' ? (
                        <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300 flex items-center gap-1 shrink-0">
                          <X className="h-3 w-3" />
                          <span>{language === 'ar' ? 'تم التخطي' : 'Skipped'}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" />
                          <span>{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <p className="font-semibold text-slate-800">
                        {language === 'ar' ? 'الجرعة:' : 'Dosage:'} <span className="font-normal">{task.medication.dosage}</span>
                      </p>
                      {task.medication.instructions && task.medication.instructions !== 'Not Mentioned' && (
                        <p className="text-[11px] text-slate-500 italic">
                          "{task.medication.instructions}"
                        </p>
                      )}
                    </div>

                    {/* Recorded details if any */}
                    {task.adherenceRecord && (
                      <div className="text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-0.5">
                        <div className="flex items-center justify-between text-slate-600 font-mono text-[10px]">
                          <span>{language === 'ar' ? 'وقت التسجيل:' : 'Logged at:'}</span>
                          <span className="font-bold text-slate-800">{task.adherenceRecord.time}</span>
                        </div>
                        {task.adherenceRecord.notes && (
                          <p className="text-slate-600 italic pt-1 border-t border-slate-100 mt-1">
                            "{task.adherenceRecord.notes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                    {!isRecorded ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleQuickMarkTaken(task)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{language === 'ar' ? 'أُخذت' : 'Mark Taken'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickMarkSkipped(task)}
                          className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>{language === 'ar' ? 'تخطي' : 'Mark Skipped'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDetailedLog(task, 'Taken')}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          title={language === 'ar' ? 'إضافة ملاحظات أو تعديل الوقت' : 'Add custom notes or time'}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailedLog(task, task.status === 'Taken' ? 'Skipped' : 'Taken')}
                          className="text-xs font-semibold text-[#0F4C81] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{language === 'ar' ? 'تعديل السجل / ملاحظة' : 'Edit note / status'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdherenceRecord(task.adherenceRecord!.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>{language === 'ar' ? 'إلغاء التسجيل' : 'Undo'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
            <Pill className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              {language === 'ar' ? 'لا توجد أدوية مجدولة لليوم' : 'No active medications scheduled for today.'}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {language === 'ar' 
                ? 'الأدوية وجداول الجرعات اليومية يتم إنشاؤها تلقائياً بعد إتمام استشارتك مع الطبيب وإصدار الوصفة الطبية.'
                : 'Medication regimens and daily dose schedules are generated only after a consultation is completed and your clinical prescription is authorized.'}
            </p>
          </div>
        )}
      </div>

      {/* 4. PRESCRIBED MEDICATIONS DIRECTORY */}
      <div id="prescribed-medications-directory" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'قائمة الأدوية المعتمدة' : 'Prescribed Medications Directory'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'ar' 
                ? 'جميع الأدوية المصروفة رسمياً مع الجرعة، مدة العلاج، والجدول المستخرج من الوصفة.'
                : 'All officially prescribed medications with dosage, duration, and schedule derived directly from prescriptions.'}
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-brand-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#0F4C81] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#0F4C81]'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'All'} ({prescribedMeds.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-[#0F4C81] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#0F4C81]'
              }`}
            >
              {language === 'ar' ? 'النشطة' : 'Active'} ({prescribedMeds.filter(m => m.status === 'Active').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-[#0F4C81] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#0F4C81]'
              }`}
            >
              {language === 'ar' ? 'المكتملة' : 'Completed'} ({prescribedMeds.filter(m => m.status === 'Completed').length})
            </button>
          </div>
        </div>

        {/* Medications Cards Grid */}
        {filteredMeds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeds.map((med, idx) => (
              <div
                key={idx}
                className="bg-white border border-brand-border hover:border-blue-300 rounded-2xl p-6 shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  {/* Card Header with Badges */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-blue-50 text-[#0F4C81] rounded-xl shrink-0">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider block font-mono">
                          {med.strength || 'Standard Strength'}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 leading-tight">
                          {med.medicineName}
                        </h3>
                      </div>
                    </div>

                    {/* Active vs Completed Status Badge */}
                    <div>
                      {med.status === 'Active' ? (
                        <span className="text-[10px] font-bold font-mono text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{language === 'ar' ? 'علاج نشط' : 'Active'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          {language === 'ar' ? 'مكتمل' : 'Completed'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Clinical Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {language === 'ar' ? 'الجرعة' : 'Dosage'}
                      </span>
                      <span className="font-bold text-slate-900">{med.dosage || 'As advised'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {language === 'ar' ? 'التكرار' : 'Frequency'}
                      </span>
                      <span className="font-bold text-[#0F4C81]">{med.frequency || 'Daily'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {language === 'ar' ? 'مدة العلاج' : 'Duration'}
                      </span>
                      <span className="font-bold text-slate-800">{med.duration || 'As directed'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {language === 'ar' ? 'تاريخ الوصفة' : 'Prescription Date'}
                      </span>
                      <span className="font-bold text-slate-700 font-mono text-[11px]">{med.prescriptionDate}</span>
                    </div>
                  </div>

                  {/* Derived Daily Schedule Occurrences */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {language === 'ar' ? 'جدول الجرعات المستخرج:' : 'Derived Schedule Occurrences:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {med.scheduleOccurrences.map((occ, oIdx) => (
                        <span 
                          key={oIdx}
                          className={`text-xs px-2.5 py-0.5 rounded-md font-semibold font-mono ${
                            occ.includes('not specified')
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-white text-[#0F4C81] border border-blue-200 shadow-2xs'
                          }`}
                        >
                          {occ}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Duration Timeline Info */}
                  {med.durationDays && med.durationDays > 0 && (
                    <div className="text-[11px] text-slate-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
                      <span className="font-medium">
                        {language === 'ar' ? 'مدة الكورس:' : 'Course length:'} {med.durationDays} {language === 'ar' ? 'أيام' : 'days'}
                      </span>
                      {med.endDate && (
                        <span className="font-mono text-slate-700 font-bold">
                          {med.status === 'Completed' ? 'Concluded: ' : 'Ends: '}{med.endDate}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Purpose / Patient Education */}
                  <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#0F4C81]">
                      <Info className="h-3.5 w-3.5" />
                      <span>{language === 'ar' ? 'الغرض الدوائي:' : 'What this medicine helps with:'}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-[11px]">
                      {med.purpose || getMedicationPurpose(med.medicineName)}
                    </p>
                  </div>

                  {/* Doctor's Usage Instructions */}
                  {med.instructions && med.instructions !== 'Not Mentioned' && (
                    <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                        {language === 'ar' ? 'إرشادات الاستخدام الموصى بها' : "Doctor's Instructions"}
                      </span>
                      <p className="text-slate-700 italic">"{med.instructions}"</p>
                    </div>
                  )}
                </div>

                {/* Footer with doctor name and view prescription button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                    <span className="block font-medium text-slate-700">{med.consultingDoctor}</span>
                    <span className="text-[10px] text-slate-400">{med.diagnosis}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPrescriptionModal(med.prescriptionRef)}
                    className="px-3 py-1.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>{language === 'ar' ? 'عرض الوصفة' : 'View Rx'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-brand-border rounded-2xl p-12 text-center space-y-3">
            <Pill className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-700">
              {language === 'ar' ? 'لا توجد أدوية موصوفة' : 'No Medications Prescribed Yet'}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {language === 'ar'
                ? 'الأدوية المعتمدة من قبل الطبيب أثناء استشاراتك السريرية ستظهر تلقائياً في هذا القسم فور انتهاء جلسة الاستشارة وإصدار الوصفة الطبية.'
                : 'Medicines will only appear here once your doctor conducts a clinical consultation session and generates your prescription with verified values.'}
            </p>
          </div>
        )}
      </div>

      {/* 5. MEDICATION ADHERENCE HISTORY */}
      <div id="medication-adherence-history-section" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {language === 'ar' ? 'سجل الالتزام بالأدوية' : 'Medication Adherence History'}
                </h2>
                <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                  {adherenceHistory.length} {language === 'ar' ? 'سجلات' : 'records'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ar' 
                  ? 'سجل زمني لجميع الجرعات المسجلة كـ "تم الأخذ" أو "تم التخطي" مع التوقيت والملاحظات.'
                  : 'Historical timeline of recorded doses (Taken / Skipped) with time-stamps and patient intake notes.'}
              </p>
            </div>
          </div>

          {/* History Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter by Medicine */}
            <div className="relative">
              <select
                value={historyMedFilter}
                onChange={(e) => setHistoryMedFilter(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-[#F8FAFC] border border-brand-border rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-[#0F4C81] cursor-pointer appearance-none"
              >
                <option value="all">{language === 'ar' ? 'جميع الأدوية' : 'All Medicines'}</option>
                {uniqueMedNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-brand-border">
              <button
                type="button"
                onClick={() => setHistoryStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyStatusFilter === 'all'
                    ? 'bg-[#0F4C81] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-[#0F4C81]'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setHistoryStatusFilter('Taken')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyStatusFilter === 'Taken'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                {language === 'ar' ? 'أُخذ ✓' : 'Taken ✓'}
              </button>
              <button
                type="button"
                onClick={() => setHistoryStatusFilter('Skipped')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyStatusFilter === 'Skipped'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {language === 'ar' ? 'تخطي ✕' : 'Skipped ✕'}
              </button>
            </div>
          </div>
        </div>

        {/* Adherence Records Table / List */}
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead>
                <tr className="bg-[#F8FAFC] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-y border-slate-200">
                  <th className="py-3 px-4">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'الدواء' : 'Medicine'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'الجرعة المجدولة' : 'Scheduled Timing'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'ملاحظات المريض' : 'Patient Notes'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{record.date}</div>
                      <div className="text-[10px] font-mono text-slate-400">{record.time}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {record.medicineName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] text-[#0F4C81] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-semibold">
                        {record.scheduledOccurrence || 'Daily'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {record.status === 'Taken' ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>{language === 'ar' ? 'تم أخذ الدواء' : 'Taken'}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-200 border border-slate-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <X className="h-3 w-3" />
                          <span>{language === 'ar' ? 'تم التخطي' : 'Skipped'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      {record.notes ? (
                        <span className="italic">"{record.notes}"</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          {language === 'ar' ? 'لا توجد ملاحظات' : 'No notes entered'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteAdherenceRecord(record.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title={language === 'ar' ? 'حذف هذا السجل' : 'Delete this record'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 italic bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-200">
            {language === 'ar' 
              ? 'لا توجد سجلات التزام سابقة مطابقة للتصفية.' 
              : 'No medication adherence records found for this filter.'}
          </div>
        )}
      </div>

      {/* 6. DETAILED DOSE RECORDING MODAL */}
      {activeLoggingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-scale-up text-left rtl:text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#0F4C81] rounded-xl">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {language === 'ar' ? 'تسجيل جرعة الدواء' : 'Record Dose Intake'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeLoggingTask.medication.medicineName} &bull; {activeLoggingTask.occurrence}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveLoggingTask(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDetailedLog} className="space-y-4">
              {/* Intake status selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  {language === 'ar' ? 'هل تم أخذ الجرعة؟' : 'Did you take this dose?'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogStatus('Taken')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      logStatus === 'Taken'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>{language === 'ar' ? 'نعم، تم أخذها' : 'Yes, Taken'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogStatus('Skipped')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      logStatus === 'Skipped'
                        ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className="h-4 w-4 text-slate-600" />
                    <span>{language === 'ar' ? 'تم التخطي' : 'Skipped'}</span>
                  </button>
                </div>
              </div>

              {/* Time taken input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'ar' ? 'وقت الأخذ / التخطي' : 'Time Recorded'}
                </label>
                <input
                  type="text"
                  value={logTime}
                  onChange={(e) => setLogTime(e.target.value)}
                  placeholder="e.g. 09:30 AM"
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-brand-border rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all font-mono"
                />
              </div>

              {/* Optional notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Patient Notes (Optional)'}
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: أُخذ مع الطعام، غثيان خفيف...' : 'e.g. Taken with food and warm water, mild nausea...'}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-brand-border rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLoggingTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingLog}
                  className="px-5 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{language === 'ar' ? 'حفظ السجل' : 'Save Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PRESCRIPTION VIEWER MODAL */}
      <PrescriptionModal
        prescription={selectedPrescription}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
};
