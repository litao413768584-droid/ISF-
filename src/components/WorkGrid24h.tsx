import React, { useState, useEffect } from 'react';
import { CrewMember, SlotStatus, WorkLogDay, WatchPattern, NonConformity, VesselInfo, VesselStatusLog, VesselStatusType } from '../types';
import { formatSlotTime, formatSlotRange, calculateDayWorkHours, calculateDayRestHours, getShiftedDateStr } from '../utils/complianceEngine';
import { getStatutoryHolidayInfo, calculateMonthlyOvertimeStats } from '../utils/holidays';
import { getCrewContractDayStatus, getContractStatusBadge, applyHandoverSlotHours } from '../utils/handoverEngine';
import { SmartRankAdviceModal } from './SmartRankAdviceModal';
import { Clock, ShieldCheck, AlertTriangle, Copy, RotateCcw, Calendar, Check, Info, FileText, ChevronLeft, ChevronRight, Zap, Compass, Flame, Shield, Globe, Anchor, MapPin, Ship, Building2, Layers, Trash2 } from 'lucide-react';

interface WorkGrid24hProps {
  crew: CrewMember;
  dateStr: string; // YYYY-MM-DD
  workLog?: WorkLogDay;
  vessel: VesselInfo;
  watchPatterns: WatchPattern[];
  allWorkLogs?: Record<string, WorkLogDay>;
  vesselStatusLogs?: VesselStatusLog[];
  onOpenVesselStatusModal?: () => void;
  onUpdateSlots: (dateStr: string, newSlots: SlotStatus[], note?: string) => void;
  onChangeDate: (newDateStr: string) => void;
  onOpenNcDetails: (nc: NonConformity) => void;
  onCopyPreviousDay: () => void;
  onCopyToWeek: () => void;
  onCopyToMonth?: () => void;
}

export const WorkGrid24h: React.FC<WorkGrid24hProps> = ({
  crew,
  dateStr,
  workLog,
  vessel,
  watchPatterns,
  allWorkLogs = {},
  vesselStatusLogs = [],
  onOpenVesselStatusModal,
  onUpdateSlots,
  onChangeDate,
  onOpenNcDetails,
  onCopyPreviousDay,
  onCopyToWeek,
  onCopyToMonth,
}) => {
  const currentSlots: SlotStatus[] = workLog ? workLog.slots : new Array(48).fill('REST');
  const [activeBrush, setActiveBrush] = useState<SlotStatus>('WORK');
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [dayNote, setDayNote] = useState<string>(workLog?.notes || '');
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [isSmartAdviceOpen, setIsSmartAdviceOpen] = useState<boolean>(false);

  useEffect(() => {
    setDayNote(workLog?.notes || '');
  }, [dateStr, workLog?.notes]);

  // Active Vessel Operational Status for current dateStr
  const activeVesselStatusLog = vesselStatusLogs.find(
    (log) => dateStr >= log.startDate && dateStr <= log.endDate
  );

  const getVesselStatusBadge = (type?: VesselStatusType) => {
    switch (type) {
      case 'weigh_anchor':
        return { label: '⚓ 抛起锚作业 (Anchoring & Weighing)', color: 'bg-amber-900 text-amber-200 border-amber-500 font-bold', icon: Anchor };
      case 'mooring_ops':
        return { label: '🚢 靠离泊系泊操作 (Berthing & Unberthing)', color: 'bg-emerald-900 text-emerald-200 border-emerald-500 font-bold', icon: Building2 };
      case 'at_anchor':
        return { label: '⚓ 锚泊候泊 (At Anchor)', color: 'bg-amber-950 text-amber-300 border-amber-700', icon: Anchor };
      case 'port_berthing':
        return { label: '🏙️ 停靠码头 (Port Berthing)', color: 'bg-emerald-950 text-emerald-300 border-emerald-700', icon: Building2 };
      case 'cargo_ops':
        return { label: '🏗️ 港口装卸 (Cargo Operations)', color: 'bg-purple-950 text-purple-300 border-purple-700', icon: Layers };
      case 'drydock':
        return { label: '🛠️ 进坞修船 (Drydock)', color: 'bg-slate-800 text-slate-300 border-slate-600', icon: Clock };
      case 'at_sea':
      default:
        return { label: '🌊 在航航行 (At Sea)', color: 'bg-blue-950 text-blue-300 border-blue-700', icon: Ship };
    }
  };

  const currentVesselBadge = getVesselStatusBadge(activeVesselStatusLog?.statusType);

  const handleApplyStationDutyOvertime = () => {
    const statusType = activeVesselStatusLog?.statusType || 'weigh_anchor';
    const newSlots = [...currentSlots];
    let appendNote = '';

    if (statusType === 'weigh_anchor' || statusType === 'at_anchor') {
      for (let s = 16; s <= 21; s++) {
        if (newSlots[s] === 'REST') newSlots[s] = 'OVERTIME';
      }
      appendNote = '[抛起锚作业前后站班/备车]';
    } else if (statusType === 'mooring_ops' || statusType === 'port_berthing') {
      for (let s = 30; s <= 35; s++) {
        if (newSlots[s] === 'REST') newSlots[s] = 'OVERTIME';
      }
      appendNote = '[靠离泊解系缆前后站班值班]';
    } else if (statusType === 'cargo_ops') {
      for (let s = 16; s <= 23; s++) {
        if (newSlots[s] === 'REST') newSlots[s] = 'OVERTIME';
      }
      appendNote = '[港口货物装卸/压排水监装值班]';
    } else {
      for (let s = 16; s <= 21; s++) {
        if (newSlots[s] === 'REST') newSlots[s] = 'OVERTIME';
      }
      appendNote = '[应急站班值班]';
    }

    const updatedNote = dayNote ? `${dayNote} | ${appendNote}` : appendNote;
    setDayNote(updatedNote);
    onUpdateSlots(dateStr, newSlots, updatedNote);
  };

  const handleSlotMouseDown = (index: number) => {
    setIsMouseDown(true);
    const newSlots = [...currentSlots];
    newSlots[index] = activeBrush;
    onUpdateSlots(dateStr, newSlots, dayNote);
  };

  const handleSlotMouseEnter = (index: number) => {
    setHoveredSlot(index);
    if (isMouseDown) {
      const newSlots = [...currentSlots];
      newSlots[index] = activeBrush;
      onUpdateSlots(dateStr, newSlots, dayNote);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleApplyPattern = (patternId: string) => {
    if (patternId === 'crew_custom') {
      const customSlots = crew.customPatternSlots || new Array(48).fill('REST');
      onUpdateSlots(dateStr, [...customSlots], dayNote);
      return;
    }
    const pattern = watchPatterns.find((p) => p.id === patternId);
    if (pattern) {
      onUpdateSlots(dateStr, [...pattern.slots], dayNote);
    }
  };

  const handleClearAll = () => {
    onUpdateSlots(dateStr, new Array(48).fill('REST'), dayNote);
  };

  const handleSaveNote = () => {
    onUpdateSlots(dateStr, currentSlots, dayNote);
  };

  const handleDeleteNote = () => {
    setDayNote('');
    onUpdateSlots(dateStr, currentSlots, '');
  };

  const appendNoteTag = (tag: string) => {
    const updated = dayNote ? `${dayNote} | ${tag}` : tag;
    setDayNote(updated);
    onUpdateSlots(dateStr, currentSlots, updated);
  };

  // Contract Status & Handover Verification Engine
  const contractDayStatus = getCrewContractDayStatus(crew, dateStr);
  const contractBadge = getContractStatusBadge(contractDayStatus);

  const joinDateOnly = crew.joinDateTime ? crew.joinDateTime.split('T')[0] : (crew.joinDate || '');
  const signOffDateOnly = crew.signOffDateTime ? crew.signOffDateTime.split('T')[0] : (crew.signOffDate || '');

  const handleFillHandoverSlots = () => {
    const updatedSlots = applyHandoverSlotHours(crew, dateStr, currentSlots);
    const note = dayNote ? `${dayNote} | [职务交接完成]` : '[在船职务与防污染交接完成]';
    onUpdateSlots(dateStr, updatedSlots, note);
  };

  // Statutory Holiday & Monthly Overtime Calculation
  const holidayInfo = getStatutoryHolidayInfo(dateStr);
  const monthStr = dateStr.substring(0, 7); // YYYY-MM
  const monthOtStats = calculateMonthlyOvertimeStats(crew.id, monthStr, allWorkLogs);

  // Helper to determine specific maritime operation & overtime cause for a slot
  const getSlotOperationDetails = (slotIdx: number, status: SlotStatus) => {
    const noteText = dayNote || '';
    const statusType = activeVesselStatusLog?.statusType;

    const isAnchoring =
      statusType === 'weigh_anchor' ||
      statusType === 'at_anchor' ||
      noteText.includes('抛锚') ||
      noteText.includes('起锚') ||
      noteText.includes('锚泊') ||
      noteText.includes('抛起锚');

    const isMooring =
      statusType === 'mooring_ops' ||
      statusType === 'port_berthing' ||
      noteText.includes('靠泊') ||
      noteText.includes('离泊') ||
      noteText.includes('系缆') ||
      noteText.includes('解缆') ||
      noteText.includes('解系缆');

    const isCargo =
      statusType === 'cargo_ops' ||
      noteText.includes('装卸') ||
      noteText.includes('压排水') ||
      noteText.includes('加油');

    const isMaintenance =
      statusType === 'drydock' ||
      noteText.includes('检修') ||
      noteText.includes('维护');

    if (status === 'DRILL_EMERGENCY') {
      return {
        type: 'drill',
        label: '🚨 应急演习 / 豁免免除 (Drill / Emergency)',
        iconSymbol: '🚨',
        bgOvertimeClass: '',
      };
    }

    if (status === 'OVERTIME') {
      if (isAnchoring) {
        return {
          type: 'anchoring',
          label: '⚓ 抛起锚备车站班加班 (Anchoring & Weighing Overtime)',
          iconSymbol: '⚓',
          bgOvertimeClass: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black ring-1 ring-amber-200',
        };
      }
      if (isMooring) {
        return {
          type: 'mooring',
          label: '🚢 靠离泊/解系缆站班加班 (Berthing & Unberthing Overtime)',
          iconSymbol: '🚢',
          bgOvertimeClass: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black ring-1 ring-amber-200',
        };
      }
      if (isCargo) {
        return {
          type: 'cargo',
          label: '🏗️ 港口装卸/压排水/加油加班 (Cargo & Ballast Overtime)',
          iconSymbol: '🏗️',
          bgOvertimeClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
        };
      }
      if (isMaintenance) {
        return {
          type: 'maintenance',
          label: '🛠️ 轮机设备维护检修加班 (Engine Maintenance Overtime)',
          iconSymbol: '🛠️',
          bgOvertimeClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
        };
      }
      if (holidayInfo) {
        return {
          type: 'holiday',
          label: `🎉 法定节假日加班 (${holidayInfo.name})`,
          iconSymbol: '🎉',
          bgOvertimeClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
        };
      }
      return {
        type: 'general',
        label: '⚡ 计划性加班 / 常规超额加班 (Overtime Work)',
        iconSymbol: 'X',
        bgOvertimeClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      };
    }

    if (status === 'WORK') {
      return { type: 'work', label: '常规正班/值班 (Regular Watch)', iconSymbol: '•', bgOvertimeClass: '' };
    }

    return { type: 'rest', label: '休息时段 (Rest Period)', iconSymbol: '', bgOvertimeClass: '' };
  };

  const workHours = calculateDayWorkHours(currentSlots);
  const restHours = calculateDayRestHours(currentSlots);
  const nonConformities = workLog?.nonConformities || [];
  const isNonConformant = nonConformities.length > 0;

  // Navigate dates
  const handleShiftDate = (offset: number) => {
    onChangeDate(getShiftedDateStr(dateStr, offset));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* 1. 表最上方显示的当前选择时间的船舶作业与抛起锚/靠离泊状态 */}
      <div className="bg-slate-950 border border-blue-800/80 rounded-lg p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950/80 rounded-lg border border-blue-700/80 shrink-0">
            <Anchor className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">当前选中日期 (<strong className="text-slate-200 font-mono">{dateStr}</strong>) 船舶动态:</span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border flex items-center gap-1 ${currentVesselBadge.color}`}>
                {currentVesselBadge.label}
              </span>
              {activeVesselStatusLog && (
                <span className="text-xs text-slate-200 font-semibold flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  {activeVesselStatusLog.locationName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {activeVesselStatusLog
                ? `作业与站班时段: ${activeVesselStatusLog.startDate} ${activeVesselStatusLog.startTime} 至 ${activeVesselStatusLog.endDate} ${activeVesselStatusLog.endTime}${activeVesselStatusLog.notes ? ` (${activeVesselStatusLog.notes})` : ''}`
                : '当前日期未单独录入停靠锚泊/抛起锚日志，默认按照在航或正常在船班组履职。'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleApplyStationDutyOvertime}
            className="px-2.5 py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-600 text-amber-200 text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="一键将该船舶状态对应的前后站备车/解系缆/装卸加班工时填入当前船员的时间表"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>一键联动录入前后站班/靠锚加班</span>
          </button>

          {onOpenVesselStatusModal && (
            <button
              onClick={onOpenVesselStatusModal}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded flex items-center gap-1 transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>管理/变更船舶动态</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Header: Seafarer Details & Date Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-100">{crew.name}</h2>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
              {crew.rank}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
              {crew.department}
            </span>

            {/* Smart Advice Button */}
            <button
              onClick={() => setIsSmartAdviceOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>智能加班/排班技巧手册</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
            <span>Seaman Book: <strong className="text-slate-300">{crew.nationalSeamanBookNo || 'N/A'}</strong></span>
            <span>•</span>
            {/* Monthly Overtime Cap Counter */}
            <span className="flex items-center gap-1">
              <span>本月累计加班:</span>
              <strong className={`font-mono ${monthOtStats.exceedsMonthlyLimit ? 'text-rose-400 font-extrabold' : 'text-amber-400'}`}>
                {monthOtStats.totalOvertimeHours.toFixed(1)}h
              </strong>
              <span className="text-slate-500">/ 75h 上限</span>
            </span>
          </div>
        </div>

        {/* Date Selector Bar */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
          <button
            onClick={() => handleShiftDate(-1)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="date"
              value={dateStr}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-transparent text-slate-100 font-bold text-sm focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleShiftDate(1)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contract Lifecycle & Handover Status Banners */}
      {contractDayStatus === 'SIGNED_OFF' && (
        <div className="bg-emerald-950/80 border border-emerald-700 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-100">🌴 已休假离船 (交接完毕止报工时):</span>
              <span className="ml-1">
                船员已于 <strong className="font-mono text-emerald-300">{crew.signOffDateTime || crew.signOffDate}</strong> 完成职能交接并休假离船。按照体系要求，离船人员之后终止时间表工时记录。
              </span>
            </div>
          </div>
          <span className="bg-emerald-900 text-emerald-200 px-2.5 py-1 rounded font-mono font-bold text-[11px] border border-emerald-700">
            已离船休假 / 终止记录
          </span>
        </div>
      )}

      {contractDayStatus === 'NOT_YET_SIGNED_ON' && (
        <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-200">⚓ 尚未上船登轮:</span>
              <span className="ml-1">
                该船员预计将于 <strong className="font-mono text-blue-300">{crew.joinDateTime || crew.joinDate}</strong> 登轮上船。在上船履职前无需填报时间表。
              </span>
            </div>
          </div>
          <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded font-mono text-[11px]">
            未上船登轮
          </span>
        </div>
      )}

      {contractDayStatus === 'HANDOVER_IN_PROGRESS' && (
        <div className="bg-indigo-950/80 border border-indigo-600 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-indigo-100">🤝 职务交接履职窗口:</span>
              <span className="ml-1">
                交接时段: <strong className="font-mono text-amber-300">{crew.handoverStartDateTime || '未定'}</strong> 至 <strong className="font-mono text-amber-300">{crew.handoverEndDateTime || '未定'}</strong>。离船人员与接班人员共同履职记录工时。
              </span>
            </div>
          </div>
          <button
            onClick={handleFillHandoverSlots}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded border border-indigo-400 shadow transition cursor-pointer flex items-center gap-1"
          >
            <span>一键填入交接工时</span>
          </button>
        </div>
      )}

      {/* Statutory Holiday Alert Banner if active */}
      {holidayInfo && (
        <div className="bg-amber-950/60 border border-amber-600/80 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>
              <strong>法定节假日: {holidayInfo.name}</strong> — 当天所有工作时间均计入加班时间 (Overtime).
            </span>
          </div>
          <span className="bg-amber-900 text-amber-100 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
            全天计加班
          </span>
        </div>
      )}

      {/* Interactive Tool Palette & Preset Watch Patterns */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
        {/* Brush Mode Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">工时画笔工具:</span>
          
          <button
            type="button"
            onClick={() => setActiveBrush('REST')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              activeBrush === 'REST'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>休息 (REST)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBrush('WORK')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              activeBrush === 'WORK'
                ? 'bg-blue-950 text-blue-300 border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>常规值班/工作 (WORK)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBrush('OVERTIME')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              activeBrush === 'OVERTIME'
                ? 'bg-amber-950 text-amber-300 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>加班工时 (OVERTIME)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBrush('DRILL_EMERGENCY')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              activeBrush === 'DRILL_EMERGENCY'
                ? 'bg-purple-950 text-purple-300 border-purple-500 ring-2 ring-purple-500/30'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>演习/应急免除 (DRILL)</span>
          </button>
        </div>

        {/* Quick Batch Actions & Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleApplyPattern(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="" disabled>应用预设轮班模板 / Watch Pattern...</option>
            <option value="crew_custom">⭐ 该船员专属常态班组 (Custom Duty Hours)</option>
            {watchPatterns.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={onCopyPreviousDay}
            title="复制前一日工时至今日"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span>复制前一日</span>
          </button>

          <button
            onClick={onCopyToWeek}
            title="将今日排班复制至未来7天"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>填充整周</span>
          </button>

          {onCopyToMonth && (
            <button
              onClick={onCopyToMonth}
              title="将今日排班与备注一键复制并覆盖填充当月所有天数 (28-31天)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-blue-950 hover:bg-blue-900 text-blue-200 text-xs font-bold border border-blue-700 cursor-pointer shadow-xs transition"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>填充整月</span>
            </button>
          )}

          <button
            onClick={handleClearAll}
            title="重置全天格子为休息"
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置</span>
          </button>
        </div>
      </div>

      {/* 24-HOUR VISUAL TIME GRID (48 Half-Hour Slots) */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 select-none">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1 flex-wrap gap-2">
          <span className="font-semibold text-slate-300">24-Hour Work / Rest Grid (30-Min Resolution • Click or Drag)</span>
          {hoveredSlot !== null ? (
            <div className="flex items-center gap-2 font-mono text-xs font-bold bg-slate-900 px-2.5 py-1 rounded border border-blue-600/80 text-blue-300 shadow">
              <span>Slot {hoveredSlot + 1}/48 ({formatSlotRange(hoveredSlot, hoveredSlot)}):</span>
              <span className={currentSlots[hoveredSlot] === 'OVERTIME' ? 'text-amber-300 font-extrabold' : currentSlots[hoveredSlot] === 'WORK' ? 'text-blue-300' : currentSlots[hoveredSlot] === 'DRILL_EMERGENCY' ? 'text-purple-300' : 'text-emerald-300'}>
                [{currentSlots[hoveredSlot]}]
              </span>
              <span className="text-slate-200 font-sans text-[11px] font-medium border-l border-slate-700 pl-2">
                {getSlotOperationDetails(hoveredSlot, currentSlots[hoveredSlot]).label}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 italic">鼠标停在格子/加班时间上可显示具体加班原因与作业细分</span>
          )}
        </div>

        {/* Hour Header Scale (00:00 to 24:00) */}
        <div className="grid grid-cols-12 text-[10px] text-slate-400 font-mono text-center border-b border-slate-800/80 pb-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border-r border-slate-800/40 last:border-r-0">
              {(i * 2).toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* 48 HALF-HOUR INTERACTIVE CELLS */}
        <div className="grid grid-cols-48 gap-[2px] bg-slate-900 p-1.5 rounded-lg border border-slate-800">
          {currentSlots.map((status, idx) => {
            const opDetails = getSlotOperationDetails(idx, status);

            let bgClass = 'bg-slate-800/60 hover:bg-slate-700';
            if (status === 'WORK') bgClass = 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs';
            if (status === 'OVERTIME') {
              bgClass = opDetails.bgOvertimeClass || 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs';
            }
            if (status === 'DRILL_EMERGENCY') bgClass = 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs';
            if (status === 'REST') bgClass = 'bg-slate-900 hover:bg-emerald-950/60 border border-slate-800';

            const isHourDivider = (idx + 1) % 2 === 0 && idx !== 47;

            return (
              <div
                key={idx}
                onMouseDown={() => handleSlotMouseDown(idx)}
                onMouseEnter={() => handleSlotMouseEnter(idx)}
                className={`h-11 rounded-xs transition-all duration-75 cursor-pointer flex items-center justify-center relative group ${bgClass} ${
                  isHourDivider ? 'mr-[2px] border-r border-slate-700/60' : ''
                }`}
                title={`Slot ${idx + 1}: ${formatSlotTime(idx)} - ${formatSlotTime(idx + 1)} | ${opDetails.label}`}
              >
                {/* Visual marker inside cell (x-mark, anchor, ship or dot) */}
                {status === 'WORK' && (
                  <span className="text-[10px] font-bold leading-none">
                    {opDetails.iconSymbol === '⚓' ? '⚓' : opDetails.iconSymbol === '🚢' ? '🚢' : '•'}
                  </span>
                )}
                {status === 'OVERTIME' && (
                  <span className="text-[10px] font-black text-slate-950 font-mono leading-none flex items-center justify-center">
                    {opDetails.iconSymbol}
                  </span>
                )}
                {status === 'DRILL_EMERGENCY' && <div className="w-1.5 h-1.5 bg-purple-200 rounded-full" />}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-900 border border-slate-700" /> Rest (0.5h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-600" /> Work / Watch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500 font-black text-[9px] flex items-center justify-center text-slate-950">X</span> 加班 (Overtime)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400 font-black text-[9px] flex items-center justify-center text-slate-950">⚓</span> 抛起锚加班
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400 font-black text-[9px] flex items-center justify-center text-slate-950">🚢</span> 靠离泊加班
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-600" /> Drill / Exempt
            </span>
          </div>

          <div className="text-slate-500 italic">
            鼠标停留加班黄色区域可自动浮现细分加班原因
          </div>
        </div>
      </div>

      {/* LIVE STCW & MLC COMPLIANCE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Day Total Work / Rest</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5 flex items-baseline gap-1">
            <span className="text-blue-400">{workHours.toFixed(1)}h</span>
            <span className="text-xs font-normal text-slate-400">Work</span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400">{restHours.toFixed(1)}h</span>
            <span className="text-xs font-normal text-slate-400">Rest</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Target: Min 10h Rest / 24h</div>
        </div>

        <div className={`p-3 rounded-lg border ${
          (workLog?.rolling24hRest ?? 12) < 10.0
            ? 'bg-rose-950/40 border-rose-800 text-rose-300'
            : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="text-[11px] font-medium text-slate-400">Rolling 24h Window Rest</div>
          <div className="text-lg font-bold mt-0.5 flex items-baseline gap-1">
            <span className={(workLog?.rolling24hRest ?? 12) < 10.0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}>
              {(workLog?.rolling24hRest ?? 12.0).toFixed(1)}h
            </span>
            <span className="text-xs text-slate-400">/ 10.0h</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">STCW A-VIII/1 Continuous Check</div>
        </div>

        <div className={`p-3 rounded-lg border ${
          (workLog?.rolling7dRest ?? 100) < (vessel.allowSTCWException ? 70.0 : 77.0)
            ? 'bg-rose-950/40 border-rose-800 text-rose-300'
            : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="text-[11px] font-medium text-slate-400">Rolling 7-Day Rest (168h)</div>
          <div className="text-lg font-bold mt-0.5 flex items-baseline gap-1">
            <span className={(workLog?.rolling7dRest ?? 100) < (vessel.allowSTCWException ? 70.0 : 77.0) ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}>
              {(workLog?.rolling7dRest ?? 100.0).toFixed(1)}h
            </span>
            <span className="text-xs text-slate-400">/ {vessel.allowSTCWException ? '70.0h' : '77.0h'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">从接班第2天起精准统计</div>
        </div>

        <div className={`p-3 rounded-lg border ${
          isNonConformant ? 'bg-rose-950/60 border-rose-700 text-rose-200' : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
        }`}>
          <div className="text-[11px] font-medium opacity-80">STCW Compliance Status</div>
          <div className="text-base font-extrabold mt-1 flex items-center gap-1.5">
            {isNonConformant ? (
              <>
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                <span className="text-rose-300">NON-CONFORMITY ({nonConformities.length})</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300">FULLY COMPLIANT</span>
              </>
            )}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">
            {isNonConformant ? 'Requires Master Remark' : 'STCW 2010 & MLC 2006 Verified'}
          </div>
        </div>
      </div>

      {/* NON-CONFORMITY WARNING DETAILS BOX (IF ANY) */}
      {isNonConformant && (
        <div className="bg-rose-950/70 border-2 border-rose-600 rounded-xl p-4 text-slate-100 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-rose-800/80">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="font-extrabold text-sm text-rose-200 uppercase tracking-wide">
                STCW Non-Conformity Violation Alert ({nonConformities.length})
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-rose-900 text-rose-200 px-2 py-0.5 rounded border border-rose-700">
              {dateStr}
            </span>
          </div>

          <div className="space-y-2">
            {nonConformities.map((nc) => (
              <div
                key={nc.id}
                onClick={() => onOpenNcDetails(nc)}
                className="bg-slate-950/90 border border-rose-800/80 rounded-lg p-2.5 flex items-start justify-between gap-3 hover:border-rose-500 cursor-pointer transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-rose-300">{nc.ruleName}</span>
                    <span className="text-[10px] bg-rose-900/60 text-rose-200 px-1.5 py-0.2 rounded font-mono">
                      {nc.ruleId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{nc.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">{nc.details}</p>
                </div>
                <button className="px-2 py-1 rounded bg-rose-900 hover:bg-rose-800 text-rose-200 text-xs font-semibold whitespace-nowrap cursor-pointer">
                  Inspect & Justify
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Note / Master Justification Comment Input & Quick Preset Chips */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>官方日志与异常情况快捷备注 (Watchkeeper Notes & Exception Remarks)</span>
          </label>
        </div>

        {/* Quick Comment Chips / 快捷注释标签 */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">快捷标签:</span>
          {[
            { label: '🛡️ 安全会议/工具箱会议', note: '安全会议/工具箱会议 (Safety Meeting / TBM)' },
            { label: '🦺 消防与救生演习', note: '消防与救生应急演习 (Fire & Lifeboat Drill)' },
            { label: '🎓 新证三副/船长夜间督航', note: '船长夜间上驾驶台协助/监督新证三副值班 (Master Night Watch Supervision for Junior 3/O)' },
            { label: '🚢 港内二/三副 6-6 值班', note: '港内/狭水道二/三副 6-6 两班倒值班 (In-Port 6-6 Watch)' },
            { label: '⚓ 抛锚作业', note: '抛锚备车站班 (Anchoring Operations)' },
            { label: '⚓ 起锚作业', note: '起锚备车站班 (Weighing Anchor Operations)' },
            { label: '🚢 靠泊站班', note: '靠泊解系缆站班 (Berthing & Mooring Duty)' },
            { label: '🚢 离泊站班', note: '离泊解系缆站班 (Unberthing & Unmooring Duty)' },
            { label: '⛽ 船上加油作业', note: '船舶加油作业 (Bunkering Operations)' },
            { label: '🌊 恶劣天气应急防台', note: '恶劣天气应急防台值班 (Heavy Weather Duty)' },
            { label: '🏗️ 港口装卸/压排水', note: '港口货物装卸与压排水监装 (Cargo & Ballast Ops)' },
            { label: '🛠️ 轮机设备检修', note: '轮机重大设备维护检修 (Engine Maintenance)' },
            { label: '📋 PSC/船旗国检查', note: 'PSC/船旗国检查 (PSC Inspection)' },
            { label: '🚢 进出港/引航上船', note: '进出港与引航员上船 (Port Arrival & Pilotage)' },
            { label: '⏰ 拨钟调整 (+1h/-1h)', note: '拨钟时差调整 (+1h/-1h Clock Change)' },
            { label: '🌐 跨越日界线 (IDL)', note: '跨越国际日界线 (Crossing IDL)' },
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const updatedNote = dayNote ? `${dayNote} | ${chip.note}` : chip.note;
                setDayNote(updatedNote);
                onUpdateSlots(dateStr, currentSlots, updatedNote);
              }}
              className="px-2 py-0.5 bg-slate-900 hover:bg-blue-950/80 border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-blue-200 text-[11px] rounded transition cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={dayNote}
            onChange={(e) => setDayNote(e.target.value)}
            placeholder="例如：船长根据 STCW A-VIII/1.8 紧急防台豁免、安全会议记录或备车站班说明..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSaveNote}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1"
          >
            保存备注
          </button>
          <button
            type="button"
            onClick={handleDeleteNote}
            disabled={!dayNote}
            className="px-3 py-1.5 rounded bg-rose-900/80 hover:bg-rose-800 border border-rose-700/80 disabled:opacity-40 disabled:hover:bg-rose-900/80 text-rose-100 font-semibold text-xs transition cursor-pointer flex items-center gap-1"
            title="删除/清空当天备注"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-300" />
            <span>删除备注</span>
          </button>
        </div>
      </div>

      {/* Smart Rank Advice Modal */}
      <SmartRankAdviceModal
        crew={crew}
        vessel={vessel}
        isOpen={isSmartAdviceOpen}
        onClose={() => setIsSmartAdviceOpen(false)}
        onApplyPreset={handleApplyPattern}
      />
    </div>
  );
};
