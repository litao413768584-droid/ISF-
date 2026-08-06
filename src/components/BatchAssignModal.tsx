import React, { useState } from 'react';
import { CrewMember, WatchPattern, SlotStatus, BatchAssignParams } from '../types';
import { formatSlotTime, getShiftedDateStr } from '../utils/complianceEngine';
import { Users, Calendar, ShieldAlert, Anchor, Clock, Flame, Zap, Check, CheckSquare, Square, Layers, AlertTriangle } from 'lucide-react';

interface BatchAssignModalProps {
  crew: CrewMember[];
  watchPatterns: WatchPattern[];
  isOpen: boolean;
  onClose: () => void;
  currentDateStr: string;
  onApplyBatch: (params: BatchAssignParams) => void;
}

export const BatchAssignModal: React.FC<BatchAssignModalProps> = ({
  crew,
  watchPatterns,
  isOpen,
  onClose,
  currentDateStr,
  onApplyBatch,
}) => {
  if (!isOpen) return null;

  // Selected Crew IDs (default all crew selected)
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>(crew.map((c) => c.id));

  // Date Range
  const [startDate, setStartDate] = useState<string>(currentDateStr);
  const [endDate, setEndDate] = useState<string>(currentDateStr);

  // Assignment Type: 'event_preset' | 'time_slot' | 'watch_pattern'
  const [assignmentType, setAssignmentType] = useState<'event_preset' | 'time_slot' | 'watch_pattern'>('event_preset');

  // Event Preset Selection
  const [selectedEventId, setSelectedEventId] = useState<string>('drill_fire');

  // Custom Time Slot Range
  const [startSlot, setStartSlot] = useState<number>(20); // 10:00
  const [endSlot, setEndSlot] = useState<number>(23);     // 12:00
  const [customStatus, setCustomStatus] = useState<SlotStatus>('OVERTIME');
  const [customNote, setCustomNote] = useState<string>('');

  // Watch Pattern Selection
  const [selectedPatternId, setSelectedPatternId] = useState<string>('use_crew_default');

  // Action Mode: 'overlay' (preserve rest of day) vs 'overwrite' (replace whole day)
  const [actionStyle, setActionStyle] = useState<'overlay' | 'overwrite'>('overlay');

  // Quick Crew Selection Filters
  const handleSelectAllCrew = () => setSelectedCrewIds(crew.map((c) => c.id));
  const handleDeselectAllCrew = () => setSelectedCrewIds([]);
  const handleSelectDept = (dept: string) => {
    setSelectedCrewIds(crew.filter((c) => c.department === dept).map((c) => c.id));
  };
  const handleSelectWatchkeepers = () => {
    setSelectedCrewIds(crew.filter((c) => c.isWatchkeeper).map((c) => c.id));
  };

  const toggleCrewSelection = (crewId: string) => {
    setSelectedCrewIds((prev) =>
      prev.includes(crewId) ? prev.filter((id) => id !== crewId) : [...prev, crewId]
    );
  };

  // Quick Date Range Setters
  const setDateDaysAhead = (days: number) => {
    setStartDate(currentDateStr);
    setEndDate(getShiftedDateStr(currentDateStr, days - 1));
  };

  // Calculate day count
  const calcDaysCount = () => {
    try {
      if (!startDate || !endDate) return 1;
      const parts1 = startDate.split('-').map((p) => parseInt(p, 10));
      const parts2 = endDate.split('-').map((p) => parseInt(p, 10));
      if (parts1.length !== 3 || parts2.length !== 3) return 1;
      const d1 = Date.UTC(parts1[0], parts1[1] - 1, parts1[2]);
      const d2 = Date.UTC(parts2[0], parts2[1] - 1, parts2[2]);
      if (isNaN(d1) || isNaN(d2)) return 1;
      const diffTime = d2 - d1;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  };

  const daysCount = calcDaysCount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCrewIds.length === 0) {
      alert('Please select at least one crew member.');
      return;
    }

    onApplyBatch({
      crewIds: selectedCrewIds,
      startDate,
      endDate,
      assignmentType,
      patternId: selectedPatternId,
      startSlot,
      endSlot,
      slotStatus: customStatus,
      eventId: selectedEventId,
      actionStyle,
      noteText: customNote,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto">
        
        {/* Header - Sticky Top */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-950 border border-blue-800 rounded-lg text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                <span>Batch Assign Work Hours & Emergency Events</span>
                <span className="text-[10px] bg-blue-900 text-blue-300 font-normal px-2 py-0.5 rounded border border-blue-700">
                  批量排班 / 演习录入
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Simultaneously update work hours, emergency drills, or port stay operations for multiple seafarers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-100 text-xs font-semibold rounded transition cursor-pointer flex items-center gap-1"
            title="关闭 (Close)"
          >
            <span>✕ 关闭</span>
          </button>
        </div>

        <form id="batch-assign-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* STEP 1: TARGET CREW SELECTION */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                  Step 1: Target Crew Selection / 选择目标船员
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300 font-mono font-bold text-[11px]">
                  {selectedCrewIds.length} / {crew.length} Selected
                </span>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllCrew}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold cursor-pointer"
                >
                  All ({crew.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDept('Deck')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 text-[11px] font-semibold cursor-pointer"
                >
                  Deck
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDept('Engine')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 text-[11px] font-semibold cursor-pointer"
                >
                  Engine
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDept('Catering')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold cursor-pointer"
                >
                  Catering
                </button>
                <button
                  type="button"
                  onClick={handleSelectWatchkeepers}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 text-[11px] font-semibold cursor-pointer"
                >
                  Watchkeepers
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllCrew}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 border border-slate-800 text-[11px] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Crew Checkbox Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
              {crew.map((c) => {
                const isChecked = selectedCrewIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCrewSelection(c.id)}
                    className={`p-2 rounded border flex items-center gap-2 cursor-pointer transition select-none ${
                      isChecked
                        ? 'bg-blue-950/80 border-blue-600 text-slate-100 shadow-xs'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-bold text-[11px] truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{c.rank}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 2: DATE OR DATE RANGE */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                  Step 2: Date Range / 生效日期范围
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDateDaysAhead(1)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] cursor-pointer"
                >
                  Today Only
                </button>
                <button
                  type="button"
                  onClick={() => setDateDaysAhead(3)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] cursor-pointer"
                >
                  3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setDateDaysAhead(7)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] cursor-pointer"
                >
                  7 Days (Week)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Start Date (起始日期)</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">End Date (截止日期)</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: ASSIGNMENT MODE & EVENT PRESETS */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                Step 3: Assignment Content / 批量排班模式
              </span>
            </div>

            {/* Sub-Tabs Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAssignmentType('event_preset')}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                  assignmentType === 'event_preset'
                    ? 'bg-blue-950 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Operational Events / 演习与作业</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  消防演习、靠离泊、压排水、加油作业
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentType('time_slot')}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                  assignmentType === 'time_slot'
                    ? 'bg-blue-950 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Custom Slot Range / 自定义时段</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  设定具体起始与结束时间 (划小X)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentType('watch_pattern')}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                  assignmentType === 'watch_pattern'
                    ? 'bg-blue-950 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Anchor className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Watch Pattern / 班组模板</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  批量套用四打八、常日班或厨工班组
                </div>
              </button>
            </div>

            {/* TAB CONTENT 1: EVENT PRESETS */}
            {assignmentType === 'event_preset' && (
              <div className="space-y-2 pt-1">
                <label className="block text-slate-400 text-[11px] font-semibold">选择海事特别作业、安全会议与演习预设 (Maritime Operational Events):</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setSelectedEventId('safety_training')}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      selectedEventId === 'safety_training'
                        ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        安全培训 (Safety Training)
                      </span>
                      <span className="text-[10px] bg-emerald-900 text-emerald-200 px-1.5 py-0.5 rounded">培训演练</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      时间: 14:00 - 15:30 (1.5h) • ISM/ISPS 体系安全合规培训
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedEventId('safety_meeting')}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      selectedEventId === 'safety_meeting'
                        ? 'bg-cyan-950/80 border-cyan-500 ring-1 ring-cyan-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-cyan-300">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-cyan-400" />
                        安全会议/工具箱会议 (Safety Meeting)
                      </span>
                      <span className="text-[10px] bg-cyan-900 text-cyan-200 px-1.5 py-0.5 rounded">常规工时</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      时间: 07:30 - 08:00 (0.5h) • 班前安全宣贯与甲板机舱会议
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedEventId('anchor_mooring')}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      selectedEventId === 'anchor_mooring'
                        ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Anchor className="w-4 h-4 text-amber-400" />
                        抛起锚作业 / 锚泊备车 (Anchor Handling)
                      </span>
                      <span className="text-[10px] bg-amber-900 text-amber-200 px-1.5 py-0.5 rounded">加班工时</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      时间: 05:00 - 07:30 (2.5h) • 水手/机匠抛起锚与机舱备车
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedEventId('crew_handover')}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      selectedEventId === 'crew_handover'
                        ? 'bg-blue-950/80 border-blue-500 ring-1 ring-blue-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-blue-300">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-400" />
                        船员换班与职能交接 (Crew Handover)
                      </span>
                      <span className="text-[10px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">交接工时</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      时间: 09:00 - 11:00 (2.0h) • 上下船职务交接与海图设备盘点
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedEventId('drill_fire')}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      selectedEventId === 'drill_fire'
                        ? 'bg-purple-950/80 border-purple-500 ring-1 ring-purple-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-purple-300">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-purple-400" />
                        消防与救生演习 (Fire & Lifeboat Drill)
                      </span>
                      <span className="text-[10px] bg-purple-900 text-purple-200 px-1.5 py-0.5 rounded">演练特例</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      时间: 10:00 - 11:30 (1.5h) • 计入演练免除 Rest 违规
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedEventId('port_berthing')}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      selectedEventId === 'port_berthing'
                        ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Anchor className="w-4 h-4 text-amber-400" />
                        进出港与靠离泊作业 (Port Arrival/Berthing)
                      </span>
                      <span className="text-[10px] bg-amber-900 text-amber-200 px-1.5 py-0.5 rounded">加班工时</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      时间: 14:00 - 18:00 (4.0h) • 靠离泊与甲板机舱防污染系缆
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedEventId('engine_bunkering')}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      selectedEventId === 'engine_bunkering'
                        ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        船舶加油作业 (Bunkering Operations)
                      </span>
                      <span className="text-[10px] bg-amber-900 text-amber-200 px-1.5 py-0.5 rounded">加班工时</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      时间: 08:00 - 12:00 (4.0h) • 轮机部燃油受油与流量监控
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedEventId('cargo_ballasting')}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      selectedEventId === 'cargo_ballasting'
                        ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        压排水作业轮换 (Ballasting Operations)
                      </span>
                      <span className="text-[10px] bg-amber-900 text-amber-200 px-1.5 py-0.5 rounded">加班工时</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      时间: 18:00 - 22:00 (4.0h) • 压载舱调配与木匠机匠轮换
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: CUSTOM TIME SLOT */}
            {assignmentType === 'time_slot' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Start Time (起始时间)</label>
                    <select
                      value={startSlot}
                      onChange={(e) => setStartSlot(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 48 }).map((_, i) => (
                        <option key={i} value={i}>
                          Slot {i + 1}: {formatSlotTime(i)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">End Time (结束时间)</label>
                    <select
                      value={endSlot}
                      onChange={(e) => setEndSlot(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 48 }).map((_, i) => (
                        <option key={i} value={i}>
                          Slot {i + 1}: {formatSlotTime(i + 1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Target Slot Status (工时状态):</label>
                  <div className="flex gap-2">
                    {(['WORK', 'OVERTIME', 'DRILL_EMERGENCY', 'REST'] as SlotStatus[]).map((st) => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setCustomStatus(st)}
                        className={`flex-1 py-1.5 rounded text-xs font-bold transition border cursor-pointer ${
                          customStatus === st
                            ? st === 'WORK'
                              ? 'bg-blue-600 text-white border-blue-400'
                              : st === 'OVERTIME'
                              ? 'bg-amber-500 text-slate-950 border-amber-300'
                              : st === 'DRILL_EMERGENCY'
                              ? 'bg-purple-600 text-white border-purple-400'
                              : 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Custom Note Remark (备注说明):</label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Special mooring operation in heavy weather..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: WATCH PATTERNS */}
            {assignmentType === 'watch_pattern' && (
              <div className="space-y-2 pt-1">
                <label className="block text-slate-400 text-[11px] font-semibold">Select Watch Pattern Template / 选择班组模板:</label>
                <select
                  value={selectedPatternId}
                  onChange={(e) => setSelectedPatternId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-blue-500 cursor-pointer text-xs"
                >
                  <option value="use_crew_default">
                    ★ Use Each Seafarer's Default Assigned Watch Pattern (按各自默认班组套用)
                  </option>
                  {watchPatterns.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.description}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* STEP 4: ACTION STYLE (OVERLAY VS OVERWRITE) */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider">
              Step 4: Update Mode / 写入更新方式
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-2.5 rounded border cursor-pointer transition flex items-start gap-2.5 ${
                  actionStyle === 'overlay'
                    ? 'bg-blue-950/80 border-blue-500 text-slate-100 ring-1 ring-blue-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <input
                  type="radio"
                  name="actionStyle"
                  checked={actionStyle === 'overlay'}
                  onChange={() => setActionStyle('overlay')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-xs text-blue-300">Incremental Overlay (增量叠加 - 推荐)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    仅修改指定的演习或加工作时间段，保留船员当天原有的日常班组和休息计划。
                  </div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded border cursor-pointer transition flex items-start gap-2.5 ${
                  actionStyle === 'overwrite'
                    ? 'bg-rose-950/60 border-rose-600 text-slate-100 ring-1 ring-rose-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <input
                  type="radio"
                  name="actionStyle"
                  checked={actionStyle === 'overwrite'}
                  onChange={() => setActionStyle('overwrite')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <div className="font-bold text-xs text-rose-300">Full Day Overwrite (全天覆盖重置)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    先清空当天 24 小时安排，完全替换为新的班组模板或时间段。
                  </div>
                </div>
              </label>
            </div>
          </div>

        </form>

        {/* SUMMARY PREVIEW & STICKY FOOTER */}
        <div className="px-4 sm:px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-400">
            Affects <strong className="text-blue-400">{selectedCrewIds.length} crew</strong> × <strong className="text-emerald-400">{daysCount} day(s)</strong> = <strong className="text-slate-200">{selectedCrewIds.length * daysCount} work logs</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
            >
              Cancel / 取消
            </button>

            <button
              type="submit"
              form="batch-assign-form"
              className="px-5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg cursor-pointer transition"
            >
              Apply Batch Assign / 批量确认生效
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BatchAssignModal;