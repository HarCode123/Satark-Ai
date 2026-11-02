import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, AlertTriangle, HeartPulse, ShieldCheck, CheckCircle2, Save, Lock } from 'lucide-react';
import { PatientDataStore, PatientProfileData } from '../../services/patientStore';
import { useLanguage } from '../../LanguageContext';

export const PatientProfileView: React.FC = () => {
  const { language } = useLanguage();
  const [profile, setProfile] = useState<PatientProfileData>(PatientDataStore.getProfile());

  // Editable form fields
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [emergencyContact, setEmergencyContact] = useState(profile.emergencyContact);
  const [address, setAddress] = useState(profile.address);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const syncProfile = async () => {
      const serverProfile = await PatientDataStore.syncProfileFromServer();
      if (serverProfile) {
        setProfile(serverProfile);
        setPhone(serverProfile.phone);
        setEmail(serverProfile.email);
        setEmergencyContact(serverProfile.emergencyContact);
        setAddress(serverProfile.address);
      }
    };
    syncProfile();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: PatientProfileData = {
      ...profile,
      phone,
      email,
      emergencyContact,
      address
    };

    PatientDataStore.saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right">
      
      {/* Header Banner */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white shrink-0">
            {profile.name.split(' ').map(n => n[0]).join('')}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">{profile.name}</h1>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Verified Patient
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-[#0F4C81]">
              Patient ID: {profile.patientId} &bull; {profile.gender}, {profile.age} Yrs
            </p>
          </div>
        </div>

        {isSaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{language === 'ar' ? 'تم حفظ التعديلات بنجاح!' : 'Profile updated successfully!'}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT 7 COLS: PERMITTED EDITABLE CONTACT FIELDS */}
        <div className="lg:col-span-7 bg-white border border-brand-border rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-lg text-[#1F2937] flex items-center gap-2">
              <User className="h-5 w-5 text-[#0F4C81]" />
              <span>{language === 'ar' ? 'معلومات الاتصال المسموح بتعديلها' : 'Contact & Address Information'}</span>
            </h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Editable Fields
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#0F4C81]" />
                <span>{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#0F4C81]" />
                <span>{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0F4C81]" />
                <span>{language === 'ar' ? 'جهة اتصال الطوارئ' : 'Emergency Contact'}</span>
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                required
                className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#0F4C81]" />
                <span>{language === 'ar' ? 'العنوان السكني' : 'Residential Address'}</span>
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:border-[#0F4C81] focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT 5 COLS: READ-ONLY CLINICAL & PHYSICAL DATA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="font-bold text-lg text-[#1F2937] flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-[#0F4C81]" />
                <span>{language === 'ar' ? 'البيانات السريرية والمؤشرات الحيوية' : 'Clinical & Vital Parameters'}</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                <Lock className="h-3 w-3" /> Read Only
              </span>
            </div>

            {/* Read Only Cards Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-medium block">Blood Group</span>
                <span className="font-extrabold text-base text-[#0F4C81]">{profile.bloodGroup}</span>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-medium block">Height</span>
                <span className="font-extrabold text-base text-slate-900">{profile.height}</span>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-medium block">Weight</span>
                <span className="font-extrabold text-base text-slate-900">{profile.weight}</span>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-medium block">BMI Index</span>
                <span className="font-extrabold text-sm text-emerald-700">{profile.bmi}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Medical Conditions</span>
                <p className="font-bold text-slate-900 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 mt-1">
                  {profile.medicalConditions}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Known Allergies</span>
                <p className="font-bold text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 mt-1">
                  {profile.allergies}
                </p>
              </div>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
};
