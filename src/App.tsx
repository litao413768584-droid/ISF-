import React, { useState, useEffect } from 'react';
import { AppData, SlotStatus, WorkLogDay, VesselInfo, CrewMember, NonConformity, BatchAssignParams, WatchPattern } from './types';
import { loadAppData, saveAppData, exportAppDataJSON, resetAppDataToDefault } from './utils/storage';
import { validateDayCompliance, getShiftedDateStr, calculateDayWorkHours, calculateDayRestHours } from './utils/complianceEngine';

import { Header } from './components/Header';
import { CrewRoster } from './components/CrewRoster';
import { WorkGrid24h } from './components/WorkGrid24h';
import { MonthlyTimesheet } from './components/MonthlyTimesheet';
import { OfficialReportModal } from './components/OfficialReportModal';
import { SchedulePlanner } from './components/SchedulePlanner';
import { VesselSettingsModal } from './components/VesselSettingsModal';
import { NCDetailsModal } from './components/NCDetailsModal';
import { BatchAssignModal } from './components/BatchAssignModal';
import { VesselStatusModal } from './components/VesselStatusModal';
import { VesselStatusLog } from './types';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<'grid' | 'matrix' | 'report' | 'planner' | 'analytics'>('grid');

  const [selectedCrewId, setSelectedCrewId] = useState<string>(appData.crew[0]?.id || '');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-08-04');
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>('2026-08');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBatchAssignOpen, setIsBatchAssignOpen] = useState<boolean>(false);
  const [isVesselStatusModalOpen, setIsVesselStatusModalOpen] = useState<boolean>(false);
  const [selectedNc, setSelectedNc] = useState<NonConformity | null>(null);

  // Active vessel status log covering current selectedDateStr
  const activeVesselStatusLog = (appData.vesselStatusLogs || []).find(
    (log) => selectedDateStr >= log.startDate && selectedDateStr <= log.endDate
  );

  // Handle saving vessel status logs array
  const handleSaveVesselStatusLogs = (updatedLogs: VesselStatusLog[]) => {
    setAppData((prev) => ({
      ...prev,
      vesselStatusLogs: updatedLogs,
    }));
  };

  // Handle saving watch patterns
  const handleSaveWatchPatterns = (updatedPatterns: WatchPattern[]) => {
    setAppData((prev) => ({
      ...prev,
      watchPatterns: updatedPatterns,
    }));
  };

  // Handle Applying Status Watch Roster based on Vessel Operational Status
  const handleApplyStatusWatch = (
    statusType: string,
    startDate: string,
    endDate: string,
    customPatternId?: string
  ) => {
    const updatedWorkLogs = { ...appData.workLogs };

    // Select target pattern based on statusType or custom selection
    let patternIdToApply = customPatternId;
    if (!patternIdToApply) {
      if (statusType === 'at_anchor' || statusType === 'cargo_ops') {
        patternIdToApply = 'pattern_6_6_1'; // Anchorage / Port watch
      } else if (statusType === 'port_berthing') {
        patternIdToApply = 'pattern_daywork'; // Port Daywork
      } else {
        patternIdToApply = 'pattern_4_8_1'; // At Sea Watch
      }
    }

    const defaultPattern = appData.watchPatterns.find((p) => p.id === patternIdToApply) || appData.watchPatterns[0];

    // Iterate through date range and apply to watchkeepers or crew members
    const start = new Date(startDate);
    const end = new Date(endDate);
    const statusLabelMap: Record<string, string> = {
      at_sea: '在航航行值班',
      at_anchor: '锚泊防台值班',
      port_berthing: '靠泊码头值班',
      cargo_ops: '装卸货物值班',
      drydock: '进坞修船值班',
    };

    const statusNote = `[船舶状态排班: ${statusLabelMap[statusType] || statusType}]`;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];

      appData.crew.forEach((c) => {
        // If crew member has customPatternSlots, prefer custom pattern slots, otherwise use selected pattern
        const slotsToApply = (c.customPatternSlots && c.customPatternSlots.length === 48)
          ? [...c.customPatternSlots]
          : [...defaultPattern.slots];

        const key = `${c.id}_${dStr}`;
        const existingLog = updatedWorkLogs[key];
        const existingNote = existingLog?.notes || '';
        const combinedNote = existingNote.includes(statusNote) ? existingNote : `${existingNote} ${statusNote}`.trim();

        const tempLog: WorkLogDay = {
          date: dStr,
          slots: slotsToApply,
          totalWorkHours: calculateDayWorkHours(slotsToApply),
          totalRestHours: calculateDayRestHours(slotsToApply),
          longestRestPeriod: 0,
          restPeriodCount: 0,
          rolling24hRest: 0,
          rolling7dRest: 0,
          nonConformities: [],
          notes: combinedNote,
        };

        updatedWorkLogs[key] = tempLog;

        const valResult = validateDayCompliance(dStr, updatedWorkLogs, appData.vessel, c.id);
        updatedWorkLogs[key] = {
          ...tempLog,
          rolling24hRest: valResult.rolling24hRest,
          rolling7dRest: valResult.rolling7dRest,
          nonConformities: valResult.nonConformities,
          longestRestPeriod: valResult.longestRestPeriod,
          restPeriodCount: valResult.restPeriodCount,
        };
      });
    }

    setAppData((prev) => ({
      ...prev,
      workLogs: updatedWorkLogs,
    }));
  };

  // Auto-persist whenever appData changes
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

  // Selected Crew Member
  const currentCrew = appData.crew.find((c) => c.id === selectedCrewId) || appData.crew[0];

  // Selected Log Key
  const logKey = `${selectedCrewId}_${selectedDateStr}`;
  const currentWorkLog = appData.workLogs[logKey];

  // Total Non-Conformity Count for vessel top banner badge
  const totalNcCount = (Object.values(appData.workLogs) as WorkLogDay[]).reduce((acc: number, log: WorkLogDay) => {
    return acc + (log.nonConformities ? log.nonConformities.length : 0);
  }, 0);

  // Handle 24h Slot Update
  const handleUpdateSlots = (dateStr: string, newSlots: SlotStatus[], note?: string) => {
    const key = `${selectedCrewId}_${dateStr}`;
    
    // Evaluate compliance
    const updatedLogs = { ...appData.workLogs };
    const tempLog: WorkLogDay = {
      date: dateStr,
      slots: newSlots,
      totalWorkHours: calculateDayWorkHours(newSlots),
      totalRestHours: calculateDayRestHours(newSlots),
      longestRestPeriod: 0,
      restPeriodCount: 0,
      rolling24hRest: 0,
      rolling7dRest: 0,
      nonConformities: [],
      notes: note !== undefined ? note : updatedLogs[key]?.notes,
    };

    updatedLogs[key] = tempLog;

    // Validate using continuous engine
    const valResult = validateDayCompliance(dateStr, updatedLogs, appData.vessel, selectedCrewId);

    updatedLogs[key] = {
      ...tempLog,
      rolling24hRest: valResult.rolling24hRest,
      rolling7dRest: valResult.rolling7dRest,
      nonConformities: valResult.nonConformities,
      longestRestPeriod: valResult.longestRestPeriod,
      restPeriodCount: valResult.restPeriodCount,
    };

    setAppData((prev) => ({
      ...prev,
      workLogs: updatedLogs,
    }));
  };

  // Copy Previous Day
  const handleCopyPreviousDay = () => {
    const prevDateStr = getShiftedDateStr(selectedDateStr, -1);
    const prevKey = `${selectedCrewId}_${prevDateStr}`;
    const prevLog = appData.workLogs[prevKey];

    if (prevLog) {
      handleUpdateSlots(selectedDateStr, [...prevLog.slots], prevLog.notes);
    } else {
      alert(`No logged hours found for yesterday (${prevDateStr}).`);
    }
  };

  // Copy to entire 7 days forward
  const handleCopyToWeek = () => {
    const currentSlots = currentWorkLog ? currentWorkLog.slots : new Array(48).fill('REST');
    const currentNotes = currentWorkLog?.notes || '';
    const updatedLogs = { ...appData.workLogs };

    for (let i = 0; i < 7; i++) {
      const targetDate = getShiftedDateStr(selectedDateStr, i);
      const key = `${selectedCrewId}_${targetDate}`;
      
      const tempLog: WorkLogDay = {
        date: targetDate,
        slots: [...currentSlots],
        totalWorkHours: calculateDayWorkHours(currentSlots),
        totalRestHours: calculateDayRestHours(currentSlots),
        longestRestPeriod: 0,
        restPeriodCount: 0,
        rolling24hRest: 0,
        rolling7dRest: 0,
        nonConformities: [],
        notes: currentNotes,
      };
      updatedLogs[key] = tempLog;

      const valResult = validateDayCompliance(targetDate, updatedLogs, appData.vessel);
      updatedLogs[key] = {
        ...tempLog,
        rolling24hRest: valResult.rolling24hRest,
        rolling7dRest: valResult.rolling7dRest,
        nonConformities: valResult.nonConformities,
        longestRestPeriod: valResult.longestRestPeriod,
        restPeriodCount: valResult.restPeriodCount,
      };
    }

    setAppData((prev) => ({ ...prev, workLogs: updatedLogs }));
  };

  // Copy to entire month (all days in selected month)
  const handleCopyToMonth = () => {
    const currentSlots = currentWorkLog ? currentWorkLog.slots : new Array(48).fill('REST');
    const currentNotes = currentWorkLog?.notes || '';
    const updatedLogs = { ...appData.workLogs };

    const [yearStr, monthStr] = selectedDateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month)) return;

    // Total days in target month
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayPadded = day.toString().padStart(2, '0');
      const targetDate = `${yearStr}-${monthStr}-${dayPadded}`;
      const key = `${selectedCrewId}_${targetDate}`;

      const tempLog: WorkLogDay = {
        date: targetDate,
        slots: [...currentSlots],
        totalWorkHours: calculateDayWorkHours(currentSlots),
        totalRestHours: calculateDayRestHours(currentSlots),
        longestRestPeriod: 0,
        restPeriodCount: 0,
        rolling24hRest: 0,
        rolling7dRest: 0,
        nonConformities: [],
        notes: currentNotes,
      };
      updatedLogs[key] = tempLog;

      const valResult = validateDayCompliance(targetDate, updatedLogs, appData.vessel);
      updatedLogs[key] = {
        ...tempLog,
        rolling24hRest: valResult.rolling24hRest,
        rolling7dRest: valResult.rolling7dRest,
        nonConformities: valResult.nonConformities,
        longestRestPeriod: valResult.longestRestPeriod,
        restPeriodCount: valResult.restPeriodCount,
      };
    }

    setAppData((prev) => ({ ...prev, workLogs: updatedLogs }));
  };

  // Add Crew
  const handleAddCrew = (newCrew: CrewMember) => {
    setAppData((prev) => ({
      ...prev,
      crew: [...prev.crew, newCrew],
    }));
  };

  // Update Crew
  const handleUpdateCrew = (updated: CrewMember) => {
    setAppData((prev) => ({
      ...prev,
      crew: prev.crew.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  // Delete Crew
  const handleDeleteCrew = (crewId: string) => {
    setAppData((prev) => ({
      ...prev,
      crew: prev.crew.filter((c) => c.id !== crewId),
    }));
    if (selectedCrewId === crewId) {
      const remaining = appData.crew.filter((c) => c.id !== crewId);
      if (remaining.length > 0) setSelectedCrewId(remaining[0].id);
    }
  };

  // Handle Batch Assign
  const handleApplyBatch = (params: BatchAssignParams) => {
    const {
      crewIds,
      startDate,
      endDate,
      assignmentType,
      patternId,
      startSlot = 20,
      endSlot = 23,
      slotStatus = 'OVERTIME',
      eventId = 'drill_fire',
      actionStyle,
      noteText = '',
    } = params;

    if (!crewIds.length) return;

    // Expand date range safely
    const dates: string[] = [];
    if (startDate && endDate) {
      const parts1 = startDate.split('-').map((p) => parseInt(p, 10));
      const parts2 = endDate.split('-').map((p) => parseInt(p, 10));
      if (parts1.length === 3 && parts2.length === 3) {
        let curMs = Date.UTC(parts1[0], parts1[1] - 1, parts1[2]);
        const endMs = Date.UTC(parts2[0], parts2[1] - 1, parts2[2]);
        if (!isNaN(curMs) && !isNaN(endMs)) {
          while (curMs <= endMs) {
            const dateObj = new Date(curMs);
            if (!isNaN(dateObj.getTime())) {
              dates.push(dateObj.toISOString().split('T')[0]);
            }
            curMs += 86400000;
          }
        }
      }
    }
    if (dates.length === 0 && startDate) {
      dates.push(startDate);
    }

    const updatedWorkLogs = { ...appData.workLogs };

    // Determine target slots
    let targetSlotsToApply: { start: number; end: number; status: SlotStatus; defaultNote: string } | null = null;

    if (assignmentType === 'event_preset') {
      if (eventId === 'safety_training') {
        targetSlotsToApply = { start: 28, end: 30, status: 'DRILL_EMERGENCY', defaultNote: '安全培训 (Safety Training)' };
      } else if (eventId === 'safety_meeting') {
        targetSlotsToApply = { start: 15, end: 15, status: 'WORK', defaultNote: '安全会议 (Safety Meeting)' };
      } else if (eventId === 'anchor_mooring') {
        targetSlotsToApply = { start: 10, end: 14, status: 'OVERTIME', defaultNote: '抛起锚与锚泊备车 (Anchor Handling & Mooring)' };
      } else if (eventId === 'crew_handover') {
        targetSlotsToApply = { start: 18, end: 21, status: 'WORK', defaultNote: '船员换班与职能交接 (Crew Handover)' };
      } else if (eventId === 'drill_fire') {
        targetSlotsToApply = { start: 20, end: 22, status: 'DRILL_EMERGENCY', defaultNote: '消防与救生演习 (Fire & Lifeboat Drill)' };
      } else if (eventId === 'port_berthing') {
        targetSlotsToApply = { start: 28, end: 35, status: 'OVERTIME', defaultNote: '进出港与靠离泊作业 (Port Arrival & Berthing)' };
      } else if (eventId === 'engine_bunkering') {
        targetSlotsToApply = { start: 16, end: 23, status: 'OVERTIME', defaultNote: '船舶加油作业 (Bunkering Operations)' };
      } else if (eventId === 'cargo_ballasting') {
        targetSlotsToApply = { start: 36, end: 43, status: 'OVERTIME', defaultNote: '压排水与压载调配 (Ballasting Operations)' };
      }
    } else if (assignmentType === 'time_slot') {
      targetSlotsToApply = {
        start: Math.min(startSlot, endSlot),
        end: Math.max(startSlot, endSlot),
        status: slotStatus,
        defaultNote: noteText || 'Batch Slot Assignment',
      };
    }

    dates.forEach((dStr) => {
      crewIds.forEach((crewId) => {
        const key = `${crewId}_${dStr}`;
        const existingLog = updatedWorkLogs[key];
        let baseSlots: SlotStatus[] = existingLog ? [...existingLog.slots] : new Array(48).fill('REST');

        const crewMember = appData.crew.find((c) => c.id === crewId);
        let finalNote = existingLog?.notes || '';

        if (assignmentType === 'watch_pattern') {
          let patToUse: WatchPattern | undefined;
          if (patternId === 'use_crew_default') {
            const defPatId = crewMember?.defaultPatternId;
            patToUse = appData.watchPatterns.find((p) => p.id === defPatId) || appData.watchPatterns[0];
          } else {
            patToUse = appData.watchPatterns.find((p) => p.id === patternId);
          }

          if (patToUse) {
            baseSlots = [...patToUse.slots];
          }
        } else if (targetSlotsToApply) {
          if (actionStyle === 'overwrite') {
            baseSlots = new Array(48).fill('REST');
          }
          for (let s = targetSlotsToApply.start; s <= targetSlotsToApply.end; s++) {
            if (s >= 0 && s < 48) {
              baseSlots[s] = targetSlotsToApply.status;
            }
          }
          const appendNote = noteText || targetSlotsToApply.defaultNote;
          if (appendNote && !finalNote.includes(appendNote)) {
            finalNote = finalNote ? `${finalNote} | ${appendNote}` : appendNote;
          }
        }

        const workH = calculateDayWorkHours(baseSlots);
        const restH = calculateDayRestHours(baseSlots);

        const tempLog: WorkLogDay = {
          date: dStr,
          slots: baseSlots,
          totalWorkHours: workH,
          totalRestHours: restH,
          longestRestPeriod: 0,
          restPeriodCount: 0,
          rolling24hRest: 0,
          rolling7dRest: 0,
          nonConformities: [],
          notes: finalNote,
        };

        updatedWorkLogs[key] = tempLog;

        const valResult = validateDayCompliance(dStr, updatedWorkLogs, appData.vessel);
        updatedWorkLogs[key] = {
          ...tempLog,
          rolling24hRest: valResult.rolling24hRest,
          rolling7dRest: valResult.rolling7dRest,
          nonConformities: valResult.nonConformities,
          longestRestPeriod: valResult.longestRestPeriod,
          restPeriodCount: valResult.restPeriodCount,
        };
      });
    });

    setAppData((prev) => ({
      ...prev,
      workLogs: updatedWorkLogs,
    }));
  };

  // Save Signatures
  const handleSaveSignatures = (crewId: string, seafarerName: string, masterName: string, deptHeadName?: string) => {
    const nowIso = new Date().toISOString();
    setAppData((prev) => ({
      ...prev,
      crew: prev.crew.map((c) => {
        if (c.id === crewId) {
          return {
            ...c,
            seafarerSignature: {
              signedAt: nowIso,
              typedName: seafarerName,
            },
            deptHeadApproval: {
              approvedAt: nowIso,
              deptHeadName: deptHeadName || '',
            },
            masterApproval: {
              approvedAt: nowIso,
              masterName: masterName,
            },
          };
        }
        return c;
      }),
    }));
  };

  // Export JSON backup
  const handleExportBackup = () => {
    exportAppDataJSON(appData);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.vessel && parsed.crew && parsed.workLogs) {
          setAppData(parsed);
          alert('Offline database successfully restored!');
        } else {
          alert('Invalid ISF Watchkeeper backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Reset to sample data
  const handleResetData = () => {
    if (confirm('Are you sure you want to reset data to initial sample vessel state?')) {
      const reset = resetAppDataToDefault();
      setAppData(reset);
      setSelectedCrewId(reset.crew[0]?.id || '');
    }
  };

  // Navigation from matrix to specific crew/date grid view
  const handleSelectCrewAndDate = (crewId: string, dateStr: string) => {
    setSelectedCrewId(crewId);
    setSelectedDateStr(dateStr);
    setActiveTab('grid');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white geo-grid-pattern">
      {/* Top Fixed Header */}
      <Header
        vessel={appData.vessel}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBatchAssign={() => setIsBatchAssignOpen(true)}
        onOpenVesselStatus={() => setIsVesselStatusModalOpen(true)}
        activeVesselStatusLog={activeVesselStatusLog}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetData={handleResetData}
        totalNcCount={totalNcCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {activeTab === 'grid' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            {/* Left Sidebar: Crew Roster */}
            <div className="lg:col-span-1">
              <CrewRoster
                crew={appData.crew}
                selectedCrewId={selectedCrewId}
                onSelectCrew={setSelectedCrewId}
                onAddCrew={handleAddCrew}
                onUpdateCrew={handleUpdateCrew}
                onDeleteCrew={handleDeleteCrew}
                workLogs={appData.workLogs}
                watchPatterns={appData.watchPatterns}
                selectedMonthStr={selectedMonthStr}
                onOpenBatchAssign={() => setIsBatchAssignOpen(true)}
              />
            </div>

            {/* Right Main Editor: 24h Work Grid */}
            <div className="lg:col-span-3">
              {currentCrew ? (
                <WorkGrid24h
                  crew={currentCrew}
                  dateStr={selectedDateStr}
                  workLog={currentWorkLog}
                  vessel={appData.vessel}
                  watchPatterns={appData.watchPatterns}
                  allWorkLogs={appData.workLogs}
                  vesselStatusLogs={appData.vesselStatusLogs || []}
                  onOpenVesselStatusModal={() => setIsVesselStatusModalOpen(true)}
                  onUpdateSlots={handleUpdateSlots}
                  onChangeDate={setSelectedDateStr}
                  onOpenNcDetails={(nc) => setSelectedNc(nc)}
                  onCopyPreviousDay={handleCopyPreviousDay}
                  onCopyToWeek={handleCopyToWeek}
                  onCopyToMonth={handleCopyToMonth}
                />
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                  Select a crew member from the roster to edit work & rest hours.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'matrix' && (
          <MonthlyTimesheet
            crew={appData.crew}
            workLogs={appData.workLogs}
            vessel={appData.vessel}
            selectedMonthStr={selectedMonthStr}
            onMonthChange={setSelectedMonthStr}
            onSelectCrewAndDate={handleSelectCrewAndDate}
            onOpenNcDetails={(nc) => setSelectedNc(nc)}
          />
        )}

        {activeTab === 'report' && (
          <OfficialReportModal
            crew={appData.crew}
            selectedCrewId={selectedCrewId}
            onSelectCrew={setSelectedCrewId}
            workLogs={appData.workLogs}
            vessel={appData.vessel}
            selectedMonthStr={selectedMonthStr}
            onMonthChange={setSelectedMonthStr}
            onSaveSignatures={handleSaveSignatures}
          />
        )}

        {activeTab === 'planner' && (
          <SchedulePlanner
            crew={appData.crew}
            watchPatterns={appData.watchPatterns}
            vessel={appData.vessel}
            workLogs={appData.workLogs}
            onUpdateWatchPatterns={handleSaveWatchPatterns}
            onUpdateCrew={handleUpdateCrew}
            onUpdateSlots={handleUpdateSlots}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 text-center text-slate-500 text-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <span>ISF Watchkeeper 3 Maritime Rest Hours Engine • STCW 2010 & MLC 2006 Compliant</span>
          <span className="font-mono text-slate-400">100% Offline Capable • Local Storage Protected</span>
        </div>
      </footer>

      {/* Vessel Settings Modal */}
      <VesselSettingsModal
        vessel={appData.vessel}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(updatedVessel) => {
          setAppData((prev) => ({ ...prev, vessel: updatedVessel }));
        }}
      />

      {/* Non-Conformity Inspector Modal */}
      <NCDetailsModal
        nc={selectedNc}
        isOpen={!!selectedNc}
        onClose={() => setSelectedNc(null)}
        onSaveComment={(ncId, comment) => {
          if (!selectedNc) return;
          const key = `${selectedCrewId}_${selectedNc.date}`;
          const currentLog = appData.workLogs[key];
          if (currentLog) {
            handleUpdateSlots(selectedNc.date, currentLog.slots, comment);
          }
        }}
      />

      {/* Batch Assign Work Hours & Drills Modal */}
      <BatchAssignModal
        crew={appData.crew}
        watchPatterns={appData.watchPatterns}
        isOpen={isBatchAssignOpen}
        onClose={() => setIsBatchAssignOpen(false)}
        currentDateStr={selectedDateStr}
        onApplyBatch={handleApplyBatch}
      />

      {/* Vessel Status & Operational Log Modal */}
      <VesselStatusModal
        isOpen={isVesselStatusModalOpen}
        onClose={() => setIsVesselStatusModalOpen(false)}
        statusLogs={appData.vesselStatusLogs || []}
        crew={appData.crew}
        onAddStatusLog={(newLog) => handleSaveVesselStatusLogs([...(appData.vesselStatusLogs || []), newLog])}
        onDeleteStatusLog={(id) => handleSaveVesselStatusLogs((appData.vesselStatusLogs || []).filter((l) => l.id !== id))}
        onApplyStatusWatch={handleApplyStatusWatch}
      />
    </div>
  );
}
