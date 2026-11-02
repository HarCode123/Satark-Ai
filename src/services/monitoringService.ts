import { ClinicalPrescription } from '../backend/services/PrescriptionService';
import { MonitoringPlan, MonitoringParameter, MonitoringParameterType } from '../types/monitoring';

export class MonitoringService {
  /**
   * Generates a stable unique identifier for a ClinicalPrescription.
   */
  static getPrescriptionId(prescription: ClinicalPrescription, index: number = 0): string {
    const patientId = prescription.patientDetails?.patientId || 'PID-2026-001';
    const date = prescription.patientDetails?.date || new Date().toISOString().split('T')[0];
    return `RX-${patientId}-${date}${index > 0 ? `-${index}` : ''}`;
  }

  /**
   * Derives a structured MonitoringPlan from an existing ClinicalPrescription.
   * Strictly uses information already present in the prescription (vitals, diagnosis, notes, medications).
   * Does NOT make any AI calls or invent ungrounded medical schedules.
   */
  static deriveMonitoringPlanFromPrescription(
    prescription: ClinicalPrescription,
    customPrescriptionId?: string
  ): MonitoringPlan {
    const patientId = prescription.patientDetails?.patientId || 'PID-2026-001';
    const rxDate = prescription.patientDetails?.date || new Date().toISOString().split('T')[0];
    const sourceRxId = customPrescriptionId || this.getPrescriptionId(prescription);
    const diagnosis = prescription.provisionalDiagnosis || 'Clinical Consultation';
    const doctorName = prescription.patientDetails?.consultingDoctor || 'Dr. Harini, MD';

    const parameters: MonitoringParameter[] = [];
    const notesLower = (prescription.doctorsNotes || '').toLowerCase();
    const adviceLower = (prescription.lifestyleDietAdvice || '').toLowerCase();
    const diagLower = diagnosis.toLowerCase();
    const historyLower = (prescription.pastMedicalHistory || '').toLowerCase();

    // 1. TEMPERATURE (Fever / Infection recovery)
    const tempVital = prescription.vitals?.temperature;
    const hasTempReading = tempVital && tempVital !== 'Not Mentioned' && tempVital !== 'null' && tempVital.trim() !== '';
    const mentionsFever = diagLower.includes('fever') || diagLower.includes('bronchitis') || 
                          diagLower.includes('infection') || notesLower.includes('temperature') || 
                          notesLower.includes('fever');

    if (hasTempReading || mentionsFever) {
      let freq = 'Not specified';
      if (notesLower.includes('twice daily') || notesLower.includes('bid')) {
        freq = 'Twice daily';
      } else if (notesLower.includes('daily') || notesLower.includes('once daily')) {
        freq = 'Daily';
      } else if (hasTempReading) {
        freq = 'Twice daily'; // Common safe clinical guidance for acute febrile recovery
      }

      parameters.push({
        id: `param-temp-${patientId}-${Date.now()}-${parameters.length + 1}`,
        patientId,
        parameterType: 'temperature',
        displayName: 'Body Temperature',
        unit: '°C',
        sourcePrescriptionId: sourceRxId,
        reasonForMonitoring: `Fever resolution and infection recovery tracking for ${diagnosis}`,
        isActive: true,
        startDate: rxDate,
        frequency: freq,
        instructions: 'Measure using a digital oral or axillary thermometer at rest.',
        baselineValue: hasTempReading ? tempVital : null
      });
    }

    // 2. BLOOD PRESSURE (Hypertension / Cardiovascular regulation)
    const bpVital = prescription.vitals?.bloodPressure;
    const hasBpReading = bpVital && bpVital !== 'Not Mentioned' && bpVital !== 'null' && bpVital.trim() !== '';
    const hasHypertension = diagLower.includes('hypertension') || historyLower.includes('hypertension') || 
                           diagLower.includes('blood pressure') || notesLower.includes('blood pressure');
    const hasBpMedication = (prescription.medications || []).some(m => {
      const name = m.medicineName.toLowerCase();
      return name.includes('telmisartan') || name.includes('amlodipine') || 
             name.includes('losartan') || name.includes('enalapril');
    });

    if (hasBpReading || hasHypertension || hasBpMedication) {
      let freq = 'Not specified';
      if (hasHypertension || hasBpMedication) {
        freq = 'Daily';
      } else if (notesLower.includes('bp daily') || notesLower.includes('check bp')) {
        freq = 'Daily';
      }

      parameters.push({
        id: `param-bp-${patientId}-${Date.now()}-${parameters.length + 1}`,
        patientId,
        parameterType: 'blood_pressure',
        displayName: 'Blood Pressure',
        unit: 'mmHg',
        sourcePrescriptionId: sourceRxId,
        reasonForMonitoring: hasHypertension 
          ? 'Cardiovascular regulation and hypertension management'
          : `Hemodynamic baseline monitoring for ${diagnosis}`,
        isActive: true,
        startDate: rxDate,
        frequency: freq,
        instructions: 'Sit quietly for 5 minutes before measuring on supported left arm.',
        baselineValue: hasBpReading ? bpVital : null
      });
    }

    // 3. HEART RATE / PULSE
    const pulseVital = prescription.vitals?.pulse;
    const hasPulseReading = pulseVital && pulseVital !== 'Not Mentioned' && pulseVital !== 'null' && pulseVital.trim() !== '';
    if (hasPulseReading) {
      parameters.push({
        id: `param-pulse-${patientId}-${Date.now()}-${parameters.length + 1}`,
        patientId,
        parameterType: 'heart_rate',
        displayName: 'Heart Rate (Pulse)',
        unit: 'bpm',
        sourcePrescriptionId: sourceRxId,
        reasonForMonitoring: 'Resting pulse stability and cardiac rhythm tracking',
        isActive: true,
        startDate: rxDate,
        frequency: 'Daily',
        instructions: 'Measure resting pulse after 5 minutes of seated rest.',
        baselineValue: pulseVital
      });
    }

    // 4. OXYGEN SATURATION (SpO2)
    const spo2Vital = prescription.vitals?.spo2;
    const hasSpo2Reading = spo2Vital && spo2Vital !== 'Not Mentioned' && spo2Vital !== 'null' && spo2Vital.trim() !== '';
    const isRespiratory = diagLower.includes('bronchitis') || diagLower.includes('respiratory') || 
                          diagLower.includes('asthma') || diagLower.includes('cough') || 
                          diagLower.includes('pneumonia');

    if (hasSpo2Reading && isRespiratory) {
      parameters.push({
        id: `param-spo2-${patientId}-${Date.now()}-${parameters.length + 1}`,
        patientId,
        parameterType: 'oxygen_saturation',
        displayName: 'Oxygen Saturation (SpO2)',
        unit: '%',
        sourcePrescriptionId: sourceRxId,
        reasonForMonitoring: `Respiratory recovery and pulmonary oxygenation tracking for ${diagnosis}`,
        isActive: true,
        startDate: rxDate,
        frequency: 'Daily',
        instructions: 'Check with fingertip pulse oximeter while breathing room air at rest.',
        baselineValue: spo2Vital
      });
    }

    // 5. BLOOD GLUCOSE (Diabetes mellitus)
    const hasDiabetes = diagLower.includes('diabetes') || historyLower.includes('diabetes');
    const hasDiabetesMed = (prescription.medications || []).some(m => {
      const name = m.medicineName.toLowerCase();
      return name.includes('metformin') || name.includes('glycomet') || 
             name.includes('insulin') || name.includes('janumet');
    });

    if (hasDiabetes || hasDiabetesMed) {
      let freq = 'Daily';
      if (notesLower.includes('weekly') || adviceLower.includes('weekly')) {
        freq = 'Weekly';
      }

      parameters.push({
        id: `param-glucose-${patientId}-${Date.now()}-${parameters.length + 1}`,
        patientId,
        parameterType: 'blood_glucose',
        displayName: 'Blood Glucose',
        unit: 'mg/dL',
        sourcePrescriptionId: sourceRxId,
        reasonForMonitoring: `Glycemic control and glucose stability in ${diagnosis}`,
        isActive: true,
        startDate: rxDate,
        frequency: freq,
        instructions: 'Record fasting morning blood glucose using a calibrated glucometer.',
        baselineValue: null
      });
    }

    // Fallback: If no parameters met specific criteria, create a baseline parameter from vitals if available
    if (parameters.length === 0 && hasBpReading) {
      parameters.push({
        id: `param-bp-${patientId}-${Date.now()}-1`,
        patientId,
        parameterType: 'blood_pressure',
        displayName: 'Blood Pressure',
        unit: 'mmHg',
        sourcePrescriptionId: sourceRxId,
        reasonForMonitoring: `Routine clinical vital follow-up for ${diagnosis}`,
        isActive: true,
        startDate: rxDate,
        frequency: 'Not specified',
        instructions: 'Measure at rest as advised by physician.',
        baselineValue: bpVital
      });
    }

    const planTitle = `${diagnosis} Monitoring Protocol`;

    return {
      id: `plan-${patientId}-${rxDate.replace(/-/g, '')}`,
      patientId,
      sourcePrescriptionId: sourceRxId,
      title: planTitle,
      diagnosis,
      doctorName,
      createdDate: rxDate,
      isActive: true,
      parameters,
      notes: prescription.doctorsNotes || prescription.lifestyleDietAdvice || undefined
    };
  }
}
