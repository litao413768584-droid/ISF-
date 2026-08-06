import React, { useState } from 'react';
import { CrewMember, SlotStatus, WatchPattern, VesselInfo, WorkLogDay } from '../types';
import { formatSlotTime, calculateDayWorkHours, calculateDayRestHours, analyzeDayRestStructure } from '../utils/complianceEngine';
import {
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Clock,
  Anchor,
  Zap,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Users,
  Settings2,
  Layers,
  Sparkles,
  Compass,
  FileText
} from 'lucide-react';

interface SchedulePlannerProps {
  crew: CrewMember[];
  watchPatterns: WatchPattern[];
  vessel: VesselInfo;
  workLogs?: Record<string, WorkLogDay>;
  onUpdateWatchPatterns?: (updatedPatterns: WatchPattern[]) => void;
  onUpdateCrew?: (updatedCrew: CrewMember) => void;
  onUpdateSlots?: (dateStr: string, slots: SlotStatus[], notes?: string) => void;
}

export const SchedulePlanner: React.FC<SchedulePlannerProps> = ({
  crew,
  watchPatterns,
  vessel,
  workLogs = {},
  onUpdateWatchPatterns,
  onUpdateCrew,
  onUpdateSlots,
}) => {
  const [plannerTab, setPlannerTab] = useState<'mlc_table' | 'pattern_manager' | 'scenario_planner'>('mlc_table');

  // --- Scenario Planner State ---
  const [selectedCrewId, setSelectedCrewId] = useState<string>(crew[0]?.id || '');
  const [plannerDate, setPlannerDate] = useState<string>('2026-08-04');
  const [plannerEndDate, setPlannerEndDate] = useState<string>('2026-08-06');
  const [selectedPatternId, setSelectedPatternId] = useState<string>(watchPatterns[0]?.id || '');
  
  // Extra planned overtime
  const [extraWorkHours, setExtraWorkHours] = useState<number>(3);
  const [scenarioName, setScenarioName] = useState<string>('新证三副上船 - 船长夜间驾驶台协助盯班');

  // --- Pattern Manager State ---
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const [patternFormName, setPatternFormName] = useState<string>('');
  const [patternFormDesc, setPatternFormDesc] = useState<string>('');
  const [patternFormSlots, setPatternFormSlots] = useState<SlotStatus[]>(new Array(48).fill('REST'));
  const [isPainterActive, setIsPainterActive] = useState<boolean>(false);
  const [paintMode, setPaintMode] = useState<SlotStatus>('WORK');

  // Success Notice toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedCrewMember = crew.find((c) => c.id === selectedCrewId) || crew[0];
  const pattern = watchPatterns.find((p) => p.id === selectedPatternId) || watchPatterns[0];

  // Simulated slots: base pattern + extra evening overtime
  const defaultPatternSlots = pattern ? pattern.slots : new Array(48).fill('REST');
  const scenarioSlots: SlotStatus[] = [...defaultPatternSlots];
  const extraSlotsCount = Math.min(24, Math.round(extraWorkHours * 2));
  
  // Extra overtime slots in evening (20:00 - 23:00 = slots 40 to 45)
  for (let i = 40; i < 40 + extraSlotsCount && i < 48; i++) {
    scenarioSlots[i] = 'OVERTIME';
  }

  const plannedWork = calculateDayWorkHours(scenarioSlots);
  const plannedRest = calculateDayRestHours(scenarioSlots);
  const restBlocks = analyzeDayRestStructure(scenarioSlots).restBlocks;
  const plannedLongestRest = restBlocks.length > 0 ? Math.max(...restBlocks.map(b => b.duration)) : 0;

  // STCW Checks for scenario
  const isOver14hWork = plannedWork > 14.0;
  const isUnder10hRest = plannedRest < 10.0;
  const isUnder6hLongest = plannedLongestRest < 6.0;

  // --- Special Preset Quick Execution Handlers ---

  // 1. Preset A: 新证三副上船 / 船长夜间驾驶台协助盯班
  const handleApplyJuniorThirdOfficerNightWatch = () => {
    if (!onUpdateSlots) {
      showToast('无法写入值班日志，缺少更新句柄');
      return;
    }

    const master = crew.find((c) => c.rank.includes('船长') || c.rank.toLowerCase().includes('master'));
    const thirdOfficer = crew.find((c) => c.rank.includes('三副') || c.rank.toLowerCase().includes('3rd officer') || c.rank.toLowerCase().includes('third officer'));

    const start = new Date(plannerDate);
    const end = new Date(plannerEndDate);
    let updatedCount = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];

      // Master gets night bridge watch (21:00 - 24:00 = slots 42 to 47)
      if (master) {
        const masterKey = `${master.id}_${dStr}`;
        const existingMasterSlots = workLogs[masterKey]?.slots || [...(watchPatterns.find(p => p.id === master.defaultPatternId)?.slots || new Array(48).fill('REST'))];
        const newMasterSlots = [...existingMasterSlots];
        // Add 21:00-24:00 night supervision
        for (let i = 42; i <= 47; i++) {
          newMasterSlots[i] = 'OVERTIME';
        }
        onUpdateSlots(dStr, newMasterSlots, '船长夜间上驾驶台协助/监督新证三副值班 (Master Night Watch Supervision for Junior 3/O)');
        updatedCount++;
      }

      // 3rd Officer gets custom note
      if (thirdOfficer) {
        const thirdKey = `${thirdOfficer.id}_${dStr}`;
        const existingThirdSlots = workLogs[thirdKey]?.slots || [...(watchPatterns.find(p => p.id === thirdOfficer.defaultPatternId)?.slots || new Array(48).fill('REST'))];
        onUpdateSlots(dStr, existingThirdSlots, '新证三副驾驶台值班 (船长夜间全程督航指导)');
        updatedCount++;
      }
    }

    showToast(`成功应用【新证三副上船/船长夜间督航】排班方案 (${plannerDate} 至 ${plannerEndDate})！`);
  };

  // 2. Preset B: 港内/狭水道 三副与二副 6-6 两班倒切换
  const handleApplyPort66WatchShift = () => {
    if (!onUpdateSlots) {
      showToast('无法写入值班日志，缺少更新句柄');
      return;
    }

    const secondOfficer = crew.find((c) => c.rank.includes('二副') || c.rank.toLowerCase().includes('2nd officer'));
    const thirdOfficer = crew.find((c) => c.rank.includes('三副') || c.rank.toLowerCase().includes('3rd officer'));

    const pattern66_1 = watchPatterns.find((p) => p.id === 'pattern_6_6') || watchPatterns.find((p) => p.name.includes('0-On 6-Off')) || watchPatterns[0];
    const pattern66_2 = watchPatterns.find((p) => p.id === 'pattern_6_6_2') || watchPatterns.find((p) => p.name.includes('6-On 12-Off')) || watchPatterns[1];

    const start = new Date(plannerDate);
    const end = new Date(plannerEndDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];

      // 2nd Officer -> 6-On 12-Off (06:00-12:00 / 18:00-24:00)
      if (secondOfficer && pattern66_2) {
        onUpdateSlots(dStr, [...pattern66_2.slots], '港内/狭水道二副 6-6 两班倒航行与靠泊值班');
      }

      // 3rd Officer -> 0-On 6-Off (00:00-06:00 / 12:00-18:00)
      if (thirdOfficer && pattern66_1) {
        onUpdateSlots(dStr, [...pattern66_1.slots], '港内/狭水道三副 6-6 两班倒航行与靠泊值班');
      }
    }

    showToast(`成功应用【港内/狭水道二/三副 6-6 两班倒】快捷排班 (${plannerDate} 至 ${plannerEndDate})！`);
  };

  // --- Pattern Manager Handlers ---
  const handleCreateNewPattern = () => {
    setEditingPatternId('NEW');
    setPatternFormName('自定义班组模式 ' + (watchPatterns.length + 1));
    setPatternFormDesc('自定义班组时段与工时安排说明');
    setPatternFormSlots(new Array(48).fill('REST'));
  };

  const handleEditPattern = (wp: WatchPattern) => {
    setEditingPatternId(wp.id);
    setPatternFormName(wp.name);
    setPatternFormDesc(wp.description || '');
    setPatternFormSlots([...wp.slots]);
  };

  const handleSavePatternForm = () => {
    if (!patternFormName.trim()) {
      alert('请输入班组名称');
      return;
    }

    if (!onUpdateWatchPatterns) return;

    if (editingPatternId === 'NEW') {
      const newP: WatchPattern = {
        id: 'pattern_custom_' + Date.now(),
        name: patternFormName,
        description: patternFormDesc,
        slots: patternFormSlots,
      };
      onUpdateWatchPatterns([...watchPatterns, newP]);
      showToast(`已创建全新自定义班组: ${newP.name}`);
    } else if (editingPatternId) {
      const updated = watchPatterns.map((p) =>
        p.id === editingPatternId
          ? { ...p, name: patternFormName, description: patternFormDesc, slots: patternFormSlots }
          : p
      );
      onUpdateWatchPatterns(updated);
      showToast(`已成功保存班组模式修改: ${patternFormName}`);
    }

    setEditingPatternId(null);
  };

  const handleDeletePattern = (id: string) => {
    if (watchPatterns.length <= 1) {
      alert('至少需要保留一个班组模式');
      return;
    }
    if (confirm('确定要删除此班组模式吗？')) {
      const updated = watchPatterns.filter((p) => p.id !== id);
      if (onUpdateWatchPatterns) onUpdateWatchPatterns(updated);
      showToast('已删除班组模式');
    }
  };

  const toggleSlotStatus = (index: number) => {
    const newSlots = [...patternFormSlots];
    if (newSlots[index] === 'REST') newSlots[index] = 'WORK';
    else if (newSlots[index] === 'WORK') newSlots[index] = 'OVERTIME';
    else newSlots[index] = 'REST';
    setPatternFormSlots(newSlots);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-5 text-slate-100">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-medium text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-950 border border-blue-800/80 rounded-lg text-blue-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <span>船上工作安排表与班组自定义规划</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700">
                MLC 2006 Reg 2.3
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              定制轮值班组、管理新证三副/船长夜间督航、港内 6-6 班组切换与 STCW 合规预判测算
            </p>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPlannerTab('mlc_table')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              plannerTab === 'mlc_table'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>船上工作安排表 (MLC Table)</span>
          </button>

          <button
            type="button"
            onClick={() => setPlannerTab('pattern_manager')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              plannerTab === 'pattern_manager'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>自定义班组模式 ({watchPatterns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPlannerTab('scenario_planner')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              plannerTab === 'scenario_planner'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>特殊航行/港内预设与测算</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OFFICIAL MLC TABLE OF SHIPBOARD WORKING ARRANGEMENTS */}
      {plannerTab === 'mlc_table' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>全船岗位班组与标准工时安排表 (Table of Shipboard Working Arrangements)</span>
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5">
                依据 MLC 2006 标准展示在航 (At Sea) 与港内 (In Port) 默认班组时段。可为不同职务一键更改标准班组。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPlannerTab('pattern_manager')}
              className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建/修改自定义班组</span>
            </button>
          </div>

          {/* MLC Table Grid */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                  <th className="p-3">职务 / 姓名</th>
                  <th className="p-3">部门</th>
                  <th className="p-3">在航航行班组 (At Sea Watch)</th>
                  <th className="p-3">港内/常日勤班组 (In Port)</th>
                  <th className="p-3 text-center">预估日工作/休息</th>
                  <th className="p-3 text-right">更改默认班组</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {crew.map((member) => {
                  const currentPattern = watchPatterns.find((p) => p.id === member.defaultPatternId) || watchPatterns[0];
                  const workH = calculateDayWorkHours(currentPattern.slots);
                  const restH = calculateDayRestHours(currentPattern.slots);

                  return (
                    <tr key={member.id} className="hover:bg-slate-900/50 transition">
                      <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <div>
                          <div className="text-slate-100 font-bold">{member.rank}</div>
                          <div className="text-slate-400 text-[11px] font-normal">{member.name}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                          {member.department}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-blue-300">
                        {currentPattern.name}
                      </td>
                      <td className="p-3 text-slate-400">
                        {member.isWatchkeeper ? '港内 6-6 / 港口站班值班' : 'Day Work 常日勤 (08-17)'}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="text-blue-400 font-bold">{workH.toFixed(1)}h</span> 工作 /{' '}
                        <span className={restH < 10 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {restH.toFixed(1)}h
                        </span> 休息
                      </td>
                      <td className="p-3 text-right">
                        <select
                          value={member.defaultPatternId}
                          onChange={(e) => {
                            if (onUpdateCrew) {
                              onUpdateCrew({ ...member, defaultPatternId: e.target.value });
                              showToast(`已更新 ${member.rank} ${member.name} 的默认班组`);
                            }
                          }}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {watchPatterns.map((wp) => (
                            <option key={wp.id} value={wp.id}>
                              {wp.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOM WATCH PATTERN MANAGER */}
      {plannerTab === 'pattern_manager' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-400" />
                <span>班组模式库 (Watch Patterns Management)</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                支持自由创建、修改 4-8、6-6、常日勤、厨工或任意自定义时间段的轮值班组
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateNewPattern}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>新建自定义班组模式</span>
            </button>
          </div>

          {/* Pattern List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {watchPatterns.map((wp) => {
              const workHours = calculateDayWorkHours(wp.slots);
              const restHours = calculateDayRestHours(wp.slots);

              return (
                <div
                  key={wp.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm text-blue-300">{wp.name}</h4>
                      <p className="text-slate-400 text-xs mt-0.5">{wp.description || '自定义班组时段安排'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditPattern(wp)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-300 rounded border border-slate-800 transition cursor-pointer"
                        title="编辑此班组"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePattern(wp.id)}
                        className="p-1.5 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded border border-slate-800 transition cursor-pointer"
                        title="删除班组"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 48-Slot Painter Bar Display */}
                  <div className="grid grid-cols-48 gap-[1px] bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                    {wp.slots.map((st, idx) => {
                      let bgClass = 'bg-slate-900';
                      if (st === 'WORK') bgClass = 'bg-blue-600';
                      if (st === 'OVERTIME') bgClass = 'bg-amber-500';

                      return (
                        <div
                          key={idx}
                          className={`h-6 rounded-xs ${bgClass}`}
                          title={`${formatSlotTime(idx)}: ${st}`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>预估班次: <strong className="text-slate-200">{workHours.toFixed(1)}h 工作</strong></span>
                    <span>休息标准: <strong className={restHours < 10 ? 'text-rose-400' : 'text-emerald-400'}>{restHours.toFixed(1)}h 休息</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Pattern Modal / Form */}
          {editingPatternId && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-2xl w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-400" />
                    <span>{editingPatternId === 'NEW' ? '新建自定义班组模式' : '编辑班组模式与工时'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingPatternId(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                  >
                    ✕ 关闭
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">班组模式名称</label>
                    <input
                      type="text"
                      value={patternFormName}
                      onChange={(e) => setPatternFormName(e.target.value)}
                      placeholder="如: 4-On 8-Off 一班 / 港内 6-6 班组"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">班组适用岗位与说明</label>
                    <input
                      type="text"
                      value={patternFormDesc}
                      onChange={(e) => setPatternFormDesc(e.target.value)}
                      placeholder="说明适用的职务或特定航行作业"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Slot Painter Interactive Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-300 font-semibold">
                        点击/绘制 48 个半小时工时区块 (00:00 - 24:00)
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="flex items-center gap-1 text-slate-400">
                          <span className="w-2.5 h-2.5 bg-slate-800 border border-slate-700 rounded-xs"></span>
                          休息 (Rest)
                        </span>
                        <span className="flex items-center gap-1 text-blue-300">
                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs"></span>
                          值班/工作 (Work)
                        </span>
                        <span className="flex items-center gap-1 text-amber-300">
                          <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs"></span>
                          加班 (Overtime)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-24 gap-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      {patternFormSlots.map((st, idx) => {
                        let bg = 'bg-slate-900 border border-slate-800 text-slate-500';
                        if (st === 'WORK') bg = 'bg-blue-600 text-white font-bold';
                        if (st === 'OVERTIME') bg = 'bg-amber-500 text-slate-950 font-bold';

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleSlotStatus(idx)}
                            className={`h-8 rounded text-[9px] transition cursor-pointer flex flex-col items-center justify-center ${bg}`}
                            title={`Slot ${idx + 1}: ${formatSlotTime(idx)} - 点击切换`}
                          >
                            <span>{idx % 2 === 0 ? `${Math.floor(idx / 2)}h` : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      当前计算: 工时 <strong className="text-blue-400">{calculateDayWorkHours(patternFormSlots).toFixed(1)}h</strong> |
                      休息 <strong className={calculateDayRestHours(patternFormSlots) < 10 ? 'text-rose-400' : 'text-emerald-400'}>{calculateDayRestHours(patternFormSlots).toFixed(1)}h</strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingPatternId(null)}
                    className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePatternForm}
                    className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                  >
                    保存班组模式
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SPECIAL MARITIME SCENARIO PRESETS & COMPLIANCE PLANNER */}
      {plannerTab === 'scenario_planner' && (
        <div className="space-y-5">
          {/* Preset Buttons for Real Ship Scenarios */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>特殊航行与港内实际工作场景一键预设 (Maritime Operational Presets)</span>
              </h3>
              <span className="text-[11px] text-slate-400">自动根据船舶实际运行调整班组与值班日志</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Preset 1: 新证三副上船 / 船长夜间督航 */}
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 hover:border-amber-500/50 transition space-y-2 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <span>🎓 新证三副上船 / 船长夜间督航</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    新证三副登轮，船长在夜间 (21:00-24:00) 上驾驶台协助与监督指导，自动为船长录入夜间督航班并记录官方备注。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyJuniorThirdOfficerNightWatch}
                  className="w-full mt-2 px-3 py-1.5 bg-amber-600/90 hover:bg-amber-500 text-white rounded font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>应用新证三副+船长督航排班</span>
                </button>
              </div>

              {/* Preset 2: 港内/狭水道 三副与二副 6-6 两班倒切换 */}
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 hover:border-cyan-500/50 transition space-y-2 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <span>🚢 港内/狭水道 6-6 两班倒切换</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    靠港或通过密集狭水道时，三副与二副由常规 4-8 班一键切换为 6-On / 6-Off 高强度两班倒轮流值班。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyPort66WatchShift}
                  className="w-full mt-2 px-3 py-1.5 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>应用港内 6-6 两班倒切换</span>
                </button>
              </div>

              {/* Preset 3: 日勤+港口夜间压排水加班 */}
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 hover:border-blue-500/50 transition space-y-2 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                    <span>⚓ 港口大副/水手长压排水加班</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    大副与水手长在靠泊装卸货期间，常日勤外附加夜间 (18:00-22:00) 压排水与货舱监装加班。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExtraWorkHours(4);
                    setScenarioName('大副/水手长港口压排水与货物监装加班');
                    showToast('已加载港口压排水加班测算参数');
                  }}
                  className="w-full mt-2 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white rounded font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>载入压排水加班测算</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left Column: Scenario Input Controls */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <h3 className="font-bold text-xs text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>测算参数与人员设置</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">情景名称 / 作业说明</label>
                  <input
                    type="text"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">选择测算船员</label>
                  <select
                    value={selectedCrewId}
                    onChange={(e) => setSelectedCrewId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {crew.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.rank})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">起始日期</label>
                    <input
                      type="date"
                      value={plannerDate}
                      onChange={(e) => setPlannerDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">结束日期</label>
                    <input
                      type="date"
                      value={plannerEndDate}
                      onChange={(e) => setPlannerEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">基础值班班组 (Base Pattern)</label>
                  <select
                    value={selectedPatternId}
                    onChange={(e) => setSelectedPatternId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {watchPatterns.map((wp) => (
                      <option key={wp.id} value={wp.id}>
                        {wp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 font-medium mb-1">
                    <span>附加夜间/特别作业时长</span>
                    <span className="text-amber-400 font-bold">{extraWorkHours.toFixed(1)} 小时</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={extraWorkHours}
                    onChange={(e) => setExtraWorkHours(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Simulation Result & Risk Analysis */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>模拟 24 小时工时状态 Profile: {scenarioName}</span>
                  <span className="text-slate-400 text-[11px] font-normal">{selectedCrewMember?.rank} - {selectedCrewMember?.name}</span>
                </h3>

                {/* Visual 48 Slot Simulation Bar */}
                <div className="grid grid-cols-48 gap-[1px] bg-slate-900 p-2 rounded-lg border border-slate-800">
                  {scenarioSlots.map((status, idx) => {
                    let bgClass = 'bg-slate-900 border border-slate-800';
                    if (status === 'WORK') bgClass = 'bg-blue-600';
                    if (status === 'OVERTIME') bgClass = 'bg-amber-500';

                    return (
                      <div
                        key={idx}
                        className={`h-9 rounded-xs ${bgClass}`}
                        title={`Slot ${idx + 1}: ${formatSlotTime(idx)} (${status})`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-slate-400 font-medium">预计总工作时长</div>
                    <div className="text-base font-extrabold text-blue-400 mt-1">{plannedWork.toFixed(1)}h</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">STCW 上限: 14.0h</div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-slate-400 font-medium">预计总休息时长</div>
                    <div className={`text-base font-extrabold mt-1 ${plannedRest < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {plannedRest.toFixed(1)}h
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">STCW 底线: 10.0h</div>
                  </div>

                  <div className={`p-3 rounded border ${
                    isUnder10hRest || isOver14hWork || isUnder6hLongest
                      ? 'bg-rose-950/60 border-rose-700 text-rose-200'
                      : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                  }`}>
                    <div className="text-slate-300 font-medium">合规预测状态</div>
                    <div className="text-sm font-extrabold mt-1 flex items-center gap-1.5">
                      {isUnder10hRest || isOver14hWork || isUnder6hLongest ? (
                        <>
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                          <span>存在违规风险</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>合规无违规风险</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Compliance Risk Advice */}
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                isUnder10hRest || isOver14hWork
                  ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              }`}>
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  {isUnder10hRest || isOver14hWork ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>{selectedCrewMember?.name} ({selectedCrewMember?.rank}) STCW 预警建议</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>排班预测符合 STCW 2010 & MLC 2006 国际公约标准</span>
                    </>
                  )}
                </h4>

                {isUnder10hRest || isOver14hWork ? (
                  <p className="text-slate-300 leading-relaxed">
                    在附加 {extraWorkHours.toFixed(1)} 小时作业后，当日休息时长将降至 <span className="text-rose-400 font-bold">{plannedRest.toFixed(1)} 小时</span>，低于 STCW 强制 10 小时最低休息门槛。
                    <br />
                    <span className="font-semibold text-rose-300">船长/大副调整建议：</span> 可分摊部分夜间作业至其他班组人员（如三副或值班水手），或拆分为两段不小于 6 小时连续休息时段，以保持公约合规。
                  </p>
                ) : (
                  <p className="text-slate-300 leading-relaxed">
                    预测休息时长 {plannedRest.toFixed(1)} 小时，且最长连续休息段达 {plannedLongestRest.toFixed(1)} 小时，完全符合 STCW A-VIII/1 规范。
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
