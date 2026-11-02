import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { PatientDataStore, AppointmentItem } from '../../services/patientStore';
import { useLanguage } from '../../LanguageContext';
import { AuthService } from '../../services/authService';

export const PatientAppointmentsView: React.FC = () => {
  const { language } = useLanguage();
  const todayStr = new Date().toISOString().split('T')[0];
  const [appointments, setAppointments] = useState<AppointmentItem[]>(PatientDataStore.getAppointments());
  
  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [docName, setDocName] = useState('Dr. Harini, MD');
  const [dept, setDept] = useState('Internal Medicine');
  const [aptDate, setAptDate] = useState(todayStr);
  const [aptTime, setAptTime] = useState('10:00 AM');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      const res = await fetch('/api/patient/appointments', {
        headers: AuthService.getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAppointments(json.data);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote appointments, using local store:", e);
    }
    setAppointments(PatientDataStore.getAppointments());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('patient-data-updated', refreshData);
    return () => window.removeEventListener('patient-data-updated', refreshData);
  }, []);

  const upcomingList = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Pending');

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    // Validate past date
    if (aptDate < todayStr) {
      setBookingError(language === 'ar' ? 'لا يمكن اختيار تاريخ موعد في الماضي.' : 'Appointment date cannot be in the past.');
      return;
    }

    try {
      const response = await fetch('/api/patient/appointments', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({
          doctorName: docName,
          department: dept,
          hospital: 'Satark Clinical Medical Center',
          date: aptDate,
          time: aptTime,
          notes: 'Requested via Patient Portal Online Scheduling.'
        })
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        setBookingError(resJson.message || (language === 'ar' ? 'فشل حجز الموعد.' : 'Failed to book appointment.'));
        return;
      }

      const bookedApt: AppointmentItem = resJson.data || {
        id: `apt-${Date.now()}`,
        doctorName: docName,
        department: dept,
        hospital: 'Satark Clinical Medical Center',
        date: aptDate,
        time: aptTime,
        status: 'Confirmed',
        notes: 'Requested via Patient Portal Online Scheduling.'
      };

      // Keep PatientDataStore synchronized
      PatientDataStore.addAppointment(bookedApt);
      PatientDataStore.addNotification({
        id: `notif-${Date.now()}`,
        title: 'Appointment Booked Successfully',
        message: `Your appointment with ${docName} (${dept}) has been scheduled for ${aptDate} at ${aptTime}.`,
        date: todayStr,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        type: 'appointment'
      });

      setAppointments(prev => [bookedApt, ...prev.filter(a => a.id !== bookedApt.id)]);
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setIsBookingOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error("Booking error:", err);
      setBookingError(err.message || 'Network error occurred while booking appointment.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right">
      
      {/* Header */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#0F4C81] font-bold uppercase tracking-wider mb-1 font-mono">
            <Calendar className="h-4 w-4" />
            <span>{language === 'ar' ? 'إدارة المواعيد السريرية' : 'Clinical Appointment Schedule'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? 'المواعيد الطبية' : 'Appointments'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            {language === 'ar' 
              ? 'تتبع مواعيدك القادمة مع طبيبك وحجز مواعيد متابعة جديدة بسهولة.' 
              : 'Track upcoming physician appointments and schedule follow-up visits.'}
          </p>
        </div>

        <button
          onClick={() => {
            setBookingError(null);
            setIsBookingOpen(true);
          }}
          className="px-5 py-3 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{language === 'ar' ? 'حجز موعد جديد' : 'Book New Appointment'}</span>
        </button>
      </div>

      {/* Appointment Cards List (Upcoming Only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {upcomingList.length > 0 ? (
          upcomingList.map((apt) => (
            <div
              key={apt.id}
              className="bg-white border border-brand-border hover:border-blue-300 rounded-2xl p-6 shadow-xs transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {apt.status}
                  </span>

                  <span className="text-xs font-mono font-bold text-slate-500">
                    {apt.id}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'اسم الطبيب المعالج' : 'Doctor'}</p>
                  <p className="font-extrabold text-lg text-[#0F4C81] mt-0.5">{apt.doctorName}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-slate-400 font-medium">{language === 'ar' ? 'القسم' : 'Department'}</p>
                    <p className="font-bold text-slate-800">{apt.department}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">{language === 'ar' ? 'المستشفى' : 'Hospital'}</p>
                    <p className="font-bold text-slate-800 truncate">{apt.hospital}</p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-700 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#0F4C81]" />
                    <span>{apt.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Clock className="h-4 w-4 text-[#0F4C81]" />
                    <span>{apt.time}</span>
                  </div>
                </div>

                {apt.notes && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    "{apt.notes}"
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white border border-brand-border rounded-2xl p-12 text-center text-slate-400 italic">
            {language === 'ar' ? 'لا توجد مواعيد قادمة' : 'No upcoming appointments.'}
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-brand-border shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#0F4C81]" />
                <span>{language === 'ar' ? 'حجز موعد استشارة جديدة' : 'Book New Appointment'}</span>
              </h3>
              <button
                onClick={() => setIsBookingOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm">{language === 'ar' ? 'تم تأكيد وتخزين حجز الموعد بنجاح!' : 'Appointment Booked & Persisted Successfully!'}</p>
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="space-y-4 text-xs">
                {bookingError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اختر الطبيب' : 'Select Doctor'}</label>
                  <select
                    value={docName}
                    onChange={(e) => {
                      setDocName(e.target.value);
                      if (e.target.value.includes('Harini')) setDept('Internal Medicine');
                      else setDept('General Medicine');
                    }}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:border-[#0F4C81]"
                  >
                    <option value="Dr. Harini, MD">Dr. Harini, MD (Internal Medicine)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'التاريخ' : 'Appointment Date'}</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={aptDate}
                    onChange={(e) => {
                      setAptDate(e.target.value);
                      if (e.target.value >= todayStr) setBookingError(null);
                    }}
                    required
                    className="w-full p-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:border-[#0F4C81]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{language === 'ar' ? 'يجب أن يكون التاريخ اليوم أو تاريخاً مستقبلياً.' : 'Date must be today or in the future.'}</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الوقت' : 'Time Slot'}</label>
                  <select
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:border-[#0F4C81]"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white rounded-xl font-bold transition-all"
                  >
                    {language === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
