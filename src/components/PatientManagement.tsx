import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, ArrowUpDown, Phone, Mail, MapPin, Activity, 
  FileText, X, ChevronRight, User, Hash, Calendar, Heart, 
  AlertTriangle, Check, ArrowLeft, PlayCircle
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { AuthService } from '../services/authService';

interface Patient {
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  heightCm?: number;
  weightKg?: number;
  phoneNumber: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  createdAt?: string;
}

interface PatientManagementProps {
  onStartConsultation: (patientId: string) => void;
  onViewMonitoring?: (patientId: string) => void;
}

export default function PatientManagement({ onStartConsultation, onViewMonitoring }: PatientManagementProps) {
  const { t, language } = useLanguage();

  // Navigation / View states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Registration Form Toggle
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');

  // Form Feedback
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Directory Search & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Load Patients from DB API
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/patients', {
        headers: AuthService.getAuthHeaders()
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPatients(result.data || []);
        }
      }
    } catch (err) {
      console.error('❌ Failed to fetch patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Form Submission
  const handleRegisterSubmit = async (e: React.FormEvent, startConsultationImmediately: boolean = false) => {
    e.preventDefault();
    setValidationErrors([]);
    setSuccessMessage('');

    const errors: string[] = [];
    
    // First Name
    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) {
      errors.push(language === 'ar' ? 'الاسم الأول مطلوب.' : 'First name is required.');
    } else if (trimmedFirst.length < 2) {
      errors.push(language === 'ar' ? 'يجب أن يتكون الاسم الأول من حرفين على الأقل.' : 'First name must be at least 2 characters.');
    } else if (/^\d+$/.test(trimmedFirst)) {
      errors.push(language === 'ar' ? 'يرجى إدخال اسم أول صحيح (ليس أرقاماً فقط).' : 'Please enter a valid first name (cannot be numbers only).');
    }

    // Last Name
    const trimmedLast = lastName.trim();
    if (!trimmedLast) {
      errors.push(language === 'ar' ? 'اسم العائلة مطلوب.' : 'Last name is required.');
    } else if (trimmedLast.length < 2) {
      errors.push(language === 'ar' ? 'يجب أن يتكون اسم العائلة من حرفين على الأقل.' : 'Last name must be at least 2 characters.');
    } else if (/^\d+$/.test(trimmedLast)) {
      errors.push(language === 'ar' ? 'يرجى إدخال اسم عائلة صحيح (ليس أرقاماً فقط).' : 'Please enter a valid last name (cannot be numbers only).');
    }

    // Age (1 - 120)
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      errors.push(language === 'ar' ? 'يرجى إدخال عمر منطقي وحقيقي (بين 1 و 120 سنة).' : 'Please enter a realistic age (between 1 and 120 years).');
    }

    // Height (30 - 250 cm)
    if (heightCm.trim() !== '') {
      const hNum = parseFloat(heightCm);
      if (isNaN(hNum) || hNum < 30 || hNum > 250) {
        errors.push(
          language === 'ar' 
            ? 'يرجى إدخال طول منطقي وحقيقي (بين 30 سم و 250 سم).' 
            : 'Please enter a realistic height (between 30 cm and 250 cm).'
        );
      }
    }

    // Weight (2 - 350 kg)
    if (weightKg.trim() !== '') {
      const wNum = parseFloat(weightKg);
      if (isNaN(wNum) || wNum < 2 || wNum > 350) {
        errors.push(
          language === 'ar' 
            ? 'يرجى إدخال وزن منطقي وحقيقي (بين 2 كجم و 350 كجم).' 
            : 'Please enter a realistic weight (between 2 kg and 350 kg).'
        );
      }
    }

    // Phone Number
    const cleanedPhone = phoneNumber.replace(/[^\d+]/g, '');
    if (!phoneNumber.trim()) {
      errors.push(language === 'ar' ? 'رقم الهاتف مطلوب.' : 'Phone number is required.');
    } else if (cleanedPhone.length < 7) {
      errors.push(language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح (7 أرقام على الأقل).' : 'Please enter a valid phone number (at least 7 digits).');
    }

    // Email Address Validation (Optional/If provided)
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.push(language === 'ar' ? 'يرجى إدخال عنوان بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({
          firstName,
          lastName,
          age,
          gender,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          weightKg: weightKg ? parseFloat(weightKg) : undefined,
          phoneNumber,
          email: trimmedEmail || undefined,
          address: address || undefined,
          bloodGroup: bloodGroup || undefined,
          allergies: allergies || undefined,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccessMessage(
          language === 'ar'
            ? `✅ تم تسجيل المريض بنجاح! رقم الملف: ${result.data.patientId}`
            : `✅ Patient registered successfully! ID: ${result.data.patientId}`
        );
        // Clear fields
        setFirstName('');
        setLastName('');
        setAge('');
        setGender('Male');
        setHeightCm('');
        setWeightKg('');
        setPhoneNumber('');
        setEmail('');
        setAddress('');
        setBloodGroup('');
        setAllergies('');
        setIsFormOpen(false);
        // Refresh patients list
        await fetchPatients();
        // Dispatch event for other components to reload patients list
        window.dispatchEvent(new Event('refresh-patients'));

        if (startConsultationImmediately && result.data?.patientId) {
          onStartConsultation(result.data.patientId);
        }
      } else {
        setValidationErrors([result.message || 'Failed to register patient.']);
      }
    } catch (err: any) {
      console.error(err);
      setValidationErrors([err.message || 'Network error occurred. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  };

  // Search and Sort Filtering Logic
  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const pid = patient.patientId.toLowerCase();
    const phone = patient.phoneNumber.toLowerCase();
    const emailStr = (patient.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return fullName.includes(query) || pid.includes(query) || phone.includes(query) || emailStr.includes(query);
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div id="patient-management-container" className="space-y-8 max-w-7xl mx-auto w-full">
      
      {/* 1. Header and Primary Toggle Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-[#1F2937] tracking-tight">
            {language === 'ar' ? 'مكتب الاستقبال وإدارة المرضى' : 'Reception Desk & Patient Management'}
          </h1>
          <p className="text-sm text-brand-text-secondary">
            {language === 'ar' 
              ? 'تسجيل المرضى الجدد، والبحث في السجلات، وبدء الاستشارات الطبية' 
              : 'Register new patients, search through clinic registry, and initiate medical consultations'}
          </p>
        </div>

        {!selectedPatient && (
          <button
            id="register-new-patient-toggle-btn"
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              setSuccessMessage('');
              setValidationErrors([]);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F4C81] text-white hover:bg-[#0c3c66] font-semibold text-sm transition-all shadow-md focus:outline-hidden cursor-pointer"
          >
            {isFormOpen ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span>
              {isFormOpen 
                ? (language === 'ar' ? 'إغلاق النموذج' : 'Close Form') 
                : (language === 'ar' ? 'تسجيل مريض جديد' : 'Register New Patient')}
            </span>
          </button>
        )}
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div id="registration-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 animate-fade-in shadow-xs">
          <div className="bg-emerald-500 text-white p-1 rounded-full shrink-0">
            <Check className="h-4.5 w-4.5" />
          </div>
          <span className="font-semibold text-sm">{successMessage}</span>
        </div>
      )}

      {/* SUB-VIEW 1: PATIENT PROFILE PAGE */}
      {selectedPatient ? (
        <div id="patient-profile-view" className="space-y-8 animate-fade-in">
          
          {/* Back button */}
          <button
            id="back-to-directory-btn"
            onClick={() => setSelectedPatient(null)}
            className="flex items-center gap-2 text-sm text-[#0F4C81] hover:underline font-semibold focus:outline-hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{language === 'ar' ? 'العودة إلى دليل المرضى' : 'Back to Patient Directory'}</span>
          </button>

          {/* Profile Card Header */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#EAF2F8] text-[#0F4C81] border border-blue-100 flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
                {selectedPatient.firstName[0]}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-[#EAF2F8] text-[#0F4C81] px-2.5 py-1 rounded-full">
                    {selectedPatient.patientId}
                  </span>
                  <span className="text-xs text-brand-text-secondary">
                    {language === 'ar' ? 'تاريخ التسجيل:' : 'Registered:'} {selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h2>
              </div>
            </div>

            {/* Doctor Workflow Action buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              {onViewMonitoring && (
                <button
                  id="view-patient-monitoring-btn"
                  onClick={() => onViewMonitoring(selectedPatient.patientId)}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white rounded-xl font-bold text-sm transition-all shadow-md focus:outline-hidden cursor-pointer"
                >
                  <Activity className="h-5 w-5" />
                  <span>{language === 'ar' ? 'متابعة المؤشرات والالتزام' : 'Health Monitoring'}</span>
                </button>
              )}

              <button
                id="start-consultation-profile-btn"
                onClick={() => onStartConsultation(selectedPatient.patientId)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg focus:outline-hidden cursor-pointer"
              >
                <PlayCircle className="h-5 w-5" />
                <span>{language === 'ar' ? 'بدء استشارة طبية' : 'Start Consultation'}</span>
              </button>
            </div>
          </div>

          {/* Details Grid & History Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Demographics Profile Info Card */}
            <div className="lg:col-span-1 bg-white border border-brand-border rounded-2xl p-6 space-y-6 shadow-xs">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-3 border-brand-border flex items-center gap-2">
                <User className="h-5 w-5 text-[#0F4C81]" />
                <span>{language === 'ar' ? 'الملف الشخصي والمؤشرات' : 'Patient Bio & Metrics'}</span>
              </h3>

              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</span>
                  <span className="text-gray-900 font-semibold block mt-0.5">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'العمر' : 'Age'}</span>
                    <span className="text-gray-900 font-semibold block mt-0.5">{selectedPatient.age}</span>
                  </div>
                  <div>
                    <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'الجنس' : 'Gender'}</span>
                    <span className="text-gray-900 font-semibold block mt-0.5">{selectedPatient.gender}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'الطول' : 'Height (cm)'}</span>
                    <span className="text-gray-900 font-semibold block mt-0.5">{selectedPatient.heightCm ? `${selectedPatient.heightCm} cm` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'الوزن' : 'Weight (kg)'}</span>
                    <span className="text-gray-900 font-semibold block mt-0.5">{selectedPatient.weightKg ? `${selectedPatient.weightKg} kg` : 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</span>
                  <span className="text-gray-900 font-semibold block mt-0.5 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span>{selectedPatient.phoneNumber}</span>
                  </span>
                </div>

                <div>
                  <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</span>
                  {selectedPatient.email ? (
                    <a
                      href={`mailto:${selectedPatient.email}`}
                      className="text-[#0F4C81] hover:underline font-semibold block mt-0.5 flex items-center gap-1.5 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Mail className="h-3.5 w-3.5 text-[#0F4C81]" />
                      <span>{selectedPatient.email}</span>
                    </a>
                  ) : (
                    <span className="text-gray-400 font-normal italic block mt-0.5 text-xs">N/A</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'العنوان' : 'Address'}</span>
                  <span className="text-gray-900 font-semibold block mt-0.5 flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                    <span>{selectedPatient.address || 'N/A'}</span>
                  </span>
                </div>

                <div>
                  <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'فصيلة الدم' : 'Blood Group'}</span>
                  <span className="text-red-700 font-bold block mt-0.5 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-md w-max text-xs">
                    {selectedPatient.bloodGroup || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-brand-text-secondary block font-medium uppercase tracking-wider">{language === 'ar' ? 'الحساسية المعروفة' : 'Known Allergies'}</span>
                  <span className="text-amber-800 font-bold block mt-0.5 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-md w-full text-xs">
                    {selectedPatient.allergies || (language === 'ar' ? 'لا يوجد حساسية معروفة' : 'No known allergies')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column (Span 2): History Sections */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Longitudinal Health Monitoring Card */}
              <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-white border border-blue-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-[#0F4C81] text-white rounded-xl shadow-xs shrink-0">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {language === 'ar' ? 'متابعة المؤشرات والالتزام الصحي' : 'Longitudinal Patient Monitoring'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {language === 'ar'
                        ? 'مراجعة قراءات الضغط، النبض، والحرارة المسجلة ذاتياً، مؤشرات 7/30/90 يوماً، وسجل التزام الأدوية.'
                        : 'Review patient self-logged vitals, 7/30/90-day time-series trend charts, and medication adherence.'}
                    </p>
                  </div>
                </div>

                {onViewMonitoring && (
                  <button
                    type="button"
                    onClick={() => onViewMonitoring(selectedPatient.patientId)}
                    className="px-5 py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{language === 'ar' ? 'فتح لوحة المتابعة' : 'Open Monitoring'}</span>
                    <ChevronRight className={`h-4 w-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Consultation History section */}
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-3 border-brand-border flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  <span>{language === 'ar' ? 'سجل الاستشارات الطبية' : 'Consultation History'}</span>
                </h3>
                <div className="py-8 text-center text-[#6B7280] text-sm font-medium bg-[#F8FAFC] rounded-xl border border-dashed border-gray-200">
                  {language === 'ar' ? 'لا توجد استشارات طبية متاحة لهذا المريض حاليًا.' : 'No consultations available.'}
                </div>
              </div>

              {/* Prescription History section */}
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-3 border-brand-border flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>{language === 'ar' ? 'سجل الوصفات الطبية' : 'Prescription History'}</span>
                </h3>
                <div className="py-8 text-center text-[#6B7280] text-sm font-medium bg-[#F8FAFC] rounded-xl border border-dashed border-gray-200">
                  {language === 'ar' ? 'لا توجد وصفات طبية متاحة لهذا المريض حاليًا.' : 'No prescriptions available.'}
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <>
          {/* 2. PATIENT REGISTRATION FORM PANEL */}
          {isFormOpen && (
            <div id="patient-registration-form-panel" className="bg-white border border-brand-border rounded-2xl p-6 md:p-8 shadow-xs space-y-6 animate-slide-down">
              <div className="border-b pb-4 border-brand-border">
                <h3 className="text-xl font-bold text-gray-900">
                  {language === 'ar' ? 'نموذج تسجيل مريض جديد' : 'New Patient Registration'}
                </h3>
                <p className="text-xs text-brand-text-secondary mt-1">
                  {language === 'ar' ? 'يرجى إدخال البيانات الشخصية والمقاييس السريرية للمريض.' : 'Please enter patient demographics and clinical baseline metrics below.'}
                </p>
              </div>

              {/* Form validation alert list */}
              {validationErrors.length > 0 && (
                <div id="registration-error-panel" className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                    <span>{language === 'ar' ? 'يرجى إصلاح الأخطاء التالية:' : 'Please correct the following errors:'}</span>
                  </div>
                  <ul className="list-disc pl-5 rtl:pl-0 rtl:pr-5 text-xs font-semibold space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                    {language === 'ar' ? 'الاسم الأول *' : 'First Name *'}
                  </label>
                  <input
                    id="patient-first-name-input"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Amina"
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                    {language === 'ar' ? 'اسم العائلة *' : 'Last Name *'}
                  </label>
                  <input
                    id="patient-last-name-input"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Al-Mansoor"
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'العمر *' : 'Age *'}
                    </label>
                    <input
                      id="patient-age-input"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 45"
                      min="1"
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'الجنس *' : 'Gender *'}
                    </label>
                    <select
                      id="patient-gender-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                    >
                      <option value="Male">{language === 'ar' ? 'ذكر' : 'Male'}</option>
                      <option value="Female">{language === 'ar' ? 'أنثى' : 'Female'}</option>
                      <option value="Other">{language === 'ar' ? 'آخر' : 'Other'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'الطول (سم)' : 'Height (cm)'}
                    </label>
                    <input
                      id="patient-height-input"
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="e.g. 165"
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'الوزن (كجم)' : 'Weight (kg)'}
                    </label>
                    <input
                      id="patient-weight-input"
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="e.g. 72"
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                    {language === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
                  </label>
                  <input
                    id="patient-phone-input"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +966 50 123 4567"
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 rtl:right-3.5 rtl:left-auto" />
                    <input
                      id="patient-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. amina.mansoor@example.com"
                      className="w-full pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                    {language === 'ar' ? 'فصيلة الدم' : 'Blood Group'}
                  </label>
                  <input
                    id="patient-bloodgroup-input"
                    type="text"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    placeholder="e.g. A+, O-, B+"
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                    {language === 'ar' ? 'العنوان الشخصي' : 'Personal Address'}
                  </label>
                  <textarea
                    id="patient-address-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. King Fahd Road, Riyadh, Saudi Arabia"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2">
                    {language === 'ar' ? 'الحساسية المعروفة والأمراض السابقة' : 'Known Allergies & Clinical Flags'}
                  </label>
                  <textarea
                    id="patient-allergies-input"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Lactose, Seafood (or state None)"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors resize-none"
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap justify-end gap-3 pt-2">
                  <button
                    id="cancel-registration-btn"
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setValidationErrors([]);
                    }}
                    className="px-5 py-3 rounded-xl border border-brand-border text-gray-700 font-semibold text-sm hover:bg-gray-50 focus:outline-hidden cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    id="submit-registration-btn"
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-all focus:outline-hidden cursor-pointer flex items-center justify-center gap-2 border border-slate-300"
                  >
                    {submitting && <span className="animate-spin text-slate-600">...</span>}
                    <span>{language === 'ar' ? 'تسجيل الملف الطبي' : 'Register Patient'}</span>
                  </button>

                  <button
                    id="submit-and-consult-btn"
                    type="button"
                    onClick={(e) => handleRegisterSubmit(e, true)}
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-sm transition-all focus:outline-hidden cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <PlayCircle className="h-4 w-4 text-emerald-300" />
                    <span>{language === 'ar' ? 'تسجيل وبدء الاستشارة فوراً' : 'Register & Start Consultation'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. PATIENT DIRECTORY & DIRECTORY HEADER SEARCH */}
          <div className="bg-white border border-brand-border rounded-2xl shadow-xs overflow-hidden">
            
            {/* Search/Sort Filter Controls */}
            <div className="p-6 border-b border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
              
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  id="patient-directory-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث برقم الملف، الاسم، الهاتف، أو البريد...' : 'Search by ID, name, phone, or email...'}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-sm bg-[#F8FAFC] transition-colors"
                />
              </div>

              {/* Sort selector controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-brand-text-secondary flex items-center gap-1.5 shrink-0">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>{language === 'ar' ? 'ترتيب حسب:' : 'Sort By:'}</span>
                </span>
                
                <select
                  id="patient-directory-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3.5 py-2 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-xs font-semibold bg-[#F8FAFC] cursor-pointer"
                >
                  <option value="newest">{language === 'ar' ? 'الأحدث أولاً' : 'Newest'}</option>
                  <option value="oldest">{language === 'ar' ? 'الأقدم أولاً' : 'Oldest'}</option>
                </select>
              </div>

            </div>

            {/* List Table Content */}
            {loading ? (
              <div id="patient-directory-loading" className="py-12 text-center text-sm text-[#6B7280]">
                <span className="animate-pulse font-medium">{language === 'ar' ? 'جاري تحميل سجلات المرضى...' : 'Loading registry files...'}</span>
              </div>
            ) : sortedPatients.length === 0 ? (
              <div id="patient-directory-empty" className="py-16 text-center text-[#6B7280]">
                <User className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold">{language === 'ar' ? 'لم يتم العثور على أي مرضى مطابقين.' : 'No patients match your search criteria.'}</p>
                <p className="text-xs text-brand-text-secondary mt-1">{language === 'ar' ? 'تأكد من كتابة الاسم أو رقم الملف أو الهاتف بشكل صحيح.' : 'Try adjusting your search keywords or register a new patient.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table id="patient-registry-table" className="w-full text-left rtl:text-right border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-brand-border text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">{language === 'ar' ? 'رقم الملف (ID)' : 'Patient ID'}</th>
                      <th className="px-6 py-4">{language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</th>
                      <th className="px-6 py-4">{language === 'ar' ? 'العمر' : 'Age'}</th>
                      <th className="px-6 py-4">{language === 'ar' ? 'الجنس' : 'Gender'}</th>
                      <th className="px-6 py-4">{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</th>
                      <th className="px-6 py-4">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</th>
                      <th className="px-6 py-4">{language === 'ar' ? 'تاريخ التسجيل' : 'Created Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border text-sm">
                    {sortedPatients.map((patient) => (
                      <tr
                        key={patient.patientId}
                        id={`patient-row-${patient.patientId}`}
                        onClick={() => setSelectedPatient(patient)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4.5 font-mono font-semibold text-[#0F4C81] whitespace-nowrap">
                          {patient.patientId}
                        </td>
                        <td className="px-6 py-4.5 font-bold text-gray-900 whitespace-nowrap">
                          {patient.firstName} {patient.lastName}
                        </td>
                        <td className="px-6 py-4.5 text-gray-600 whitespace-nowrap">
                          {patient.age}
                        </td>
                        <td className="px-6 py-4.5 text-gray-600 whitespace-nowrap">
                          {patient.gender}
                        </td>
                        <td className="px-6 py-4.5 text-gray-600 whitespace-nowrap">
                          {patient.phoneNumber}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          {patient.email ? (
                            <a
                              href={`mailto:${patient.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#0F4C81] hover:underline flex items-center gap-1 font-medium text-xs"
                              title={language === 'ar' ? 'إرسال بريد إلكتروني' : 'Send Email'}
                            >
                              <Mail className="h-3.5 w-3.5" />
                              <span>{patient.email}</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4.5 text-gray-500 whitespace-nowrap">
                          {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
