export type Language = 'en' | 'ar';

export interface TranslationSchema {
  // Navigation & Branding
  brandName: string;
  appDescription: string;
  doctors: string;
  hospitals: string;
  patients: string;
  dashboard: string;
  emrRecords: string;
  logout: string;
  signIn: string;
  signup: string;

  // General Actions
  save: string;
  cancel: string;
  backToDashboard: string;
  newConsultation: string;
  loading: string;
  errors: string;
  notifications: string;

  // Login Screen
  loginPortalHeader: string;
  authorizedPersonnelOnly: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  invalidCredentials: string;
  accessSystemButton: string;
  returnToHomepage: string;

  // Landing Screen
  clinicalPlatform: string;
  landingHeadline: string;
  landingSubtitle: string;
  landingFooter: string;

  // Dashboard Overview
  helloDoctor: string;
  welcomeDoctorText: string;
  hospitalSystemConnected: string;
  secureSessionActive: string;
  newConsultationDesc: string;
  emrRecordsDesc: string;

  // Consultation Session Drawer
  consultationSessionHeader: string;
  consultationSessionSubtitle: string;
  minimizeSession: string;
  recordConversationHeader: string;
  microphoneAriaStop: string;
  microphoneAriaStopConnecting: string;
  microphoneAriaStart: string;
  stateLiveCapturing: string;
  stateStopping: string;
  stateConnecting: string;
  stateContinuousSpeech: string;
  tipLiveListening: string;
  tipStopping: string;
  tipConnecting: string;
  tipInitial: string;
  liveApiEngine: string;
  typePrescriptionLabel: string;
  typePrescriptionPlaceholder: string;
  translateToArabicButton: string;
  translatingStatus: string;
  arabicTranslationLabel: string;
  arabicTranslationPlaceholder: string;
  submittingNote: string;
  submitRecordButton: string;

  // Dept Summary Panel
  deptSummaryHeader: string;
  todaysVisitsLabel: string;
  todaysVisitsValue: string;
  consultationsFiledLabel: string;
  consultationsFiledValue: string;
  avgSessionTimeLabel: string;
  avgSessionTimeValue: string;
  pendingLabApprovalsLabel: string;
  pendingLabApprovalsValue: string;

  // EMR view & Search Table
  emrTitleText: string;
  emrSubtitleText: string;
  searchPlaceholder: string;
  showingRecordsText: (count: number, total: number) => string;
  noMedicalRecordsFound: string;
  noMedicalRecordsSearchTip: string;

  // Table Columns & Gender
  colSNo: string;
  colPatientId: string;
  colPatientName: string;
  colAge: string;
  colGender: string;
  genderMale: string;
  genderFemale: string;
  colVisitDate: string;
  colDiagnosis: string;
  colPrescription: string;
  colFollowUpDate: string;
}

export const translations: Record<Language, TranslationSchema> = {
  en: {
    brandName: "Satark AI",
    appDescription: "Clinical AI Healthcare Platform",
    doctors: "Doctors",
    hospitals: "Hospitals",
    patients: "Patients",
    dashboard: "Dashboard",
    emrRecords: "EMR Records",
    logout: "Logout",
    signIn: "Sign In",
    signup: "Signup",

    save: "Save",
    cancel: "Cancel",
    backToDashboard: "Back to Dashboard",
    newConsultation: "New Consultation",
    loading: "Loading...",
    errors: "Errors",
    notifications: "Notifications",

    loginPortalHeader: "Hospital Portal Access",
    authorizedPersonnelOnly: "Authorized Personnel Only",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "Enter authorized name",
    emailLabel: "Email Address",
    emailPlaceholder: "doctor@satark.ai",
    passwordLabel: "Security Password",
    passwordPlaceholder: "••••••",
    invalidCredentials: "Invalid Email or Password",
    accessSystemButton: "Access System",
    returnToHomepage: "Return to Homepage",

    clinicalPlatform: "Clinical Platform",
    landingHeadline: "Satark AI",
    landingSubtitle: "Clinical Intelligence & Healthcare Platform",
    landingFooter: "© 2026 Satark AI. Dedicated Hospital Medical Systems. All Rights Reserved.",

    helloDoctor: "Hello Dr. Harini",
    welcomeDoctorText: "Welcome to Satark AI. What would you like to do today?",
    hospitalSystemConnected: "Hospital System Connected",
    secureSessionActive: "Secure Session Active",
    newConsultationDesc: "Start a new patient consultation and capture diagnosis automatically.",
    emrRecordsDesc: "View and manage historical patient medical records and reports.",

    consultationSessionHeader: "New Patient Consultation Session",
    consultationSessionSubtitle: "Input clinical inputs to generate patient diagnostic reports.",
    minimizeSession: "Minimize Session",
    recordConversationHeader: "Doctor Voice Dictation & Audio Capture",
    microphoneAriaStop: "Stop Voice Recording",
    microphoneAriaStopConnecting: "Cancel Connection Attempt",
    microphoneAriaStart: "Start Voice Recording",
    stateLiveCapturing: "🔴 Live Voice Dictation Active...",
    stateStopping: "🛑 Finalizing Dictation...",
    stateConnecting: "⏳ Connecting to Live Audio...",
    stateContinuousSpeech: "Voice Clinical Dictation",
    tipLiveListening: "Speak clearly. Click the red button when finished to capture clinical notes directly into the transcript.",
    tipStopping: "Finalizing audio capture and securing consultation transcript...",
    tipConnecting: "Initializing secure microphone and real-time audio pipeline...",
    tipInitial: "Click the microphone button to start voice dictation of consultation notes.",
    liveApiEngine: "Live Audio Engine",
    typePrescriptionLabel: "Consultation Notes & Transcript",
    typePrescriptionPlaceholder: "Doctor consultation transcript, clinical examination findings, vitals, diagnosis, and prescribed medications will appear here or can be typed manually...",
    translateToArabicButton: "Process",
    translatingStatus: "Processing...",
    arabicTranslationLabel: "Consultation Summary",
    arabicTranslationPlaceholder: "Clinical summary will appear here...",
    submittingNote: "Note: Click below to generate an official AI-assisted digital prescription.",
    submitRecordButton: "Generate Clinical Prescription",

    deptSummaryHeader: "Authorized Department Summary (Internal Medicine)",
    todaysVisitsLabel: "Today's Visits",
    todaysVisitsValue: "12 Patients",
    consultationsFiledLabel: "Consultations Filed",
    consultationsFiledValue: "8 Completed",
    avgSessionTimeLabel: "Average Session Time",
    avgSessionTimeValue: "8.5 Minutes",
    pendingLabApprovalsLabel: "Pending Lab Approvals",
    pendingLabApprovalsValue: "3 Orders",

    emrTitleText: "Electronic Medical Records",
    emrSubtitleText: "Explore complete records of patient diagnoses, medication protocols, and follow-up clinical indicators.",
    searchPlaceholder: "Search by Patient Name, ID, or Diagnosis...",
    showingRecordsText: (count: number, total: number) => `Showing ${count} of ${total} electronic medical records`,
    noMedicalRecordsFound: "No medical records found",
    noMedicalRecordsSearchTip: "Try searching for a different patient name or ID.",

    colSNo: "S.No",
    colPatientId: "Patient ID",
    colPatientName: "Patient Name",
    colAge: "Age",
    colGender: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    colVisitDate: "Visit Date",
    colDiagnosis: "Diagnosis",
    colPrescription: "Prescription",
    colFollowUpDate: "Follow-up Date"
  },
  ar: {
    brandName: "Satark AI (ساتارك)",
    appDescription: "منصة الرعاية الصحية بالذكاء الاصطناعي",
    doctors: "الأطباء",
    hospitals: "المستشفيات",
    patients: "المرضى",
    dashboard: "لوحة التحكم",
    emrRecords: "السجلات الطبية",
    logout: "تسجيل الخروج",
    signIn: "تسجيل الدخول",
    signup: "إنشاء حساب",

    save: "حفظ",
    cancel: "إلغاء",
    backToDashboard: "العودة إلى لوحة التحكم",
    newConsultation: "استشارة جديدة",
    loading: "جاري التحميل...",
    errors: "الأخطاء",
    notifications: "الإشعارات",

    loginPortalHeader: "بوابة دخول المستشفى",
    authorizedPersonnelOnly: "للموظفين المصرح لهم فقط",
    fullNameLabel: "الاسم الكامل",
    fullNamePlaceholder: "أدخل الاسم المصرح به",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "doctor@satark.ai",
    passwordLabel: "كلمة مرور الأمان",
    passwordPlaceholder: "••••••",
    invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صالحة",
    accessSystemButton: "دخول النظام",
    returnToHomepage: "العودة إلى الصفحة الرئيسية",

    clinicalPlatform: "المنصة السريرية",
    landingHeadline: "Satark AI",
    landingSubtitle: "منصة الرعاية الصحية الذكية والسريرية",
    landingFooter: "© ٢٠٢٦ Satark AI. أنظمة مستشفيات مخصصة. جميع الحقوق محفوظة.",

    helloDoctor: "أهلاً د. هاريني",
    welcomeDoctorText: "مرحباً بك في Satark AI. ماذا تود أن تفعل اليوم؟",
    hospitalSystemConnected: "متصل بنظام المستشفى",
    secureSessionActive: "الجلسة الآمنة نشطة",
    newConsultationDesc: "ابدأ استشارة مريض جديدة والتقط التشخيص تلقائياً.",
    emrRecordsDesc: "عرض وإدارة سجلات المرضى والتقارير الطبية السابقة.",

    consultationSessionHeader: "جلسة استشارة مريض جديدة",
    consultationSessionSubtitle: "أدخل البيانات السريرية لإنشاء التقارير التشخيصية للمرضى.",
    minimizeSession: "تصغير الجلسة",
    recordConversationHeader: "تسجيل الإملاء الصوتي السريري",
    microphoneAriaStop: "إيقاف تسجيل الصوت",
    microphoneAriaStopConnecting: "إلغاء محاولة الاتصال",
    microphoneAriaStart: "بدء تسجيل الصوت",
    stateLiveCapturing: "🔴 الإملاء الصوتي المباشر نشط...",
    stateStopping: "🛑 جاري إتمام الإملاء...",
    stateConnecting: "⏳ جاري الاتصال بالصوت المباشر...",
    stateContinuousSpeech: "الإملاء الصوتي السريري",
    tipLiveListening: "تحدث بوضوح. انقر على الزر الأحمر عند الانتهاء لحفظ الملاحظات السريرية مباشرة في السجل.",
    tipStopping: "جاري إكمال التقاط الصوت وحفظ نص الاستشارة السريرية...",
    tipConnecting: "جاري تهيئة الميكروفون الآمن ومسار الصوت المباشر...",
    tipInitial: "انقر على زر الميكروفون أعلاه لبدء الإملاء الصوتي للملاحظات السريرية.",
    liveApiEngine: "محرك الصوت المباشر (API)",
    typePrescriptionLabel: "ملاحظات ونص الاستشارة السريرية",
    typePrescriptionPlaceholder: "نص استشارة الطبيب، نتائج الفحص السريري، المؤشرات الحيوية، والتشخيص وقائمة الأدوية ستظهر هنا أو يمكن كتابتها يدوياً...",
    translateToArabicButton: "معالجة",
    translatingStatus: "جاري المعالجة...",
    arabicTranslationLabel: "الملخص السريري",
    arabicTranslationPlaceholder: "سيظهر الملخص السريري هنا...",
    submittingNote: "ملاحظة: انقر أدناه لإنشاء وصفة طبية رقمية معتمدة بالذكاء الاصطناعي.",
    submitRecordButton: "إنشاء الوصفة الطبية الرقمية",

    deptSummaryHeader: "ملخص القسم المصرح به (الباطنة العامة)",
    todaysVisitsLabel: "زيارات اليوم",
    todaysVisitsValue: "١٢ مريضاً",
    consultationsFiledLabel: "الاستشارات المسجلة",
    consultationsFiledValue: "٨ مكتملة",
    avgSessionTimeLabel: "متوسط وقت الجلسة",
    avgSessionTimeValue: "٨.٥ دقيقة",
    pendingLabApprovalsLabel: "موافقات المختبر المعلقة",
    pendingLabApprovalsValue: "٣ طلبات",

    emrTitleText: "السجلات الطبية الإلكترونية",
    emrSubtitleText: "استكشف السجلات الكاملة لتشخيصات المرضى، وبروتوكولات الأدوية، ومؤشرات المتابعة الطبية.",
    searchPlaceholder: "ابحث باسم المريض، الرقم التعريفي، أو التشخيص...",
    showingRecordsText: (count: number, total: number) => `عرض ${count} من أصل ${total} من السجلات الطبية الإلكترونية`,
    noMedicalRecordsFound: "لم يتم العثور على سجلات طبية",
    noMedicalRecordsSearchTip: "جرّب البحث باسم مريض آخر أو رقمه التعريفي.",

    colSNo: "م",
    colPatientId: "رقم المريض",
    colPatientName: "اسم المريض",
    colAge: "العمر",
    colGender: "الجنس",
    genderMale: "ذكر",
    genderFemale: "أنثى",
    colVisitDate: "تاريخ الزيارة",
    colDiagnosis: "التشخيص",
    colPrescription: "الوصفة الطبية",
    colFollowUpDate: "تاريخ المتابعة"
  }
};
