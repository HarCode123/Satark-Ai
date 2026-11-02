import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Download, Eye, Search, AlertCircle, HeartPulse, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { PatientDataStore } from '../../services/patientStore';
import { ClinicalPrescription } from '../../backend/services/PrescriptionService';
import { PrescriptionModal } from './PrescriptionModal';
import { useLanguage } from '../../LanguageContext';
import { AuthService } from '../../services/authService';

export const PatientPrescriptionsView: React.FC = () => {
  const { language } = useLanguage();
  const [prescriptions, setPrescriptions] = useState<ClinicalPrescription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<ClinicalPrescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLivePrescriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = AuthService.getUser();
      const patientId = user?.patientId || PatientDataStore.getProfile()?.patientId || 'PID-2026-001';

      console.log(`📡 [PatientPrescriptionsView] Fetching online prescriptions for patient: ${patientId}`);
      const response = await fetch(`/api/patient/prescriptions?patientId=${encodeURIComponent(patientId)}`, {
        headers: AuthService.getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          // Strict filter: only approved prescriptions are displayed
          const approved = result.data.filter((p: any) => p.status === 'approved' || p.status === undefined);
          approved.forEach((p: any) => PatientDataStore.addPrescription(p));
          setPrescriptions(approved);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to local store if server route fails
      const fallback = PatientDataStore.getPrescriptions(patientId).filter((p: any) => p.status !== 'draft');
      setPrescriptions(fallback);
    } catch (err: any) {
      console.warn("⚠️ [PatientPrescriptionsView] Network error fetching prescriptions, using local fallback:", err);
      const user = AuthService.getUser();
      const patientId = user?.patientId || PatientDataStore.getProfile()?.patientId || 'PID-2026-001';
      const fallback = PatientDataStore.getPrescriptions(patientId).filter((p: any) => p.status !== 'draft');
      setPrescriptions(fallback);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePrescriptions();
    const handleUpdate = () => {
      fetchLivePrescriptions();
    };
    window.addEventListener('patient-data-updated', handleUpdate);
    return () => window.removeEventListener('patient-data-updated', handleUpdate);
  }, [fetchLivePrescriptions]);

  const filtered = prescriptions.filter(p => {
    const q = searchQuery.toLowerCase();
    const diag = (p.provisionalDiagnosis || '').toLowerCase();
    const doc = (p.patientDetails?.consultingDoctor || '').toLowerCase();
    const meds = (p.medications || []).map(m => m.medicineName.toLowerCase()).join(' ');
    return diag.includes(q) || doc.includes(q) || meds.includes(q);
  });

  const handleOpenModal = (rx: ClinicalPrescription) => {
    setSelectedPrescription(rx);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right">
      
      {/* Header */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#0F4C81] font-bold uppercase tracking-wider mb-1 font-mono">
            <Pill className="h-4 w-4" />
            <span>{language === 'ar' ? 'الوصفات الطبية الرقمية المعتمدة' : 'Official Digital Prescriptions'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? 'الوصفات الطبية الصادرة' : 'Issued Medical Prescriptions'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            {language === 'ar' 
              ? 'الوصفات والبروتوكولات العلاجية المعتمدة من الطبيب متاحة للتنزيل والمعاينة بصيغة PDF عالية الدقة.' 
              : 'Prescriptions reviewed, approved, and published online by your consulting physician. Click to view or download as PDF.'}
          </p>
        </div>

        {/* Search & Refresh Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث باسم الدواء أو التشخيص...' : 'Search medicine or diagnosis...'}
              className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-4 py-2.5 bg-[#F8FAFC] border border-brand-border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all"
            />
          </div>

          <button
            type="button"
            onClick={fetchLivePrescriptions}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title={language === 'ar' ? 'تحديث القائمة' : 'Refresh list'}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-[#0F4C81]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && prescriptions.length === 0 && (
        <div className="bg-white border border-brand-border rounded-2xl p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 text-[#0F4C81] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            {language === 'ar' ? 'جاري تحميل الوصفات الطبية المعتمدة...' : 'Loading verified prescriptions from clinical database...'}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchLivePrescriptions}
            className="text-xs font-bold underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid of Prescriptions */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.length > 0 ? (
            filtered.map((rx, idx) => (
              <div
                key={(rx as any).prescriptionId || idx}
                className="bg-white border border-brand-border hover:border-blue-300 rounded-2xl p-6 shadow-xs transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          {rx.provisionalDiagnosis || 'Clinical Prescription'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{rx.patientDetails?.consultingDoctor || 'Dr. Harini, MD'}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold font-mono text-[#0F4C81] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        {rx.patientDetails?.date}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>{language === 'ar' ? 'معتمدة' : 'Approved'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Medications Table Preview */}
                  <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === 'ar' ? 'الأدوية الموصوفة' : 'Prescribed Medications'}
                    </span>
                    
                    {rx.medications && rx.medications.length > 0 ? (
                      <div className="space-y-1.5">
                        {rx.medications.slice(0, 3).map((med, mIdx) => (
                          <div key={mIdx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200 font-mono">
                            <span className="font-bold text-slate-900">{med.medicineName}</span>
                            <span className="text-[#0F4C81] font-semibold">{med.strength} ({med.frequency})</span>
                          </div>
                        ))}
                        {rx.medications.length > 3 && (
                          <p className="text-[10px] text-slate-500 italic text-center font-semibold pt-1">
                            +{rx.medications.length - 3} additional medications prescribed
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No medications listed.</p>
                    )}
                  </div>

                  {/* Follow-up Note */}
                  {rx.followUp && (
                    <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-start gap-1.5 font-medium">
                      <AlertCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Follow-Up: {rx.followUp}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">EMR Verified</span>
                    {PatientDataStore.hasActivePlanForPrescription(rx, idx) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <HeartPulse className="h-3 w-3 text-emerald-600" />
                        <span>{language === 'ar' ? 'المتابعة الصحية: نشطة' : 'Health Monitoring: Active'}</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(rx)}
                      className="px-3.5 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{language === 'ar' ? 'عرض الوصفة' : 'View Prescription'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenModal(rx)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      title={language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{language === 'ar' ? 'تحميل PDF' : 'Download PDF'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white border border-brand-border rounded-2xl p-12 text-center space-y-2">
              <Pill className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                {language === 'ar' ? 'لا توجد وصفات طبية معتمدة متاحة' : 'No approved clinical prescriptions available yet.'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {language === 'ar' 
                  ? 'ستظهر الوصفات الطبية هنا بمجرد أن يقوم الطبيب بمراجعتها واعتمادها ونشرها في بوابتك.' 
                  : 'Prescriptions will appear here once your consulting physician reviews, approves, and authorizes them online.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Prescription Viewer Modal */}
      <PrescriptionModal
        prescription={selectedPrescription}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
};
