import React, { useState, useEffect } from 'react';
import { Folder, FileText, Activity, ShieldCheck, HeartPulse, Search, Eye, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { PatientDataStore, PatientProfileData } from '../../services/patientStore';
import { ClinicalPrescription } from '../../backend/services/PrescriptionService';
import { PrescriptionModal } from './PrescriptionModal';
import { useLanguage } from '../../LanguageContext';
import { AuthService } from '../../services/authService';

export const PatientMedicalRecordsView: React.FC = () => {
  const { language } = useLanguage();
  const [profile, setProfile] = useState<PatientProfileData>(PatientDataStore.getProfile());
  const [prescriptions, setPrescriptions] = useState<ClinicalPrescription[]>(() => {
    const pId = PatientDataStore.getProfile()?.patientId;
    return PatientDataStore.getPrescriptions(pId);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<ClinicalPrescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = () => {
    const p = PatientDataStore.getProfile();
    setProfile(p);
    setPrescriptions(PatientDataStore.getPrescriptions(p?.patientId));
  };

  const syncServerPrescriptions = async () => {
    try {
      const user = AuthService.getUser();
      const p = PatientDataStore.getProfile();
      const pId = user?.patientId || p?.patientId || 'PID-2026-004';

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
      console.warn("Could not sync server prescriptions in medical records:", e);
    }
  };

  useEffect(() => {
    refreshData();
    syncServerPrescriptions();
    window.addEventListener('patient-data-updated', refreshData);
    return () => window.removeEventListener('patient-data-updated', refreshData);
  }, []);

  const filteredRecords = prescriptions.filter(p => {
    const q = searchQuery.toLowerCase();
    const diag = (p.provisionalDiagnosis || '').toLowerCase();
    const doc = (p.patientDetails.consultingDoctor || '').toLowerCase();
    const inv = (p.investigationsAdvised || '').toLowerCase();
    return diag.includes(q) || doc.includes(q) || inv.includes(q);
  });

  const handleOpenModal = (rx: ClinicalPrescription) => {
    setSelectedPrescription(rx);
    setIsModalOpen(true);
  };

  return (
    <div id="patient-medical-records-view" className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right">
      
      {/* Header */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#0F4C81] font-bold uppercase tracking-wider mb-1 font-mono">
            <Folder className="h-4 w-4" />
            <span>{language === 'ar' ? 'السجل الطبي الإلكتروني' : 'Electronic Medical Records'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? 'السجلات والملفات الطبية' : 'Patient Medical Records'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            {language === 'ar' 
              ? 'السجلات السريرية المعتمدة، الفحوصات والتحاليل المخبرية الموصى بها، والبيانات الصحية الثابتة.' 
              : 'Official clinical records, advised laboratory diagnostics, and verified health documentation.'}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'بحث في السجلات أو الفحوصات...' : 'Search records or investigations...'}
            className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-4 py-2.5 bg-[#F8FAFC] border border-brand-border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Clinical Baseline Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-brand-border p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'ar' ? 'رقم الملف الطبي' : 'Patient File ID'}
          </span>
          <span className="text-base font-extrabold text-[#0F4C81] font-mono mt-0.5 block">{profile.patientId}</span>
        </div>

        <div className="bg-white border border-brand-border p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'ar' ? 'فصيلة الدم' : 'Blood Group'}
          </span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{profile.bloodGroup}</span>
        </div>

        <div className="bg-white border border-brand-border p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'ar' ? 'مؤشر كتلة الجسم' : 'BMI Index'}
          </span>
          <span className="text-base font-extrabold text-emerald-700 mt-0.5 block">{profile.bmi}</span>
        </div>

        <div className="bg-white border border-brand-border p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'ar' ? 'حالة السجلات' : 'EMR Status'}
          </span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
            {language === 'ar' ? 'سجل نشط وموثق' : 'Active & Verified'}
          </span>
        </div>
      </div>

      {/* Medical Records List */}
      <div className="space-y-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((rx, idx) => (
            <div
              key={idx}
              className="bg-white border border-brand-border hover:border-blue-300 rounded-2xl p-6 shadow-xs transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-[#0F4C81] rounded-xl shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {rx.provisionalDiagnosis}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {rx.patientDetails.consultingDoctor} &bull; {rx.patientDetails.date}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-[#0F4C81] bg-blue-50 px-2.5 py-1 rounded border border-blue-100 self-start sm:self-auto">
                  EMR Ref: #{rx.patientDetails.date}
                </span>
              </div>

              {/* Clinical Assessment Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-[#F8FAFC] p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    {language === 'ar' ? 'الفحوصات والتحاليل الموصى بها' : 'Investigations Advised'}
                  </span>
                  <p className="font-semibold text-slate-800 mt-1">
                    {rx.investigationsAdvised || 'No special investigations advised'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    {language === 'ar' ? 'الفحص السريري' : 'Clinical Examination'}
                  </span>
                  <p className="text-slate-700 mt-1 line-clamp-2">
                    {rx.clinicalExamination || 'Not Mentioned'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    {language === 'ar' ? 'توجيهات نمط الحياة والغذاء' : 'Lifestyle & Diet Advice'}
                  </span>
                  <p className="text-slate-700 mt-1 line-clamp-2">
                    {rx.lifestyleDietAdvice || 'Maintain regular diet'}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{language === 'ar' ? 'سجل طبي معتمد من الطبيب' : 'Hospital Authenticated Record'}</span>
                </div>

                <button
                  onClick={() => handleOpenModal(rx)}
                  className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{language === 'ar' ? 'عرض السجل الكامل' : 'View Full Document'}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-brand-border rounded-2xl p-12 text-center text-slate-400 italic">
            {language === 'ar' ? 'لا توجد سجلات طبية مطابقة' : 'No matching medical records found.'}
          </div>
        )}
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
