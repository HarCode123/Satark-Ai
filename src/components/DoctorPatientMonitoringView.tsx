import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  HeartPulse, 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  AlertCircle, 
  FileText, 
  Pill, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Eye, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  Info, 
  PlayCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Check, 
  Bell, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { AuthService } from '../services/authService';
import { PatientDataStore, PatientNotificationItem } from '../services/patientStore';
import { MonitoringService } from '../services/monitoringService';
import { MonitoringAlertService } from '../services/monitoringAlertService';
import { MedicationAdherenceService } from '../services/medicationAdherenceService';
import { 
  MonitoringPlan, 
  MonitoringParameter, 
  HealthLogEntry, 
  HealthLogReading,
  ParameterMonitoringStatus 
} from '../types/monitoring';
import { 
  PrescribedMedicationWithSchedule, 
  MedicationAdherenceRecord 
} from '../types/medication';
import { ClinicalPrescription } from '../backend/services/PrescriptionService';
import { HealthTrendChart, ChartDataPoint } from './patient/HealthTrendChart';
import { PrescriptionModal } from './patient/PrescriptionModal';
import { getMedicationPurpose } from './PrescriptionPDF';

interface DoctorPatientMonitoringViewProps {
  initialPatientId?: string;
  onNavigate: (route: string) => void;
  onStartConsultation?: (patientId: string) => void;
}

interface PatientSummary {
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  bloodGroup?: string;
  phoneNumber?: string;
  email?: string;
  allergies?: string;
}

export const DoctorPatientMonitoringView: React.FC<DoctorPatientMonitoringViewProps> = ({
  initialPatientId = 'PID-2026-001',
  onNavigate,
  onStartConsultation
}) => {
  const { language, isRtl } = useLanguage();

  // Patient Directory State
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Monitoring Data State
  const [monitoringPlan, setMonitoringPlan] = useState<MonitoringPlan | null>(null);
  const [healthLogs, setHealthLogs] = useState<HealthLogEntry[]>([]);
  const [latestReadings, setLatestReadings] = useState<Record<string, HealthLogReading & { date: string; time: string }>>({});
  const [monitoringStatuses, setMonitoringStatuses] = useState<ParameterMonitoringStatus[]>([]);
  const [prescribedMeds, setPrescribedMeds] = useState<PrescribedMedicationWithSchedule[]>([]);
  const [adherenceRecords, setAdherenceRecords] = useState<MedicationAdherenceRecord[]>([]);
  const [monitoringAlerts, setMonitoringAlerts] = useState<PatientNotificationItem[]>([]);

  // Chart Controls State
  const [selectedParamId, setSelectedParamId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('7');

  // Prescription Modal State
  const [selectedPrescription, setSelectedPrescription] = useState<ClinicalPrescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch registered patients from backend directory
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients', {
          headers: AuthService.getAuthHeaders()
        });
        if (response.ok) {
          const res = await response.json();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setPatients(res.data);
            const found = res.data.find((p: any) => p.patientId === selectedPatientId);
            if (found) {
              setSelectedPatient(found);
            } else {
              setSelectedPatient(res.data[0]);
              setSelectedPatientId(res.data[0].patientId);
            }
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load doctor patient list:', e);
      }

      // Fallback patient profile if API is not reachable
      const profile = PatientDataStore.getProfile();
      setSelectedPatient({
        patientId: profile.patientId,
        firstName: profile.name.split(' ')[0] || 'Harini',
        lastName: profile.name.split(' ').slice(1).join(' ') || 'Al-Mansoor',
        age: parseInt(profile.age, 10) || 28,
        gender: profile.gender,
        bloodGroup: profile.bloodGroup,
        phoneNumber: profile.phone,
        email: profile.email,
        allergies: profile.allergies,
        address: profile.address
      });
    };

    fetchPatients();
  }, []);

  // Update selected patient when dropdown changes
  const handleSelectPatient = (pId: string) => {
    setSelectedPatientId(pId);
    const found = patients.find(p => p.patientId === pId);
    if (found) {
      setSelectedPatient(found);
    }
  };

  // Load and refresh patient-specific monitoring data
  const loadPatientMonitoringData = () => {
    // Proactively evaluate reminders & alerts without mutating clinical records
    MonitoringAlertService.evaluateMonitoringReminders(selectedPatientId);
    MedicationAdherenceService.evaluateMedicationReminders(selectedPatientId);

    const plan = PatientDataStore.getActiveMonitoringPlan(selectedPatientId);
    const logs = PatientDataStore.getHealthLogs(selectedPatientId);
    const latest = PatientDataStore.getLatestReadings(selectedPatientId);
    const statuses = MonitoringAlertService.getTodayMonitoringStatuses(selectedPatientId);
    const meds = MedicationAdherenceService.getPrescribedMedicationsWithSchedule(selectedPatientId);
    const adherence = PatientDataStore.getMedicationAdherence(selectedPatientId);
    
    // Retrieve notifications that are monitoring reminders or threshold alerts for selected patient
    const allNotifs = PatientDataStore.getNotifications();
    const alerts = allNotifs.filter(n => 
      (n.id.includes(selectedPatientId) || (!n.id.startsWith('notif-med-') && !n.id.startsWith('notif-reminder-') && !n.id.startsWith('notif-alert-'))) &&
      (n.type === 'monitoring_alert' || 
       n.type === 'monitoring_reminder' || 
       n.type === 'medication_reminder')
    );

    setMonitoringPlan(plan);
    setHealthLogs(logs);
    setLatestReadings(latest);
    setMonitoringStatuses(statuses);
    setPrescribedMeds(meds);
    setAdherenceRecords(adherence);
    setMonitoringAlerts(alerts);

    // Default selected parameter for charts
    if (plan && plan.parameters.length > 0 && !selectedParamId) {
      setSelectedParamId(plan.parameters[0].id);
    }
  };

  useEffect(() => {
    loadPatientMonitoringData();
    window.addEventListener('patient-data-updated', loadPatientMonitoringData);
    return () => window.removeEventListener('patient-data-updated', loadPatientMonitoringData);
  }, [selectedPatientId]);

  // Construct chart readings by parameter
  const readingsByParam: Record<string, ChartDataPoint[]> = {};
  const activeParameters = monitoringPlan?.parameters || [];

  healthLogs.forEach((log) => {
    log.readings.forEach((reading) => {
      const dataPoint: ChartDataPoint = {
        id: `${log.id}-${reading.parameterId}`,
        date: log.date,
        time: log.time,
        timestamp: log.timestamp || new Date(`${log.date}T${log.time || '12:00'}`).getTime(),
        value: reading.value,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        numericValue: reading.numericValue
      };

      if (!readingsByParam[reading.parameterId]) {
        readingsByParam[reading.parameterId] = [];
      }
      readingsByParam[reading.parameterId].push(dataPoint);

      if (!readingsByParam[reading.parameterType]) {
        readingsByParam[reading.parameterType] = [];
      }
      readingsByParam[reading.parameterType].push(dataPoint);
    });
  });

  const activeParam = activeParameters.find(p => p.id === selectedParamId) || activeParameters[0];

  const handleOpenPrescription = (rx: ClinicalPrescription) => {
    setSelectedPrescription(rx);
    setIsModalOpen(true);
  };

  const patientFullName = selectedPatient 
    ? `${selectedPatient.firstName} ${selectedPatient.lastName}` 
    : 'Patient';

  return (
    <div id="doctor-patient-monitoring-view" className="space-y-8 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right pb-16">
      
      {/* 1. TOP BREADCRUMBS & PATIENT SELECTOR HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/patients')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-border hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span>{language === 'ar' ? 'العودة لسجل المرضى' : 'Back to Patient Registry'}</span>
          </button>
          
          <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span>{language === 'ar' ? 'لوحة المتابعة الطبية للمريض' : 'Doctor Patient Monitoring'}</span>
            <span>&bull;</span>
            <span className="font-bold text-[#0F4C81]">{selectedPatientId}</span>
          </div>
        </div>

        {/* Patient Switcher Dropdown */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0">
            <User className="h-4 w-4 text-[#0F4C81]" />
            <span>{language === 'ar' ? 'اختر المريض:' : 'Select Patient:'}</span>
          </span>

          <div className="relative min-w-[220px]">
            <select
              value={selectedPatientId}
              onChange={(e) => handleSelectPatient(e.target.value)}
              className="w-full pl-3 pr-8 rtl:pr-3 rtl:pl-8 py-2 bg-white border border-brand-border rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-[#0F4C81] cursor-pointer appearance-none shadow-2xs"
            >
              {patients.length > 0 ? (
                patients.map(p => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.firstName} {p.lastName} ({p.patientId})
                  </option>
                ))
              ) : (
                <option value="PID-2026-001">Harini Al-Mansoor (PID-2026-001)</option>
              )}
            </select>
            <ChevronDown className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. PATIENT BIO & CLINICAL CONTEXT CARD */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F4C81] to-[#1E6091] text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
            {selectedPatient?.firstName ? selectedPatient.firstName[0] : 'P'}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold bg-[#EAF2F8] text-[#0F4C81] px-2.5 py-0.5 rounded-md border border-blue-100">
                {selectedPatientId}
              </span>
              {selectedPatient?.bloodGroup && (
                <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  {selectedPatient.bloodGroup}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                {selectedPatient?.age || 28} {language === 'ar' ? 'سنة' : 'Yrs'} &bull; {selectedPatient?.gender || 'Female'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
              {patientFullName}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-0.5">
              {selectedPatient?.phoneNumber && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{selectedPatient.phoneNumber}</span>
                </span>
              )}
              {selectedPatient?.allergies && (
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{language === 'ar' ? 'الحساسية:' : 'Allergies:'} {selectedPatient.allergies}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Button */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onStartConsultation ? onStartConsultation(selectedPatientId) : onNavigate('/dashboard')}
            className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-lg focus:outline-hidden cursor-pointer"
          >
            <PlayCircle className="h-4.5 w-4.5" />
            <span>{language === 'ar' ? 'بدء استشارة جديدة' : 'Start Clinical Consultation'}</span>
          </button>
        </div>
      </div>

      {/* 3. MONITORING STATUS SUMMARY BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Plan Status */}
        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-[#0F4C81] rounded-xl shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {language === 'ar' ? 'حالة خطة المتابعة' : 'Monitoring Plan'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${monitoringPlan?.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {monitoringPlan?.isActive ? (language === 'ar' ? 'نشطة' : 'Active') : (language === 'ar' ? 'قيد الإعداد' : 'Inactive')}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              {monitoringPlan?.startDate ? `${language === 'ar' ? 'بدأت:' : 'Started:'} ${monitoringPlan.startDate}` : 'No plan date'}
            </span>
          </div>
        </div>

        {/* Metric 2: Today's Tracking */}
        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {language === 'ar' ? 'تسجيلات اليوم' : "Today's Tracking"}
            </span>
            <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
              {monitoringStatuses.filter(s => s.hasRecordedToday).length} / {monitoringStatuses.length} {language === 'ar' ? 'معايير' : 'parameters'}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {monitoringStatuses.every(s => s.hasRecordedToday) && monitoringStatuses.length > 0
                ? (language === 'ar' ? 'اكتملت قراءات اليوم' : 'All readings recorded')
                : (language === 'ar' ? 'قيد المتابعة اليومية' : 'Tracking in progress')}
            </span>
          </div>
        </div>

        {/* Metric 3: Latest Health Log */}
        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {language === 'ar' ? 'آخر سجل صحي' : 'Latest Health Log'}
            </span>
            <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
              {healthLogs.length > 0 ? healthLogs[0].date : (language === 'ar' ? 'لا توجد سجلات' : 'No logs yet')}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              {healthLogs.length > 0 ? healthLogs[0].time : 'Awaiting log'}
            </span>
          </div>
        </div>

        {/* Metric 4: Medication Tracking */}
        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {language === 'ar' ? 'متابعة الأدوية' : 'Medication Tracking'}
            </span>
            <div className="text-sm font-bold text-[#0F4C81] font-mono mt-0.5">
              {adherenceRecords.length > 0 ? (language === 'ar' ? 'متوفر' : 'Available') : (language === 'ar' ? 'غير مسجل' : 'Pending')}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {adherenceRecords.length} {language === 'ar' ? 'جرعات مسجلة' : 'adherence logs recorded'}
            </span>
          </div>
        </div>

      </div>

      {/* 4. ACTIVE MONITORING PARAMETERS & LATEST READINGS */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-rose-600" />
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'المؤشرات الحيوية المراقبة وأحدث القراءات' : 'Active Parameters & Latest Readings'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'القيم الحيوية المسجلة ذاتياً بواسطة المريض وفق الخطة السريرية المقررة.'
                : 'Self-logged biomarker readings captured from the patient daily journal under this clinical plan.'}
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-[#0F4C81] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 self-start sm:self-auto">
            {activeParameters.length} {language === 'ar' ? 'معايير نشطة' : 'Active Parameters'}
          </span>
        </div>

        {activeParameters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeParameters.map((param) => {
              const latest = latestReadings[param.id] || latestReadings[param.parameterType];
              const status = monitoringStatuses.find(s => s.parameterId === param.id || s.parameterType === param.parameterType);

              return (
                <div 
                  key={param.id}
                  className="bg-[#F8FAFC] border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                          {param.frequency || 'Daily'}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 mt-0.5">
                          {param.displayName}
                        </h3>
                      </div>

                      {/* Today's status badge */}
                      {status?.hasRecordedToday ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <Check className="h-3 w-3" />
                          <span>{language === 'ar' ? 'سُجلت اليوم' : 'Recorded today'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" />
                          <span>{language === 'ar' ? 'قيد المتابعة' : 'Tracking pending'}</span>
                        </span>
                      )}
                    </div>

                    {/* Latest Reading Box */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === 'ar' ? 'أحدث قراءة مسجلة' : 'Latest Recorded Reading'}
                      </span>
                      {latest ? (
                        <div>
                          <div className="text-xl font-extrabold text-[#0F4C81] font-mono flex items-baseline gap-1.5">
                            <span>{latest.value}</span>
                            <span className="text-xs text-slate-500 font-normal">{param.unit}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            {language === 'ar' ? 'التسجيل:' : 'Logged:'} {latest.date} ({latest.time})
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic py-1">
                          {language === 'ar' ? 'لا توجد قراءة مسجلة بعد.' : 'No reading recorded yet.'}
                        </div>
                      )}
                    </div>

                    {/* Baseline / Doctor-Consultation Value */}
                    {param.baselineValue && (
                      <div className="text-[11px] text-slate-500 bg-slate-100/70 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="font-medium text-slate-600">
                          {language === 'ar' ? 'قيمة الاستشارة الأولية:' : 'Baseline Consultation Value:'}
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {param.baselineValue}
                        </span>
                      </div>
                    )}

                    {/* Threshold Rule Info if configured */}
                    {param.threshold && (
                      <div className="text-[11px] bg-blue-50/70 p-2.5 rounded-lg border border-blue-100 text-blue-900 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] block">
                          {language === 'ar' ? 'قاعدة النطاق المستهدف المحددة:' : 'Configured Monitoring Rule:'}
                        </span>
                        <p className="font-mono text-[10px] text-slate-700">
                          {param.threshold.targetMin && param.threshold.targetMax ? (
                            `Range: ${param.threshold.targetMin} - ${param.threshold.targetMax} ${param.unit}`
                          ) : param.threshold.targetMax ? (
                            `Max Threshold: ${param.threshold.targetMax} ${param.unit}`
                          ) : (
                            `Min Threshold: ${param.threshold.targetMin} ${param.unit}`
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {param.clinicalReason || 'Clinical follow-up'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedParamId(param.id)}
                      className="text-xs font-semibold text-[#0F4C81] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{language === 'ar' ? 'عرض المؤشر الزمني' : 'View Trend'}</span>
                      <ChevronRight className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 italic bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-200">
            {language === 'ar' ? 'لا توجد خطة متابعة نشطة لهذا المريض.' : 'No active monitoring plan assigned to this patient.'}
          </div>
        )}
      </div>

      {/* 5. HEALTH TRENDS & TIME-SERIES VISUALIZER (Reusing HealthTrendChart from Step 4) */}
      <div id="doctor-health-trends-section" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#0F4C81]" />
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'المؤشرات الزمنية والرسوم البيانية' : 'Longitudinal Health Trends'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? 'مخطط بياني زمني يعرض التغيرات الفعلية في مؤشرات المريض عبر فترات 7، 30، و90 يوماً.'
              : 'Vector time-series visualization plotted directly from patient self-logged readings across 7, 30, and 90-day intervals.'}
          </p>
        </div>

        {activeParameters.length > 0 ? (
          <HealthTrendChart
            parameters={activeParameters}
            readingsByParam={readingsByParam}
            selectedParamId={selectedParamId || activeParameters[0]?.id}
            onSelectParam={(id) => setSelectedParamId(id)}
            timeRange={timeRange}
            onChangeTimeRange={(r) => setTimeRange(r)}
            language={language}
            isRtl={isRtl}
          />
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 italic bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-200">
            {language === 'ar' ? 'لا توجد معايير متابعة متوفرة لإنشاء الرسوم البيانية.' : 'No active parameters available for chart generation.'}
          </div>
        )}
      </div>

      {/* 6. HEALTH LOG HISTORY (WITH SYMPTOMS & PATIENT NOTES) */}
      <div id="doctor-health-log-history" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#0F4C81]" />
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'سجل القراءات والملاحظات الصحية' : 'Patient Health Log History'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'السجل الزمني للقراءات، الأعراض الملحوظة ذاتياً، وملاحظات المريض الحرة مرتبة من الأحدث إلى الأقدم.'
                : 'Chronological health readings, patient-observed symptoms, and self-recorded observations ordered newest first.'}
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            {healthLogs.length} {language === 'ar' ? 'سجلات محفوظة' : 'logged entries'}
          </span>
        </div>

        {healthLogs.length > 0 ? (
          <div className="space-y-4">
            {healthLogs.map((log) => (
              <div 
                key={log.id}
                className="bg-[#F8FAFC] border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-colors space-y-3.5"
              >
                {/* Header: Date, Time & Source */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {log.date}
                    </span>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{log.time}</span>
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                    ID: {log.id}
                  </span>
                </div>

                {/* Values Grid */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    {language === 'ar' ? 'القيم المسجلة:' : 'Recorded Biomarkers:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {log.readings.map((r, rIdx) => (
                      <div key={rIdx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                          {r.displayName}
                        </span>
                        <div className="text-sm font-extrabold text-[#0F4C81] font-mono flex items-baseline gap-1">
                          <span>{r.value}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{r.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Symptoms Reported by Patient */}
                {log.symptoms && log.symptoms.length > 0 && (
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                      <span>{language === 'ar' ? 'الأعراض الملحوظة ذاتياً (ملاحظات مريض، ليست تشخيصاً):' : 'Patient-Reported Symptoms (Self-observed, not clinical diagnosis):'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {log.symptoms.map((symptom, sIdx) => (
                        <span key={sIdx} className="text-xs px-2.5 py-0.5 bg-white text-amber-900 font-semibold rounded-md border border-amber-200">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patient Notes */}
                {log.notes && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                      {language === 'ar' ? 'ملاحظة المريض المرفقة:' : 'Patient Note:'}
                    </span>
                    <p className="italic text-slate-800 leading-relaxed">
                      "{log.notes}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 italic bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-200">
            {language === 'ar' ? 'لا توجد سجلات صحية مدخلة لهذا المريض بعد.' : 'No health log entries submitted by this patient yet.'}
          </div>
        )}
      </div>

      {/* 7. PRESCRIBED MEDICATIONS & ADHERENCE INFORMATION */}
      <div id="doctor-medication-monitoring" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-indigo-700" />
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'الأدوية الموصوفة ومتابعة الالتزام' : 'Medication Regimen & Adherence Records'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'الأدوية المعتمدة رسمياً في الوصفة الطبية، مع سجل الالتزام الذاتي المسجل من قبل المريض.'
                : 'Current clinical medications from authorized prescriptions paired with patient-reported adherence logs.'}
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 self-start sm:self-auto">
            {prescribedMeds.length} {language === 'ar' ? 'أدوية موصوفة' : 'Prescribed Medicines'}
          </span>
        </div>

        {/* Medications List */}
        {prescribedMeds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {prescribedMeds.map((med, idx) => {
              const medAdherence = adherenceRecords.filter(a => a.medicineName.toLowerCase() === med.medicineName.toLowerCase());
              const recentLogs = medAdherence.slice(0, 4);

              return (
                <div 
                  key={idx}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between pb-2.5 border-b border-slate-200 gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#0F4C81] uppercase tracking-wider block">
                          {med.strength || 'Standard'}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 mt-0.5">
                          {med.medicineName}
                        </h3>
                      </div>

                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        med.status === 'Active'
                          ? 'text-emerald-800 bg-emerald-100 border-emerald-200'
                          : 'text-slate-600 bg-slate-100 border-slate-200'
                      }`}>
                        {med.status === 'Active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'مكتمل' : 'Completed')}
                      </span>
                    </div>

                    {/* Clinical Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{language === 'ar' ? 'الجرعة' : 'Dosage'}</span>
                        <span className="font-bold text-slate-800">{med.dosage}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{language === 'ar' ? 'التكرار' : 'Frequency'}</span>
                        <span className="font-bold text-[#0F4C81]">{med.frequency}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{language === 'ar' ? 'المدة' : 'Duration'}</span>
                        <span className="font-bold text-slate-800">{med.duration}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{language === 'ar' ? 'الوصفة' : 'Rx Date'}</span>
                        <span className="font-bold text-slate-700 font-mono text-[11px]">{med.prescriptionDate}</span>
                      </div>
                    </div>

                    {/* Derived Occurrences */}
                    <div className="text-xs space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        {language === 'ar' ? 'الجدول المستخرج:' : 'Derived Schedule:'}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {med.scheduleOccurrences.map((occ, oIdx) => (
                          <span key={oIdx} className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white text-slate-700 rounded border border-slate-200">
                            {occ}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Patient Adherence Summary for this medicine */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          {language === 'ar' ? 'سجل الالتزام الذاتي:' : 'Patient Adherence Logs:'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#0F4C81] bg-blue-50 px-2 py-0.5 rounded">
                          {medAdherence.length} {language === 'ar' ? 'تسجيلات' : 'entries'}
                        </span>
                      </div>

                      {recentLogs.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {recentLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="font-mono text-slate-600">
                                {log.date} ({log.scheduledOccurrence || 'Daily'})
                              </span>
                              {log.status === 'Taken' ? (
                                <span className="text-emerald-700 font-bold font-mono text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  ✓ {language === 'ar' ? 'أُخذ' : 'Taken'} {log.time ? `@ ${log.time}` : ''}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-medium font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">
                                  ✕ {language === 'ar' ? 'تخطي' : 'Skipped'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          {language === 'ar' ? 'لا توجد تسجيلات التزام سابقة لهذا الدواء.' : 'No adherence logged yet by patient.'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 italic">
                      {language === 'ar' ? 'عرض للقراءة فقط' : 'Read-only clinical view'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenPrescription(med.prescriptionRef)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-[#0F4C81] border border-brand-border rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      <span>{language === 'ar' ? 'الوصفة' : 'View Rx'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#F8FAFC] border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <Pill className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-base text-slate-800">
              {language === 'ar' ? 'لا توجد أدوية موصوفة لهذا المريض' : 'No Medications Prescribed for this Patient'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {language === 'ar'
                ? 'لم يتم إجراء استشارة سريرية لهذا المريض بعد. يتم توليد الأدوية وجداول المتابعة وسجلات الالتزام حصراً بعد إتمام جلسة الاستشارة وإصدار الوصفة الطبية.'
                : 'No consultation has been conducted for this patient yet. Medications, monitoring schedules, and adherence records will only be generated after a clinical consultation is completed and the prescription is issued.'}
            </p>
            <div>
              {onStartConsultation ? (
                <button
                  type="button"
                  onClick={() => onStartConsultation(selectedPatientId)}
                  className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-2xs mt-2"
                >
                  {language === 'ar' ? 'بدء استشارة سريرية لهذا المريض' : 'Start Consultation for this Patient'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard')}
                  className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-2xs mt-2"
                >
                  {language === 'ar' ? 'الانتقال إلى جلسة الاستشارة' : 'Go to Consultation Session'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 8. MONITORING ALERTS & THRESHOLD NOTIFICATIONS */}
      <div id="doctor-monitoring-alerts" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'تنبيهات المتابعة وإشعارات النطاق' : 'Monitoring Alerts & Threshold Advisories'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'التنبيهات الناتجة عن القواعد المحددة، التذكيرات اليومية، أو النطاقات الاسترشادية دون تشخيص آلي.'
                : 'Rule-based threshold notifications and schedule tracking reminders generated by the monitoring system.'}
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 self-start sm:self-auto">
            {monitoringAlerts.length} {language === 'ar' ? 'إشعارات' : 'Alerts'}
          </span>
        </div>

        {monitoringAlerts.length > 0 ? (
          <div className="space-y-3">
            {monitoringAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {alert.type.replace('_', ' ')}
                      </span>
                      {alert.parameterName && (
                        <span className="text-[10px] font-bold text-[#0F4C81] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {alert.parameterName}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                    {alert.readingValue && (
                      <p className="text-slate-700 font-mono text-[11px] mt-1 font-semibold">
                        {language === 'ar' ? 'القيمة المسجلة الفعلية:' : 'Actual Stored Reading:'} {alert.readingValue}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-mono text-[11px] text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{alert.date} {alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 italic bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-200">
            {language === 'ar' ? 'لا توجد تنبيهات مراقبة نشطة لهذا المريض.' : 'No active monitoring alerts for this patient.'}
          </div>
        )}
      </div>

      {/* 9. MEDICAL SAFETY DISCLAIMER */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
        <Info className="h-4.5 w-4.5 text-[#0F4C81] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {language === 'ar'
            ? 'ملاحظة سريرية: تعرض هذه الشاشة البيانات والقراءات الحيوية المدخلة ذاتياً من قبل المريض لأغراض المراجعة السريرية والمتابعة الروتينية. لا تتضمن تشخيصات آلية أو تعديلات تلقائية على خطة العلاج المعتمدة.'
            : 'Clinical Notice: This longitudinal dashboard visualizes patient self-reported biometric logs for follow-up evaluation and clinical context. It does not perform automated diagnoses, alter prescribed therapies, or replace physician judgment.'}
        </p>
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
