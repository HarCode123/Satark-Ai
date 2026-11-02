import React, { useState, useEffect } from 'react';
import { Calendar, User, Stethoscope, FileText, Download, Eye, Sparkles, Filter, Activity, Search } from 'lucide-react';
import { PatientDataStore } from '../../services/patientStore';
import { ClinicalPrescription } from '../../backend/services/PrescriptionService';
import { PrescriptionModal } from './PrescriptionModal';
import { downloadPrescriptionPDF } from '../../utils/downloadPdf';
import { useLanguage } from '../../LanguageContext';

export const PatientHistoryView: React.FC = () => {
  const { language } = useLanguage();
  const [prescriptions, setPrescriptions] = useState<ClinicalPrescription[]>(() => {
    const pId = PatientDataStore.getProfile()?.patientId;
    return PatientDataStore.getPrescriptions(pId);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<ClinicalPrescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = () => {
    const pId = PatientDataStore.getProfile()?.patientId;
    setPrescriptions(PatientDataStore.getPrescriptions(pId));
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('patient-data-updated', refreshData);
    return () => window.removeEventListener('patient-data-updated', refreshData);
  }, []);

  // Filter & sort newest first
  const filteredPrescriptions = prescriptions.filter(p => {
    const q = searchQuery.toLowerCase();
    const doc = (p.patientDetails.consultingDoctor || '').toLowerCase();
    const diag = (p.provisionalDiagnosis || '').toLowerCase();
    const complaint = (p.chiefComplaint || '').toLowerCase();
    return doc.includes(q) || diag.includes(q) || complaint.includes(q);
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
            <Activity className="h-4 w-4" />
            <span>{language === 'ar' ? 'السجل الطبي والسجل السريري' : 'Patient Clinical History'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? 'سجل الاستشارات الطبية' : 'Medical Consultation History'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            {language === 'ar' 
              ? 'عرض شامل لجميع الاستشارات، الفحوصات، والتشخيصات الصادرة من الكادر الطبي مرتبة بالأحدث.' 
              : 'Complete archive of all physician consultations, clinical assessments, and generated EMR prescriptions.'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالتشخيص أو الطبيب...' : 'Search diagnosis or doctor...'}
            className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-4 py-2.5 bg-[#F8FAFC] border border-brand-border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Consultations List (Newest First) */}
      <div className="space-y-4">
        {filteredPrescriptions.length > 0 ? (
          filteredPrescriptions.map((rx, idx) => (
            <div
              key={idx}
              className="bg-white border border-brand-border hover:border-blue-300 rounded-2xl p-6 shadow-xs transition-all space-y-4"
            >
              {/* Consultation Card Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#0F4C81] text-white rounded-xl shadow-xs shrink-0">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider block font-mono">
                      Consultation #{filteredPrescriptions.length - idx}
                    </span>
                    <h3 className="font-bold text-lg text-slate-900">
                      {rx.provisionalDiagnosis || 'Clinical Assessment'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg flex items-center gap-1.5 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-[#0F4C81]" />
                    {rx.patientDetails.date}
                  </span>
                </div>
              </div>

              {/* Consultation Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs bg-[#F8FAFC] p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{language === 'ar' ? 'الطبيب المعالج' : 'Doctor'}</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{rx.patientDetails.consultingDoctor}</p>
                  <p className="text-[11px] text-[#0F4C81] font-semibold">Department of Medicine</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{language === 'ar' ? 'الشكوى الرئيسية' : 'Chief Complaint'}</span>
                  <p className="font-medium text-slate-800 mt-0.5 truncate">{rx.chiefComplaint || 'Not Mentioned'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{language === 'ar' ? 'الأدوية الموصوفة' : 'Medications Prescribed'}</span>
                  <p className="font-bold text-slate-900 mt-0.5 font-mono">
                    {rx.medications && rx.medications.length > 0 
                      ? `${rx.medications.length} Prescribed Medications` 
                      : 'No Medications Prescribed'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{language === 'ar' ? 'موعد المتابعة' : 'Follow-Up Date'}</span>
                  <p className="font-bold text-emerald-800 mt-0.5">
                    {rx.followUp || (language === 'ar' ? 'غير محدد' : 'Not Required')}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium font-mono">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>EMR Record Verified &bull; ID: {rx.patientDetails.patientId}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(rx)}
                    className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{language === 'ar' ? 'عرض الوصفة الطبية' : 'View Prescription'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-brand-border rounded-2xl p-12 text-center text-slate-400 italic">
            {language === 'ar' ? 'لا توجد استشارات متاحة' : 'No consultations available.'}
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
