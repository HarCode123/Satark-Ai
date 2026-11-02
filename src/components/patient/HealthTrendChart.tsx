import React, { useState } from 'react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Plus, 
  ChevronDown, 
  Info,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { MonitoringParameter, MonitoringParameterType, HealthLogReading } from '../../types/monitoring';

export interface ChartDataPoint {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  value: string;
  systolic?: number | null;
  diastolic?: number | null;
  numericValue?: number | null;
}

interface HealthTrendChartProps {
  parameters: MonitoringParameter[];
  readingsByParam: Record<string, ChartDataPoint[]>;
  selectedParamId: string;
  onSelectParam: (paramId: string) => void;
  timeRange: '7' | '30' | '90';
  onChangeTimeRange: (range: '7' | '30' | '90') => void;
  onRecordReading?: () => void;
  language: string;
  isRtl: boolean;
}

export const HealthTrendChart: React.FC<HealthTrendChartProps> = ({
  parameters,
  readingsByParam,
  selectedParamId,
  onSelectParam,
  timeRange,
  onChangeTimeRange,
  onRecordReading,
  language,
  isRtl
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const activeParam = parameters.find(p => p.id === selectedParamId) || parameters[0];
  const allReadings = (activeParam ? readingsByParam[activeParam.id] || readingsByParam[activeParam.parameterType] : []) || [];

  // Filter readings strictly by the selected time range window relative to now
  const now = Date.now();
  const rangeDays = parseInt(timeRange, 10);
  const cutoffTime = now - rangeDays * 24 * 60 * 60 * 1000;

  // Filter and sort chronologically (oldest to newest for X-axis left-to-right plotting)
  const filteredReadings = allReadings
    .filter(r => {
      const readingTime = r.timestamp || new Date(`${r.date}T${r.time || '12:00'}`).getTime() || 0;
      return readingTime >= cutoffTime;
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const isBP = activeParam?.parameterType === 'blood_pressure';

  // Construct basic non-medical trend summary
  const readingCount = filteredReadings.length;
  let summaryText = '';
  let timingText = '';
  let rangeText = '';

  if (readingCount > 0) {
    // 1. Reading count
    if (language === 'ar') {
      summaryText = `${readingCount} ${readingCount === 1 ? 'قراءة مسجلة' : 'قراءات مسجلة'} خلال فترة ${timeRange} يوم.`;
    } else {
      summaryText = `${readingCount} reading${readingCount === 1 ? '' : 's'} recorded in the selected ${timeRange}-day period.`;
    }

    // 2. Latest reading timing
    const latest = filteredReadings[filteredReadings.length - 1];
    const todayStr = new Date().toISOString().split('T')[0];
    const latestDate = new Date(latest.date);
    const todayDate = new Date(todayStr);
    const diffDays = Math.round((todayDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (latest.date === todayStr || diffDays === 0) {
      timingText = language === 'ar' 
        ? `آخر قراءة تم تسجيلها اليوم (${latest.time}).` 
        : `Latest reading recorded today at ${latest.time}.`;
    } else if (diffDays === 1) {
      timingText = language === 'ar' 
        ? `آخر قراءة تم تسجيلها بالأمس (${latest.time}).` 
        : `Latest reading recorded yesterday at ${latest.time}.`;
    } else if (diffDays > 1) {
      timingText = language === 'ar' 
        ? `آخر قراءة سُجلت منذ ${diffDays} أيام (${latest.date}).` 
        : `Latest reading recorded ${diffDays} days ago (${latest.date}).`;
    }

    // 3. Previous reading timing (if >= 2)
    if (readingCount >= 2) {
      const prev = filteredReadings[readingCount - 2];
      const prevDate = new Date(prev.date);
      const prevDiff = Math.max(1, Math.round((latestDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)));
      const prevText = language === 'ar'
        ? ` القراءة السابقة سُجلت قبل ${prevDiff} يوم (${prev.date}).`
        : ` Previous reading recorded ${prevDiff} day${prevDiff === 1 ? '' : 's'} prior (${prev.date}).`;
      timingText += prevText;
    }

    // 4. Value span (purely factual numerical bounds)
    if (isBP) {
      const systolicVals = filteredReadings.map(r => r.systolic ?? (r.value.includes('/') ? parseFloat(r.value.split('/')[0]) : null)).filter((v): v is number => v !== null && !isNaN(v));
      const diastolicVals = filteredReadings.map(r => r.diastolic ?? (r.value.includes('/') ? parseFloat(r.value.split('/')[1]) : null)).filter((v): v is number => v !== null && !isNaN(v));
      if (systolicVals.length && diastolicVals.length) {
        const minSys = Math.min(...systolicVals);
        const maxSys = Math.max(...systolicVals);
        const minDia = Math.min(...diastolicVals);
        const maxDia = Math.max(...diastolicVals);
        rangeText = language === 'ar'
          ? `نطاق القيم المسجلة: الانقباضي ${minSys}–${maxSys} mmHg، الانبساطي ${minDia}–${maxDia} mmHg.`
          : `Recorded range: Systolic ${minSys}–${maxSys} mmHg | Diastolic ${minDia}–${maxDia} mmHg.`;
      }
    } else {
      const numericVals = filteredReadings.map(r => r.numericValue ?? parseFloat(r.value)).filter((v): v is number => !isNaN(v));
      if (numericVals.length) {
        const minVal = Math.min(...numericVals);
        const maxVal = Math.max(...numericVals);
        rangeText = language === 'ar'
          ? `نطاق القيم المسجلة: ${minVal}–${maxVal} ${activeParam.unit}.`
          : `Recorded range: ${minVal}–${maxVal} ${activeParam.unit}.`;
      }
    }
  }

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 280;
  const padLeft = 60;
  const padRight = 35;
  const padTop = 35;
  const padBottom = 45;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Compute Scales
  let minY = 0;
  let maxY = 100;

  if (readingCount > 0) {
    if (isBP) {
      const sysArr = filteredReadings.map(r => r.systolic ?? (r.value.includes('/') ? parseFloat(r.value.split('/')[0]) : 120)).filter((v): v is number => !isNaN(v));
      const diaArr = filteredReadings.map(r => r.diastolic ?? (r.value.includes('/') ? parseFloat(r.value.split('/')[1]) : 80)).filter((v): v is number => !isNaN(v));
      const allVals = [...sysArr, ...diaArr];
      const minRaw = Math.min(...allVals);
      const maxRaw = Math.max(...allVals);
      minY = Math.max(0, Math.floor(minRaw - 10));
      maxY = Math.ceil(maxRaw + 10);
    } else {
      const numArr = filteredReadings.map(r => r.numericValue ?? parseFloat(r.value)).filter((v): v is number => !isNaN(v));
      if (numArr.length > 0) {
        const minRaw = Math.min(...numArr);
        const maxRaw = Math.max(...numArr);
        if (minRaw === maxRaw) {
          minY = Math.max(0, minRaw - 5);
          maxY = maxRaw + 5;
        } else {
          const buffer = (maxRaw - minRaw) * 0.15;
          minY = Math.max(0, parseFloat((minRaw - buffer).toFixed(1)));
          maxY = parseFloat((maxRaw + buffer).toFixed(1));
        }
      }
    }
  }

  const getYCoord = (val: number) => {
    if (maxY === minY) return padTop + chartH / 2;
    const ratio = (val - minY) / (maxY - minY);
    return padTop + chartH - ratio * chartH;
  };

  const getXCoord = (index: number) => {
    if (readingCount === 1) return padLeft + chartW / 2;
    return padLeft + (index / (readingCount - 1)) * chartW;
  };

  // Build SVG Paths
  let linePathSystolic = '';
  let linePathDiastolic = '';
  let linePathSingle = '';
  let areaPathSingle = '';

  if (readingCount > 1) {
    if (isBP) {
      const sysCoords = filteredReadings.map((r, i) => {
        const val = r.systolic ?? (r.value.includes('/') ? parseFloat(r.value.split('/')[0]) : 120);
        return { x: getXCoord(i), y: getYCoord(val) };
      });
      linePathSystolic = sysCoords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

      const diaCoords = filteredReadings.map((r, i) => {
        const val = r.diastolic ?? (r.value.includes('/') ? parseFloat(r.value.split('/')[1]) : 80);
        return { x: getXCoord(i), y: getYCoord(val) };
      });
      linePathDiastolic = diaCoords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    } else {
      const coords = filteredReadings.map((r, i) => {
        const val = r.numericValue ?? parseFloat(r.value);
        return { x: getXCoord(i), y: getYCoord(val) };
      });
      linePathSingle = coords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
      const firstX = coords[0].x;
      const lastX = coords[coords.length - 1].x;
      const bottomY = padTop + chartH;
      areaPathSingle = `${linePathSingle} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }
  }

  // Y-axis grid ticks (4 intervals)
  const yTicks = [0, 1, 2, 3, 4].map(step => {
    const val = minY + (step / 4) * (maxY - minY);
    return {
      value: isBP ? Math.round(val) : parseFloat(val.toFixed(1)),
      y: getYCoord(val)
    };
  });

  return (
    <div id="health-trends-section" className="bg-white border border-brand-border rounded-2xl p-6 sm:p-7 shadow-xs space-y-6 text-left rtl:text-right">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-[#0F4C81] rounded-xl border border-blue-100">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <span>{language === 'ar' ? 'مؤشرات وتاريخ القراءات' : 'Health Trends & Historical Readings'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? 'عرض بياني زمني دقيق لقراءاتك المسجلة عبر الفترات الزمنية المحددة.'
                  : 'Time-series visualization based strictly on your verified health log submissions.'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls: Parameter Selection & Time Range */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Parameter Selection Dropdown */}
          <div className="relative">
            <label htmlFor="param-selector" className="sr-only">
              {language === 'ar' ? 'المعيار الصحي' : 'Health Parameter'}
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-[#0F4C81] focus-within:ring-2 focus-within:ring-[#0F4C81]/10">
              <span className="text-[11px] font-bold text-slate-500 mr-2 rtl:ml-2 rtl:mr-0">
                {language === 'ar' ? 'المعيار:' : 'Parameter:'}
              </span>
              <select
                id="param-selector"
                value={selectedParamId}
                onChange={(e) => onSelectParam(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer pr-5 rtl:pl-5 rtl:pr-0"
              >
                {parameters.map(param => (
                  <option key={param.id} value={param.id}>
                    {param.displayName} ({param.unit})
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute right-3 rtl:left-3 rtl:right-auto" />
            </div>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {(['7', '30', '90'] as const).map(rangeKey => {
              const isSelected = timeRange === rangeKey;
              return (
                <button
                  key={rangeKey}
                  type="button"
                  onClick={() => onChangeTimeRange(rangeKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white text-[#0F4C81] shadow-2xs border border-blue-100 font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={isSelected}
                >
                  {rangeKey} {language === 'ar' ? 'أيام' : 'Days'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Non-medical Trend Summary */}
      {readingCount > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-[#0F4C81]" />
              <span>{summaryText}</span>
            </span>
            {rangeText && (
              <span className="font-mono text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                {rangeText}
              </span>
            )}
          </div>
          {timingText && (
            <p className="text-slate-600 font-medium">
              {timingText}
            </p>
          )}
        </div>
      )}

      {/* 3. Main Chart Display */}
      {readingCount === 0 ? (
        /* NO DATA STATE (Specified in requirements) */
        <div 
          id="chart-no-data-state" 
          className="border-2 border-dashed border-slate-200 bg-slate-50/60 rounded-2xl p-8 sm:p-12 text-center space-y-4"
        >
          <div className="w-14 h-14 bg-white text-slate-400 rounded-2xl shadow-2xs border border-slate-200 flex items-center justify-center mx-auto">
            <Activity className="h-7 w-7 text-slate-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="font-bold text-slate-800 text-base">
              {language === 'ar' 
                ? 'لا توجد قراءات صحية مسجلة لهذه الفترة.' 
                : 'No health readings recorded for this period.'}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'ar'
                ? `لم يتم تسجيل أي قراءات لمعيار (${activeParam?.displayName || ''}) خلال آخر ${timeRange} يوم. قم بتسجيل قراءة اليوم للبدء في بناء المؤشر الزمني.`
                : `No recorded logs found for ${activeParam?.displayName || 'this parameter'} in the last ${timeRange} days. Record today's reading to initiate chronological trend tracking.`}
            </p>
          </div>
          {onRecordReading ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRecordReading}
                className="px-4 py-2.5 bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{language === 'ar' ? 'تسجيل قراءة صحية' : 'Record Health Reading'}</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic pt-2">
              {language === 'ar' ? 'في انتظار تسجيل القراءات من المريض عبر البوابة الصحية' : 'Awaiting patient daily health logs via patient portal'}
            </p>
          )}
        </div>
      ) : (
        /* ACTUAL STORED READINGS CHART */
        <div className="space-y-4">
          
          {/* Chart Header & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{activeParam.displayName}</span>
              <span className="font-mono text-[11px] text-[#0F4C81] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-semibold">
                {activeParam.unit}
              </span>
            </div>

            {/* Legend */}
            {isBP ? (
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
                  <span>{language === 'ar' ? 'الانقباضي (Systolic mmHg)' : 'Systolic (mmHg)'}</span>
                </span>
                <span className="flex items-center gap-1.5 text-teal-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-600"></span>
                  <span>{language === 'ar' ? 'الانبساطي (Diastolic mmHg)' : 'Diastolic (mmHg)'}</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0F4C81]"></span>
                <span>{activeParam.displayName} ({activeParam.unit})</span>
              </div>
            )}
          </div>

          {/* SVG Responsive Container */}
          <div className="relative w-full overflow-x-auto bg-[#FAFAFC] border border-slate-200 rounded-2xl p-2 sm:p-4">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto min-w-[550px] overflow-visible select-none"
            >
              <defs>
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F4C81" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0F4C81" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={tick.y}
                    x2={padLeft + chartW}
                    y2={tick.y}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray={i === 0 ? '0' : '4 4'}
                  />
                  <text
                    x={padLeft - 10}
                    y={tick.y + 4}
                    textAnchor="end"
                    fill="#64748B"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}

              {/* Y-axis Unit Label */}
              <text
                x={padLeft}
                y={padTop - 12}
                textAnchor="middle"
                fill="#475569"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {activeParam.unit}
              </text>

              {/* Chart Paths when 2+ readings */}
              {readingCount > 1 && (
                <>
                  {!isBP && areaPathSingle && (
                    <path
                      d={areaPathSingle}
                      fill="url(#chartAreaGradient)"
                    />
                  )}

                  {!isBP && linePathSingle && (
                    <path
                      d={linePathSingle}
                      fill="none"
                      stroke="#0F4C81"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {isBP && linePathSystolic && (
                    <path
                      d={linePathSystolic}
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {isBP && linePathDiastolic && (
                    <path
                      d={linePathDiastolic}
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </>
              )}

              {/* Single Reading Case: Draw Reference Dashed Line */}
              {readingCount === 1 && (
                <line
                  x1={padLeft}
                  y1={padTop + chartH / 2}
                  x2={padLeft + chartW}
                  y2={padTop + chartH / 2}
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Data Points and Interactivity */}
              {filteredReadings.map((reading, index) => {
                const x = getXCoord(index);
                const isHovered = hoveredPoint?.id === reading.id;

                if (isBP) {
                  const sysVal = reading.systolic ?? (reading.value.includes('/') ? parseFloat(reading.value.split('/')[0]) : 120);
                  const diaVal = reading.diastolic ?? (reading.value.includes('/') ? parseFloat(reading.value.split('/')[1]) : 80);
                  const ySys = getYCoord(sysVal);
                  const yDia = getYCoord(diaVal);

                  return (
                    <g 
                      key={reading.id || index}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(reading)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Vertical highlight line when hovered */}
                      {isHovered && (
                        <line
                          x1={x}
                          y1={padTop}
                          x2={x}
                          y2={padTop + chartH}
                          stroke="#94A3B8"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Connecting stem between systolic and diastolic for same reading */}
                      <line
                        x1={x}
                        y1={ySys}
                        x2={x}
                        y2={yDia}
                        stroke="#CBD5E1"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />

                      {/* Systolic Point */}
                      <circle
                        cx={x}
                        cy={ySys}
                        r={isHovered ? 6.5 : 5}
                        fill="#6366F1"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="transition-all"
                      />

                      {/* Diastolic Point */}
                      <circle
                        cx={x}
                        cy={yDia}
                        r={isHovered ? 6.5 : 5}
                        fill="#0D9488"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="transition-all"
                      />

                      {/* X-axis Tick Label (Date & Time) */}
                      <text
                        x={x}
                        y={padTop + chartH + 20}
                        textAnchor="middle"
                        fill="#475569"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {reading.date.split('-').slice(1).join('/')}
                      </text>
                      <text
                        x={x}
                        y={padTop + chartH + 34}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {reading.time}
                      </text>
                    </g>
                  );
                } else {
                  const numVal = reading.numericValue ?? parseFloat(reading.value);
                  const y = getYCoord(numVal);

                  return (
                    <g 
                      key={reading.id || index}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(reading)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Vertical highlight line when hovered */}
                      {isHovered && (
                        <line
                          x1={x}
                          y1={padTop}
                          x2={x}
                          y2={padTop + chartH}
                          stroke="#94A3B8"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Point marker */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 7 : 5.5}
                        fill="#0F4C81"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        className="transition-all"
                      />

                      {/* X-axis Tick Label (Date & Time) */}
                      <text
                        x={x}
                        y={padTop + chartH + 20}
                        textAnchor="middle"
                        fill="#475569"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {reading.date.split('-').slice(1).join('/')}
                      </text>
                      <text
                        x={x}
                        y={padTop + chartH + 34}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {reading.time}
                      </text>
                    </g>
                  );
                }
              })}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredPoint && (
              <div 
                className="absolute z-20 top-4 right-4 bg-slate-900/90 text-white rounded-xl p-3 shadow-lg text-xs space-y-1 pointer-events-none backdrop-blur-xs border border-slate-700 animate-fade-in"
              >
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300 border-b border-slate-700/80 pb-1">
                  <span>{hoveredPoint.date}</span>
                  <span>&bull;</span>
                  <span>{hoveredPoint.time}</span>
                </div>
                <div className="pt-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    {activeParam.displayName}
                  </span>
                  <div className="text-sm font-extrabold text-white font-mono flex items-baseline gap-1 mt-0.5">
                    <span>{hoveredPoint.value}</span>
                    <span className="text-xs text-blue-300 font-normal">{activeParam.unit}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{language === 'ar' ? 'القيم مرتبة تسلسلياً حسب تاريخ التسجيل الفعلي' : 'Readings ordered chronologically from actual patient submissions'}</span>
            </span>
            <span className="font-mono text-slate-400">
              {filteredReadings.length} {language === 'ar' ? 'نقاط بيانية' : 'data points'}
            </span>
          </div>

        </div>
      )}

    </div>
  );
};
