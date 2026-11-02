import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  HeartPulse, 
  Activity, 
  Thermometer, 
  Droplet, 
  Wind, 
  Scale, 
  FileText, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Stethoscope, 
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { RoutePath } from '../../types';
import { PatientDataStore } from '../../services/patientStore';
import { MonitoringAlertService } from '../../services/monitoringAlertService';
import { 
  MonitoringPlan, 
  MonitoringParameter, 
  MonitoringParameterType, 
  HealthLogEntry, 
  HealthLogReading 
} from '../../types/monitoring';

interface PatientDailyLogViewProps {
  onNavigate?: (route: RoutePath) => void;
}

const COMMON_SYMPTOM_OPTIONS = [
  'Headache',
  'Fatigue / Tiredness',
  'Cough',
  'Chest Tightness',
  'Shortness of Breath',
  'Fever / Chills',
  'Dizziness',
  'Body Ache',
  'Nausea',
  'Throat Irritation'
];

export const PatientDailyLogView: React.FC<PatientDailyLogViewProps> = ({ onNavigate }) => {
  const { language, isRtl } = useLanguage();

  const [activePlan, setActivePlan] = useState<MonitoringPlan | null>(() => PatientDataStore.getActiveMonitoringPlan());
  const [logs, setLogs] = useState<HealthLogEntry[]>(() => PatientDataStore.getHealthLogs());

  // Form State
  const [readingValues, setReadingValues] = useState<Record<string, {
    value?: string;
    systolic?: string;
    diastolic?: string;
    numeric?: string;
  }>>({});

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [notes, setNotes] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logTime, setLogTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  // Editing state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Status feedback
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const refreshData = () => {
    const plan = PatientDataStore.getActiveMonitoringPlan();
    setActivePlan(plan);
    setLogs(PatientDataStore.getHealthLogs());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('patient-data-updated', refreshData);
    return () => window.removeEventListener('patient-data-updated', refreshData);
  }, []);

  const activeParameters = (activePlan?.parameters || []).filter(p => p.isActive);

  // Handle input changes for standard numeric vs blood pressure
  const handleNumericChange = (paramId: string, val: string) => {
    setReadingValues(prev => ({
      ...prev,
      [paramId]: {
        ...prev[paramId],
        numeric: val
      }
    }));
    if (validationErrors[paramId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[paramId];
        return next;
      });
    }
  };

  const handleBpChange = (paramId: string, part: 'systolic' | 'diastolic', val: string) => {
    setReadingValues(prev => ({
      ...prev,
      [paramId]: {
        ...prev[paramId],
        [part]: val
      }
    }));
    if (validationErrors[paramId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[paramId];
        return next;
      });
    }
  };

  // Symptoms management
  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const addCustomSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSymptomInput.trim();
    if (trimmed && !selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms(prev => [...prev, trimmed]);
      setCustomSymptomInput('');
    }
  };

  const removeSymptom = (sym: string) => {
    setSelectedSymptoms(prev => prev.filter(s => s !== sym));
  };

  // Reset form
  const resetForm = () => {
    setReadingValues({});
    setSelectedSymptoms([]);
    setCustomSymptomInput('');
    setNotes('');
    setEditingLogId(null);
    setValidationErrors({});
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
  };

  // Populate form for editing existing log
  const handleStartEdit = (log: HealthLogEntry) => {
    setEditingLogId(log.id);
    setLogDate(log.date);
    setLogTime(log.time);
    setSelectedSymptoms(log.symptoms || []);
    setNotes(log.notes || '');

    const values: Record<string, { systolic?: string; diastolic?: string; numeric?: string }> = {};
    log.readings.forEach(r => {
      if (r.parameterType === 'blood_pressure') {
        values[r.parameterId] = {
          systolic: r.systolic !== null && r.systolic !== undefined ? String(r.systolic) : '',
          diastolic: r.diastolic !== null && r.diastolic !== undefined ? String(r.diastolic) : ''
        };
      } else {
        values[r.parameterId] = {
          numeric: r.numericValue !== null && r.numericValue !== undefined ? String(r.numericValue) : r.value
        };
      }
    });
    setReadingValues(values);
    setValidationErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Form submission & validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (activeParameters.length === 0) {
      setValidationErrors({ general: 'No active monitoring parameters are established in your plan.' });
      return;
    }

    const errors: Record<string, string> = {};
    const readings: HealthLogReading[] = [];

    // Structural validation across active parameters
    for (const param of activeParameters) {
      const valState = readingValues[param.id] || {};

      if (param.parameterType === 'blood_pressure') {
        const sysStr = (valState.systolic || '').trim();
        const diaStr = (valState.diastolic || '').trim();

        if (!sysStr || !diaStr) {
          errors[param.id] = 'Both Systolic and Diastolic numbers are required.';
          continue;
        }

        const sysNum = parseFloat(sysStr);
        const diaNum = parseFloat(diaStr);

        if (isNaN(sysNum) || isNaN(diaNum) || sysNum <= 0 || diaNum <= 0) {
          errors[param.id] = 'Please enter valid positive numbers for Blood Pressure.';
          continue;
        }

        readings.push({
          parameterId: param.id,
          parameterType: param.parameterType,
          displayName: param.displayName,
          unit: param.unit,
          value: `${Math.round(sysNum)} / ${Math.round(diaNum)}`,
          systolic: Math.round(sysNum),
          diastolic: Math.round(diaNum)
        });
      } else {
        const numStr = (valState.numeric || '').trim();

        if (!numStr) {
          errors[param.id] = `${param.displayName} reading is required.`;
          continue;
        }

        const numVal = parseFloat(numStr);
        if (isNaN(numVal) || numVal <= 0) {
          errors[param.id] = `Please enter a valid numeric value for ${param.displayName}.`;
          continue;
        }

        readings.push({
          parameterId: param.id,
          parameterType: param.parameterType,
          displayName: param.displayName,
          unit: param.unit,
          value: param.parameterType === 'temperature' ? numVal.toFixed(1) : String(numVal),
          numericValue: numVal
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const patientId = activePlan?.patientId || 'PID-2026-001';
    const timestamp = new Date(`${logDate} ${logTime}`).getTime() || Date.now();

    if (editingLogId) {
      const updatedLog: HealthLogEntry = {
        id: editingLogId,
        patientId,
        monitoringPlanId: activePlan?.id,
        date: logDate,
        time: logTime,
        timestamp,
        readings,
        symptoms: selectedSymptoms,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      PatientDataStore.updateHealthLog(updatedLog);
      setSuccessMessage('Health log record updated successfully.');

      // Check threshold alert for each reading if an explicit threshold is configured
      if (activePlan?.parameters) {
        for (const reading of readings) {
          const param = activePlan.parameters.find(p => p.id === reading.parameterId || p.parameterType === reading.parameterType);
          MonitoringAlertService.checkReadingThresholdAlert(reading, updatedLog, param);
        }
      }
    } else {
      const newLog: HealthLogEntry = {
        id: `log-${Date.now()}`,
        patientId,
        monitoringPlanId: activePlan?.id,
        date: logDate,
        time: logTime,
        timestamp,
        readings,
        symptoms: selectedSymptoms,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      PatientDataStore.addHealthLog(newLog);
      setSuccessMessage('Health readings successfully recorded into your journal.');

      // Check threshold alert for each reading if an explicit threshold is configured
      if (activePlan?.parameters) {
        for (const reading of readings) {
          const param = activePlan.parameters.find(p => p.id === reading.parameterId || p.parameterType === reading.parameterType);
          MonitoringAlertService.checkReadingThresholdAlert(reading, newLog, param);
        }
      }
    }

    resetForm();
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleDeleteLog = (id: string) => {
    PatientDataStore.deleteHealthLog(id);
    setDeleteConfirmId(null);
    setSuccessMessage('Health log entry deleted.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getParameterIcon = (type: MonitoringParameterType) => {
    switch (type) {
      case 'blood_pressure':
        return <HeartPulse className="h-5 w-5 text-rose-500" />;
      case 'heart_rate':
        return <Activity className="h-5 w-5 text-indigo-500" />;
      case 'temperature':
        return <Thermometer className="h-5 w-5 text-amber-500" />;
      case 'oxygen_saturation':
        return <Wind className="h-5 w-5 text-sky-500" />;
      case 'blood_glucose':
        return <Droplet className="h-5 w-5 text-purple-500" />;
      case 'weight':
        return <Scale className="h-5 w-5 text-emerald-500" />;
      default:
        return <ClipboardList className="h-5 w-5 text-[#0F4C81]" />;
    }
  };

  return (
    <div id="patient-daily-log-view" className="space-y-8 max-w-7xl mx-auto w-full animate-fade-in text-left rtl:text-right">
      
      {/* 1. Header Banner */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[#0F4C81] font-bold uppercase tracking-wider mb-1 font-mono">
            <ClipboardList className="h-4 w-4" />
            <span>{language === 'ar' ? 'سجل المتابعة اليومي' : 'Daily Health Journal'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">
            {language === 'ar' ? 'سجل الصحة اليومي' : 'Daily Health Log'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] max-w-2xl leading-relaxed">
            {language === 'ar' 
              ? 'سجل قياساتك الحيوية اليومية وأعراضك. يتم عرض المؤشرات النشطة فقط والمحددة في خطة المتابعة الطبية.' 
              : 'Record your daily health readings and symptom observations. Only parameters actively assigned in your clinical monitoring plan are requested.'}
          </p>
        </div>

        {/* Actions & Plan Status Card */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/patient-health-monitoring')}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0F4C81] border border-blue-200 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="h-4 w-4" />
              <span>{language === 'ar' ? 'عرض الرسوم والمؤشرات' : 'View Trends & Charts'}</span>
            </button>
          )}

          <div className="bg-[#F8FAFC] border border-brand-border p-4 rounded-xl flex items-center gap-3 shrink-0">
            <div className="p-2.5 bg-blue-50 text-[#0F4C81] rounded-xl">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-[#1F2937]">
                {activePlan ? `${activeParameters.length} Active Targets` : 'No Plan Active'}
              </p>
              <p className="text-[#6B7280] font-mono">
                {activePlan ? (activePlan.diagnosis || activePlan.title) : 'Awaiting Protocol'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-xs animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 2. MAIN LOGGING FORM (If Active Plan Exists) */}
      {activePlan && activeParameters.length > 0 ? (
        <form onSubmit={handleSubmit} className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-[#0F4C81] rounded-lg">
                  <Activity className="h-4 w-4" />
                </span>
                <h2 className="font-bold text-lg text-slate-900">
                  {editingLogId ? 'Edit Health Log Entry' : 'Record New Health Log'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enter your physical measurements for your active parameters as prescribed.
              </p>
            </div>

            {/* Date & Time Selectors */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-hidden text-xs cursor-pointer"
                  required
                />
              </div>
              <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={logTime}
                  onChange={(e) => setLogTime(e.target.value)}
                  placeholder="e.g. 09:00 AM"
                  className="bg-transparent text-slate-700 font-semibold focus:outline-hidden text-xs w-20 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* ACTIVE PARAMETERS INPUT GRID */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Active Monitoring Parameters ({activeParameters.length})
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeParameters.map((param) => {
                const paramVal = readingValues[param.id] || {};
                const hasError = !!validationErrors[param.id];

                return (
                  <div 
                    key={param.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      hasError 
                        ? 'border-red-300 bg-red-50/30' 
                        : 'border-slate-200 bg-[#F8FAFC]/60 hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          {getParameterIcon(param.parameterType)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{param.displayName}</h3>
                          <span className="text-[11px] text-slate-500 font-medium">Frequency: {param.frequency}</span>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#0F4C81] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                        Unit: {param.unit}
                      </span>
                    </div>

                    {/* Parameter Input Controls */}
                    {param.parameterType === 'blood_pressure' ? (
                      /* Blood Pressure Dual Input: Systolic & Diastolic */
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Systolic (mmHg)
                            </span>
                            <input
                              type="number"
                              min="40"
                              max="300"
                              value={paramVal.systolic || ''}
                              onChange={(e) => handleBpChange(param.id, 'systolic', e.target.value)}
                              placeholder="e.g. 120"
                              className={`w-full px-3 py-2 bg-white rounded-xl border text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81] transition-all font-mono ${
                                hasError ? 'border-red-400' : 'border-slate-300'
                              }`}
                              required
                            />
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Diastolic (mmHg)
                            </span>
                            <input
                              type="number"
                              min="30"
                              max="200"
                              value={paramVal.diastolic || ''}
                              onChange={(e) => handleBpChange(param.id, 'diastolic', e.target.value)}
                              placeholder="e.g. 80"
                              className={`w-full px-3 py-2 bg-white rounded-xl border text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81] transition-all font-mono ${
                                hasError ? 'border-red-400' : 'border-slate-300'
                              }`}
                              required
                            />
                          </div>
                        </div>

                        {param.instructions && (
                          <p className="text-[11px] text-slate-400 italic">{param.instructions}</p>
                        )}
                      </div>
                    ) : (
                      /* Single Numeric Input (Heart Rate, Temperature, Glucose, SpO2, Weight, etc.) */
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="number"
                            step={param.parameterType === 'temperature' || param.parameterType === 'weight' ? '0.1' : '1'}
                            value={paramVal.numeric || ''}
                            onChange={(e) => handleNumericChange(param.id, e.target.value)}
                            placeholder={
                              param.parameterType === 'heart_rate' ? 'e.g. 76' :
                              param.parameterType === 'temperature' ? 'e.g. 37.2' :
                              param.parameterType === 'oxygen_saturation' ? 'e.g. 98' :
                              param.parameterType === 'blood_glucose' ? 'e.g. 110' :
                              param.parameterType === 'weight' ? 'e.g. 62.5' : 'Enter value'
                            }
                            className={`w-full px-3 py-2 bg-white rounded-xl border text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81] transition-all font-mono pr-14 ${
                              hasError ? 'border-red-400' : 'border-slate-300'
                            }`}
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                            {param.unit}
                          </span>
                        </div>

                        {param.instructions && (
                          <p className="text-[11px] text-slate-400 italic">{param.instructions}</p>
                        )}
                      </div>
                    )}

                    {/* Error message */}
                    {hasError && (
                      <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{validationErrors[param.id]}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. SYMPTOMS SELECTOR & CUSTOM INPUT */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#0F4C81]" />
                <span>Patient-Reported Symptoms (Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400">Select any symptoms experienced today</span>
            </div>

            {/* Quick symptom pills */}
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOM_OPTIONS.map((sym) => {
                const isSelected = selectedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymptom(sym)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                      isSelected 
                        ? 'bg-[#0F4C81] text-white border-[#0F4C81] shadow-2xs' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {sym}
                  </button>
                );
              })}
            </div>

            {/* Custom symptom input */}
            <div className="flex items-center gap-2 max-w-md pt-1">
              <input
                type="text"
                value={customSymptomInput}
                onChange={(e) => setCustomSymptomInput(e.target.value)}
                placeholder="Add other symptom (e.g. Mild headache)"
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0F4C81]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSymptom(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomSymptom}
                disabled={!customSymptomInput.trim()}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Selected Symptoms tags */}
            {selectedSymptoms.length > 0 && (
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#0F4C81] mr-1">Reported:</span>
                {selectedSymptoms.map((sym) => (
                  <span
                    key={sym}
                    className="inline-flex items-center gap-1 bg-white text-[#0F4C81] border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                  >
                    <span>{sym}</span>
                    <button
                      type="button"
                      onClick={() => removeSymptom(sym)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. NOTES / OBSERVATIONS */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Patient Journal Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Felt fine in morning, took medications on schedule after breakfast. Light walk in the afternoon..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81] transition-all resize-y"
            />
          </div>

          {/* 5. FORM ACTION BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Entries are safely timestamped and stored in your medical history record.</span>
            </div>

            <div className="flex items-center gap-2">
              {editingLogId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{editingLogId ? 'Update Health Log' : 'Save Health Readings'}</span>
              </button>
            </div>
          </div>

        </form>
      ) : (
        /* EMPTY STATE: NO ACTIVE MONITORING PLAN */
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-8 sm:p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-amber-700" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-amber-950">
              No Active Health Monitoring Plan Found
            </h2>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              Your Daily Health Log form activates automatically once your consulting doctor establishes an active monitoring plan linked to your prescription.
            </p>
          </div>
          {onNavigate && (
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/patient-prescriptions')}
                className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Check Prescriptions</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. HEALTH LOG HISTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-base text-[#1F2937] flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#0F4C81]" />
              <span>Health Log History</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your chronological daily self-recorded measurements and symptom journals.
            </p>
          </div>
          <span className="text-xs font-bold text-[#0F4C81] bg-blue-50 px-2.5 py-1 rounded-full font-mono">
            {logs.length} Entries
          </span>
        </div>

        {logs.length > 0 ? (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-blue-200"
              >
                {/* Header: Date, Time, Log ID, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-[#0F4C81]" />
                      <span>{log.date}</span>
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="font-medium text-xs text-slate-600 flex items-center gap-1 font-mono">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{log.time}</span>
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      ID: {log.id.slice(-8)}
                    </span>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(log)}
                      className="px-2.5 py-1 text-xs text-[#0F4C81] hover:bg-blue-50 border border-blue-100 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer"
                      title="Edit this entry"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    {deleteConfirmId === log.id ? (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1 rounded-lg">
                        <span className="text-[10px] font-bold text-red-700 px-1">Confirm?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id)}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(log.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Delete this entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Readings Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {log.readings.map((reading, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200/80 space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                        {getParameterIcon(reading.parameterType)}
                        <span className="truncate">{reading.displayName}</span>
                      </div>
                      <div className="flex items-baseline gap-1 pt-0.5">
                        <span className="text-base font-extrabold text-[#0F4C81] font-mono">
                          {reading.value}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {reading.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Symptoms tags */}
                {log.symptoms && log.symptoms.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                    <span className="text-[11px] font-bold text-slate-500">Symptoms:</span>
                    {log.symptoms.map((sym, sIdx) => (
                      <span 
                        key={sIdx} 
                        className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-medium"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {log.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 italic">
                    <span className="font-semibold not-italic text-slate-500 text-[11px] block mb-0.5">Notes:</span>
                    {log.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-brand-border rounded-2xl p-8 text-center space-y-2 text-slate-400">
            <ClipboardList className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No health logs recorded yet.</p>
            <p className="text-[11px] text-slate-400">
              Use the form above to record your first set of health readings.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
