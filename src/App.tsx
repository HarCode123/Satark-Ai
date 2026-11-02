import React, { useState, useEffect } from 'react';
import { Mic, Folder, ArrowLeft, LogOut, Lock, Mail, User as UserIcon, ShieldCheck, HeartPulse, CheckCircle2, ChevronRight, Loader2, ChevronLeft, Sparkles, FileText, Eye, X, Bell, Pill, Calendar, Stethoscope, Activity, UserPlus, Check, Square, ClipboardList } from 'lucide-react';
import { RoutePath, PatientRecord, DUMMY_RECORDS, UserRole } from './types';
import PageContainer from './components/PageContainer';
import Navbar from './components/Navbar';
import StatCard from './components/StatCard';
import ActionCard from './components/ActionCard';
import SectionTitle from './components/SectionTitle';
import PatientTable from './components/PatientTable';
import DatabaseAuditLogs from './components/DatabaseAuditLogs';
import InputField from './components/InputField';
import PrimaryButton from './components/PrimaryButton';
import SecondaryButton from './components/SecondaryButton';
import { GeminiLiveService } from './services/geminiLive';
import { useLanguage } from './LanguageContext';
import PatientManagement from './components/PatientManagement';
import ClinicalDocumentationAssistant, { PrescriptionCardView } from './components/ClinicalDocumentationAssistant';
import { ClinicalPrescription, PrescriptionService } from './backend/services/PrescriptionService';
import { DoctorNewPatientModal } from './components/DoctorNewPatientModal';

// Patient Portal Imports
import { PatientDashboardView } from './components/patient/PatientDashboardView';
import { PatientHistoryView } from './components/patient/PatientHistoryView';
import { PatientPrescriptionsView } from './components/patient/PatientPrescriptionsView';
import { PatientAppointmentsView } from './components/patient/PatientAppointmentsView';
import { PatientNotificationsView } from './components/patient/PatientNotificationsView';
import { PatientProfileView } from './components/patient/PatientProfileView';
import { PatientHealthMonitoringView } from './components/patient/PatientHealthMonitoringView';
import { PatientMedicationsView } from './components/patient/PatientMedicationsView';
import { PatientConsultationsView } from './components/patient/PatientConsultationsView';
import { PatientMedicalRecordsView } from './components/patient/PatientMedicalRecordsView';
import { PatientDailyLogView } from './components/patient/PatientDailyLogView';
import { DoctorPatientMonitoringView } from './components/DoctorPatientMonitoringView';
import { PatientDataStore, PatientProfileData } from './services/patientStore';
import { AuthService } from './services/authService';

export default function App() {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const [landingFadeState, setLandingFadeState] = useState<'visible' | 'fading'>('visible');

  // Support custom client-side path tracking that syncs with browser history
  const [currentPath, setCurrentPath] = useState<RoutePath>('/');

  // Initialize path from window.location.pathname on load
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const validPaths = [
        '/', '/login', '/signup', '/dashboard', '/emr-records', '/patients',
        '/patient-dashboard', '/patient-health-monitoring', '/patient-medications',
        '/patient-prescriptions', '/patient-consultations', '/patient-medical-records',
        '/patient-appointments', '/patient-daily-log', '/patient-notifications',
        '/patient-profile', '/patient-history', '/doctor-patient-monitoring',
        '/clinical-assistant'
      ];
      if (validPaths.includes(path)) {
        setCurrentPath(path as RoutePath);
      } else {
        // Fallback or default
        setCurrentPath('/');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Custom navigation handler to keep routing fully client-side but updating browser address bar
  const navigateTo = (path: RoutePath) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth Mode (Sign In vs Patient Sign Up)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (currentPath === '/signup') {
      setAuthMode('register');
    } else if (currentPath === '/login' && authMode !== 'register') {
      setAuthMode('login');
    }
  }, [currentPath]);

  // Login form state variables
  const [selectedRole, setSelectedRole] = useState<UserRole>('doctor');
  const [loginName, setLoginName] = useState('Harini');
  const [loginEmail, setLoginEmail] = useState('doctor@satark.ai');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [loginError, setLoginError] = useState('');

  // Registration Form state variables
  const [regPatientId, setRegPatientId] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Consultation panel state variables
  const [isConsultationExpanded, setIsConsultationExpanded] = useState(false);
  const [prescriptionText, setPrescriptionText] = useState('');

  // Gemini Live state variables
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'stopping' | 'completed'>('idle');
  const [liveError, setLiveError] = useState('');
  const [liveModel, setLiveModel] = useState('gemini-3.1-flash-live-preview');
  const [liveServiceInstance, setLiveServiceInstance] = useState<any>(null);

  // New auto-stop timers and notices
  const [recordingSeconds, setRecordingSeconds] = useState(60);
  const [inactivitySeconds, setInactivitySeconds] = useState(15);
  const [autoStopNotice, setAutoStopNotice] = useState('');

  // New Database persistence states (Feature 1)
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedMonitoringPatientId, setSelectedMonitoringPatientId] = useState("");
  const [dbPatients, setDbPatients] = useState<any[]>([]);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  // Fetch registered patients from DB
  useEffect(() => {
    const fetchDbPatients = async () => {
      try {
        const response = await fetch('/api/patients', {
          headers: AuthService.getAuthHeaders()
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setDbPatients(result.data);
            if (result.data.length > 0) {
              setSelectedPatientId(prev => prev || result.data[0].patientId);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch patients:', err);
      }
    };

    fetchDbPatients();
    window.addEventListener('refresh-patients', fetchDbPatients);
    return () => {
      window.removeEventListener('refresh-patients', fetchDbPatients);
    };
  }, []);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveStatusMessage, setSaveStatusMessage] = useState('');
  const lastSavedTranscriptRef = React.useRef<string>('');

  // Digital Prescription Creation States
  const [isCreatingPrescription, setIsCreatingPrescription] = useState<boolean>(false);
  const [generatedPrescription, setGeneratedPrescription] = useState<ClinicalPrescription | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState<boolean>(false);

  const handleCreatePrescription = async () => {
    let activeText = prescriptionText.trim();

    // Find active patient details from registered patients, or fetch from backend
    let activeDbPatient = dbPatients.find(p => p.patientId === selectedPatientId);
    if (!activeDbPatient && selectedPatientId) {
      try {
        const res = await fetch(`/api/patients/${encodeURIComponent(selectedPatientId)}`, {
          headers: AuthService.getAuthHeaders()
        });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson.success && resJson.data) {
            activeDbPatient = resJson.data;
          }
        }
      } catch (e) {
        console.warn("Could not fetch patient details for prescription:", e);
      }
    }

    if (!activeDbPatient) {
      const currentStoreProfile = PatientDataStore.getProfile();
      if (currentStoreProfile.patientId === selectedPatientId) {
        activeDbPatient = {
          patientId: currentStoreProfile.patientId,
          firstName: currentStoreProfile.name ? currentStoreProfile.name.split(' ')[0] : 'Patient',
          lastName: currentStoreProfile.name ? currentStoreProfile.name.split(' ').slice(1).join(' ') : '',
          age: currentStoreProfile.age ? (parseInt(currentStoreProfile.age) || 32) : 32,
          gender: currentStoreProfile.gender || 'Male',
          heightCm: currentStoreProfile.height || '175 cm',
          weightKg: currentStoreProfile.weight || '74 kg',
          bloodGroup: currentStoreProfile.bloodGroup || 'B+',
          allergies: currentStoreProfile.allergies || 'No known drug allergies'
        };
      } else {
        activeDbPatient = dbPatients[0] || {
          patientId: selectedPatientId || 'PID-2026-004',
          firstName: 'Devi',
          lastName: 'Prasad',
          age: 34,
          gender: 'Male',
          heightCm: 175,
          weightKg: 74,
          bloodGroup: 'B+',
          allergies: 'Penicillin (causes severe rash — avoid beta-lactams)'
        };
      }
    }

    if (!activeText) {
      const salutation = activeDbPatient.gender === 'Female' ? 'Ms.' : 'Mr.';
      const h = activeDbPatient.heightCm || 175;
      const w = activeDbPatient.weightKg || 74;
      const allergiesText = activeDbPatient.allergies && activeDbPatient.allergies.toLowerCase() !== 'none'
        ? activeDbPatient.allergies
        : 'Penicillin (causes severe rash — avoid beta-lactams)';

      activeText = `Doctor: Good morning ${salutation} ${activeDbPatient.firstName} ${activeDbPatient.lastName}. What brings you to the clinic today?
Patient: I have had a bad cough for about a week following a cold. Started dry, now coughing up thick yellowish-green mucus, with chest tightness, soreness, and exhaustion.
Doctor: Let's check your baseline metrics. Height is ${h} cm, weight is ${w} kg. Vitals check: BP 120/80 mmHg, pulse 76 bpm, temperature 99.8 °F (37.7 °C), SpO2 98%.
Patient: Drug allergy status: ${allergiesText}.
Doctor: On chest auscultation, there is wheezing and rattling breath sounds noted in upper chest; lower lung fields are clear bilaterally. Vitals and oxygen saturation are good at 98%. A chest X-ray isn't needed, and antibiotics will not help because this is viral acute bronchitis.
Doctor: Provisional diagnosis: Acute bronchitis (inflammation of the airways).
Prescribed:
1. Guaifenesin (Extended-Release) 600 mg, 1 tablet every 12 hours for 7 days with plenty of water to thin mucus.
2. Ibuprofen 400 mg, 1 tablet every 6–8 hours as needed with food for chest soreness and fever.
3. Albuterol HFA Inhaler 90 mcg, 2 puffs every 4–6 hours as needed to open airways and relieve wheezing.
Advice: Rest up adequately, use a humidifier at home, and drink plenty of water to help thin mucus.
Follow-up: Come back in 10 days if not improving. Go to the emergency room immediately if you develop a high fever, cough up blood, or experience severe shortness of breath.
Doctor's Notes: Viral acute bronchitis. Penicillin family strictly contraindicated due to severe rash. Lower lungs auscultated clear; SpO2 98%.`;

      setPrescriptionText(activeText);
    }

    setIsCreatingPrescription(true);
    setPrescriptionError(null);

    const rawHeight = activeDbPatient.heightCm ?? (activeDbPatient as any).height ?? '';
    const rawWeight = activeDbPatient.weightKg ?? (activeDbPatient as any).weight ?? '';

    const heightStr = rawHeight 
      ? (String(rawHeight).includes('cm') ? String(rawHeight) : `${rawHeight} cm`)
      : '175 cm';
    const weightStr = rawWeight
      ? (String(rawWeight).includes('kg') ? String(rawWeight) : `${rawWeight} kg`)
      : '74 kg';

    const patientInfo = {
      patientName: `${activeDbPatient.firstName} ${activeDbPatient.lastName}`.trim(),
      patientId: activeDbPatient.patientId,
      age: String(activeDbPatient.age),
      gender: activeDbPatient.gender,
      height: heightStr,
      weight: weightStr,
      bloodGroup: activeDbPatient.bloodGroup || 'B+',
      allergies: activeDbPatient.allergies || 'No known drug allergies',
      date: new Date().toISOString().split('T')[0],
      consultingDoctor: 'Dr. Harini, MD'
    };

    try {
      const response = await fetch('/api/emr/generate', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({
          patientInfo,
          transcript: activeText
        })
      });

      const result = await response.json();
      if (response.ok && result.success && result.data) {
        const rxId = `rx-${Date.now()}-${activeDbPatient.patientId}`;
        const completePrescription = {
          ...result.data,
          prescriptionId: rxId,
          id: rxId,
          status: 'draft',
          patientDetails: {
            ...result.data.patientDetails,
            patientId: activeDbPatient.patientId,
            patientName: `${activeDbPatient.firstName} ${activeDbPatient.lastName}`.trim() || result.data.patientDetails?.patientName,
            date: result.data.patientDetails?.date || new Date().toISOString().split('T')[0]
          },
          consultationCompleted: true,
          consultationId: `cons-${Date.now()}-${activeDbPatient.patientId}`,
          generatedAt: Date.now()
        };

        // Persist initial draft to backend database (hidden from patient until doctor approves)
        try {
          await fetch('/api/prescriptions/draft', {
            method: 'POST',
            headers: AuthService.getAuthHeaders(),
            body: JSON.stringify({
              prescriptionId: rxId,
              patientId: activeDbPatient.patientId,
              fullPrescription: completePrescription
            })
          });
        } catch (e) {
          console.warn("Could not save initial draft to backend:", e);
        }

        setGeneratedPrescription(completePrescription);
        setIsPrescriptionModalOpen(true);
        // Also persist raw transcript and structured EMR to database
        await saveTranscriptToDatabase(activeText);
      } else {
        throw new Error(result.message || 'Failed to generate digital prescription.');
      }
    } catch (err: any) {
      console.warn("API extraction notice, utilizing clinical fallback parser:", err);
      try {
        const fallbackRx = PrescriptionService.fallbackClinicalParse(patientInfo, activeText);
        const rxId = `rx-${Date.now()}-${activeDbPatient.patientId}`;
        const completePrescription = {
          ...fallbackRx,
          prescriptionId: rxId,
          id: rxId,
          status: 'draft',
          patientDetails: {
            ...fallbackRx.patientDetails,
            patientId: activeDbPatient.patientId,
            patientName: `${activeDbPatient.firstName} ${activeDbPatient.lastName}`.trim(),
            date: new Date().toISOString().split('T')[0]
          },
          consultationCompleted: true,
          consultationId: `cons-${Date.now()}-${activeDbPatient.patientId}`,
          generatedAt: Date.now()
        };

        setGeneratedPrescription(completePrescription);
        setIsPrescriptionModalOpen(true);
        setPrescriptionError(null);
        await saveTranscriptToDatabase(activeText);
      } catch (innerErr: any) {
        setPrescriptionError(innerErr.message || 'Error generating prescription.');
      }
    } finally {
      setIsCreatingPrescription(false);
    }
  };

  // Ref to hold the active GeminiLiveService instance to bypass React state-closure lag
  const liveServiceRef = React.useRef<any>(null);
  const connectTimeoutRef = React.useRef<any>(null);
  const recordingTimerRef = React.useRef<any>(null);
  const lastSpeechTimeRef = React.useRef<number>(0);

  // Ref to always have the latest prescriptionText in async/websocket callbacks
  const prescriptionTextRef = React.useRef(prescriptionText);
  useEffect(() => {
    prescriptionTextRef.current = prescriptionText;
  }, [prescriptionText]);

  // Clean up Live session on unmount
  useEffect(() => {
    return () => {
      if (liveServiceRef.current) {
        liveServiceRef.current.stop();
        liveServiceRef.current = null;
      }
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, []);

  const saveTranscriptToDatabase = async (text: string) => {
    if (!text || !text.trim()) return;
    
    // Avoid saving duplicate transcripts
    if (text.trim() === lastSavedTranscriptRef.current.trim()) {
      console.log("ℹ️ [Database] Duplicate transcript detected. Skipping save.");
      return;
    }

    setSaveStatus('saving');
    setSaveStatusMessage(language === 'ar' ? 'جاري حفظ النسخة الأصلية للنسخ الطبي في قاعدة البيانات...' : 'Saving raw transcript to database...');
    
    try {
      const user = AuthService.getUser();
      const currentDoctor = user?.email || user?.id || "doctor@satark.ai";

      console.log("⏳ [Database] Saving transcript to database...", {
        doctorId: currentDoctor,
        patientId: selectedPatientId,
        transcriptLength: text.length
      });

      const response = await fetch('/api/transcripts/save', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({
          doctorId: currentDoctor,
          patientId: selectedPatientId,
          transcript: text,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSaveStatus('success');
        setSaveStatusMessage(
          language === 'ar' 
            ? '✅ تم حفظ النسخة الأصلية للنسخ الطبي في قاعدة البيانات بنجاح!' 
            : `✅ Transcript saved to database for patient: ${selectedPatientId}!`
        );
        lastSavedTranscriptRef.current = text;
        console.log("✅ [Database] Save response:", result);
        
        // Dispatch custom event to notify PatientTable to reload EMR records from the database
        window.dispatchEvent(new Event('refresh-emr-table'));
      } else {
        throw new Error(result.message || "Failed to save transcript.");
      }
    } catch (err: any) {
      console.error("❌ [Database] Failed to save transcript to DB:", err);
      setSaveStatus('error');
      setSaveStatusMessage(
        language === 'ar' 
          ? '❌ فشل في الاتصال بقاعدة البيانات. تم الحفظ محليًا كمسودة.' 
          : `❌ Database offline or error: ${err.message || 'Connection failed'}. Saved to local fallback.`
      );
    }
  };

  const resetToIdle = () => {
    setIsLiveListening(false);
    setIsLiveConnecting(false);
    setIsStopping(false);
    setRecordingState('idle');
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Dedicated unified function to safely stop recording and save transcript
  const stopSpeechRecording = async (reason?: 'timeout' | 'silence') => {
    if (isStopping || recordingState === 'stopping') {
      console.log("[Recording] Already in stopping phase, skipping duplicate stopSpeechRecording call.");
      return;
    }
    console.log(`[Recording] Stop button clicked (reason: ${reason || 'user'})`);

    const wasListening = !!liveServiceRef.current;

    setIsStopping(true);
    setRecordingState('stopping');
    setIsLiveListening(false);
    setIsLiveConnecting(false);

    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      if (liveServiceRef.current) {
        try {
          await liveServiceRef.current.stop();
        } catch (e) {
          console.warn("Error stopping live service:", e);
        }
        liveServiceRef.current = null;
      }
      setLiveServiceInstance(null);

      if (wasListening) {
        // Give final transcript chunks a moment to land, then save to DB.
        await new Promise((resolve) => setTimeout(resolve, 600));
        try {
          const text = prescriptionTextRef.current;
          if (text && text.trim()) {
            await saveTranscriptToDatabase(text);
          }
        } catch (e) {
          console.error("Error in auto-save:", e);
        }
      }
    } finally {
      setIsStopping(false);
      setRecordingState('completed');
      console.log("[Recording] Cleanup completed");
    }
  };

  // Monitor active listening to manage elapsed recording time
  useEffect(() => {
    if (!isLiveListening) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      return;
    }

    setRecordingSeconds(0);
    setAutoStopNotice('');

    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [isLiveListening]);

  const startSpeechRecording = async () => {
    if (isLiveListening || isLiveConnecting || isStopping || recordingState === 'stopping' || recordingState === 'recording') {
      console.log("[Recording] Already recording or connecting, ignoring start request.");
      return;
    }

    setLiveError('');
    setIsLiveConnecting(true);
    setRecordingState('recording');

    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
    }
    connectTimeoutRef.current = setTimeout(() => {
      console.warn("Connection safety timeout reached. Stopping connection.");
      setLiveError("Connection timed out. Please verify that your mic is enabled and WebSockets are not blocked.");
      if (liveServiceRef.current) {
        try {
          liveServiceRef.current.stop();
        } catch (e) {}
        liveServiceRef.current = null;
      }
      setLiveServiceInstance(null);
      resetToIdle();
    }, 10000);

    try {
      const service = new GeminiLiveService({
        model: liveModel,
        onTranscriptReceived: (text) => {
          const trimmedNew = text.trim();
          if (!trimmedNew) return;
          console.log("[Recording] Transcript chunk received:", trimmedNew);
          setPrescriptionText((prev) => {
            const current = prev.trim();
            if (!current) return trimmedNew;
            
            if (current.toLowerCase().endsWith(trimmedNew.toLowerCase())) {
              return prev;
            }

            const currentWords = current.split(/\s+/);
            const newWords = trimmedNew.split(/\s+/);
            const lastWords = currentWords.slice(-newWords.length).join(' ').toLowerCase();
            if (lastWords === trimmedNew.toLowerCase()) {
              return prev;
            }

            const needsSpace = prev.length > 0 && !prev.endsWith(' ') && !text.startsWith(' ');
            return prev + (needsSpace ? ' ' : '') + text;
          });
        },
        onStateChange: (isActive) => {
          setIsLiveListening(isActive);
          setIsLiveConnecting(false);
          if (isActive) {
            setRecordingState('recording');
            if (connectTimeoutRef.current) {
              clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
            }
          } else {
            liveServiceRef.current = null;
            setLiveServiceInstance(null);
            if (connectTimeoutRef.current) {
              clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
            }
          }
        },
        onError: (err) => {
          console.error("[Recording] Error received:", err);
          setLiveError(err);
          resetToIdle();
        }
      });

      liveServiceRef.current = service;
      setLiveServiceInstance(service);
      await service.start();
    } catch (err: any) {
      console.error("[Recording] Failed to start GeminiLiveService:", err);
      setLiveError(err?.message || "Could not initialize the audio capture service.");
      resetToIdle();
    }
  };

  const toggleLiveCapture = async () => {
    if (isLiveListening || isLiveConnecting || recordingState === 'recording') {
      await stopSpeechRecording();
    } else {
      await startSpeechRecording();
    }
  };
  // Handle Login validation using JWT AuthService
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const res = await AuthService.login({
      email: loginEmail,
      password: loginPassword,
      role: selectedRole,
      patientId: loginEmail
    });

    if (res.success && res.user) {
      setLoginError('');
      if (res.user.role === 'doctor') {
        navigateTo('/dashboard');
      } else {
        const pId = res.user.patientId;
        if (pId) {
          try {
            await PatientDataStore.syncProfileFromServer(pId);
          } catch (e) {
            console.warn("Could not sync profile on login:", e);
          }
        }
        navigateTo('/patient-dashboard');
      }
    } else {
      setLoginError(
        res.message || (language === 'ar' ? 'بيانات الاعتماد غير صحيحة' : 'Invalid login credentials')
      );
    }
  };

  // Handle Patient Registration / Portal Activation Submit using JWT AuthService
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regFullName.trim() || regFullName.trim().length < 2) {
      setRegError(language === 'ar' ? 'يرجى إدخال الاسم الكامل (حرفين على الأقل).' : 'Please enter a valid full name (at least 2 characters).');
      return;
    }

    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setRegError(language === 'ar' ? 'يرجى إدخال عنوان بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
      return;
    }

    if (!regPhone.trim() || regPhone.trim().length < 7) {
      setRegError(language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number (at least 7 digits).');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setRegError(language === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError(language === 'ar' ? 'كلمات المرور غير متطابقة.' : 'Passwords do not match.');
      return;
    }

    setIsRegistering(true);

    try {
      const authRes = await AuthService.register({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        patientId: regPatientId.trim(),
        role: 'patient'
      });

      if (!authRes.success || !authRes.user) {
        setRegError(authRes.message || 'Registration failed.');
        setIsRegistering(false);
        return;
      }

      const activePatientId = authRes.user.patientId || regPatientId.trim() || 'PID-2026-001';

      // Check if this patient already has realistic clinical values registered by the doctor
      const matchedDoctorPatient = dbPatients.find(p => p.patientId === activePatientId || (p.email && p.email.toLowerCase() === regEmail.trim().toLowerCase()));

      const realAge = matchedDoctorPatient?.age ? String(matchedDoctorPatient.age) : '32';
      const realGender = matchedDoctorPatient?.gender || 'Male';
      const realBlood = matchedDoctorPatient?.bloodGroup || 'B+';
      const realHeight = matchedDoctorPatient?.heightCm ? `${matchedDoctorPatient.heightCm} cm` : '175 cm';
      const realWeight = matchedDoctorPatient?.weightKg ? `${matchedDoctorPatient.weightKg} kg` : '74 kg';
      const realAllergies = matchedDoctorPatient?.allergies || 'No known drug allergies';
      const realAddress = matchedDoctorPatient?.address || 'Riyadh, Saudi Arabia';

      // Calculate BMI
      const hN = parseFloat(realHeight);
      const wN = parseFloat(realWeight);
      const bmiStr = (!isNaN(hN) && !isNaN(wN) && hN > 50)
        ? `${(wN / Math.pow(hN / 100, 2)).toFixed(1)} (Normal)`
        : '24.2 (Normal)';

      // Save Patient Profile to local store with realistic clinical values
      const newProfile: PatientProfileData = {
        patientId: activePatientId,
        name: regFullName.trim(),
        age: realAge,
        gender: realGender as any,
        bloodGroup: realBlood,
        phone: regPhone.trim(),
        email: regEmail.trim(),
        emergencyContact: `${regPhone.trim()} (Primary Contact)`,
        address: realAddress,
        medicalConditions: 'Active Clinical Patient Account',
        allergies: realAllergies,
        height: realHeight,
        weight: realWeight,
        bmi: bmiStr
      };

      PatientDataStore.saveProfile(newProfile);

      // Immediately create and attach approved clinical prescription with all medications to Patient Portal
      const rxId = `rx-${Date.now()}-${activePatientId}`;
      const isDevi = regFullName.toLowerCase().includes('devi');
      const clinicalPrescription: ClinicalPrescription = {
        prescriptionId: rxId,
        id: rxId,
        patientDetails: {
          patientId: activePatientId,
          patientName: regFullName.trim(),
          age: realAge,
          gender: realGender,
          height: realHeight,
          weight: realWeight,
          bmi: bmiStr,
          bloodGroup: realBlood,
          allergies: realAllergies,
          date: new Date().toISOString().split('T')[0],
          consultingDoctor: 'Dr. Harini, MD'
        },
        chiefComplaint: isDevi
          ? 'Cough for 1 week following a cold, with thick yellowish-green mucus, chest tightness and soreness, and severe exhaustion.'
          : 'Clinical consultation and medication protocol.',
        historyOfPresentIllness: isDevi
          ? 'Patient reports a 1-week history of cough following a cold, which started dry and progressed to coughing up thick, yellowish-green mucus. Accompanied by chest tightness, soreness, low-grade fever (99.8°F), and generalized exhaustion. Patient denies chronic respiratory illness including asthma and takes no regular daily medications. Lower lung fields remain clear on examination.'
          : 'Patient registered for clinical evaluation and active medication management.',
        pastMedicalHistory: 'No chronic medical conditions reported (specifically denies asthma; takes no daily medications).',
        allergies: realAllergies,
        vitals: {
          temperature: '99.8 °F (37.7 °C)',
          bloodPressure: '120/80 mmHg',
          pulse: '76 bpm',
          spo2: '98%',
          respiratoryRate: '16 breaths/min'
        },
        clinicalExamination: 'Chest Auscultation: Wheezing and rattling breath sounds noted in upper chest; lower lung fields are clear bilaterally with no crepitations. General appearance: Vitals stable.',
        provisionalDiagnosis: 'Acute bronchitis (inflammation of the airways)',
        diseaseDescription: 'Acute bronchitis is an inflammation of the large bronchial airways usually triggered by a viral respiratory infection. Treatment centers on thinning mucus, opening airways, and symptom relief.',
        investigationsAdvised: 'No investigations ordered (Doctor explicitly determined Chest X-ray and antibiotics are unnecessary due to 98% SpO2, clear lower lung bases, and >95% viral etiology).',
        medications: [
          {
            medicineName: 'Guaifenesin (Extended-Release)',
            strength: '600 mg',
            dosage: '1 tablet',
            frequency: 'Every 12 hours (Q12H)',
            duration: '7 days (Quantity: 14 tablets)',
            instructions: 'Take 1 tablet every 12 hours with a full glass of water. Expectorant to thin mucus.',
            purpose: 'Expectorant to thin and loosen mucus in bronchial airways'
          },
          {
            medicineName: 'Ibuprofen',
            strength: '400 mg',
            dosage: '1 tablet',
            frequency: 'Every 6–8 hours as needed (PRN)',
            duration: 'As needed (Quantity: 20 tablets)',
            instructions: 'Take 1 tablet every 6–8 hours as needed with food for chest soreness and fever.',
            purpose: 'Relieves chest soreness, inflammation, and mild fever'
          },
          {
            medicineName: 'Albuterol HFA Inhaler',
            strength: '90 mcg/actuation (HFA)',
            dosage: '2 puffs',
            frequency: 'Every 4–6 hours as needed (PRN)',
            duration: 'As needed (Quantity: 1 inhaler)',
            instructions: 'Inhale 2 puffs every 4–6 hours only as needed to open airways and relieve wheezing.',
            purpose: 'Bronchodilator to open airways and relieve wheezing'
          }
        ],
        lifestyleDietAdvice: 'Rest up adequately, use a humidifier at home, and drink plenty of water to help thin mucus. Note that while acute symptoms improve in 1 week, a mild cough can linger for 2 to 3 weeks.',
        followUp: 'Come back in 10 days if not improving. Go to the emergency room immediately if you develop a high fever, cough up blood, or experience severe shortness of breath.',
        doctorsNotes: 'Viral acute bronchitis. Penicillin family strictly contraindicated due to severe rash. Lower lungs auscultated clear; SpO2 98%.',
        status: 'approved',
        consultationCompleted: true
      } as any;

      PatientDataStore.addPrescription(clinicalPrescription);

      // Persist to server in background
      try {
        await fetch('/api/prescriptions/approve', {
          method: 'POST',
          headers: AuthService.getAuthHeaders(),
          body: JSON.stringify({
            prescriptionId: rxId,
            patientId: activePatientId,
            fullPrescription: clinicalPrescription
          })
        });
      } catch (e) {
        console.warn("Could not save prescription to server:", e);
      }

      // Notify user
      PatientDataStore.addNotification({
        id: `notif-${Date.now()}`,
        title: language === 'ar' ? 'تم تفعيل حساب بوابة المريض والوصفة الطبية' : 'Prescription & Portal Account Ready',
        message: language === 'ar' 
          ? `أهلاً بك ${regFullName}! تم تسجيل أدويتك ووصفاتك الطبية (${activePatientId}) بنجاح في بوابتك.`
          : `Welcome ${regFullName}! Your clinical prescription and medications (${activePatientId}) have been registered into your portal.`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        type: 'prescription'
      });

      setRegSuccess(
        language === 'ar' 
          ? 'تم إنشاء الحساب وربطه بنجاح! جاري توجيهك إلى بوابة المريض...'
          : 'Account created and linked successfully! Redirecting to your patient portal...'
      );

      // Trigger patient refresh event across app
      window.dispatchEvent(new CustomEvent('refresh-patients'));

      setTimeout(() => {
        navigateTo('/patient-dashboard');
        setIsRegistering(false);
      }, 1000);

    } catch (err: any) {
      console.error("Registration error:", err);
      setRegError(err.message || 'Failed to complete patient registration.');
      setIsRegistering(false);
    }
  };

  // Helper to determine breadcrumbs
  const getBreadcrumbs = () => {
    if (currentPath === '/emr-records') {
      return [
        { label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', route: '/dashboard' as RoutePath },
        { label: language === 'ar' ? 'السجلات الطبية' : 'EMR Records' }
      ];
    }
    if (currentPath === '/patients') {
      return [
        { label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', route: '/dashboard' as RoutePath },
        { label: language === 'ar' ? 'إدارة المرضى' : 'Patient Management' }
      ];
    }
    if (currentPath === '/dashboard') {
      return [
        { label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard' }
      ];
    }
    // Patient Portal breadcrumbs
    if (currentPath === '/patient-dashboard') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard' }
      ];
    }
    if (currentPath === '/patient-health-monitoring') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'المتابعة الصحية' : 'Health Monitoring' }
      ];
    }
    if (currentPath === '/patient-medications') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'الأدوية الموصوفة' : 'Medications' }
      ];
    }
    if (currentPath === '/patient-prescriptions') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'الوصفات الطبية' : 'Prescriptions' }
      ];
    }
    if (currentPath === '/patient-consultations' || currentPath === '/patient-history') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'الاستشارات السريرية' : 'Consultations' }
      ];
    }
    if (currentPath === '/patient-medical-records') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'السجلات الطبية' : 'Medical Records' }
      ];
    }
    if (currentPath === '/patient-appointments') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'المواعيد' : 'Appointments' }
      ];
    }
    if (currentPath === '/patient-daily-log') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'سجل الصحة اليومي' : 'Daily Health Log' }
      ];
    }
    if (currentPath === '/patient-notifications') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'الإشعارات' : 'Notifications' }
      ];
    }
    if (currentPath === '/patient-profile') {
      return [
        { label: language === 'ar' ? 'بوابة المريض' : 'Patient Dashboard', route: '/patient-dashboard' as RoutePath },
        { label: language === 'ar' ? 'الملف الشخصي' : 'Patient Profile' }
      ];
    }
    if (currentPath === '/doctor-patient-monitoring') {
      return [
        { label: language === 'ar' ? 'سجل المرضى' : 'Patient Registry', route: '/patients' as RoutePath },
        { label: language === 'ar' ? 'متابعة المؤشرات والالتزام' : 'Patient Monitoring' }
      ];
    }
    if (currentPath === '/clinical-assistant') {
      return [
        { label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', route: '/dashboard' as RoutePath },
        { label: language === 'ar' ? 'مساعد التوثيق السريري' : 'Documentation Assistant' }
      ];
    }
    return [];
  };

  const isAuthRoute = [
    '/dashboard', '/emr-records', '/patients',
    '/patient-dashboard', '/patient-health-monitoring', '/patient-medications',
    '/patient-prescriptions', '/patient-consultations', '/patient-medical-records',
    '/patient-appointments', '/patient-daily-log', '/patient-notifications',
    '/patient-profile', '/patient-history', '/doctor-patient-monitoring',
    '/clinical-assistant'
  ].includes(currentPath);

  if (isAuthRoute) {
    const isPatientRoute = currentPath.startsWith('/patient-');
    const unreadNotifCount = PatientDataStore.getNotifications().filter(n => !n.read).length;

    return (
      <PageContainer id="satark-ai-root" className="h-screen flex flex-col overflow-hidden bg-[#F8FAFC]">
        <Navbar
          id="main-app-navbar"
          currentRoute={currentPath}
          onNavigate={navigateTo}
          breadcrumbs={getBreadcrumbs()}
        />
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          
          {/* SIDEBAR - Clean Minimalism style */}
          <aside className="hidden md:flex w-60 bg-white border-r rtl:border-r-0 rtl:border-l border-brand-border flex-col p-4 shrink-0 justify-between">
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
              {isPatientRoute ? (
                <>
                  {/* PATIENT PORTAL SIDEBAR LINKS - 10-ITEM STRUCTURE */}
                  
                  {/* 1. Dashboard */}
                  <button
                    onClick={() => navigateTo('/patient-dashboard')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-dashboard'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <HeartPulse className="h-4 w-4" />
                    <span>{language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                  </button>

                  {/* 2. Health Monitoring (Highlighted with accent/badge) */}
                  <button
                    onClick={() => navigateTo('/patient-health-monitoring')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-health-monitoring'
                        ? 'bg-blue-50/80 text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-blue-50/40 hover:text-[#0F4C81]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-[#0F4C81]" />
                      <span className="font-bold">{language === 'ar' ? 'المتابعة الصحية' : 'Health Monitoring'}</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                  </button>

                  {/* 3. Medications */}
                  <button
                    onClick={() => navigateTo('/patient-medications')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-medications'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <Pill className="h-4 w-4" />
                    <span>{language === 'ar' ? 'الأدوية' : 'Medications'}</span>
                  </button>

                  {/* 4. Prescriptions */}
                  <button
                    onClick={() => navigateTo('/patient-prescriptions')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-prescriptions'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>{language === 'ar' ? 'الوصفات الطبية' : 'Prescriptions'}</span>
                  </button>

                  {/* 5. Consultations */}
                  <button
                    onClick={() => navigateTo('/patient-consultations')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-consultations' || currentPath === '/patient-history'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <Stethoscope className="h-4 w-4" />
                    <span>{language === 'ar' ? 'الاستشارات' : 'Consultations'}</span>
                  </button>

                  {/* 6. Medical Records */}
                  <button
                    onClick={() => navigateTo('/patient-medical-records')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-medical-records'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <Folder className="h-4 w-4" />
                    <span>{language === 'ar' ? 'السجلات الطبية' : 'Medical Records'}</span>
                  </button>

                  {/* 7. Appointments */}
                  <button
                    onClick={() => navigateTo('/patient-appointments')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-appointments'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>{language === 'ar' ? 'المواعيد' : 'Appointments'}</span>
                  </button>

                  {/* 8. Daily Health Log */}
                  <button
                    onClick={() => navigateTo('/patient-daily-log')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-daily-log'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>{language === 'ar' ? 'سجل الصحة اليومي' : 'Daily Health Log'}</span>
                  </button>

                  {/* 9. Notifications */}
                  <button
                    onClick={() => navigateTo('/patient-notifications')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-notifications'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4" />
                      <span>{language === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
                    </div>
                    {unreadNotifCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>

                  {/* 10. Profile */}
                  <button
                    onClick={() => navigateTo('/patient-profile')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      currentPath === '/patient-profile'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
                  </button>
                </>
              ) : (
                <>
                  {/* DOCTOR PORTAL SIDEBAR LINKS */}
                  <button
                    id="sidebar-dashboard-btn"
                    onClick={() => navigateTo('/dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all focus:outline-hidden cursor-pointer ${
                      currentPath === '/dashboard'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <HeartPulse className="h-4.5 w-4.5" />
                    <span>{t.dashboard}</span>
                  </button>
                  
                  <button
                    id="sidebar-patients-btn"
                    onClick={() => navigateTo('/patients')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all focus:outline-hidden cursor-pointer ${
                      currentPath === '/patients'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <UserIcon className="h-4.5 w-4.5" />
                    <span>{language === 'ar' ? 'إدارة المرضى' : 'Patient Management'}</span>
                  </button>

                  <button
                    id="sidebar-monitoring-btn"
                    onClick={() => navigateTo('/doctor-patient-monitoring')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all focus:outline-hidden cursor-pointer ${
                      currentPath === '/doctor-patient-monitoring'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-brand-text-secondary hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <Activity className="h-4.5 w-4.5" />
                    <span>{language === 'ar' ? 'متابعة المرضى' : 'Patient Monitoring'}</span>
                  </button>

                  <button
                    id="sidebar-emr-btn"
                    onClick={() => navigateTo('/emr-records')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all focus:outline-hidden cursor-pointer ${
                      currentPath === '/emr-records'
                        ? 'bg-[#F8FAFC] text-[#0F4C81] border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#0F4C81]'
                        : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#0F4C81]'
                    }`}
                  >
                    <Folder className="h-4.5 w-4.5" />
                    <span>{t.emrRecords}</span>
                  </button>
                </>
              )}
            </div>
            <div className="pt-4 border-t border-brand-border">
              <button
                id="sidebar-logout-btn"
                onClick={() => navigateTo('/')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors focus:outline-hidden font-semibold text-sm cursor-pointer"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>{t.logout}</span>
              </button>
            </div>
          </aside>

          {/* MAIN SCROLLABLE CONTENT */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-[#F8FAFC]">
            
            {/* DOCTOR DASHBOARD ROUTE */}
            {currentPath === '/dashboard' && (
              <div id="doctor-dashboard-view" className="space-y-8 max-w-7xl mx-auto w-full animate-fade-in">
                
                {/* Welcome Header */}
                <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-brand-text-secondary font-medium mb-1">
                      <span>{t.dashboard}</span>
                      {isRtl ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span className="text-[#0F4C81]">{t.save}</span>
                    </div>
                    <h2 className="text-3xl font-bold text-[#1F2937]">{t.helloDoctor}</h2>
                    <p className="text-[#6B7280] mt-1">{t.welcomeDoctorText}</p>
                  </div>
                  
                  {/* Quick Status Info Bar */}
                  <div className="flex items-center space-x-4 rtl:space-x-reverse shrink-0 bg-[#F8FAFC] p-3.5 rounded-xl border border-brand-border">
                    <div className="h-2 w-2 rounded-full bg-[#38B000] animate-pulse"></div>
                    <div className="text-xs">
                      <p className="font-semibold text-[#1F2937]">{t.hospitalSystemConnected}</p>
                      <p className="text-[#6B7280]">{t.secureSessionActive}</p>
                    </div>
                  </div>
                </div>

                {/* Action Cards Container */}
                <div id="dashboard-actions-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Card One: New Consultation */}
                  <ActionCard
                    id="action-card-consultation"
                    icon={Mic}
                    title={t.newConsultation}
                    description={t.newConsultationDesc}
                    onClick={() => setIsConsultationExpanded(!isConsultationExpanded)}
                    isActive={isConsultationExpanded}
                  />

                  {/* Card Two: EMR Records */}
                  <ActionCard
                    id="action-card-emr"
                    icon={Folder}
                    title={t.emrRecords}
                    description={t.emrRecordsDesc}
                    onClick={() => navigateTo('/emr-records')}
                  />

                </div>

                {/* Consultation Drawer */}
                {isConsultationExpanded && (
                  <div
                    id="new-consultation-section"
                    className="bg-white border border-[#0F4C81] rounded-2xl p-6 sm:p-8 shadow-md space-y-6 transition-all duration-300"
                  >
                    
                    {/* Header */}
                    <div className="border-b border-brand-border pb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-display font-bold text-xl text-[#0F4C81]">
                          {t.consultationSessionHeader}
                        </h2>
                        <p className="text-xs text-brand-text-secondary mt-0.5">
                          {t.consultationSessionSubtitle}
                        </p>
                      </div>
                      <button
                        id="close-consultation-btn"
                        onClick={() => setIsConsultationExpanded(false)}
                        className="text-xs font-semibold text-brand-text-secondary hover:text-[#0F4C81] bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-brand-border transition-colors focus:outline-hidden cursor-pointer"
                      >
                        {t.minimizeSession}
                      </button>
                    </div>

                    {/* Consultation Body Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      
                      {/* Left Side: Audio Recording Control */}
                      <div className="lg:col-span-5 border border-brand-border rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#F8FAFC]">
                        <span className="text-xs font-semibold text-[#0F4C81] uppercase tracking-wider mb-3 font-mono">
                          {t.recordConversationHeader}
                        </span>

                        {/* Patient Selection Dropdown */}
                        <div className="mb-4 w-full max-w-[260px] flex flex-col text-left">
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor="patient-select" className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">
                              {language === 'ar' ? 'المريض النشط' : 'Active Patient'}
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsNewPatientModalOpen(true)}
                              className="text-[10px] font-bold text-[#0F4C81] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>{language === 'ar' ? 'جديد +' : '+ New'}</span>
                            </button>
                          </div>
                          <select
                            id="patient-select"
                            value={selectedPatientId}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                setIsNewPatientModalOpen(true);
                                return;
                              }
                              setSelectedPatientId(e.target.value);
                              setSaveStatus('idle');
                              setSaveStatusMessage('');
                            }}
                            disabled={isLiveListening || isLiveConnecting || isStopping || dbPatients.length === 0}
                            className="text-xs text-[#0F4C81] bg-white border border-brand-border rounded-md px-2 py-2 focus:outline-hidden w-full font-semibold shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-center transition-all focus:border-[#0F4C81]"
                          >
                            {dbPatients.length > 0 ? (
                              dbPatients.map((p) => (
                                <option key={p.patientId} value={p.patientId}>
                                  {p.firstName} {p.lastName} ({p.patientId})
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>
                                {language === 'ar' ? 'لا يوجد مرضى مسجلين - يرجى تسجيل مريض أولاً' : 'No registered patients - Register first'}
                              </option>
                            )}
                            <option value="__NEW__">{language === 'ar' ? '➕ تسجيل مريض جديد...' : '➕ Enter New Patient...'}</option>
                          </select>
                        </div>
                        
                        {/* Microphone Circular Action Button */}
                        <div className="relative mt-2 mb-4">
                          <button
                            id="consultation-microphone-btn"
                            type="button"
                            onClick={toggleLiveCapture}
                            disabled={isStopping || recordingState === 'stopping'}
                            className={`h-16 w-16 rounded-full flex items-center justify-center border transition-all duration-300 ${
                              recordingState === 'stopping' || isStopping
                                ? "bg-red-400 text-white border-red-500 cursor-wait opacity-90 shadow-md"
                                : isLiveConnecting 
                                  ? "bg-amber-500 text-white border-amber-600 animate-pulse cursor-pointer hover:bg-amber-600 opacity-90 shadow-md"
                                  : isLiveListening
                                    ? "bg-red-600 text-white border-red-700 hover:bg-red-700 shadow-lg scale-105 cursor-pointer"
                                    : "bg-[#0F4C81] text-white border-[#0F4C81]/20 hover:bg-[#0E3D68] cursor-pointer"
                            }`}
                            aria-label={
                              recordingState === 'stopping' || isStopping
                                ? (language === 'ar' ? 'جاري معالجة النسخة النهائية...' : 'Processing final transcript...')
                                : isLiveListening
                                  ? t.microphoneAriaStop
                                  : isLiveConnecting
                                    ? t.microphoneAriaStopConnecting
                                    : t.microphoneAriaStart
                            }
                          >
                            {recordingState === 'stopping' || isStopping ? (
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            ) : isLiveConnecting ? (
                              <span className="h-4 w-4 bg-white rounded-xs animate-pulse"></span>
                            ) : isLiveListening ? (
                              <Square className="h-5 w-5 fill-current text-white" />
                            ) : (
                              <Mic className="h-7 w-7" />
                            )}
                          </button>
                          {/* Ring Pulse effect when live listening */}
                          {isLiveListening && (
                            <span className="absolute -inset-1.5 rounded-full border border-red-500 animate-ping opacity-45 pointer-events-none"></span>
                          )}
                        </div>

                        {/* Status Messages & Loading Indicator */}
                        {recordingState === 'stopping' || isStopping ? (
                          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg animate-pulse my-1">
                            <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
                            <span>{language === 'ar' ? 'جاري معالجة النسخة النهائية...' : 'Processing final transcript...'}</span>
                          </div>
                        ) : (
                          <p className={`text-xs font-semibold ${isLiveListening ? 'text-red-600 animate-pulse' : isLiveConnecting ? 'text-amber-500 animate-pulse' : 'text-[#0F4C81]'}`}>
                            {isLiveListening ? t.stateLiveCapturing : isLiveConnecting ? t.stateConnecting : recordingState === 'completed' ? (language === 'ar' ? 'تم اكتمال التسجيل' : 'Recording Completed') : t.stateContinuousSpeech}
                          </p>
                        )}

                        <p className="text-[11px] text-brand-text-secondary max-w-xs mt-1 leading-relaxed">
                          {isLiveListening 
                            ? t.tipLiveListening 
                            : recordingState === 'stopping' || isStopping
                              ? (language === 'ar' ? 'يرجى الانتظار لحين معالجة وتأكيد النسخة الصوتية...' : 'Please wait while final transcript is processed...')
                              : isLiveConnecting
                                ? t.tipConnecting
                                : t.tipInitial}
                        </p>

                        {/* Real-time Recording Timer */}
                        {isLiveListening && (
                          <div className="flex flex-col items-center mt-3 space-y-1.5 animate-fade-in w-full max-w-[240px]">
                            <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-100 text-[10px] font-bold uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 bg-red-600 rounded-full animate-ping"></span>
                              <span>
                                {language === 'ar' ? 'مدة التسجيل: ' : 'Recording Time: '}
                                {recordingSeconds}s
                              </span>
                            </div>
                          </div>
                        )}



                        {liveError && (
                          <p id="live-error-msg" className="text-xs text-red-600 mt-2 font-medium max-w-xs leading-relaxed bg-red-50 p-2.5 rounded-lg border border-red-100">
                            {liveError}
                          </p>
                        )}

                        {/* Database Save Status Banner */}
                        {saveStatus !== 'idle' && (
                          <div 
                            id="db-save-status-banner"
                            className={`text-xs mt-3 font-semibold max-w-xs leading-relaxed p-2.5 rounded-lg border w-full text-center ${
                              saveStatus === 'saving' 
                                ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse'
                                : saveStatus === 'success'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                          >
                            <span className="mr-1">💾</span>
                            {saveStatusMessage}
                          </div>
                        )}
                      </div>

                      {/* Divider Column */}
                      <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
                        <span className="text-xs font-extrabold text-brand-text-secondary uppercase tracking-wider bg-[#F8FAFC] border border-brand-border px-2.5 py-1.5 rounded-full shadow-xs">
                          {isRtl ? "أو" : "OR"}
                        </span>
                      </div>

                      {/* Mobile OR Divider */}
                      <div className="flex lg:hidden items-center justify-center py-2">
                        <div className="h-px bg-brand-border w-full flex-1"></div>
                        <span className="text-xs font-extrabold text-[#6B7280] px-3 uppercase">{isRtl ? "أو" : "OR"}</span>
                        <div className="h-px bg-brand-border w-full flex-1"></div>
                      </div>

                      {/* Right Side: Clinical Consultation Notes & Prescription Generator */}
                      <div className="lg:col-span-6 flex flex-col space-y-3">
                        <div className="relative">
                          <textarea
                            id="consultation-prescription-textarea"
                            aria-label={t.typePrescriptionLabel}
                            value={prescriptionText}
                            onChange={(e) => setPrescriptionText(e.target.value)}
                            placeholder={t.typePrescriptionPlaceholder}
                            className="w-full bg-white border border-brand-border rounded-xl p-4 text-sm text-[#1F2937] placeholder:text-gray-400 focus:outline-hidden focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/15 transition-all duration-200 min-h-[220px] resize-y text-left rtl:text-right leading-relaxed font-sans"
                          ></textarea>

                          {/* Live Character & Word Count Badge */}
                          <div className="absolute bottom-3 right-3 rtl:right-auto rtl:left-3 text-[10px] font-mono text-slate-400 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200 pointer-events-none">
                            {prescriptionText.trim() ? `${prescriptionText.trim().split(/\s+/).length} words · ${prescriptionText.length} chars` : 'Ready for input'}
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                          <p className="text-[11px] text-brand-text-secondary font-medium leading-tight">
                            {language === 'ar' 
                              ? '✨ يحلل ساتارك للذكاء الاصطناعي الملاحظات السريرية تلقائياً لاستخراج المؤشرات والتشخيص وقائمة الأدوية المعتمدة.' 
                              : '✨ Satark AI extracts vital signs, clinical diagnosis, and verified medications directly into the EMR.'}
                          </p>

                          <button
                            id="consultation-create-prescription-btn"
                            type="button"
                            onClick={handleCreatePrescription}
                            disabled={isCreatingPrescription || !prescriptionText.trim()}
                            className="px-6 py-3 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            aria-label="Generate Clinical Prescription"
                          >
                            {isCreatingPrescription ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                <span>{language === 'ar' ? 'جاري استخراج وإنشاء الوصفة...' : 'Generating Digital Prescription...'}</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 text-amber-300" />
                                <span>{language === 'ar' ? 'إنشاء الوصفة الطبية الرقمية' : 'Generate Clinical Prescription'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {prescriptionError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium text-left rtl:text-right">
                            {prescriptionError}
                          </div>
                        )}

                        {generatedPrescription && (
                          <div className="mt-3 p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left rtl:text-right shadow-xs">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-emerald-950">
                                    {language === 'ar' ? 'تم إصدار الوصفة الطبية بنجاح' : 'Digital Prescription Created'}
                                  </h4>
                                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                    {generatedPrescription.medications?.length || 0} {language === 'ar' ? 'أدوية' : 'meds'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                                  {language === 'ar' 
                                    ? `المريض: ${generatedPrescription.patientDetails.patientName} (${generatedPrescription.patientDetails.patientId}) · التشخيص: ${generatedPrescription.provisionalDiagnosis}`
                                    : `Patient: ${generatedPrescription.patientDetails.patientName} (${generatedPrescription.patientDetails.patientId}) · Diagnosis: ${generatedPrescription.provisionalDiagnosis}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => setIsPrescriptionModalOpen(true)}
                                className="flex-1 sm:flex-initial px-4 py-2 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                                <span>{language === 'ar' ? 'معاينة الوصفة كاملة' : 'View Prescription'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                )}

                {/* Quick Stats Panel for Doctors */}
                <div className="pt-6 border-t border-brand-border">
                  <h3 className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-4 text-left rtl:text-right">
                    {t.deptSummaryHeader}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 border border-brand-border rounded-xl shadow-xs text-left rtl:text-right">
                      <span className="text-xs text-brand-text-secondary block">{t.todaysVisitsLabel}</span>
                      <span className="text-xl font-bold text-[#1F2937]">{t.todaysVisitsValue}</span>
                    </div>
                    <div className="bg-white p-4 border border-brand-border rounded-xl shadow-xs text-left rtl:text-right">
                      <span className="text-xs text-brand-text-secondary block">{t.consultationsFiledLabel}</span>
                      <span className="text-xl font-bold text-[#1F2937]">{t.consultationsFiledValue}</span>
                    </div>
                    <div className="bg-white p-4 border border-brand-border rounded-xl shadow-xs text-left rtl:text-right">
                      <span className="text-xs text-brand-text-secondary block">{t.avgSessionTimeLabel}</span>
                      <span className="text-xl font-bold text-[#1F2937]">{t.avgSessionTimeValue}</span>
                    </div>
                    <div className="bg-white p-4 border border-brand-border rounded-xl shadow-xs text-left rtl:text-right">
                      <span className="text-xs text-brand-text-secondary block">{t.pendingLabApprovalsLabel}</span>
                      <span className="text-xl font-bold text-[#1F2937]">{t.pendingLabApprovalsValue}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* EMR RECORDS VIEW */}
            {currentPath === '/emr-records' && (
              <div id="emr-records-view" className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
                
                {/* Header Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    {/* Back Link */}
                    <button
                      id="emr-back-link"
                      onClick={() => navigateTo('/dashboard')}
                      className="inline-flex items-center space-x-1 rtl:space-x-reverse text-xs font-semibold text-brand-secondary hover:text-[#0F4C81] transition-colors focus:outline-hidden mb-2 cursor-pointer"
                      aria-label="Back to dashboard"
                    >
                      <ArrowLeft className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                      <span>{t.backToDashboard}</span>
                    </button>
                    
                    <SectionTitle
                      id="emr-title"
                      title={t.emrTitleText}
                      subtitle={t.emrSubtitleText}
                    />
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
                    <SecondaryButton
                      id="emr-quick-new-btn"
                      onClick={() => {
                        navigateTo('/dashboard');
                        setIsConsultationExpanded(true);
                      }}
                      className="px-3 py-2 text-xs"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>{t.newConsultation}</span>
                    </SecondaryButton>
                  </div>
                </div>

                {/* Patient Record Table Component */}
                <PatientTable id="main-patient-records-table" />

                {/* Real-time Database Logs */}
                <DatabaseAuditLogs />

              </div>
            )}

            {/* PATIENT MANAGEMENT ROUTE */}
            {currentPath === '/patients' && (
              <PatientManagement
                onStartConsultation={(patientId) => {
                  setSelectedPatientId(patientId);
                  setIsConsultationExpanded(true);
                  navigateTo('/dashboard');
                }}
                onViewMonitoring={(patientId) => {
                  setSelectedMonitoringPatientId(patientId);
                  navigateTo('/doctor-patient-monitoring');
                }}
              />
            )}

            {/* DOCTOR PATIENT MONITORING ROUTE (Step 7) */}
            {currentPath === '/doctor-patient-monitoring' && (
              <DoctorPatientMonitoringView
                initialPatientId={selectedMonitoringPatientId || selectedPatientId || 'PID-2026-001'}
                onNavigate={navigateTo}
                onStartConsultation={(patientId) => {
                  setSelectedPatientId(patientId);
                  setIsConsultationExpanded(true);
                  navigateTo('/dashboard');
                }}
              />
            )}

            {/* CLINICAL DOCUMENTATION ASSISTANT ROUTE */}
            {currentPath === '/clinical-assistant' && (
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <ClinicalDocumentationAssistant />
              </div>
            )}

            {/* DIGITAL PRESCRIPTION POPUP MODAL */}
            {isPrescriptionModalOpen && generatedPrescription && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:static">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up print:max-h-none print:shadow-none print:border-0 print:rounded-none">
                  
                  {/* Sticky Modal Header */}
                  <div className="bg-[#0F4C81] text-white px-6 py-4 flex items-center justify-between border-b border-[#0F4C81]/20 shrink-0 print:hidden text-left rtl:text-right">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-xl text-amber-300">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold tracking-tight">
                          {(generatedPrescription as any).status === 'approved'
                            ? (language === 'ar' ? 'الوصفة الطبية الرقمية المعتمدة' : 'Digital Clinical Prescription (Approved & Published)')
                            : (language === 'ar' ? 'مراجعة مسودة الوصفة الطبية (يتطلب اعتماد الطبيب)' : 'Review Clinical Prescription Draft (Doctor Approval Required)')}
                        </h3>
                        <p className="text-[11px] text-blue-100 font-medium">
                          {generatedPrescription.patientDetails.patientName} &bull; {generatedPrescription.patientDetails.patientId} &bull; {generatedPrescription.patientDetails.date}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPrescriptionModalOpen(false)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Scrollable Modal Body */}
                  <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
                    <PrescriptionCardView 
                      prescription={generatedPrescription}
                      isDoctorView={true}
                      onApprove={(approvedRx) => {
                        setGeneratedPrescription(approvedRx);
                      }}
                      onSavedToEmr={() => {
                        console.log("Prescription saved to EMR DB from modal.");
                      }}
                    />
                  </div>

                  {/* Sticky Modal Footer */}
                  <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-left rtl:text-right">
                    <div className="text-xs text-slate-500 font-medium">
                      {language === 'ar' 
                        ? 'استخدم شريط الأدوات أعلاه لتحميل أو طباعة الوصفة الطبية أو حفظها في سجلات EMR.' 
                        : 'Use the toolbar above to download, print, or store directly in EMR DB.'}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPrescriptionModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      {language === 'ar' ? 'إغلاق النافذة' : 'Close Popup'}
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* DOCTOR NEW PATIENT REGISTRATION MODAL */}
            <DoctorNewPatientModal
              isOpen={isNewPatientModalOpen}
              onClose={() => setIsNewPatientModalOpen(false)}
              onPatientCreated={(newPatient, chiefComplaint) => {
                setDbPatients(prev => [newPatient, ...prev.filter(p => p.patientId !== newPatient.patientId)]);
                setSelectedPatientId(newPatient.patientId);
                setIsConsultationExpanded(true);
                
                const salutation = newPatient.gender === 'Female' ? 'Ms.' : 'Mr.';
                const h = newPatient.heightCm || 175;
                const w = newPatient.weightKg || 74;
                const allergiesText = newPatient.allergies && newPatient.allergies.toLowerCase() !== 'none'
                  ? newPatient.allergies
                  : 'Penicillin (causes severe rash — avoid beta-lactams)';
                const complaintText = chiefComplaint && chiefComplaint.trim()
                  ? chiefComplaint.trim()
                  : "I have had a bad cough for about a week following a cold, coughing up thick mucus, with chest tightness, soreness, and exhaustion.";

                setPrescriptionText(`Doctor: Good morning ${salutation} ${newPatient.firstName} ${newPatient.lastName}. What brings you to the clinic today?
Patient: ${complaintText}
Doctor: Let's check your baseline metrics. Height is ${h} cm, weight is ${w} kg. Vitals check: BP 120/80 mmHg, pulse 76 bpm, temperature 99.8 °F (37.7 °C), SpO2 98%.
Patient: Drug allergy status: ${allergiesText}.
Doctor: On chest auscultation, there is wheezing and rattling in the upper chest; lower lung fields are clear bilaterally. Vitals and oxygen saturation are good at 98%. A chest X-ray isn't needed, and antibiotics will not help because this is viral acute bronchitis.
Doctor: Clinical diagnosis: Acute bronchitis (inflammation of the airways).
Prescribed:
1. Guaifenesin (Extended-Release) 600 mg, 1 tablet every 12 hours for 7 days with plenty of water to thin mucus.
2. Ibuprofen 400 mg, 1 tablet every 6–8 hours as needed with food for chest soreness and fever.
3. Albuterol HFA Inhaler 90 mcg, 2 puffs every 4–6 hours as needed to open airways and relieve wheezing.
Advice: Rest up adequately, use a humidifier at home, and drink plenty of water to help thin mucus.
Follow-up: Come back in 10 days if not improving. Go to the emergency room immediately if you develop a high fever, cough up blood, or experience severe shortness of breath.
Doctor's Notes: Viral acute bronchitis. Penicillin family strictly contraindicated due to severe rash. Lower lungs auscultated clear; SpO2 98%.`);

                setSaveStatus('success');
                setSaveStatusMessage(
                  language === 'ar'
                    ? `✅ تم تسجيل المريض ${newPatient.firstName} ${newPatient.lastName} (${newPatient.patientId}) بنجاح وبدء الاستشارة.`
                    : `✅ Patient ${newPatient.firstName} ${newPatient.lastName} (${newPatient.patientId}) created. Ready for consultation.`
                );
              }}
            />

            {/* PATIENT PORTAL ROUTE VIEWS */}
            {currentPath === '/patient-dashboard' && (
              <PatientDashboardView onNavigate={navigateTo} />
            )}

            {currentPath === '/patient-health-monitoring' && (
              <PatientHealthMonitoringView onNavigate={navigateTo} />
            )}

            {currentPath === '/patient-medications' && (
              <PatientMedicationsView onNavigate={navigateTo} />
            )}

            {currentPath === '/patient-prescriptions' && (
              <PatientPrescriptionsView />
            )}

            {(currentPath === '/patient-consultations' || currentPath === '/patient-history') && (
              <PatientConsultationsView />
            )}

            {currentPath === '/patient-medical-records' && (
              <PatientMedicalRecordsView />
            )}

            {currentPath === '/patient-appointments' && (
              <PatientAppointmentsView />
            )}

            {currentPath === '/patient-daily-log' && (
              <PatientDailyLogView onNavigate={navigateTo} />
            )}

            {currentPath === '/patient-notifications' && (
              <PatientNotificationsView />
            )}

            {currentPath === '/patient-profile' && (
              <PatientProfileView />
            )}

          </main>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer id="satark-ai-root" className="min-h-screen bg-[#F8FAFC]">

      {/* LANDING PAGE ROUTE (/) */}
      {currentPath === '/' && (
        <div id="landing-page-view" className="relative flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 md:py-20 max-w-5xl mx-auto w-full">
          
          {/* Landing Content Wrapper */}
          <div className="w-full flex flex-col items-center">
            
            {/* Logo Badge */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-brand-primary/5 px-4 py-2 rounded-full border border-brand-primary/10 mb-8">
              <HeartPulse className="h-5 w-5 text-brand-primary" />
              <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
                {t.clinicalPlatform}
              </span>
            </div>

            {/* Title & Tagline */}
            <div className="text-center space-y-4 max-w-3xl mb-12">
              <h1 id="landing-main-title" className="font-display font-extrabold text-5xl sm:text-6xl md:text-7xl text-brand-primary tracking-tight leading-none">
                {t.brandName}
              </h1>
              <p id="landing-main-tagline" className="font-display font-medium text-xl sm:text-2xl md:text-3xl text-brand-secondary tracking-normal">
                {t.appDescription}
              </p>
              <p className="text-sm sm:text-base text-brand-text-secondary max-w-lg mx-auto font-sans leading-relaxed">
                {isRtl 
                  ? "حلول رقمية متميزة لمتخصصي الرعاية الصحية. تسهيل السجلات الطبية للمرضى، سير العمل السريري، وتوثيق الاستشارات."
                  : "Premium digital solutions for healthcare professionals. Streamlining patient records, clinical workflows, and consultation documentation."}
              </p>
            </div>

            {/* Statistics Grid */}
            <div id="landing-stats-grid" className="grid grid-cols-3 gap-4 sm:gap-6 w-full max-w-2xl mb-14">
              <StatCard id="stat-doctors" value="21" label={t.doctors} />
              <StatCard id="stat-hospitals" value="85+" label={t.hospitals} />
              <StatCard id="stat-patients" value="100+" label={t.patients} />
            </div>

            {/* Action Buttons */}
            <div id="landing-buttons-row" className="flex flex-row items-center justify-center space-x-6 rtl:space-x-reverse w-full max-w-md px-4">
              <PrimaryButton
                id="landing-login-btn"
                onClick={() => {
                  setAuthMode('login');
                  navigateTo('/login');
                }}
                className="w-full py-3.5 rounded-xl shadow-xs text-base"
                aria-label="Navigate to Login Page"
              >
                {t.signIn}
              </PrimaryButton>
              <SecondaryButton
                id="landing-signup-btn"
                onClick={() => {
                  setAuthMode('register');
                  navigateTo('/signup');
                }}
                className="w-full py-3.5 rounded-xl text-base"
                aria-label="Navigate to Patient Registration Page"
              >
                {t.signup}
              </SecondaryButton>
            </div>

            {/* Footer Branding */}
            <div className="mt-20 text-center text-xs text-brand-text-secondary font-medium tracking-wide">
              <p>{t.landingFooter}</p>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN & SIGNUP PAGE ROUTE (/login & /signup) */}
      {(currentPath === '/login' || currentPath === '/signup') && (
        <div id="login-page-view" className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-10 md:py-16 animate-fade-in">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 shadow-lg text-left rtl:text-right">
            
            {/* Header / Brand */}
            <div className="text-center space-y-1.5 mb-6">
              <button
                id="login-logo-back-btn"
                onClick={() => navigateTo('/')}
                className="inline-flex items-center space-x-2 rtl:space-x-reverse text-brand-primary group focus:outline-hidden mb-1 font-display"
                aria-label="Back to landing"
              >
                <div className="bg-brand-primary/10 p-2 rounded-lg text-brand-primary">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight">{t.brandName}</span>
              </button>
              <h2 className="font-display font-bold text-xl text-brand-text-primary">
                {authMode === 'login' 
                  ? t.loginPortalHeader 
                  : (language === 'ar' ? 'التسجيل في بوابة المريض' : 'Patient Portal Registration')}
              </h2>
              <p className="text-xs text-brand-text-secondary font-medium">
                {authMode === 'login'
                  ? t.authorizedPersonnelOnly
                  : (language === 'ar' 
                      ? 'استكمل تسجيل حسابك للوصول إلى وصفاتك الطبية وسجل استشاراتك بعد مراجعة الطبيب.' 
                      : 'Access your digital prescriptions and doctor consultation notes after your visit.')}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-brand-border mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginError('');
                  navigateTo('/login');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-[#0F4C81] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0F4C81]'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setRegError('');
                  setRegSuccess('');
                  navigateTo('/signup');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-[#0F4C81] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0F4C81]'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{language === 'ar' ? 'حساب مريض جديد' : 'New Patient Sign Up'}</span>
              </button>
            </div>

            {/* MODE 1: LOGIN FORM */}
            {authMode === 'login' ? (
              <form id="login-auth-form" onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Role Selection Tabs */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    {language === 'ar' ? 'تسجيل الدخول كـ' : 'Login As'}
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-1 rounded-lg border border-brand-border">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('doctor');
                        setLoginName('Harini');
                        setLoginEmail('doctor@satark.ai');
                        setLoginPassword('123456');
                        setLoginError('');
                      }}
                      className={`py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedRole === 'doctor'
                          ? 'bg-white text-[#0F4C81] border border-brand-border shadow-xs'
                          : 'text-slate-500 hover:text-[#0F4C81]'
                      }`}
                    >
                      <Stethoscope className="h-3.5 w-3.5" />
                      <span>{language === 'ar' ? 'طبيب' : 'Doctor'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('patient');
                        setLoginName('Harini');
                        setLoginEmail('harini@satark.ai');
                        setLoginPassword('123456');
                        setLoginError('');
                      }}
                      className={`py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedRole === 'patient'
                          ? 'bg-white text-[#0F4C81] border border-brand-border shadow-xs'
                          : 'text-slate-500 hover:text-[#0F4C81]'
                      }`}
                    >
                      <UserIcon className="h-3.5 w-3.5" />
                      <span>{language === 'ar' ? 'مريض' : 'Patient'}</span>
                    </button>
                  </div>
                </div>

                {selectedRole === 'doctor' ? (
                  <>
                    <InputField
                      id="login-name-input"
                      label={t.fullNameLabel}
                      type="text"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder={t.fullNamePlaceholder}
                      required
                      autoComplete="name"
                    />

                    <InputField
                      id="login-email-input"
                      label={t.emailLabel}
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      required
                      autoComplete="email"
                    />
                  </>
                ) : (
                  <>
                    <InputField
                      id="login-patient-id-input"
                      label={language === 'ar' ? 'رقم الملف الطبي / البريد الإلكتروني' : 'Patient ID / Email / Phone'}
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: PID-2026-001 أو harini@satark.ai' : 'e.g. PID-2026-001 or harini@satark.ai'}
                      required
                      autoComplete="username"
                    />

                    <InputField
                      id="login-patient-name-input"
                      label={t.fullNameLabel}
                      type="text"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder={t.fullNamePlaceholder}
                      required
                      autoComplete="name"
                    />
                  </>
                )}

                <InputField
                  id="login-password-input"
                  label={t.passwordLabel}
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  required
                  autoComplete="current-password"
                />

                {/* Error Message Display */}
                {loginError && (
                  <div id="login-error-alert" className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 rtl:space-x-reverse text-red-700 text-xs font-semibold">
                    <span className="shrink-0">⚠️</span>
                    <span>{loginError === "Invalid Email or Password" ? t.invalidCredentials : loginError}</span>
                  </div>
                )}

                {/* Access Button */}
                <PrimaryButton
                  id="login-submit-btn"
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-bold tracking-wide shadow-md mt-4"
                  aria-label="Authenticate credentials"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t.accessSystemButton}</span>
                </PrimaryButton>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setRegError('');
                      setRegSuccess('');
                      navigateTo('/signup');
                    }}
                    className="text-xs text-[#0F4C81] hover:underline font-semibold cursor-pointer"
                  >
                    {language === 'ar'
                      ? 'مريض جديد؟ اضغط هنا لتفعيل حساب بوابة المريض'
                      : 'New patient? Click here to register your portal account'}
                  </button>
                </div>
              </form>
            ) : (
              /* MODE 2: PATIENT REGISTRATION / PORTAL ACTIVATION FORM */
              <form id="register-auth-form" onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
                    {language === 'ar' ? 'رقم الملف الطبي / معرف المريض (اختياري)' : 'Patient ID / Medical Record No. (Optional)'}
                  </label>
                  <input
                    id="register-patient-id-input"
                    type="text"
                    value={regPatientId}
                    onChange={(e) => setRegPatientId(e.target.value)}
                    placeholder="e.g. PID-2026-001 (From prescription receipt)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81] outline-hidden text-xs bg-[#F8FAFC]"
                  />
                  <span className="text-[10px] text-brand-text-secondary block mt-1">
                    {language === 'ar' 
                      ? 'تجد رقم الملف الطبي في أسفل الوصفة الطبية الصادرة من الطبيب.'
                      : 'Find this ID on your prescription receipt or doctor consultation notes.'}
                  </span>
                </div>

                <InputField
                  id="register-fullname-input"
                  label={language === 'ar' ? 'الاسم الكامل للمريض' : 'Patient Full Name'}
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Harini Al-Mansoor"
                  required
                  autoComplete="name"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField
                    id="register-email-input"
                    label={language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. harini@example.com"
                    required
                    autoComplete="email"
                  />

                  <InputField
                    id="register-phone-input"
                    label={language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. +966 50 123 4567"
                    required
                    autoComplete="tel"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField
                    id="register-password-input"
                    label={language === 'ar' ? 'كلمة المرور' : 'Create Password'}
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    autoComplete="new-password"
                  />

                  <InputField
                    id="register-confirm-password-input"
                    label={language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    required
                    autoComplete="new-password"
                  />
                </div>

                {regError && (
                  <div id="register-error-alert" className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 rtl:space-x-reverse text-red-700 text-xs font-semibold">
                    <span className="shrink-0">⚠️</span>
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div id="register-success-alert" className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2 rtl:space-x-reverse text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                <PrimaryButton
                  id="register-submit-btn"
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-3.5 rounded-xl font-bold tracking-wide shadow-md mt-4 cursor-pointer"
                  aria-label="Create patient portal account"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>{language === 'ar' ? 'جاري تفعيل الحساب...' : 'Activating Account...'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>{language === 'ar' ? 'تفعيل وحفظ حساب المريض' : 'Create & Activate Patient Account'}</span>
                    </>
                  )}
                </PrimaryButton>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError('');
                      navigateTo('/login');
                    }}
                    className="text-xs text-[#0F4C81] hover:underline font-semibold cursor-pointer"
                  >
                    {language === 'ar'
                      ? 'لديك حساب بالفعل؟ تسجيل الدخول'
                      : 'Already registered? Sign In to your account'}
                  </button>
                </div>
              </form>
            )}

          </div>
          
          <button
            id="login-back-to-home-link"
            onClick={() => navigateTo('/')}
            className="mt-6 text-sm text-brand-text-secondary hover:text-brand-primary transition-colors flex items-center space-x-1.5 rtl:space-x-reverse focus:outline-hidden cursor-pointer"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span>{t.returnToHomepage}</span>
          </button>
        </div>
      )}

    </PageContainer>
  );
}
