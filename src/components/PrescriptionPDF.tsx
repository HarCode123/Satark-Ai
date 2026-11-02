import React, { forwardRef } from 'react';
import { Stethoscope, Pill, Activity, AlertCircle, ClipboardList, ShieldAlert, HeartPulse, Sparkles, FileText, CheckCircle2, Info } from 'lucide-react';
import { ClinicalPrescription } from '../backend/services/PrescriptionService';

export function getMedicationPurpose(medicineName: string, purpose?: string): string {
  if (purpose && purpose !== 'Not Mentioned' && purpose.trim() !== '') {
    return purpose;
  }
  const name = medicineName.toLowerCase();
  if (name.includes('vomikind') || name.includes('ondansetron') || name.includes('emset')) {
    return 'Used for coping with and preventing nausea and vomiting';
  }
  if (name.includes('paracetamol') || name.includes('crocin') || name.includes('calpol') || name.includes('dolo') || name.includes('panadol') || name.includes('acetaminophen')) {
    return 'Relieves body pain, headache, and helps lower fever';
  }
  if (name.includes('amoxicillin') || name.includes('augmentin') || name.includes('azithromycin') || name.includes('zithromax') || name.includes('cefixime') || name.includes('ciprofloxacin')) {
    return 'Antibiotic medication used to treat and clear bacterial infections';
  }
  if (name.includes('metformin') || name.includes('glycomet') || name.includes('janumet')) {
    return 'Helps lower and manage blood sugar levels in Diabetes';
  }
  if (name.includes('pantoprazole') || name.includes('pan') || name.includes('omeprazole') || name.includes('rabeprazole') || name.includes('rantac') || name.includes('antacid')) {
    return 'Reduces stomach acid, heartburn, and protects stomach lining';
  }
  if (name.includes('telmisartan') || name.includes('amlodipine') || name.includes('enalapril') || name.includes('losartan')) {
    return 'Helps regulate and lower high blood pressure';
  }
  if (name.includes('atorvastatin') || name.includes('rosuvastatin') || name.includes('lipitor')) {
    return 'Helps control and reduce high blood cholesterol levels';
  }
  if (name.includes('levosalbutamol') || name.includes('salbutamol') || name.includes('asthalin') || name.includes('cough syrup') || name.includes('ascoril')) {
    return 'Relieves cough, opens airways, and eases chest tightness';
  }
  if (name.includes('dicyclomine') || name.includes('meftal') || name.includes('buscopan') || name.includes('cyclopam')) {
    return 'Relieves abdominal cramps, stomach spasms, and digestive pain';
  }
  if (name.includes('ors') || name.includes('electral') || name.includes('rehydration')) {
    return 'Restores body hydration and replaces lost essential electrolytes';
  }
  if (name.includes('cetirizine') || name.includes('allegra') || name.includes('montelukast') || name.includes('levocetirizine')) {
    return 'Relieves allergy symptoms like runny nose, sneezing, and itching';
  }
  if (name.includes('guaifenesin') || name.includes('mucinex')) {
    return 'Expectorant to thin and loosen mucus in bronchial airways';
  }
  if (name.includes('ibuprofen') || name.includes('advil') || name.includes('motrin')) {
    return 'Relieves chest soreness, body aches, inflammation, and fever';
  }
  if (name.includes('albuterol') || name.includes('salbutamol') || name.includes('proair') || name.includes('ventolin')) {
    return 'Bronchodilator inhaler that opens constricted airways and relieves wheezing';
  }
  return 'Prescribed therapeutic medication to support treatment and symptom recovery';
}

export function getDiseaseDescription(provisionalDiagnosis: string, diseaseDescription?: string): string {
  if (diseaseDescription && diseaseDescription !== 'Not Mentioned' && diseaseDescription.trim() !== '') {
    return diseaseDescription;
  }
  const diag = provisionalDiagnosis.toLowerCase();
  if (diag.includes('bronchitis') || diag.includes('respiratory')) {
    return 'Inflammation of bronchial airways causing cough, tightness, and fever. Prescribed medicines clear infection, open airways, and lower fever.';
  }
  if (diag.includes('diabetes')) {
    return 'Elevated blood glucose levels. Antidiabetic therapy assists your body in regulating blood sugar and protecting cardiovascular health.';
  }
  if (diag.includes('gastroenteritis') || diag.includes('diarrhea') || diag.includes('vomit')) {
    return 'Stomach/intestinal infection causing nausea, vomiting, or loose stools. Prescribed medicines reduce nausea, ease cramps, and prevent dehydration.';
  }
  if (diag.includes('hypertension') || diag.includes('blood pressure')) {
    return 'Elevated blood pressure in arteries. Antihypertensive therapy helps maintain blood pressure in a safe range.';
  }
  return 'Diagnosed clinical condition. Prescribed targeted medications address root causes and provide active symptom relief.';
}

interface PrescriptionPDFProps {
  prescription: ClinicalPrescription | null;
}

/**
 * Dedicated printable/capturable component for generating hospital-grade A4 PDFs.
 * Styled with solid hex colors and explicit layout dimensions to ensure 100% fidelity
 * when captured by html2canvas and converted to PDF with jsPDF.
 */
export const PrescriptionPDF = forwardRef<HTMLDivElement, PrescriptionPDFProps>(({ prescription }, ref) => {
  if (!prescription) {
    return (
      <div
        ref={ref}
        id="printable-prescription-pdf"
        className="bg-white text-slate-800 p-8 w-[800px] min-h-[1100px] mx-auto font-sans text-xs box-border text-left"
        style={{ backgroundColor: '#ffffff', color: '#1e293b' }}
      >
        <p className="text-slate-400 italic text-center pt-20">No active prescription data available.</p>
      </div>
    );
  }

  const { patientDetails, vitals, medications } = prescription;

  const getVitalValue = (val?: string | null, defaultValue: string = '—') => {
    if (!val || val === 'null' || val === 'undefined' || val === 'Not Mentioned' || val.trim() === '') {
      return defaultValue;
    }
    return val;
  };

  const hasVitals = vitals && (
    vitals.temperature || vitals.bloodPressure || vitals.pulse || vitals.respiratoryRate || vitals.spo2
  );

  return (
    <div
      ref={ref}
      id="printable-prescription-pdf"
      className="bg-white text-slate-800 p-8 sm:p-10 w-[800px] min-h-[1130px] h-auto mx-auto font-sans text-xs leading-relaxed box-border shadow-none border border-slate-200 rounded-none text-left rtl:text-right overflow-visible"
      style={{ backgroundColor: '#ffffff', color: '#1e293b', boxSizing: 'border-box' }}
    >
      {/* 1. HOSPITAL HEADER & LOGO */}
      <div 
        data-pdf-keep-together="true"
        className="flex items-center justify-between pb-6 border-b-2 border-[#0F4C81] mb-6 overflow-visible" 
        style={{ borderColor: '#0F4C81' }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0F4C81] text-white rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#0F4C81', color: '#ffffff' }}>
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0F4C81] uppercase tracking-wider font-display leading-tight" style={{ color: '#0F4C81' }}>
              SATARK CLINICAL MEDICAL CENTER
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 leading-snug" style={{ color: '#64748b' }}>
              Department of Internal Medicine & Digital Health Services
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none" style={{ color: '#94a3b8' }}>
              Accredited EHR Healthcare Institution &bull; Reg No: KSA-MED-2026-99
            </p>
          </div>
        </div>

        <div className="text-right rtl:text-left space-y-1 text-slate-600 shrink-0">
          <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-[#0F4C81] font-bold text-[11px] rounded-lg" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#0F4C81' }}>
            Electronic Medical Record
          </div>
          <p className="text-[10px] text-slate-500 font-medium" style={{ color: '#64748b' }}>Date: <span className="font-bold text-slate-800" style={{ color: '#1e293b' }}>{patientDetails.date || 'Today'}</span></p>
          <p className="text-[10px] text-slate-500 font-medium" style={{ color: '#64748b' }}>EMR No: <span className="font-mono font-bold text-slate-800" style={{ color: '#1e293b' }}>{patientDetails.patientId}</span></p>
        </div>
      </div>

      {/* 2. PATIENT INFORMATION SECTION */}
      <div 
        data-pdf-keep-together="true"
        className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5 overflow-visible" 
        style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-3" style={{ borderColor: '#e2e8f0' }}>
          <h2 className="text-[11px] font-bold text-[#0F4C81] uppercase tracking-wider flex items-center gap-2" style={{ color: '#0F4C81' }}>
            <span className="w-2 h-2 rounded-full bg-[#0F4C81]" style={{ backgroundColor: '#0F4C81' }}></span>
            <span>Patient Information</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-mono font-bold" style={{ color: '#94a3b8' }}>PID: {patientDetails.patientId}</span>
        </div>

        <div className="grid grid-cols-4 gap-y-3 gap-x-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Patient Name</span>
            <span className="font-bold text-slate-900 text-sm break-words" style={{ color: '#0f172a' }}>{patientDetails.patientName}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Patient ID</span>
            <span className="font-mono font-bold text-[#0F4C81] text-xs" style={{ color: '#0F4C81' }}>{patientDetails.patientId}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Age / Gender</span>
            <span className="font-semibold text-slate-800" style={{ color: '#1e293b' }}>{patientDetails.age} Yrs / {patientDetails.gender}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Blood Group</span>
            <span className="font-bold text-slate-900 text-xs block" style={{ color: '#0f172a' }}>
              {patientDetails.bloodGroup || 'Not Mentioned'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Height</span>
            <span className="font-semibold text-slate-800" style={{ color: '#1e293b' }}>{patientDetails.height || 'N/A'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Weight</span>
            <span className="font-semibold text-slate-800" style={{ color: '#1e293b' }}>{patientDetails.weight || 'N/A'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>BMI</span>
            <span className="font-bold text-slate-900 text-xs block" style={{ color: '#0f172a' }}>
              {patientDetails.bmi || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Consultation Date</span>
            <span className="font-semibold text-slate-800" style={{ color: '#1e293b' }}>{patientDetails.date}</span>
          </div>

          <div className="col-span-4 pt-2.5 border-t border-slate-200 flex items-center justify-between mt-1" style={{ borderColor: '#e2e8f0' }}>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold inline mr-2" style={{ color: '#94a3b8' }}>Consulting Doctor:</span>
              <span className="font-bold text-slate-900" style={{ color: '#0f172a' }}>{patientDetails.consultingDoctor}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono" style={{ color: '#64748b' }}>License: MED-88429-KSA</span>
          </div>
        </div>
      </div>

      <hr className="border-t border-slate-200 my-4" style={{ borderColor: '#e2e8f0' }} />

      {/* 3. CHIEF COMPLAINT & HPI */}
      <div 
        data-pdf-keep-together="true"
        className="grid grid-cols-2 gap-4 mb-4 overflow-visible"
      >
        <div className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <h3 className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider flex items-center gap-1.5 leading-normal" style={{ color: '#0F4C81' }}>
            <AlertCircle className="h-3.5 w-3.5 text-[#0F4C81] shrink-0" />
            <span>Chief Complaint</span>
          </h3>
          <p className="font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[48px] h-auto break-words whitespace-pre-wrap leading-relaxed text-xs" style={{ color: '#1e293b', backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
            {prescription.chiefComplaint || 'None documented'}
          </p>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <h3 className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider flex items-center gap-1.5 leading-normal" style={{ color: '#0F4C81' }}>
            <ClipboardList className="h-3.5 w-3.5 text-[#0F4C81] shrink-0" />
            <span>History of Present Illness</span>
          </h3>
          <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[48px] h-auto break-words whitespace-pre-wrap leading-relaxed text-xs" style={{ color: '#334155', backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
            {prescription.historyOfPresentIllness || 'None documented'}
          </p>
        </div>
      </div>

      {/* 4. PAST MEDICAL HISTORY & ALLERGIES */}
      <div 
        data-pdf-keep-together="true"
        className="grid grid-cols-2 gap-4 mb-4 overflow-visible"
      >
        <div className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider leading-normal" style={{ color: '#475569' }}>
            Past Medical History
          </h3>
          <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[48px] h-auto break-words whitespace-pre-wrap leading-relaxed text-xs" style={{ color: '#334155', backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
            {prescription.pastMedicalHistory || 'None documented'}
          </p>
        </div>

        <div className="bg-amber-50 p-3.5 border border-amber-200 rounded-xl space-y-1.5 flex flex-col justify-between" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <h3 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 leading-normal" style={{ color: '#92400e' }}>
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Allergies</span>
          </h3>
          <p className="font-bold text-amber-900 bg-amber-100 p-3 rounded-lg border border-amber-200 min-h-[48px] h-auto break-words whitespace-pre-wrap leading-relaxed text-xs" style={{ color: '#78350f', backgroundColor: '#fef3c7', borderColor: '#fde68a' }}>
            {prescription.allergies || 'None reported'}
          </p>
        </div>
      </div>

      {/* 5. VITAL SIGNS */}
      <div 
        data-pdf-keep-together="true"
        className="bg-white p-4 border border-slate-200 rounded-xl mb-4 overflow-visible" 
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        <h3 className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider flex items-center gap-1.5 mb-2.5 leading-normal" style={{ color: '#0F4C81' }}>
          <HeartPulse className="h-4 w-4 text-[#0F4C81] shrink-0" />
          <span>Vital Signs</span>
        </h3>
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Temperature</span>
            <span className="font-bold text-slate-800 text-xs" style={{ color: '#1e293b' }}>{getVitalValue(vitals?.temperature, '—')}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Blood Pressure</span>
            <span className="font-bold text-slate-800 text-xs" style={{ color: '#1e293b' }}>{getVitalValue(vitals?.bloodPressure, '—')}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Heart Rate</span>
            <span className="font-bold text-slate-800 text-xs" style={{ color: '#1e293b' }}>{getVitalValue(vitals?.pulse, '—')}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>Resp. Rate</span>
            <span className="font-bold text-slate-800 text-xs" style={{ color: '#1e293b' }}>{getVitalValue(vitals?.respiratoryRate, '—')}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5" style={{ color: '#94a3b8' }}>SpO₂</span>
            <span className="font-bold text-slate-800 text-xs" style={{ color: '#1e293b' }}>{getVitalValue(vitals?.spo2, '—')}</span>
          </div>
        </div>
      </div>

      {/* 6. PHYSICAL / CLINICAL EXAMINATION & DIAGNOSIS */}
      <div 
        data-pdf-keep-together="true"
        className="bg-emerald-50/80 p-4 border border-emerald-200 rounded-xl mb-4 overflow-visible" 
        style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}
      >
        <h3 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5 leading-normal" style={{ color: '#065f46' }}>
          <Activity className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Physical Examination & Clinical Assessment</span>
        </h3>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col justify-start">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1 leading-normal overflow-visible whitespace-normal" style={{ color: '#047857' }}>
              Primary Diagnosis
            </span>
            <p className="font-bold text-emerald-950 text-xs bg-white p-3 rounded-lg border border-emerald-200/90 break-words whitespace-pre-wrap leading-relaxed h-auto min-h-[48px]" style={{ color: '#022c22', backgroundColor: '#ffffff', borderColor: '#a7f3d0' }}>
              {prescription.provisionalDiagnosis || 'None documented'}
            </p>
            {prescription.provisionalDiagnosis && (
              <div className="mt-2 p-2 bg-emerald-100/60 border border-emerald-200 rounded-md text-[10.5px] text-emerald-900 leading-snug" style={{ backgroundColor: '#d1fae5', borderColor: '#a7f3d0', color: '#064e3b' }}>
                💡 <strong className="font-bold">Condition Overview:</strong> {getDiseaseDescription(prescription.provisionalDiagnosis, prescription.diseaseDescription)}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-start">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1 leading-normal overflow-visible whitespace-normal" style={{ color: '#047857' }}>
              Physical / Clinical Examination
            </span>
            <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-emerald-200/90 break-words whitespace-pre-wrap leading-relaxed h-auto min-h-[48px]" style={{ color: '#334155', backgroundColor: '#ffffff', borderColor: '#a7f3d0' }}>
              {prescription.clinicalExamination || 'None documented'}
            </p>
          </div>
        </div>
      </div>

      {/* 7. INVESTIGATIONS */}
      <div 
        data-pdf-keep-together="true"
        className="bg-white p-4 border border-slate-200 rounded-xl mb-4 overflow-visible" 
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        <h3 className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider mb-2 leading-normal" style={{ color: '#0F4C81' }}>
          Investigations & Laboratory Tests Advised
        </h3>
        <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 font-semibold text-xs break-words whitespace-pre-wrap leading-relaxed h-auto min-h-[44px]" style={{ color: '#1e293b', backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
          {prescription.investigationsAdvised || 'None ordered'}
        </p>
      </div>

      {/* 8. MEDICATIONS PRESCRIBED */}
      <div 
        data-pdf-keep-together="true"
        className="bg-white p-4 border-2 border-[#0F4C81] rounded-xl mb-5 mt-8 overflow-visible" 
        style={{ backgroundColor: '#ffffff', borderColor: '#0F4C81' }}
      >
        <h3 className="text-[11px] font-black text-[#0F4C81] uppercase tracking-wider flex items-center gap-2 pb-2.5 border-b border-slate-200 mb-3.5 leading-normal" style={{ color: '#0F4C81', borderColor: '#e2e8f0' }}>
          <Pill className="h-4 w-4 text-[#0F4C81] shrink-0" />
          <span>Rx — Medications Prescribed</span>
        </h3>

        {medications && medications.length > 0 ? (
          <div className="w-[calc(100%-38px)] mx-auto overflow-hidden">
            <table className="w-full text-left border-collapse my-1" style={{ width: '100%' }}>
              <thead>
                <tr className="bg-slate-100 text-[9.5px] font-black text-slate-700 uppercase tracking-wider" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                  <th className="py-2.5 px-3 border-b-2 border-slate-300">#</th>
                  <th className="py-2.5 px-3 border-b-2 border-slate-300">Medicine Name</th>
                  <th className="py-2.5 px-3 border-b-2 border-slate-300">Dose</th>
                  <th className="py-2.5 px-3 border-b-2 border-slate-300">Frequency</th>
                  <th className="py-2.5 px-3 border-b-2 border-slate-300">Duration</th>
                  <th className="py-2.5 px-3 border-b-2 border-slate-300">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {medications.map((med, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', pageBreakInside: 'avoid' }}>
                    <td className="py-2.5 px-3 font-bold text-slate-400 align-top" style={{ color: '#94a3b8' }}>{index + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 font-mono align-top break-words" style={{ color: '#0f172a' }}>
                      <div>{med.medicineName}</div>
                      <div className="text-[10px] text-blue-800 font-sans font-medium mt-1 leading-tight bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-200/80 inline-block" style={{ color: '#1e40af', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                        💡 What it helps: {getMedicationPurpose(med.medicineName, med.purpose)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 align-top whitespace-nowrap" style={{ color: '#1e293b' }}>{med.dosage}</td>
                    <td className="py-2.5 px-3 font-bold text-[#0F4C81] align-top whitespace-nowrap" style={{ color: '#0F4C81' }}>{med.frequency}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 align-top whitespace-nowrap" style={{ color: '#334155' }}>{med.duration}</td>
                    <td className="py-2.5 px-3 text-slate-600 italic align-top break-words" style={{ color: '#475569' }}>{med.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 italic p-3 bg-slate-50 rounded-lg text-center" style={{ color: '#64748b', backgroundColor: '#f8fafc' }}>
            No medications prescribed.
          </p>
        )}
      </div>

      {/* PATIENT CARE & MEDICATION PURPOSE GUIDE */}
      {medications && medications.length > 0 && (
        <div 
          data-pdf-keep-together="true"
          className="bg-blue-50/50 p-3.5 border border-blue-200 rounded-xl mb-5 text-xs space-y-2 overflow-visible"
          style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}
        >
          <h4 className="text-[10px] font-black text-[#0F4C81] uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#0F4C81' }}>
            <Info className="h-3.5 w-3.5 text-[#0F4C81] shrink-0" />
            <span>Patient Medication Guidance — What Your Tablets Are For</span>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {medications.map((med, idx) => (
              <div key={idx} className="bg-white p-2 rounded border border-blue-100 text-[10.5px]" style={{ backgroundColor: '#ffffff', borderColor: '#e0f2fe' }}>
                <span className="font-bold text-slate-900 block" style={{ color: '#0f172a' }}>{med.medicineName}</span>
                <span className="text-blue-900 block text-[10px] leading-snug mt-0.5" style={{ color: '#1e3a8a' }}>
                  <strong>Purpose:</strong> {getMedicationPurpose(med.medicineName, med.purpose)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. LIFESTYLE ADVICE & FOLLOW-UP */}
      <div 
        data-pdf-keep-together="true"
        className="grid grid-cols-2 gap-4 mb-5 overflow-visible"
      >
        <div className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <h3 className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider leading-normal" style={{ color: '#0F4C81' }}>
            Lifestyle, Diet & Care Advice
          </h3>
          <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[48px] h-auto break-words whitespace-pre-wrap leading-relaxed text-xs" style={{ color: '#334155', backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
            {prescription.lifestyleDietAdvice || 'None documented'}
          </p>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <h3 className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider leading-normal" style={{ color: '#0F4C81' }}>
            Follow-Up & Emergency Advice
          </h3>
          <p className="font-semibold text-slate-800 bg-emerald-50 p-3 rounded-lg border border-emerald-100 min-h-[48px] h-auto break-words whitespace-pre-wrap leading-relaxed text-xs" style={{ color: '#1e293b', backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }}>
            {prescription.followUp || 'None documented'}
          </p>
        </div>
      </div>

      {/* 10. DOCTOR'S NOTES */}
      {prescription.doctorsNotes && (
        <div 
          data-pdf-keep-together="true"
          className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl mb-5 overflow-visible" 
          style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
        >
          <h3 className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider mb-1.5 leading-normal" style={{ color: '#0F4C81' }}>
            Doctor's Clinical Notes & Precautions
          </h3>
          <p className="text-slate-700 italic text-xs leading-relaxed" style={{ color: '#334155' }}>
            {prescription.doctorsNotes}
          </p>
        </div>
      )}

      {/* 11. DOCTOR DETAILS & SIGNATURE PLACEHOLDER */}
      <div 
        data-pdf-keep-together="true"
        className="pt-6 border-t-2 border-slate-300 flex items-end justify-between mt-6 overflow-visible" 
        style={{ borderColor: '#cbd5e1' }}
      >
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[10px] mb-1" style={{ color: '#64748b' }}>
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Generated by AI Engine — Satark AI Clinical Assistant</span>
          </div>
          <p className="text-[9px] text-slate-400 font-mono" style={{ color: '#94a3b8' }}>
            Document ID: {patientDetails.patientId}-RX-{patientDetails.date}
          </p>
          <p className="text-[9px] text-slate-400 font-mono" style={{ color: '#94a3b8' }}>
            Verified Digital Healthcare Record
          </p>
        </div>

        <div className="text-right space-y-1 shrink-0">
          <div className="w-52 h-14 border-b-2 border-dashed border-slate-400 mb-1 flex items-end justify-center pb-1.5" style={{ borderColor: '#94a3b8' }}>
            <span className="text-[11px] text-slate-500 italic font-serif" style={{ color: '#64748b' }}>Dr. Harini (Digital Signature)</span>
          </div>
          <p className="font-bold text-slate-900 text-xs" style={{ color: '#0f172a' }}>{patientDetails.consultingDoctor}</p>
          <p className="text-[10px] text-slate-500 font-semibold" style={{ color: '#64748b' }}>Consulting Physician & Physician In-Charge</p>
        </div>
      </div>
    </div>
  );
});

PrescriptionPDF.displayName = 'PrescriptionPDF';
