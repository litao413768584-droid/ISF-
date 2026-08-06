import React, { useState } from 'react';
import { CrewMember, WorkLogDay, VesselInfo } from '../types';
import { getMonthDates, calculateDayWorkHours, calculateDayRestHours, validateDayCompliance } from '../utils/complianceEngine';
import { isStatutoryHoliday, getStatutoryHolidayInfo } from '../utils/holidays';
import { getCrewContractDayStatus } from '../utils/handoverEngine';
import { Printer, ShieldCheck, FileText, Anchor, Layers } from 'lucide-react';

interface OfficialReportModalProps {
  crew: CrewMember[];
  selectedCrewId: string;
  onSelectCrew: (crewId: string) => void;
  workLogs: Record<string, WorkLogDay>;
  vessel: VesselInfo;
  selectedMonthStr: string; // YYYY-MM
  onMonthChange: (monthStr: string) => void;
  onSaveSignatures: (crewId: string, seafarerSig: string, masterSig: string, deptHeadSig?: string) => void;
}

export const OfficialReportModal: React.FC<OfficialReportModalProps> = ({
  crew,
  selectedCrewId,
  onSelectCrew,
  workLogs,
  vessel,
  selectedMonthStr,
  onMonthChange,
  onSaveSignatures,
}) => {
  const [reportType, setReportType] = useState<'individual' | 'working_arrangements'>('individual');
  const currentCrew = crew.find((c) => c.id === selectedCrewId) || crew[0];

  // Find Department Heads
  const chiefOfficer = crew.find((c) => 
    c.rank.toLowerCase().includes('chief officer') || 
    c.rank.includes('大副') || 
    c.rank.toLowerCase().includes('mate')
  );
  const chiefEngineer = crew.find((c) => 
    c.rank.toLowerCase().includes('chief engineer') || 
    c.rank.includes('轮机长')
  );

  const isEngineDept = currentCrew?.department === 'Engine' || 
    currentCrew?.rank.includes('轮机') || 
    currentCrew?.rank.toLowerCase().includes('engineer');

  const defaultDeptHeadCleanName = isEngineDept 
    ? (chiefEngineer ? chiefEngineer.name : 'Chief Engineer')
    : (chiefOfficer ? chiefOfficer.name : 'Chief Officer');

  const [typedSeafarerSig, setTypedSeafarerSig] = useState<string>(
    currentCrew?.seafarerSignature?.typedName || currentCrew?.name || ''
  );
  const [typedMasterSig, setTypedMasterSig] = useState<string>(
    currentCrew?.masterApproval?.masterName || vessel.masterName || ''
  );
  const [typedDeptHeadSig, setTypedDeptHeadSig] = useState<string>(
    currentCrew?.deptHeadApproval?.deptHeadName || defaultDeptHeadCleanName
  );

  const [isSigned, setIsSigned] = useState<boolean>(!!currentCrew?.seafarerSignature);
  const [isDeptHeadApproved, setIsDeptHeadApproved] = useState<boolean>(!!currentCrew?.deptHeadApproval);
  const [isMasterApproved, setIsMasterApproved] = useState<boolean>(!!currentCrew?.masterApproval);

  // Sync state when selected crew changes
  React.useEffect(() => {
    setTypedSeafarerSig(currentCrew?.seafarerSignature?.typedName || currentCrew?.name || '');
    setTypedMasterSig(currentCrew?.masterApproval?.masterName || vessel.masterName || '');
    setTypedDeptHeadSig(currentCrew?.deptHeadApproval?.deptHeadName || defaultDeptHeadCleanName);
    setIsSigned(!!currentCrew?.seafarerSignature);
    setIsDeptHeadApproved(!!currentCrew?.deptHeadApproval);
    setIsMasterApproved(!!currentCrew?.masterApproval);
  }, [selectedCrewId, currentCrew, vessel.masterName, defaultDeptHeadCleanName]);

  const [yearStr, monthNumStr] = selectedMonthStr.split('-');
  const year = parseInt(yearStr || '2026', 10);
  const month = parseInt(monthNumStr || '08', 10);
  const monthDates = getMonthDates(year, month);

  // Month stats calculation
  let monthTotalWork = 0;
  let monthTotalRest = 0;
  let monthTotalNc = 0;
  let monthHolidayOt = 0;

  monthDates.forEach((dStr) => {
    const log = workLogs[`${currentCrew.id}_${dStr}`];
    const isHoliday = isStatutoryHoliday(dStr);
    if (log) {
      const work = calculateDayWorkHours(log.slots);
      monthTotalWork += work;
      monthTotalRest += calculateDayRestHours(log.slots);
      if (isHoliday) monthHolidayOt += work;
      if (log.nonConformities && log.nonConformities.length > 0) {
        monthTotalNc += log.nonConformities.length;
      }
    } else {
      monthTotalRest += 24;
    }
  });

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSignatures(currentCrew.id, typedSeafarerSig, typedMasterSig, typedDeptHeadSig);
    setIsSigned(true);
    setIsDeptHeadApproved(true);
    setIsMasterApproved(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Printable Control Bar (Hidden during printing) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Printer className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-slate-100 text-sm sm:text-base">
            IMO / ILO Standard Timesheet & Shipboard Working Arrangements
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Report Type Selector */}
          <div className="flex bg-slate-950 p-1 rounded border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setReportType('individual')}
              className={`px-3 py-1 rounded cursor-pointer transition ${
                reportType === 'individual'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              海员工作和休息时间记录表
            </button>
            <button
              onClick={() => setReportType('working_arrangements')}
              className={`px-3 py-1 rounded cursor-pointer transition ${
                reportType === 'working_arrangements'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              船上工作安排表 (Working Arrangements)
            </button>
          </div>

          {/* Crew Selector (For Individual Timesheet) */}
          {reportType === 'individual' && (
            <select
              value={selectedCrewId}
              onChange={(e) => onSelectCrew(e.target.value)}
              className="bg-slate-950 text-slate-100 border border-slate-700 rounded px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {crew.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.rank})
                </option>
              ))}
            </select>
          )}

          {/* Month Selector */}
          <input
            type="month"
            value={selectedMonthStr}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-slate-950 text-blue-400 font-bold border border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
          />

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* REPORT TYPE 1: SEAFARER WORK & REST HOURS RECORD (SQR-GEN008 STANDARD FORM) */}
      {reportType === 'individual' && (
        <div className="bg-[#fcfdf2] text-slate-900 p-6 rounded-xl border border-slate-400 shadow-2xl print:shadow-none print:border-none print:p-0 max-w-5xl mx-auto font-sans text-xs">
          
          {/* SQR-GEN008 TOP HEADER BAR */}
          <div className="border border-slate-800 bg-[#f7f9d8] p-3 rounded-t text-xs mb-0">
            <div className="flex items-center justify-between border-b border-slate-600 pb-2 mb-2 font-mono">
              <div className="flex items-center gap-4">
                <span><strong className="font-sans">Ship :</strong> {vessel.name}</span>
                <span><strong className="font-sans">M/Year :</strong> {monthNumStr}/{yearStr}</span>
              </div>
              <div className="text-center font-sans">
                <h1 className="text-lg font-black tracking-wider text-slate-900 leading-tight">
                  工作/休息时间记录
                </h1>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  Working/Rest hours record
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span><strong className="font-sans">Serial No :</strong> SQR-{yearStr}-{monthNumStr}</span>
                <span className="text-[10px] text-slate-600 font-bold">Ver 1.0/0 &nbsp; SQR-GEN008</span>
              </div>
            </div>

            {/* Crew Member Attributes Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-medium">
              <div>
                <strong className="text-slate-700">船员姓名 Name:</strong> <span className="font-bold underline text-slate-950 ml-1">{currentCrew.name}</span>
              </div>
              <div>
                <strong className="text-slate-700">职务 Rank:</strong> <span className="font-bold underline text-slate-950 ml-1">{currentCrew.rank}</span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-slate-700">是否值班人员:</strong>
                <span className="font-bold text-slate-900">
                  yes [{currentCrew.isWatchkeeper ? ' ✓ ' : '   '}] &nbsp; no [{!currentCrew.isWatchkeeper ? ' ✓ ' : '   '}]
                </span>
              </div>
            </div>
          </div>

          {/* Subtitle / Instructions Bar above Table */}
          <div className="flex items-center justify-between bg-[#f0f4cd] border-x border-slate-800 px-3 py-1 text-[10px] font-bold text-slate-800">
            <div>
              请在下表中以『✔』标示工作时间，『×』标示休息时间。Please mark periods of work with '✔' and rest with '×'.
            </div>
            <div className="uppercase tracking-wide font-extrabold text-slate-900 pr-2">
              TO BE COMPLETED BY THE HEAD OF DEPT.
            </div>
          </div>

          {/* SQR-GEN008 GRID TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-800 text-[10px] bg-white">
              <thead>
                <tr className="bg-[#e2e8b8] text-slate-950 font-bold border-b border-slate-800 font-mono text-[9px]">
                  <th className="border border-slate-800 p-1 w-10 text-center font-sans text-[10px]">
                    <div>Hours</div>
                    <div className="border-t border-slate-700 pt-0.5">Date</div>
                  </th>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <th key={h} className="border border-slate-800 p-0.5 text-center w-5">
                      {h.toString().padStart(2, '0')}
                    </th>
                  ))}
                  <th className="border border-slate-800 p-1 w-20 text-center leading-tight bg-[#dce3a8] font-sans">
                    Hours of work in 24-hour period
                  </th>
                  <th className="border border-slate-800 p-1 w-20 text-center leading-tight bg-[#dce3a8] font-sans">
                    Hours of rest in any 24-hour period
                  </th>
                  <th className="border border-slate-800 p-1 w-20 text-center leading-tight bg-[#dce3a8] font-sans">
                    Hours of rest in any 7-day period
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthDates.map((dStr) => {
                  const dayNum = parseInt(dStr.split('-')[2], 10);
                  const log = workLogs[`${currentCrew.id}_${dStr}`];
                  const slots = log ? log.slots : new Array(48).fill('REST');
                  const workH = calculateDayWorkHours(slots);
                  const restH = calculateDayRestHours(slots);
                  
                  // Compute rolling compliance stats dynamically for current crew
                  const valResult = validateDayCompliance(dStr, workLogs, vessel, currentCrew.id);
                  const rolling24hRest = valResult.rolling24hRest;
                  const rolling7dRest = valResult.rolling7dRest;
                  
                  const ncs = log?.nonConformities || [];
                  const hasNc = ncs.length > 0;
                  const contractStatus = currentCrew ? getCrewContractDayStatus(currentCrew, dStr) : 'ACTIVE_ONBOARD';

                  let contractBgClass = 'bg-[#fafce8]';
                  if (contractStatus === 'SIGNED_OFF') contractBgClass = 'bg-slate-100 text-slate-400 italic';
                  else if (contractStatus === 'NOT_YET_SIGNED_ON') contractBgClass = 'bg-slate-50 text-slate-400';
                  else if (hasNc) contractBgClass = 'bg-red-50/80';

                  return (
                    <tr key={dStr} className={`border-b border-slate-700 ${contractBgClass}`}>
                      <td className="border border-slate-800 p-1 text-center font-bold font-mono bg-[#edf1ca]">
                        {dayNum}
                      </td>

                      {/* 24 Hour columns with 2 half-hour sub-columns per hour */}
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const slot1 = slots[hour * 2];
                        const slot2 = slots[hour * 2 + 1];
                        const isWork1 = slot1 === 'WORK' || slot1 === 'OVERTIME';
                        const isWork2 = slot2 === 'WORK' || slot2 === 'OVERTIME';

                        return (
                          <td
                            key={hour}
                            className="border border-slate-600 p-0 text-center bg-[#fbfde8]"
                            title={`${dStr} Hour ${hour}:00 - ${hour + 1}:00`}
                          >
                            <div className="h-4 w-full flex">
                              <div className={`w-1/2 h-full flex items-center justify-center font-mono text-[8px] leading-none ${isWork1 ? 'bg-amber-200/90 text-emerald-950 font-black' : 'bg-transparent text-slate-400 font-medium'}`}>
                                {isWork1 ? '✔' : '×'}
                              </div>
                              <div className={`w-1/2 h-full flex items-center justify-center font-mono text-[8px] leading-none border-l border-slate-300 ${isWork2 ? 'bg-amber-200/90 text-emerald-950 font-black' : 'bg-transparent text-slate-400 font-medium'}`}>
                                {isWork2 ? '✔' : '×'}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      <td className="border border-slate-800 p-1 text-center font-mono font-bold text-slate-950 bg-[#f7f9d8]">
                        {workH.toFixed(1)}
                      </td>
                      <td className={`border border-slate-800 p-1 text-center font-mono font-bold bg-[#f7f9d8] ${
                        rolling24hRest < 10.0 ? 'text-red-600 font-black bg-red-100' : 'text-slate-900'
                      }`}>
                        {rolling24hRest.toFixed(1)}
                      </td>
                      <td className={`border border-slate-800 p-1 text-center font-mono font-bold bg-[#f7f9d8] ${
                        rolling7dRest < 77.0 ? 'text-red-600 font-black bg-red-100' : 'text-slate-900'
                      }`}>
                        {rolling7dRest.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}

                {/* Hours Scale Row at Bottom */}
                <tr className="bg-[#e2e8b8] text-slate-900 font-bold border-t border-b border-slate-800 font-mono text-[9px]">
                  <td className="border border-slate-800 p-1 text-center font-sans font-bold">Hours</td>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <td key={h} className="border border-slate-800 p-0.5 text-center">
                      {h.toString().padStart(2, '0')}
                    </td>
                  ))}
                  <td className="border border-slate-800 p-1 text-center bg-[#dce3a8]" colSpan={3}>
                    SUMMARY
                  </td>
                </tr>

                {/* Total Row */}
                <tr className="bg-[#edf1ca] font-bold border-t-2 border-slate-900 text-slate-950">
                  <td className="border border-slate-800 p-1 text-center font-sans">Total</td>
                  <td className="border border-slate-800 p-1 text-center font-sans text-slate-700" colSpan={24}>
                    Monthly Accumulation / 月度总和 (法定节假日加班: {monthHolidayOt.toFixed(1)}h)
                  </td>
                  <td className="border border-slate-800 p-1 text-center font-mono text-slate-950 font-black">{monthTotalWork.toFixed(1)}</td>
                  <td className="border border-slate-800 p-1 text-center font-mono text-emerald-950 font-black">{monthTotalRest.toFixed(1)}</td>
                  <td className="border border-slate-800 p-1 text-center font-mono text-slate-900" colSpan={1}>
                    NC: {monthTotalNc}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SQR-GEN008 OFFICIAL FOOTER SIGNATURE BLOCK */}
          <div className="mt-4 border-t-2 border-slate-900 pt-3 bg-[#f7f9d8] p-3 rounded border border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
              <div>
                <div className="font-bold text-slate-900 mb-1">船长 Master :</div>
                <div className="border-b border-slate-800 pb-1 font-mono font-bold text-slate-900 flex justify-between items-center">
                  <span>{typedMasterSig || vessel.masterName || 'Master Signature'}</span>
                  {isMasterApproved && <span className="text-emerald-800 text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-sans">Signed</span>}
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-900 mb-1">部门长 Head of Department :</div>
                <div className="border-b border-slate-800 pb-1 font-mono font-bold text-slate-900 flex justify-between items-center">
                  <span>{typedDeptHeadSig || defaultDeptHeadCleanName}</span>
                  <span className="text-emerald-800 text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-sans">Signed</span>
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-900 mb-1">船员本人 Seaman :</div>
                <div className="border-b border-slate-800 pb-1 font-mono font-bold text-slate-900 flex justify-between items-center">
                  <span>{typedSeafarerSig || currentCrew.name}</span>
                  {isSigned && <span className="text-emerald-800 text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-sans">Signed</span>}
                </div>
              </div>
            </div>

            {/* Official Footnote Text */}
            <div className="mt-3 text-[9px] text-slate-700 leading-normal border-t border-slate-400 pt-2 font-sans">
              <strong>注：</strong>依据：SQM-05/PART3/07，本工作时间记录应由船员每天进行记录，每月末交给所属部门长，由部门长汇总至船长处，相关人员签字后正本留船长处，副本一份发给船员本人。The form should be recorded daily by personnel and delivered to headquarter after signature at end of each month. Then headquarter will transfer it to master to keep. Copy should be kept by himself.
            </div>

            {/* Print Sign Form Buttons (Hidden when printing) */}
            <div className="mt-3 pt-2.5 border-t border-slate-300 print:hidden">
              <form onSubmit={handleSignSubmit} className="space-y-2">
                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                  <span>✍️ 三方审签存盘区 (Electronic Signatures Entry):</span>
                  <span className="text-[10px] font-normal text-slate-600">点击【签名存盘】保存本月表单最终签署状态</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 mb-1">
                      1. 船员本人签名 (Seaman)
                    </label>
                    <input
                      type="text"
                      value={typedSeafarerSig}
                      onChange={(e) => setTypedSeafarerSig(e.target.value)}
                      placeholder="船员本人姓名"
                      className="bg-white border border-slate-400 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 mb-1">
                      2. 部门长签名 ({isEngineDept ? '轮机部: 轮机长 Chief Engineer' : '甲板部: 大副 Chief Officer'})
                    </label>
                    <input
                      type="text"
                      value={typedDeptHeadSig}
                      onChange={(e) => setTypedDeptHeadSig(e.target.value)}
                      placeholder={isEngineDept ? "轮机长签名" : "大副签名"}
                      className="bg-white border border-slate-400 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 mb-1">
                      3. 船长签名 (Master)
                    </label>
                    <input
                      type="text"
                      value={typedMasterSig}
                      onChange={(e) => setTypedMasterSig(e.target.value)}
                      placeholder="船长姓名"
                      className="bg-white border border-slate-400 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow cursor-pointer transition flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirm Signatures / 签名存盘</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      )}

      {/* REPORT TYPE 2: TABLE OF SHIPBOARD WORKING ARRANGEMENTS */}
      {reportType === 'working_arrangements' && (
        <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-300 shadow-2xl print:shadow-none print:border-none print:p-0 max-w-5xl mx-auto font-sans text-xs space-y-4">
          <div className="border-b-2 border-slate-900 pb-3 text-center">
            <h1 className="text-lg font-black uppercase text-slate-900 tracking-wide">
              TABLE OF SHIPBOARD WORKING ARRANGEMENTS / 船上工作安排表
            </h1>
            <p className="text-[11px] text-slate-600 font-medium">
              MLC 2006 Standard A2.3 & STCW 2010 Section A-VIII/1 • Posted in Easily Accessible Location on Vessel
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded border border-slate-300 text-xs">
            <div>
              <span className="text-slate-500 font-bold block">Ship Name / 船名:</span>
              <strong className="text-slate-900">{vessel.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-bold block">Flag State / 船旗:</span>
              <strong className="text-slate-900">{vessel.flagState}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-bold block">IMO No.:</span>
              <strong className="text-slate-900">{vessel.imoNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-bold block">Standard Daily Hours:</span>
              <strong className="text-emerald-800">8h Work / 16h Rest</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                  <th className="border border-slate-400 p-2 text-left">Rank / 职务</th>
                  <th className="border border-slate-400 p-2 text-center">Duty Status</th>
                  <th className="border border-slate-400 p-2 text-center">Standard Work Hours at Sea (海上工作时间)</th>
                  <th className="border border-slate-400 p-2 text-center">Standard Work Hours in Port (港内工作时间)</th>
                  <th className="border border-slate-400 p-2 text-center">Total Scheduled Daily Hours</th>
                </tr>
              </thead>
              <tbody>
                {crew.map((c) => {
                  let dutyStatus = c.isWatchkeeper ? '值班 (Watchkeeping)' : '非值班 (Non-watchkeeping)';
                  let scheduleText = '08:00-12:00 ; 13:00-17:00';
                  if (c.rank.includes('Chief Officer')) scheduleText = '00:00-04:00 ; 12:00-16:00';
                  if (c.rank.includes('2nd Officer')) scheduleText = '04:00-08:00 ; 16:00-20:00';
                  if (c.rank.includes('3rd Officer')) scheduleText = '08:00-12:00 ; 20:00-24:00';
                  if (c.rank.includes('Cook') || c.rank.includes('厨工')) {
                    dutyStatus = '非值班 (Non-watchkeeping)';
                    scheduleText = '06:00-12:00 ; 16:00-18:00';
                  }
                  if (c.rank.includes('Steward') || c.rank.includes('服务员')) {
                    dutyStatus = '非值班 (Non-watchkeeping)';
                    scheduleText = '07:00-13:00 ; 17:00-19:00';
                  }
                  if (c.department === 'Engine' && c.isWatchkeeper) {
                    dutyStatus = '轮机有人值班 (Manned Engine Watch)';
                  }

                  return (
                    <tr key={c.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">{c.rank} ({c.name})</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{dutyStatus}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-semibold">{scheduleText}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-semibold">{scheduleText}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold text-blue-900">8.0 hrs</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-300 space-y-1 text-[11px] text-slate-700">
            <div className="font-bold text-slate-900">填表及排班重要提示 (Shipboard Rules Note):</div>
            <p>1. 《船上工作安排表》中，“值班 (Watchkeeping)” 与 “非值班 (Non-watchkeeping)” 为相互排斥状态，不可同时勾选。</p>
            <p>2. 本船轮机部执行“有人值班 (Manned Engine Watch)”模式，轮机员与机匠按 4-8 / 8-12 / 12-4 班次在机舱集中控制室与现场连续值班，正常值班时间计入常规工时（不作为加班计算）。</p>
            <p>3. 厨工标准工时为 0600-1200 / 1600-1800；服务员标准工时为 0700-1300 / 1700-1900。</p>
          </div>
        </div>
      )}
    </div>
  );
};
