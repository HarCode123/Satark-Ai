import React, { useRef, useState } from 'react';
import { X, Download, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { ClinicalPrescription } from '../../backend/services/PrescriptionService';
import { PrescriptionCardView } from '../ClinicalDocumentationAssistant';
import { PrescriptionPDF } from '../PrescriptionPDF';
import { downloadPrescriptionPDF } from '../../utils/downloadPdf';
import { useLanguage } from '../../LanguageContext';

interface PrescriptionModalProps {
  prescription: ClinicalPrescription | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  prescription,
  isOpen,
  onClose
}) => {
  const { language } = useLanguage();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !prescription) return null;

  const handleDownload = async () => {
    if (!pdfRef.current) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const result = await downloadPrescriptionPDF(
        pdfRef.current,
        prescription.patientDetails.patientName,
        prescription.patientDetails.patientId,
        prescription.patientDetails.date
      );

      if (result.success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error("PDF Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-left rtl:text-right">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0F4C81] text-white rounded-xl shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                {language === 'ar' ? 'الوصفة الطبية والسجل السريري' : 'Digital EMR Prescription'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {prescription.patientDetails.patientName} &bull; {prescription.patientDetails.patientId} &bull; {prescription.patientDetails.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>{language === 'ar' ? 'تم التحميل!' : 'PDF Downloaded!'}</span>
                </>
              ) : isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{language === 'ar' ? 'جاري التحميل...' : 'Generating PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>{language === 'ar' ? 'تحميل PDF' : 'Download PDF'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <PrescriptionCardView prescription={prescription} />
        </div>

        {/* Hidden Printable PDF Canvas */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', backgroundColor: '#ffffff', pointerEvents: 'none' }}>
          <PrescriptionPDF ref={pdfRef} prescription={prescription} />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-[#F8FAFC] flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
          <span className="flex items-center gap-1 text-slate-600 font-mono">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Satark AI Hospital Accredited EMR Record
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
