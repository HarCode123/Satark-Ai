import React, { useState } from 'react';
import { 
  UserPlus, X, AlertCircle, CheckCircle2, User, HeartPulse, 
  Phone, Mail, MapPin, ShieldAlert, Activity, Sparkles, Scale, Ruler
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { PatientDataStore, PatientProfileData } from '../services/patientStore';
import { AuthService } from '../services/authService';

interface DoctorNewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patient: any, chiefComplaint?: string) => void;
}

export const DoctorNewPatientModal: React.FC<DoctorNewPatientModalProps> = ({
  isOpen,
  onClose,
  onPatientCreated
}) => {
  const { language } = useLanguage();

  // Form Fields State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('Riyadh, Saudi Arabia');
  const [allergies, setAllergies] = useState('No known drug allergies');
  const [chiefComplaint, setChiefComplaint] = useState('');

  // Status & Feedback
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate live BMI
  const hNum = parseFloat(heightCm);
  const wNum = parseFloat(weightKg);
  let bmiString = '';
  let bmiCategory = '';
  if (!isNaN(hNum) && hNum > 50 && !isNaN(wNum) && wNum > 10) {
    const bmiVal = wNum / Math.pow(hNum / 100, 2);
    bmiString = bmiVal.toFixed(1);
    if (bmiVal < 18.5) bmiCategory = 'Underweight';
    else if (bmiVal < 25) bmiCategory = 'Normal';
    else if (bmiVal < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    const errors: string[] = [];

    const trimmedFirst = firstName.trim();
    if (!trimmedFirst || trimmedFirst.length < 2) {
      errors.push(language === 'ar' ? 'الاسم الأول مطلوب (حرفين على الأقل).' : 'First name is required (at least 2 characters).');
    }

    const trimmedLast = lastName.trim();
    if (!trimmedLast || trimmedLast.length < 2) {
      errors.push(language === 'ar' ? 'اسم العائلة مطلوب (حرفين على الأقل).' : 'Last name is required (at least 2 characters).');
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      errors.push(language === 'ar' ? 'يرجى إدخال عمر صحيح بين 1 و 120 سنة.' : 'Please enter a realistic age between 1 and 120.');
    }

    if (heightCm.trim()) {
      const h = parseFloat(heightCm);
      if (isNaN(h) || h < 40 || h > 250) {
        errors.push(language === 'ar' ? 'يرجى إدخال طول صحيح (بين 40 و 250 سم).' : 'Please enter a realistic height (between 40 and 250 cm).');
      }
    }

    if (weightKg.trim()) {
      const w = parseFloat(weightKg);
      if (isNaN(w) || w < 2 || w > 350) {
        errors.push(language === 'ar' ? 'يرجى إدخال وزن صحيح (بين 2 و 350 كجم).' : 'Please enter a realistic weight (between 2 and 350 kg).');
      }
    }

    const cleanedPhone = phoneNumber.replace(/[^\d+]/g, '');
    if (!phoneNumber.trim() || cleanedPhone.length < 7) {
      errors.push(language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number (at least 7 digits).');
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.push(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        firstName: trimmedFirst,
        lastName: trimmedLast,
        age: ageNum,
        gender,
        heightCm: heightCm.trim() ? parseFloat(heightCm) : undefined,
        weightKg: weightKg.trim() ? parseFloat(weightKg) : undefined,
        phoneNumber: phoneNumber.trim(),
        email: trimmedEmail || undefined,
        address: address.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        allergies: allergies.trim() || 'No known drug allergies'
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok && result.success && result.data) {
        const created = result.data;

        // Synchronize realistic profile in PatientDataStore
        const profileData: PatientProfileData = {
          patientId: created.patientId,
          name: `${created.firstName} ${created.lastName}`,
          age: String(created.age),
          gender: created.gender,
          bloodGroup: created.bloodGroup || 'O+',
          phone: created.phoneNumber,
          email: created.email || '',
          emergencyContact: `${created.phoneNumber} (Primary Contact)`,
          address: created.address || 'Riyadh, Saudi Arabia',
          medicalConditions: chiefComplaint.trim() || 'Clinical Consultation',
          allergies: created.allergies || 'No known allergies',
          height: created.heightCm ? `${created.heightCm} cm` : 'Not Mentioned',
          weight: created.weightKg ? `${created.weightKg} kg` : 'Not Mentioned',
          bmi: bmiString ? `${bmiString} (${bmiCategory})` : 'Normal'
        };
        PatientDataStore.saveProfile(profileData);

        // Notify app components to refresh directory
        window.dispatchEvent(new CustomEvent('refresh-patients'));

        // Callback to doctor consultation view with new patient and optional chief complaint
        onPatientCreated(created, chiefComplaint.trim());
        onClose();
      } else {
        setValidationErrors([result.message || 'Failed to register patient in database.']);
      }
    } catch (err: any) {
      console.error('Error creating patient:', err);
      setValidationErrors([err.message || 'Network error occurred while creating patient.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-left rtl:text-right">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0F4C81] to-[#1a5b98] text-white p-5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl text-amber-300">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {language === 'ar' ? 'تسجيل مريض قادم جديد في العيادة' : 'Register Incoming Patient'}
              </h2>
              <p className="text-xs text-blue-100">
                {language === 'ar' 
                  ? 'أدخل المقاييس السريرية الواقعية لإنشاء ملف المريض وبدء الاستشارة فوراً' 
                  : 'Enter realistic clinical metrics to create patient profile and begin consultation'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="m-4 mb-0 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{language === 'ar' ? 'يرجى مراجعة الأخطاء التالية:' : 'Please correct the following:'}</span>
            </div>
            <ul className="list-disc pl-5 rtl:pl-0 rtl:pr-5 space-y-0.5">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Section 1: Demographics */}
          <div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5 text-[#0F4C81]">
              <User className="h-3.5 w-3.5" />
              <span>{language === 'ar' ? '1. البيانات الشخصية الأساسية' : '1. Patient Demographics'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الاسم الأول *' : 'First Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Ahmed"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'اسم العائلة *' : 'Last Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Al-Ghamdi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'العمر (بالسنوات) *' : 'Age (Years) *'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الجنس *' : 'Gender *'}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                >
                  <option value="Male">{language === 'ar' ? 'ذكر (Male)' : 'Male'}</option>
                  <option value="Female">{language === 'ar' ? 'أنثى (Female)' : 'Female'}</option>
                  <option value="Other">{language === 'ar' ? 'آخر (Other)' : 'Other'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Physical Metrics */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5 text-[#0F4C81]">
              <Activity className="h-3.5 w-3.5" />
              <span>{language === 'ar' ? '2. المقاييس السريرية والجسدية الواقعية' : '2. Realistic Clinical & Physical Metrics'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5 text-slate-400" />
                  <span>{language === 'ar' ? 'الطول (سم)' : 'Height (cm)'}</span>
                </label>
                <input
                  type="number"
                  min="40"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g. 176"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5 text-slate-400" />
                  <span>{language === 'ar' ? 'الوزن (كجم)' : 'Weight (kg)'}</span>
                </label>
                <input
                  type="number"
                  min="2"
                  max="350"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 78"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <HeartPulse className="h-3.5 w-3.5 text-red-500" />
                  <span>{language === 'ar' ? 'فصيلة الدم' : 'Blood Group'}</span>
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden text-[#0F4C81]"
                >
                  <option value="O+">O+ (Positive)</option>
                  <option value="A+">A+ (Positive)</option>
                  <option value="B+">B+ (Positive)</option>
                  <option value="AB+">AB+ (Positive)</option>
                  <option value="O-">O- (Negative)</option>
                  <option value="A-">A- (Negative)</option>
                  <option value="B-">B- (Negative)</option>
                  <option value="AB-">AB- (Negative)</option>
                </select>
              </div>
            </div>

            {/* Live BMI badge if height and weight entered */}
            {bmiString && (
              <div className="mt-2.5 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Calculated Body Mass Index (BMI):</span>
                </span>
                <span className="font-bold font-mono">
                  {bmiString} kg/m² ({bmiCategory})
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Contact & Clinical Notes */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5 text-[#0F4C81]">
              <Phone className="h-3.5 w-3.5" />
              <span>{language === 'ar' ? '3. الاتصال والملاحظات السريرية الأولية' : '3. Contact & Clinical Baseline'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +966 55 123 4567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email Address (Optional)'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ahmed.ghamdi@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  <span>{language === 'ar' ? 'الحساسية الدوائية المعروفة' : 'Known Drug Allergies'}</span>
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa, or None known"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{language === 'ar' ? 'المدينة / العنوان' : 'City / Residential Address'}</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. King Fahd Road, Riyadh"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-[#0F4C81] outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الشكوى الأولية / سبب المراجعة (اختياري - يملأ ملاحظات الاستشارة تلقائياً)' : 'Initial Chief Complaint / Reason for Visit (Optional - Pre-fills Consultation)'}
                </label>
                <textarea
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Patient presents with high fever, sore throat, and dry cough for the past 3 days."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white focus:border-[#0F4C81] outline-hidden resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold cursor-pointer transition-colors"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{language === 'ar' ? 'جاري التسجيل والربط...' : 'Creating Patient...'}</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>{language === 'ar' ? 'إنشاء ملف المريض والبدء بالاستشارة' : 'Create Patient & Begin Consultation'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
