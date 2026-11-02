import React, { useState, useRef } from 'react';
import { 
  FileText, Sparkles, Printer, Copy, Check, Save, RefreshCw, 
  User, Stethoscope, Activity, Pill, AlertCircle, FileCheck, 
  Calendar, Hash, HeartPulse, ChevronDown, CheckCircle2,
  Info, ClipboardList, ShieldAlert, Download, Loader2,
  Clock, ShieldCheck, Send
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { ClinicalPrescription } from '../backend/services/PrescriptionService';
import { PrescriptionPDF, getMedicationPurpose, getDiseaseDescription } from './PrescriptionPDF';
import { downloadPrescriptionPDF } from '../utils/downloadPdf';
import { AuthService } from '../services/authService';
import { PatientDataStore } from '../services/patientStore';

// Pre-packaged realistic medical consultation transcript scenarios for 1-click evaluation
const SAMPLE_SCENARIOS = [
  {
    id: "devi",
    title: "Acute Bronchitis & Cough (Devi - Penicillin Allergic)",
    patientName: "Devi Sharma",
    patientId: "PID-2026-235",
    age: "40",
    gender: "Female",
    height: "160 cm",
    weight: "72 kg",
    bloodGroup: "B+",
    consultingDoctor: "Dr. Harini, MD (Internal Medicine)",
    transcript: `Doctor: Good morning, Devi. What brings you in today?
Devi: Morning. I've had a terrible cough for a week following a cold. It started dry, but now I’m coughing up thick, yellowish-green mucus. My chest feels tight and sore, and I feel completely exhausted.
[PMH & Allergies]
Doctor: Any chronic medical conditions like asthma, or any daily medications?
Devi: No, none.
Doctor: Do you have any allergies?
Devi: Yes, I am allergic to Penicillin. It gives me a severe rash.
Doctor: Noted. We will strictly avoid that family of medications.
[Physical Exam & Diagnosis]
Doctor: Your vitals look stable: blood pressure is 120/80, oxygen is excellent at 98%, and you have a mild fever of 99.8°F. Let me listen to your lungs. [Listens with stethoscope] I hear some wheezing and rattling in your upper chest, but your lower lungs are clear. You have acute bronchitis (inflammation of the airways).
Devi: Do I need an antibiotic or an X-ray?
Doctor: No. This is over 95% viral, so antibiotics won't help. Because your oxygen is great and your lower lungs are clear, an X-ray isn't needed. We will treat your symptoms directly.
[Prescriptions & Plan]
Devi: What should I take to feel better?
Doctor: I am writing three specific prescriptions:
1. Guaifenesin 600 mg (Extended-Release): An expectorant to thin mucus. Take 1 tablet every 12 hours. Quantity: 14 tablets (7-day course).
2. Ibuprofen 400 mg: For chest soreness and fever. Take 1 tablet every 6–8 hours as needed. Quantity: 20 tablets.
3. Albuterol HFA Inhaler: To open your airways and relieve wheezing. Use 2 puffs every 4–6 hours only as needed. Quantity: 1 inhaler.
[Follow-up & Home Care]
Doctor: Rest up, use a humidifier, and drink plenty of water to thin the mucus. The worst should clear in a week, though a mild cough can linger for 2 to 3 weeks.
Devi: When should I follow up?
Doctor: Come back in 10 days if you aren't improving. Go to the emergency room immediately if you develop a high fever, cough up blood, or experience severe shortness of breath.
Devi: Thank you, Doctor.
Doctor: You're welcome, Devi. Feel better soon!`
  },
  {
    id: "bronchitis",
    title: "Acute Bronchitis & High Fever (Sarah)",
    patientName: "Sarah Al-Mansoor",
    patientId: "PID-2026-001",
    age: "34",
    gender: "Female",
    height: "165 cm",
    weight: "62 kg",
    bloodGroup: "O+",
    consultingDoctor: "Dr. Harini, MD (Internal Medicine)",
    transcript: `Doctor: Good morning, Mrs. Sarah. What brings you to the clinic today?
Patient: Hello doctor. I've been having a severe dry cough for the last 4 days that keeps me awake at night, along with a high fever since yesterday. My chest feels tight.
Doctor: I see. Let's check your vitals. Temperature is 38.6 °C, blood pressure is 118/76, pulse is 82 bpm, and SpO2 is 98% on room air.
Patient: Also, doctor, I should let you know I am allergic to Penicillin. I get severe hives.
Doctor: Thank you for noting that. I will write down Penicillin allergy in your medical chart. Let me listen to your chest... On auscultation, breath sounds are clear bilaterally with mild scattered rhonchi, no crepitations or wheezing.
Doctor: This looks like acute bronchitis with a secondary viral upper respiratory infection. I will advise a Complete Blood Count (CBC) and a Chest X-Ray (PA view) to rule out pneumonia.
Doctor: Since you are allergic to Penicillin, I am prescribing Azithromycin 500mg, 1 tablet once daily (QD) for 5 days. Take it after meals.
Doctor: For the fever and chest discomfort, take Paracetamol 650mg, 1 tablet twice daily (BID) for 3 days after food as needed.
Doctor: Also, a bronchodilator cough syrup - Levosalbutamol Syrup 5ml three times a day (TID) for 5 days.
Doctor: Please rest adequately, drink plenty of warm fluids, and avoid cold beverages.
Doctor: Please follow up with me in 5 days, or sooner if breathlessness increases.`
  },
  {
    id: "diabetes",
    title: "Type 2 Diabetes & Hypertension Follow-up",
    patientName: "Robert Miller",
    patientId: "PID-2026-002",
    age: "58",
    gender: "Male",
    height: "178 cm",
    weight: "86 kg",
    bloodGroup: "A+",
    consultingDoctor: "Dr. Harini, MD (Endocrinology)",
    transcript: `Doctor: Hello Mr. Miller. Welcome back for your routine 3-month diabetes review. How have you been feeling?
Patient: Hello Doctor. Generally fine, though I occasionally feel tired in the late afternoon. My home morning blood sugar readings have been averaging around 140 mg/dL.
Doctor: Let's review today's vitals. Blood Pressure is 135/85 mmHg, pulse is 72 bpm, weight is 86 kg. Respiratory rate is 16 breaths/min.
Patient: No known drug allergies, doctor.
Doctor: Great. Your laboratory results show HbA1c is 7.4%, Fasting Plasma Glucose is 138 mg/dL, Serum Creatinine is 0.9 mg/dL, and Lipid Profile shows LDL of 115 mg/dL.
Doctor: Physical examination reveals normal S1/S2 cardiac sounds, peripheral pulses intact, and non-diabetic foot inspection is normal with preserved monofilament sensation.
Doctor: Our provisional diagnosis remains Type 2 Diabetes Mellitus with Mild Essential Hypertension.
Doctor: I am advising Fasting Blood Sugar tracking weekly and a repeat HbA1c & Renal Function Test in 3 months.
Doctor: We will continue Metformin Hydrochloride 1000mg, 1 tablet twice daily (BID) with meals for 90 days.
Doctor: For blood pressure regulation, Telmisartan 40mg, 1 tablet once daily (QD) in the morning for 90 days.
Doctor: For cholesterol management, Atorvastatin 10mg, 1 tablet at bedtime (HS) for 90 days.
Doctor: Diet advice: strict low-glycemic index diet, reduce daily sodium intake below 2g, and engage in 30 minutes of brisk walking 5 days a week.
Doctor: Follow-up in 3 months with fresh HbA1c lab report.`
  },
  {
    id: "gastro",
    title: "Acute Gastroenteritis & Mild Dehydration",
    patientName: "Amina Hassan",
    patientId: "PID-2026-003",
    age: "27",
    gender: "Female",
    height: "160 cm",
    weight: "54 kg",
    bloodGroup: "B+",
    consultingDoctor: "Dr. Harini, MD (Gastroenterology)",
    transcript: `Doctor: Hello Amina, what symptoms are you experiencing today?
Patient: Doctor, I've had severe watery diarrhea and abdominal cramping since last night after eating food outside. I vomited twice this morning.
Doctor: Let's check your vitals. Temperature is 37.8 °C, Blood Pressure is 105/68 mmHg, Pulse is 94 bpm, SpO2 is 99%.
Doctor: On clinical examination: mild diffuse abdominal tenderness, hyperactive bowel sounds, dry mucous membranes indicating mild dehydration. No rebound tenderness.
Patient: I am allergic to Sulfa drugs.
Doctor: Noted. Provisional diagnosis: Acute Gastroenteritis with mild dehydration.
Doctor: Investigations advised: Stool routine and culture examination, Serum Electrolytes.
Doctor: Medications prescribed:
1. Oral Rehydration Salts (ORS) - 1 sachet dissolved in 1 liter of clean water, drink frequently throughout the day for 3 days.
2. Ondansetron 4mg tablet - 1 tablet as needed (PRN) before meals for nausea/vomiting for 2 days.
3. Dicyclomine 10mg tablet - 1 tablet twice daily (BID) before meals for abdominal cramps for 3 days.
Doctor: Lifestyle & diet advice: Bland BRAT diet (Bananas, Rice, Applesauce, Toast). Avoid dairy, spicy foods, caffeine, and fatty meals until fully recovered.
Doctor: Follow-up in 2 days if vomiting persists or symptoms worsen.`
  }
];


// Reusable component to render a full Digital Clinical Prescription
export function PrescriptionCardView({ 
  prescription, 
  onSavedToEmr,
  onApprove,
  isDoctorView = false
}: { 
  prescription: ClinicalPrescription; 
  onSavedToEmr?: () => void;
  onApprove?: (approvedRx: ClinicalPrescription) => Promise<void> | void;
  isDoctorView?: boolean;
}) {
  const { language } = useLanguage();
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [savedToDb, setSavedToDb] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfToast, setPdfToast] = useState<{ success: boolean; message: string } | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'approved'>(
    (prescription as any).status === 'approved' ? 'approved' : 'draft'
  );
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || !prescription) return;

    setIsGeneratingPdf(true);
    setPdfToast(null);

    const result = await downloadPrescriptionPDF(
      pdfRef.current,
      prescription.patientDetails.patientName,
      prescription.patientDetails.patientId,
      prescription.patientDetails.date
    );

    setIsGeneratingPdf(false);
    setPdfToast(result);

    setTimeout(() => {
      setPdfToast(null);
    }, 4500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!prescription) return;

    const formattedText = `
==================================================
CLINICAL DIGITAL PRESCRIPTION
==================================================

PATIENT DETAILS:
Patient Name     : ${prescription.patientDetails.patientName}
Patient ID       : ${prescription.patientDetails.patientId}
Age              : ${prescription.patientDetails.age}
Gender           : ${prescription.patientDetails.gender}
Height           : ${prescription.patientDetails.height}
Weight           : ${prescription.patientDetails.weight}
BMI              : ${prescription.patientDetails.bmi}
Blood Group      : ${prescription.patientDetails.bloodGroup}
Date             : ${prescription.patientDetails.date}
Consulting Doctor: ${prescription.patientDetails.consultingDoctor}

--------------------------------------------------
CHIEF COMPLAINT:
${prescription.chiefComplaint || 'None documented'}

--------------------------------------------------
HISTORY OF PRESENT ILLNESS:
${prescription.historyOfPresentIllness || 'None documented'}

--------------------------------------------------
PAST MEDICAL HISTORY:
${prescription.pastMedicalHistory || 'None documented'}

--------------------------------------------------
ALLERGIES:
${prescription.allergies || 'None reported'}

--------------------------------------------------
VITALS:
${prescription.vitals.temperature ? `Temperature     : ${prescription.vitals.temperature}\n` : ''}${prescription.vitals.pulse ? `Pulse           : ${prescription.vitals.pulse}\n` : ''}${prescription.vitals.bloodPressure ? `Blood Pressure  : ${prescription.vitals.bloodPressure}\n` : ''}${prescription.vitals.respiratoryRate ? `Respiratory Rate: ${prescription.vitals.respiratoryRate}\n` : ''}${prescription.vitals.spo2 ? `SpO2            : ${prescription.vitals.spo2}\n` : ''}${!prescription.vitals.temperature && !prescription.vitals.pulse && !prescription.vitals.bloodPressure && !prescription.vitals.respiratoryRate && !prescription.vitals.spo2 ? 'None documented\n' : ''}--------------------------------------------------
CLINICAL EXAMINATION:
${prescription.clinicalExamination || 'None documented'}

--------------------------------------------------
PROVISIONAL DIAGNOSIS:
${prescription.provisionalDiagnosis || 'None documented'}

--------------------------------------------------
INVESTIGATIONS ORDERED:
${prescription.investigationsAdvised || 'None ordered'}

--------------------------------------------------
MEDICATIONS:
${prescription.medications.length > 0 ? prescription.medications.map((m, i) => `${i+1}. ${m.medicineName}${m.strength ? ` (${m.strength})` : ''}
   Dosage: ${m.dosage || '—'} | Frequency: ${m.frequency || '—'} | Duration: ${m.duration || '—'}
   Instructions: ${m.instructions || '—'}`).join('\n\n') : 'None prescribed'}

--------------------------------------------------
LIFESTYLE AND DIET ADVICE:
${prescription.lifestyleDietAdvice || 'None documented'}

--------------------------------------------------
FOLLOW-UP:
${prescription.followUp || 'None documented'}

--------------------------------------------------
DOCTOR'S NOTES:
${prescription.doctorsNotes || 'None documented'}
==================================================
`;

    navigator.clipboard.writeText(formattedText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleSaveToEMR = async () => {
    if (!prescription) return;

    try {
      const response = await fetch('/api/emr', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({
          consultationId: Date.now(),
          patientId: prescription.patientDetails.patientId,
          patientName: prescription.patientDetails.patientName,
          age: prescription.patientDetails.age,
          gender: prescription.patientDetails.gender,
          height: prescription.patientDetails.height,
          weight: prescription.patientDetails.weight,
          bloodGroup: prescription.patientDetails.bloodGroup,
          doctorId: "DOC-HARINI-01",
          chiefComplaint: prescription.chiefComplaint,
          symptoms: prescription.historyOfPresentIllness,
          diagnosis: prescription.provisionalDiagnosis,
          medications: prescription.medications.map(m => `${m.medicineName} ${m.strength}`).join(', ') || "None",
          dosage: prescription.medications.map(m => `${m.dosage} ${m.frequency}`).join('; ') || "None",
          advice: prescription.lifestyleDietAdvice,
          followUpDate: prescription.followUp,
          status: "Completed"
        })
      });

      if (response.ok) {
        setSavedToDb(true);
        if (onSavedToEmr) onSavedToEmr();
        window.dispatchEvent(new Event('refresh-emr-table'));
      }
    } catch (err) {
      console.error("Failed to save to EMR:", err);
    }
  };

  const handleSaveDraft = async () => {
    if (!prescription) return;
    setIsSavingDraft(true);
    setApprovalMessage(null);
    try {
      const rxId = (prescription as any).prescriptionId || (prescription as any).id || `rx-${Date.now()}-${prescription.patientDetails.patientId}`;
      const response = await fetch('/api/prescriptions/draft', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({
          prescriptionId: rxId,
          patientId: prescription.patientDetails.patientId,
          fullPrescription: {
            ...prescription,
            prescriptionId: rxId,
            status: 'draft'
          }
        })
      });

      if (response.ok) {
        setApprovalMessage(
          language === 'ar' 
            ? 'تم حفظ المسودة بنجاح في قاعدة البيانات. (لا تزال غير مرئية للمريض)' 
            : 'Draft saved to backend database. (Remains hidden from patient until approved)'
        );
      } else {
        let errorMsg = 'Failed to save draft';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            errorMsg = data.message || data.error || errorMsg;
          } else {
            const text = await response.text();
            errorMsg = text.slice(0, 150) || errorMsg;
          }
        } catch (e) {
          errorMsg = `Server error (Status: ${response.status})`;
        }
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error("Error saving draft:", err);
      setApprovalMessage(err.message || "Failed to save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApproveAndPublish = async () => {
    if (!prescription) return;
    setIsApproving(true);
    setApprovalMessage(null);

    const rxId = (prescription as any).prescriptionId || (prescription as any).id || `rx-${Date.now()}-${prescription.patientDetails.patientId}`;

    const approvedPrescription: ClinicalPrescription = {
      ...prescription,
      ...({
        prescriptionId: rxId,
        id: rxId,
        status: 'approved',
        consultationCompleted: true,
        approvedAt: new Date().toISOString()
      } as any)
    };

    try {
      const response = await fetch('/api/prescriptions/approve', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({
          prescriptionId: rxId,
          patientId: prescription.patientDetails.patientId,
          fullPrescription: approvedPrescription
        })
      });

      if (response.ok) {
        setCurrentStatus('approved');
        setApprovalMessage(
          language === 'ar'
            ? `تم اعتماد الوصفة ونشرها بنجاح في بوابة المريض (${prescription.patientDetails.patientName}).`
            : `Prescription approved and published online for ${prescription.patientDetails.patientName}. Available immediately in Patient Portal.`
        );

        // Synchronize with PatientDataStore & dispatch event so any open patient view updates
        PatientDataStore.addPrescription(approvedPrescription);
        window.dispatchEvent(new CustomEvent('patient-data-updated'));

        // Save EMR summary
        await handleSaveToEMR();

        if (onApprove) {
          await onApprove(approvedPrescription);
        }
      } else {
        let errorMsg = 'Failed to approve prescription';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            errorMsg = data.message || data.error || errorMsg;
          } else {
            const text = await response.text();
            errorMsg = text.slice(0, 150) || errorMsg;
          }
        } catch (e) {
          errorMsg = `Server error (Status: ${response.status})`;
        }
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error("Error approving prescription:", err);
      setApprovalMessage(err.message || "Failed to approve prescription.");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden animate-fade-in print:border-0 print:shadow-none print:m-0">
      
      {/* Prescription Header / Clinic Details */}
      <div className="bg-gradient-to-r from-slate-900 to-[#0F4C81] text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-4 border-amber-400">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="bg-white text-[#0F4C81] p-1.5 rounded-lg font-bold">
              <Stethoscope className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider font-display">SATARK CLINICAL MEDICAL CENTER</h2>
          </div>
          <p className="text-xs text-blue-200">Electronic Health Record (EHR) System — Official Digital Prescription</p>
        </div>

        <div className="text-left sm:text-right text-xs space-y-0.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10 w-full sm:w-auto">
          <p className="font-bold text-white text-sm">{prescription.patientDetails.consultingDoctor}</p>
          <p className="text-blue-200">License No: MED-88429-KSA</p>
          <p className="text-blue-200">Date: {prescription.patientDetails.date}</p>
        </div>
      </div>

      {/* Toolbar Actions */}
      <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Status indicator badge */}
        <div>
          {currentStatus === 'approved' ? (
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{language === 'ar' ? 'الوصفة الطبية معتمدة ومنشورة للمريض' : 'Approved & Published to Patient Portal'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>{language === 'ar' ? 'مسودة — قيد المراجعة السريرية (غير متاحة للمريض)' : 'Draft — Under Clinical Review (Hidden from Patient)'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Doctor Approval & Save Actions */}
          {isDoctorView && currentStatus !== 'approved' && (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isApproving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                title="Save draft to database without publishing to patient"
              >
                {isSavingDraft ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
                ) : (
                  <Save className="h-3.5 w-3.5 text-slate-600" />
                )}
                <span>{language === 'ar' ? 'حفظ كمسودة' : 'Save as Draft'}</span>
              </button>

              <button
                type="button"
                onClick={handleApproveAndPublish}
                disabled={isApproving || isSavingDraft}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60 animate-pulse hover:animate-none"
                title="Approve prescription and publish immediately to the patient portal"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>{language === 'ar' ? 'جاري الاعتماد والنشر...' : 'Approving...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{language === 'ar' ? 'اعتماد ونشر للمريض' : 'Approve & Publish to Patient'}</span>
                  </>
                )}
              </button>
            </>
          )}

          {isDoctorView && currentStatus === 'approved' && (
            <button
              type="button"
              onClick={handleSaveToEMR}
              disabled={savedToDb}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5 text-emerald-400" />
              <span>{savedToDb ? (language === 'ar' ? 'محفوظ في EMR' : 'Saved in EMR') : (language === 'ar' ? 'حفظ في السجل الطبي EMR' : 'Save to EMR DB')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
            <span>{copiedText ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ النص' : 'Copy Text')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf || !prescription}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0052CC] hover:bg-[#003D99] text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                <span>{language === 'ar' ? 'جاري إنشاء PDF...' : 'Generating PDF...'}</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>{language === 'ar' ? 'تحميل PDF' : 'Download PDF'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Approval Status Message Banner */}
      {approvalMessage && (
        <div className="px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b bg-emerald-50 text-emerald-900 border-emerald-200 transition-all print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{approvalMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setApprovalMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* PDF Toast Status Notification */}
      {pdfToast && (
        <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b transition-all print:hidden ${
          pdfToast.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {pdfToast.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{pdfToast.message}</span>
          </div>
        </div>
      )}

      {/* Hidden Dedicated Printable Container for html2canvas PDF Export */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', backgroundColor: '#ffffff', pointerEvents: 'none' }}>
        <PrescriptionPDF ref={pdfRef} prescription={prescription} />
      </div>

      {/* Prescription Body Document Content */}
      <div className="p-6 sm:p-8 space-y-6 text-slate-800 text-xs leading-relaxed">
        
        {/* 1. PATIENT DETAILS SECTION */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
          <h3 className="font-bold text-[#0F4C81] uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200 flex items-center justify-between">
            <span>PATIENT DETAILS</span>
            <span className="font-mono text-[10px] text-slate-400">EMR RECORD ID: {prescription.patientDetails.patientId}</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient Name</span>
              <span className="font-bold text-slate-900 block">{prescription.patientDetails.patientName}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient ID</span>
              <span className="font-mono font-semibold text-[#0F4C81] block">{prescription.patientDetails.patientId}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Age / Gender</span>
              <span className="font-semibold text-slate-800 block">{prescription.patientDetails.age} Yrs / {prescription.patientDetails.gender}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Height / Weight</span>
              <span className="font-semibold text-slate-800 block">{prescription.patientDetails.height} / {prescription.patientDetails.weight}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">BMI</span>
              <span className="font-bold text-slate-800 block">
                {prescription.patientDetails.bmi || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Blood Group</span>
              <span className="font-bold text-slate-800 block">
                {prescription.patientDetails.bloodGroup || 'Not Mentioned'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
              <span className="font-semibold text-slate-800 block">{prescription.patientDetails.date}</span>
            </div>

            <div className="col-span-2 sm:col-span-3">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Consulting Doctor</span>
              <span className="font-bold text-slate-900 block">{prescription.patientDetails.consultingDoctor}</span>
            </div>
          </div>
        </div>

        {/* 2. CHIEF COMPLAINT & HPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-bold uppercase text-[10px] tracking-wider text-[#0F4C81] flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>CHIEF COMPLAINT</span>
            </h4>
            <p className="font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {prescription.chiefComplaint || 'Not Mentioned'}
            </p>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-bold uppercase text-[10px] tracking-wider text-[#0F4C81] flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>HISTORY OF PRESENT ILLNESS</span>
            </h4>
            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {prescription.historyOfPresentIllness || 'Not Mentioned'}
            </p>
          </div>
        </div>

        {/* 3. PAST MEDICAL HISTORY & ALLERGIES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-bold uppercase text-[10px] tracking-wider text-slate-600">
              PAST MEDICAL HISTORY
            </h4>
            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {prescription.pastMedicalHistory || 'None reported'}
            </p>
          </div>

          <div className="bg-white p-4 border border-amber-200 rounded-xl space-y-1.5 bg-amber-50/20">
            <h4 className="font-bold uppercase text-[10px] tracking-wider text-amber-800 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>ALLERGIES</span>
            </h4>
            <p className="font-bold text-amber-900 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200">
              {prescription.allergies || 'None reported'}
            </p>
          </div>
        </div>

        {/* 4. VITALS SECTION */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-2">
          <h4 className="font-bold text-[#0F4C81] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <HeartPulse className="h-3.5 w-3.5 text-[#0F4C81]" />
            <span>VITALS</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Temperature</span>
              <span className="font-bold text-slate-800">{prescription.vitals.temperature || '—'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Blood Pressure</span>
              <span className="font-bold text-slate-800">{prescription.vitals.bloodPressure || '—'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Heart Rate</span>
              <span className="font-bold text-slate-800">{prescription.vitals.pulse || '—'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Resp. Rate</span>
              <span className="font-bold text-slate-800">{prescription.vitals.respiratoryRate || '—'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">SpO₂</span>
              <span className="font-bold text-slate-800">{prescription.vitals.spo2 || '—'}</span>
            </div>
          </div>
        </div>

        {/* 5. CLINICAL EXAMINATION & PROVISIONAL DIAGNOSIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-bold text-[#0F4C81] uppercase text-[10px] tracking-wider">
              CLINICAL EXAMINATION
            </h4>
            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {prescription.clinicalExamination || 'Not documented'}
            </p>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-bold text-[#0F4C81] uppercase text-[10px] tracking-wider flex items-center justify-between">
              <span>PROVISIONAL DIAGNOSIS</span>
              <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">Patient Education</span>
            </h4>
            <p className="font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
              {prescription.provisionalDiagnosis || 'Not documented'}
            </p>
            <div className="bg-blue-50/80 border border-blue-200 p-2.5 rounded-lg text-xs text-blue-900 mt-2 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-blue-900 text-[10px] uppercase tracking-wider mb-0.5">Condition Overview & Purpose:</span>
                <p className="leading-relaxed text-slate-700 text-xs">{getDiseaseDescription(prescription.provisionalDiagnosis, prescription.diseaseDescription)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. INVESTIGATIONS ADVISED */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
          <h4 className="font-bold text-[#0F4C81] uppercase text-[10px] tracking-wider">
            INVESTIGATIONS ADVISED
          </h4>
          <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-semibold">
            {prescription.investigationsAdvised || 'None ordered'}
          </p>
        </div>

        {/* 7. MEDICATIONS TABLE */}
        <div className="bg-white p-4 border-2 border-[#0F4C81]/20 rounded-xl space-y-3">
          <h4 className="font-extrabold text-[#0F4C81] uppercase text-xs tracking-wider flex items-center gap-2 border-b pb-2 border-slate-200">
            <Pill className="h-4 w-4 text-[#0F4C81]" />
            <span>MEDICATIONS PRESCRIBED</span>
          </h4>

          {prescription.medications && prescription.medications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="p-2.5 border-b border-slate-200">#</th>
                    <th className="p-2.5 border-b border-slate-200">Medicine Name</th>
                    <th className="p-2.5 border-b border-slate-200">Dosage</th>
                    <th className="p-2.5 border-b border-slate-200">Frequency</th>
                    <th className="p-2.5 border-b border-slate-200">Duration</th>
                    <th className="p-2.5 border-b border-slate-200">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {prescription.medications.map((med, index) => (
                    <tr key={index} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-bold text-slate-400 align-top">{index + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900 font-mono text-xs align-top">
                        <div>{med.medicineName}</div>
                        <div className="text-[11px] text-blue-800 font-sans font-medium bg-blue-50 border border-blue-100 px-2 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                          <Info className="h-3 w-3 text-blue-600 shrink-0" />
                          <span><strong>What it helps:</strong> {getMedicationPurpose(med.medicineName, med.purpose)}</span>
                        </div>
                      </td>
                      <td className="p-2.5 font-semibold text-slate-700 align-top">{med.dosage}</td>
                      <td className="p-2.5 font-bold text-[#0F4C81] align-top">{med.frequency}</td>
                      <td className="p-2.5 font-semibold text-slate-700 align-top">{med.duration}</td>
                      <td className="p-2.5 text-slate-600 italic align-top">{med.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 italic p-3 bg-slate-50 rounded-lg text-center">None prescribed</p>
          )}
        </div>

        {/* PATIENT MEDICATION AWARENESS GUIDE */}
        {prescription.medications && prescription.medications.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-[#0F4C81] text-xs uppercase tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4 text-[#0F4C81]" />
              <span>Patient Care Guide — Understanding Your Prescribed Medications</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {prescription.medications.map((med, i) => (
                <div key={i} className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{med.medicineName}</span>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">{med.dosage}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-snug">
                    💡 <strong className="text-slate-700">Function:</strong> {getMedicationPurpose(med.medicineName, med.purpose)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. LIFESTYLE / DIET ADVICE & FOLLOW-UP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-bold text-[#0F4C81] uppercase text-[10px] tracking-wider">
              LIFESTYLE / DIET ADVICE
            </h4>
            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {prescription.lifestyleDietAdvice || 'None documented'}
            </p>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-bold text-[#0F4C81] uppercase text-[10px] tracking-wider">
              FOLLOW-UP
            </h4>
            <p className="font-semibold text-slate-800 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
              {prescription.followUp || 'Not documented'}
            </p>
          </div>
        </div>

        {/* 9. DOCTOR'S NOTES */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5">
          <h4 className="font-bold text-[#0F4C81] uppercase text-[10px] tracking-wider">
            DOCTOR'S NOTES
          </h4>
          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
            {prescription.doctorsNotes || 'None documented'}
          </p>
        </div>

        {/* Official EMR Signoff Footer */}
        <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 font-mono">
          <div>
            <span>ELECTRONIC MEDICAL RECORD (EMR) ID: {prescription.patientDetails.patientId}</span>
            <span className="block text-slate-400">System Verified by Satark AI Clinical Assistant</span>
          </div>
          <div className="text-center sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
            <div className="h-8 border-b border-dashed border-slate-300 mb-1 w-36 mx-auto sm:ml-auto"></div>
            <span className="font-bold text-slate-700 block">{prescription.patientDetails.consultingDoctor}</span>
            <span>Digitally Signed & Certified</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ClinicalDocumentationAssistant() {
  const { language } = useLanguage();

  // Selected sample preset or custom
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("devi");

  // Form Input States
  const [patientName, setPatientName] = useState<string>(SAMPLE_SCENARIOS[0].patientName);
  const [patientId, setPatientId] = useState<string>(SAMPLE_SCENARIOS[0].patientId);
  const [age, setAge] = useState<string>(SAMPLE_SCENARIOS[0].age);
  const [gender, setGender] = useState<string>(SAMPLE_SCENARIOS[0].gender);
  const [height, setHeight] = useState<string>(SAMPLE_SCENARIOS[0].height);
  const [weight, setWeight] = useState<string>(SAMPLE_SCENARIOS[0].weight);
  const [bloodGroup, setBloodGroup] = useState<string>(SAMPLE_SCENARIOS[0].bloodGroup);
  const [consultingDoctor, setConsultingDoctor] = useState<string>(SAMPLE_SCENARIOS[0].consultingDoctor);
  const [consultDate, setConsultDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transcript, setTranscript] = useState<string>(SAMPLE_SCENARIOS[0].transcript);

  // Output State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [prescription, setPrescription] = useState<ClinicalPrescription | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handler for scenario switching
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    const found = SAMPLE_SCENARIOS.find(s => s.id === scenarioId);
    if (found) {
      setPatientName(found.patientName);
      setPatientId(found.patientId);
      setAge(found.age);
      setGender(found.gender);
      setHeight(found.height);
      setWeight(found.weight);
      setBloodGroup(found.bloodGroup);
      setConsultingDoctor(found.consultingDoctor);
      setTranscript(found.transcript);
      setPrescription(null);
    }
  };

  // API Call to Generate Clinical Prescription
  const handleGeneratePrescription = async () => {
    if (!transcript.trim()) {
      setErrorMessage("Please enter or paste a consultation transcript first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      console.log("🩺 Sending request to /api/emr/generate...");
      const response = await fetch('/api/emr/generate', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({
          patientInfo: {
            patientName,
            patientId,
            age,
            gender,
            height,
            weight,
            bloodGroup,
            date: consultDate,
            consultingDoctor
          },
          transcript
        })
      });

      const result = await response.json();
      if (response.ok && result.success && result.data) {
        setPrescription(result.data);
      } else {
        throw new Error(result.message || "Failed to parse consultation transcript.");
      }
    } catch (err: any) {
      console.error("❌ Prescription Generation Error:", err);
      setErrorMessage(err.message || "An error occurred while calling the AI Clinical Documentation engine.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="clinical-documentation-assistant-page" className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* 1. Header & Title Banner */}
      <div className="bg-gradient-to-r from-[#0F4C81] to-[#1e619d] text-white p-6 sm:p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-xs border border-white/15">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>AI Clinical Documentation Assistant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Doctor Consultation Transcript to Digital Prescription
            </h1>
            <p className="text-blue-100 text-sm max-w-3xl leading-relaxed">
              Convert doctor-patient consultation audio transcripts into structured, medically accurate digital prescriptions for EMR storage without inventing or hallucinating clinical data.
            </p>
          </div>

          {/* Quick Scenario Selector */}
          <div className="bg-white/10 border border-white/20 p-3.5 rounded-xl backdrop-blur-md shrink-0 space-y-1.5 w-full md:w-72">
            <label className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">
              Load Sample Clinical Scenario:
            </label>
            <select
              id="clinical-scenario-select"
              value={selectedScenarioId}
              onChange={(e) => handleScenarioChange(e.target.value)}
              className="w-full bg-white text-slate-800 text-xs font-bold py-2 px-3 rounded-lg border-0 shadow-xs focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              {SAMPLE_SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Input Form & Transcript (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Patient Details Input Card */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-3 border-brand-border flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#0F4C81]">
                <User className="h-4 w-4" />
                <span>Patient & Doctor Information</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">STEP 1</span>
            </h2>

            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Patient ID</label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-mono font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Age</label>
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Height</label>
                <input
                  type="text"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 170 cm"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Weight</label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 68 kg"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Blood Group</label>
                <input
                  type="text"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  placeholder="e.g. O+"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Consult Date</label>
                <input
                  type="date"
                  value={consultDate}
                  onChange={(e) => setConsultDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-500 font-semibold mb-1">Consulting Doctor</label>
                <input
                  type="text"
                  value={consultingDoctor}
                  onChange={(e) => setConsultingDoctor(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Transcript Input Card */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-3 border-brand-border flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#0F4C81]">
                <Stethoscope className="h-4 w-4" />
                <span>Consultation Transcript</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">STEP 2</span>
            </h2>

            <div>
              <textarea
                id="consultation-transcript-textarea"
                rows={11}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste or record doctor-patient dialogue transcript here..."
                className="w-full p-3.5 border rounded-xl bg-slate-50 font-mono text-xs text-slate-800 leading-relaxed focus:bg-white focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden transition-colors resize-none"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              id="generate-prescription-btn"
              onClick={handleGeneratePrescription}
              disabled={isProcessing}
              className="w-full py-3.5 px-6 bg-[#0F4C81] hover:bg-[#0c3c66] text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg focus:outline-hidden cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin text-amber-300" />
                  <span>Extracting Clinical Data with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5 text-amber-300" />
                  <span>Generate Digital Clinical Prescription</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Professional EMR Digital Prescription Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {prescription ? (
            <PrescriptionCardView prescription={prescription} />
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-4">
              <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-300 shadow-3xs">
                <FileText className="h-8 w-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-700">Digital Prescription Preview</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fill in the patient details and consultation transcript on the left, then click <strong className="text-[#0F4C81]">"Generate Digital Clinical Prescription"</strong> to view the structured EMR output here.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

