import React, { useEffect, useState } from 'react';
import { Search, User, Calendar, FileText, Pill, Hash, AlertCircle, X, RotateCw, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { AuthService } from '../services/authService';

export interface DBEMRRecord {
  emrId: number;
  consultationId: number;
  patientId: string;
  patientName?: string;
  age?: string | number;
  gender?: string;
  height?: string;
  weight?: string;
  bloodGroup?: string;
  doctorId: string;
  visitDate: string;
  chiefComplaint: string;
  symptoms: string;
  diagnosis: string;
  medications: string;
  dosage: string;
  advice: string;
  followUpDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  rawTranscript?: string;
}

interface PatientTableProps {
  id?: string;
}

export default function PatientTable({ id = "emr-patient-table" }: PatientTableProps) {
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<DBEMRRecord[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Fetch registered patients for lookup
  const fetchPatientsList = async () => {
    try {
      const res = await fetch('/api/patients', {
        headers: AuthService.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPatientsList(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch patients list for EMR table:', e);
    }
  };

  // Fetch structured EMRs from the backend MySQL / local JSON fallback database
  const fetchEMRRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("🔌 [PatientTable] Querying live relational database via /api/emr...");
      const response = await fetch('/api/emr', {
        headers: AuthService.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to communicate with EMR API backend');
      }
      const result = await response.json();
      if (result.success) {
        setRecords(result.data || []);
        console.log(`✅ [PatientTable] Loaded ${result.data?.length || 0} relational EMR records.`);
      } else {
        throw new Error(result.message || 'API error');
      }
    } catch (err: any) {
      console.error('❌ [PatientTable] Error fetching database EMR records:', err);
      setError(err.message || 'Connection offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEMRRecords();
    fetchPatientsList();

    // Listen for custom "refresh" events from App.tsx when a consultation is saved
    const handleRefresh = () => {
      console.log("🔄 [PatientTable] Received refresh event. Querying DB...");
      fetchEMRRecords();
      fetchPatientsList();
    };

    window.addEventListener('refresh-emr-table', handleRefresh);
    return () => {
      window.removeEventListener('refresh-emr-table', handleRefresh);
    };
  }, []);

  // Map real patient metadata from EMR record or registered patients DB
  const getPatientInfo = (record: DBEMRRecord) => {
    // 1. Check if real patientName is present on record
    if (record.patientName && record.patientName !== record.patientId && record.patientName.trim() !== '') {
      return {
        name: record.patientName,
        age: record.age !== undefined && record.age !== null && record.age !== '' ? record.age : 'N/A',
        gender: record.gender || 'Unknown'
      };
    }

    // 2. Look up in registered patients list from DB
    const registered = patientsList.find(p => p.patientId === record.patientId);
    if (registered) {
      return {
        name: `${registered.firstName} ${registered.lastName}`.trim(),
        age: registered.age,
        gender: registered.gender
      };
    }

    // 3. Fallback to record patient ID
    return {
      name: record.patientName || `Patient ${record.patientId}`,
      age: record.age || '—',
      gender: record.gender || '—'
    };
  };

  // Live client-side filtering on database records
  const filteredRecords = records.filter(record => {
    const term = searchTerm.toLowerCase();
    const patientInfo = getPatientInfo(record);
    return (
      patientInfo.name.toLowerCase().includes(term) ||
      record.patientId.toLowerCase().includes(term) ||
      record.diagnosis.toLowerCase().includes(term) ||
      record.chiefComplaint.toLowerCase().includes(term)
    );
  });

  return (
    <div id={id} className="space-y-6">
      {/* Search Bar Container */}
      <div className="bg-brand-card p-5 border border-brand-border rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <label htmlFor="patient-search-input" className="sr-only">
            {t.searchPlaceholder}
          </label>
          <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-brand-text-secondary">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            id="patient-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'ar' ? 'البحث عن مريض أو تشخيص...' : 'Search patient name, ID, or diagnosis...'}
            className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-brand-text-primary placeholder:text-brand-text-secondary focus:outline-hidden focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/15 transition-all duration-200 text-left rtl:text-right"
          />
          {searchTerm && (
            <button
              id="clear-search-btn"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-brand-text-secondary hover:text-brand-text-primary"
              title="Clear Search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          <p className="text-xs text-brand-text-secondary">
            {language === 'ar'
              ? `عرض ${filteredRecords.length} من ${records.length} سجلات طبية`
              : `Showing ${filteredRecords.length} of ${records.length} database records`}
          </p>

          <button
            id="manual-refresh-emr-btn"
            onClick={fetchEMRRecords}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-border hover:border-[#0F4C81] rounded-lg bg-white text-xs font-semibold text-slate-700 hover:text-[#0F4C81] cursor-pointer shadow-2xs transition-all disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Table Container with Sticky Header & Responsive Scrolling */}
      <div className="bg-brand-card border border-brand-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="bg-[#0F4C81] text-white text-xs font-semibold uppercase tracking-wider sticky top-0 z-10 shadow-sm select-none">
                <th className="py-3.5 px-4 text-center w-16">{language === 'ar' ? 'م' : 'ID'}</th>
                <th className="py-3.5 px-4">{t.colPatientId}</th>
                <th className="py-3.5 px-6">{t.colPatientName}</th>
                <th className="py-3.5 px-4 text-center w-20">{t.colAge}</th>
                <th className="py-3.5 px-4 text-center w-24">{t.colGender}</th>
                <th className="py-3.5 px-4">{t.colVisitDate}</th>
                <th className="py-3.5 px-6">{t.colDiagnosis}</th>
                <th className="py-3.5 px-6">{t.colPrescription}</th>
                <th className="py-3.5 px-4">{t.colFollowUpDate}</th>
                <th className="py-3.5 px-4 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-sm">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => {
                  const patientInfo = getPatientInfo(record);
                  const isExpanded = expandedRow === record.emrId;

                  return (
                    <React.Fragment key={record.emrId}>
                      <tr
                         onClick={() => setExpandedRow(isExpanded ? null : record.emrId)}
                         className={`hover:bg-brand-secondary/5 transition-colors cursor-pointer select-none ${
                           isExpanded ? 'bg-brand-secondary/5 border-l-4 border-l-[#0F4C81]' : (index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]')
                         }`}
                      >
                        {/* EMR ID */}
                        <td className="py-4 px-4 text-center font-bold text-slate-400 font-mono text-xs">
                          #{record.emrId}
                        </td>

                        {/* Patient ID */}
                        <td className="py-4 px-4 font-mono text-xs font-semibold text-brand-primary whitespace-nowrap">
                          {record.patientId}
                        </td>

                        {/* Patient Name */}
                        <td className="py-4 px-6 font-semibold text-brand-text-primary whitespace-nowrap">
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <div className="h-6 w-6 rounded-full bg-brand-primary/5 flex items-center justify-center text-[10px] text-brand-primary font-bold uppercase">
                              {patientInfo.name.charAt(0)}
                            </div>
                            <span>{patientInfo.name}</span>
                          </div>
                        </td>

                        {/* Age */}
                        <td className="py-4 px-4 text-center text-brand-text-primary">
                          {patientInfo.age}
                        </td>

                        {/* Gender */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            patientInfo.gender === 'Female'
                              ? 'bg-pink-50 text-pink-700 border border-pink-100'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {patientInfo.gender === 'Female' ? t.genderFemale : t.genderMale}
                          </span>
                        </td>

                        {/* Visit Date */}
                        <td className="py-4 px-4 text-xs font-medium text-brand-text-secondary whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                            <Calendar className="h-3.5 w-3.5 text-brand-text-secondary" />
                            <span>{new Date(record.visitDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </td>

                        {/* Diagnosis */}
                        <td className="py-4 px-6 text-brand-text-primary max-w-xs truncate" title={record.diagnosis}>
                          <div className="flex items-start space-x-1.5 rtl:space-x-reverse">
                            <AlertCircle className="h-4 w-4 text-brand-secondary shrink-0 mt-0.5" />
                            <span className="font-semibold line-clamp-2 text-[#0F4C81]">{record.diagnosis || record.chiefComplaint}</span>
                          </div>
                        </td>

                        {/* Prescription Medications */}
                        <td className="py-4 px-6 text-brand-text-primary max-w-sm" title={record.medications}>
                          <div className="flex items-start space-x-1.5 rtl:space-x-reverse bg-brand-primary/5 p-2 rounded-lg border border-brand-primary/10">
                            <Pill className="h-3.5 w-3.5 text-brand-primary shrink-0 mt-0.5" />
                            <span className="font-mono text-xs text-brand-primary leading-relaxed line-clamp-2 font-semibold">
                              {record.medications}
                            </span>
                          </div>
                        </td>

                        {/* Follow-up Date */}
                        <td className="py-4 px-4 text-xs font-medium text-brand-text-secondary whitespace-nowrap">
                          <span className="inline-flex items-center space-x-1 rtl:space-x-reverse bg-brand-success/5 text-[#38B000] border border-brand-success/10 px-2 py-1 rounded-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#38B000] animate-pulse"></span>
                            <span>{record.followUpDate}</span>
                          </span>
                        </td>

                        {/* Expansion caret */}
                        <td className="py-4 px-4 text-center">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-brand-text-secondary" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-brand-text-secondary" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded Relational Details Section */}
                      {isExpanded && (
                        <tr key={`expanded-detail-${record.emrId}`} className="bg-slate-50/50">
                          <td colSpan={10} className="px-6 py-5 border-t border-b border-[#0F4C81]/10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs leading-relaxed text-left rtl:text-right">
                              
                              {/* Left Panel: Chief Complaints & Symptoms */}
                              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                                <div>
                                  <h4 className="font-bold text-[#0F4C81] uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono text-[10px] pb-1.5 border-b border-slate-100">
                                    <AlertCircle className="h-4 w-4 text-[#0F4C81]" />
                                    {language === 'ar' ? 'الشكوى السريرية والأعراض' : 'Clinical Complaint & Symptoms'}
                                  </h4>
                                  <div className="space-y-3">
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">
                                        {language === 'ar' ? 'الشكوى الرئيسية' : 'Chief Complaint'}
                                      </span>
                                      <p className="text-slate-800 font-semibold text-sm bg-slate-50 p-2 rounded border border-slate-100">
                                        {record.chiefComplaint || "Not recorded"}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">
                                        {language === 'ar' ? 'الأعراض التي تم تحديدها' : 'Identified Symptoms'}
                                      </span>
                                      <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                                        {record.symptoms || "None listed"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                                  <span>Status: <span className="text-emerald-600 font-bold">{record.status}</span></span>
                                  <span>Visit Date: {new Date(record.visitDate).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {/* Middle Panel: AI Structured Rx & Dosage */}
                              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs">
                                <h4 className="font-bold text-[#0F4C81] uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono text-[10px] pb-1.5 border-b border-slate-100">
                                  <Pill className="h-4 w-4 text-[#0F4C81]" />
                                  {language === 'ar' ? 'خطة الأدوية والتعليمات الطبية' : 'Structured Treatment Plan'}
                                </h4>
                                <div className="space-y-3">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">
                                      {language === 'ar' ? 'الأدوية المقررة' : 'Prescribed Rx'}
                                    </span>
                                    <p className="text-emerald-700 font-bold font-mono text-sm bg-emerald-50/50 p-2 rounded border border-emerald-100 flex items-center gap-1.5">
                                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                      {record.medications || "No active medications"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">
                                      {language === 'ar' ? 'الجرعة وتكرار الاستخدام' : 'Dosage instructions'}
                                    </span>
                                    <p className="text-slate-700 font-mono text-xs bg-slate-50 p-2 rounded border border-slate-100">
                                      {record.dosage || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">
                                      {language === 'ar' ? 'نصائح وتوصيات الطبيب للمريض' : 'Doctor\'s Advice & Remarks'}
                                    </span>
                                    <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 italic leading-relaxed text-[11px]">
                                      "{record.advice || "No specific advice noted."}"
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Right Panel: Relational Reference to Speech Transcript */}
                              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                                <div>
                                  <h4 className="font-bold text-[#0F4C81] uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono text-[10px] pb-1.5 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-[#0F4C81]" />
                                    {language === 'ar' ? 'النسخة الأصلية للحوار الطبي (مرجع علائقي)' : 'Relational Audio Transcript Reference'}
                                  </h4>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                                    {language === 'ar' ? 'حوار الطبيب والمريض المسجل' : 'Linked Dialogue Speech-to-Text Input'}
                                  </p>
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 max-h-[140px] overflow-y-auto font-mono text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap select-all">
                                    {record.rawTranscript || (language === 'ar' ? 'النسخة الأصلية غير متوفرة' : 'No raw speech transcript referenced.')}
                                  </div>
                                </div>
                                
                                <div className="mt-3 pt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                                  <span className="bg-[#0F4C81]/10 text-[#0F4C81] font-bold px-2 py-0.5 rounded-md">
                                    CONSULTATION ID: #{record.consultationId}
                                  </span>
                                  <span>{language === 'ar' ? 'مؤمن بالكامل وعلمي' : 'Relational (Zero duplication)'}</span>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-brand-text-secondary bg-white">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                      <div className="h-12 w-12 rounded-full bg-slate-50 border border-brand-border flex items-center justify-center text-slate-400">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="font-bold text-slate-800">{language === 'ar' ? 'سجل قاعدة البيانات فارغ حالياً' : 'No Medical Records in Database'}</p>
                      <p className="text-xs text-brand-text-secondary leading-relaxed">
                        {language === 'ar'
                          ? 'لم يتم حفظ أي استشارة طبية بعد في قاعدة البيانات. ابدأ محادثة جديدة عبر الميكروفون وعند الانتهاء ستظهر تلقائياً هنا في جدول الـ EMR.'
                          : 'The database is currently empty. Start a consultation, record dialogue with the patient, and stop recording. The EMR pipeline will trigger, structure it, and save a dynamic row instantly!'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
