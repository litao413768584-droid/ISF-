import React, { useState } from 'react';
import { CrewMember, WorkLogDay, VesselInfo, NonConformity } from '../types';
import { getMonthDates, calculateDayWorkHours, calculateDayRestHours } from '../utils/complianceEngine';
import { getCrewContractDayStatus } from '../utils/handoverEngine';
import { Calendar, AlertTriangle, CheckCircle, Search, ShieldAlert, FileCheck, Eye, ArrowRight, User } from 'lucide-react';

interface MonthlyTimesheetProps {
  crew: CrewMember[];
  workLogs: Record<string, WorkLogDay>;
  vessel: VesselInfo;
  selectedMonthStr: string; // YYYY-MM
  onMonthChange: (monthStr: string) => void;
  onSelectCrewAndDate: (crewId: string, dateStr: string) => void;
  onOpenNcDetails: (nc: NonConformity) => void;
}

export const MonthlyTimesheet: React.FC<MonthlyTimesheetProps> = ({
  crew,
  workLogs,
  vessel,
  selectedMonthStr,
  onMonthChange,
  onSelectCrewAndDate,
  onOpenNcDetails,
}) => {
  const [selectedCrewId, setSelectedCrewId] = useState<string>(crew[0]?.id || '');
  const [filterMode, setFilterMode] = useState<'ALL' | 'NC_ONLY'>('ALL');

  const [yearStr, monthNumStr] = selectedMonthStr.split('-');
  const year = parseInt(yearStr || '2026', 10);
  const month = parseInt(monthNumStr || '08', 10);

  const monthDates = getMonthDates(year, month);
  const selectedCrewMember = crew.find((c) => c.id === selectedCrewId) || crew[0];

  // Calculate totals for matrix view
  const getCrewMonthSummary = (cId: string) => {
    let totalWork = 0;
    let totalRest = 0;
    let totalNc = 0;

    monthDates.forEach((dStr) => {
      const log = workLogs[`${cId}_${dStr}`];
      if (log) {
        totalWork += calculateDayWorkHours(log.slots);
        totalRest += calculateDayRestHours(log.slots);
        if (log.nonConformities && log.nonConformities.length > 0) {
          totalNc += log.nonConformities.length;
        }
      } else {
        totalRest += 24; // default unlogged day = rest
      }
    });

    return { totalWork, totalRest, totalNc };
  };

  const filteredCrew = crew.filter((c) => {
    if (filterMode === 'NC_ONLY') {
      const { totalNc } = getCrewMonthSummary(c.id);
      return totalNc > 0;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header: Month Selector & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-slate-100 text-sm sm:text-base">全船月度合规工时矩阵</h2>
          
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400">切换月份:</span>
            <input
              type="month"
              value={selectedMonthStr}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent text-blue-400 font-bold text-sm focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            全船人员 ({crew.length} 人)
          </button>
          
          <button
            onClick={() => setFilterMode('NC_ONLY')}
            className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'NC_ONLY'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-950 text-rose-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>仅看违规人员</span>
          </button>
        </div>
      </div>

      {/* CREW X DAYS OVERVIEW HEATMAP MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md overflow-x-auto custom-scrollbar">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>全船船员月度工作与违规监控透视图 ({selectedMonthStr})</span>
          <span className="text-slate-500 font-normal">🟢 正常合规 • 🔴 STCW / MLC 违规警告</span>
        </h3>

        <table className="w-full text-xs text-slate-200 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono">
              <th className="p-2 text-left min-w-[160px]">船员姓名</th>
              <th className="p-2 text-center">职务</th>
              {monthDates.map((dStr) => {
                const dayNum = parseInt(dStr.split('-')[2], 10);
                return (
                  <th key={dStr} className="p-1 text-center w-7 text-[10px] border-l border-slate-800/60">
                    {dayNum}
                  </th>
                );
              })}
              <th className="p-2 text-right min-w-[70px]">总工时</th>
              <th className="p-2 text-right min-w-[70px]">违规项</th>
            </tr>
          </thead>
          <tbody>
            {filteredCrew.map((c) => {
              const { totalWork, totalNc } = getCrewMonthSummary(c.id);
              const isSelected = c.id === selectedCrewId;

              return (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCrewId(c.id)}
                  className={`border-b border-slate-800/60 transition cursor-pointer ${
                    isSelected ? 'bg-blue-950/60 font-medium' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="p-2 font-bold text-slate-100 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span className="truncate">{c.name}</span>
                  </td>
                  <td className="p-2 text-center text-slate-400 text-[11px]">{c.rank}</td>

                  {monthDates.map((dStr) => {
                    const log = workLogs[`${c.id}_${dStr}`];
                    const contractStatus = getCrewContractDayStatus(c, dStr);
                    const hasNc = log && log.nonConformities && log.nonConformities.length > 0;
                    const workH = log ? calculateDayWorkHours(log.slots) : 0;

                    let cellBg = 'bg-slate-950/60 text-slate-600';
                    let cellText = '•';

                    if (contractStatus === 'SIGNED_OFF') {
                      cellBg = 'bg-slate-900/80 text-emerald-400/80 border border-slate-800';
                      cellText = '休';
                    } else if (contractStatus === 'NOT_YET_SIGNED_ON') {
                      cellBg = 'bg-slate-950 text-slate-700';
                      cellText = '-';
                    } else if (contractStatus === 'HANDOVER_IN_PROGRESS') {
                      cellBg = 'bg-indigo-900 text-indigo-200 font-bold border border-indigo-700';
                      cellText = '交';
                    } else if (hasNc) {
                      cellBg = 'bg-rose-600 text-white animate-pulse shadow-xs';
                      cellText = '!';
                    } else if (workH > 0) {
                      cellBg = 'bg-emerald-950 text-emerald-400 border border-emerald-800';
                      cellText = '✓';
                    }

                    return (
                      <td
                        key={dStr}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCrewAndDate(c.id, dStr);
                        }}
                        className="p-0.5 text-center border-l border-slate-800/40 hover:bg-slate-700/60"
                        title={`${c.name} - ${dStr}: Status: ${contractStatus}, ${workH}h Work ${hasNc ? `(${log.nonConformities.length} NC)` : 'Compliant'}`}
                      >
                        <div className={`w-5 h-5 mx-auto rounded flex items-center justify-center text-[10px] font-bold ${cellBg}`}>
                          {cellText}
                        </div>
                      </td>
                    );
                  })}

                  <td className="p-2 text-right font-mono text-blue-400 font-bold">{totalWork.toFixed(1)}h</td>
                  <td className={`p-2 text-right font-mono font-bold ${totalNc > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {totalNc}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SELECTED SEAFARER DAILY BREAKDOWN TABLE */}
      {selectedCrewMember && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  Daily Log Summary: {selectedCrewMember.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                  {selectedCrewMember.rank} ({selectedCrewMember.department})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Month: <span className="text-slate-200 font-semibold">{selectedMonthStr}</span>
              </p>
            </div>

            <button
              onClick={() => onSelectCrewAndDate(selectedCrewMember.id, monthDates[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow"
            >
              <span>Edit 24h Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs text-slate-200">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-left">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5 text-center">Work Hours</th>
                  <th className="p-2.5 text-center">Rest Hours</th>
                  <th className="p-2.5 text-center">24h Rolling Rest</th>
                  <th className="p-2.5 text-center">7d Rolling Rest</th>
                  <th className="p-2.5">STCW Status</th>
                  <th className="p-2.5">Master Remark / Notes</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {monthDates.map((dStr) => {
                  const log = workLogs[`${selectedCrewMember.id}_${dStr}`];
                  const workH = log ? calculateDayWorkHours(log.slots) : 0;
                  const restH = log ? calculateDayRestHours(log.slots) : 24;
                  const ncs = log?.nonConformities || [];
                  const isNc = ncs.length > 0;

                  return (
                    <tr
                      key={dStr}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition ${
                        isNc ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="p-2.5 font-mono font-bold text-slate-200">{dStr}</td>
                      <td className="p-2.5 text-center font-mono text-blue-400 font-semibold">{workH.toFixed(1)}h</td>
                      <td className="p-2.5 text-center font-mono text-emerald-400 font-semibold">{restH.toFixed(1)}h</td>
                      <td className={`p-2.5 text-center font-mono font-bold ${
                        (log?.rolling24hRest ?? 12) < 10 ? 'text-rose-400' : 'text-slate-300'
                      }`}>
                        {(log?.rolling24hRest ?? 12.0).toFixed(1)}h
                      </td>
                      <td className={`p-2.5 text-center font-mono font-bold ${
                        (log?.rolling7dRest ?? 100) < (vessel.allowSTCWException ? 70 : 77) ? 'text-rose-400' : 'text-slate-300'
                      }`}>
                        {(log?.rolling7dRest ?? 100.0).toFixed(1)}h
                      </td>
                      <td className="p-2.5">
                        {isNc ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              NC ({ncs.length})
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            Compliant
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-400 italic max-w-xs truncate">
                        {log?.notes || '-'}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => onSelectCrewAndDate(selectedCrewMember.id, dStr)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyTimesheet;