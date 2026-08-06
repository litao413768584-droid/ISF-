import { WorkLogDay, SlotStatus, NonConformity, VesselInfo } from '../types';

/**
 * Format slot index (0 to 47) to HH:MM time string (e.g. 0 -> "00:00", 1 -> "00:30", 47 -> "23:30")
 */
export function formatSlotTime(slotIndex: number): string {
  const totalMinutes = slotIndex * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Returns formatted range e.g. "08:00 - 12:00" for start and end slot indices
 */
export function formatSlotRange(startSlot: number, endSlot: number): string {
  return `${formatSlotTime(startSlot)} - ${formatSlotTime(endSlot + 1)}`;
}

/**
 * Convert 48 slot status array to total work hours (WORK + OVERTIME)
 */
export function calculateDayWorkHours(slots: SlotStatus[]): number {
  return slots.reduce((acc, status) => {
    return status === 'WORK' || status === 'OVERTIME' ? acc + 0.5 : acc;
  }, 0);
}

/**
 * Regular watch hours (常规值班工时 - Status = WORK)
 */
export function calculateDayRegularWorkHours(slots: SlotStatus[]): number {
  return slots.reduce((acc, status) => {
    return status === 'WORK' ? acc + 0.5 : acc;
  }, 0);
}

/**
 * Overtime hours (加班工时 - Status = OVERTIME)
 */
export function calculateDayOvertimeHours(slots: SlotStatus[]): number {
  return slots.reduce((acc, status) => {
    return status === 'OVERTIME' ? acc + 0.5 : acc;
  }, 0);
}

/**
 * Emergency drill/exempt hours (演练/免除特例工时 - Status = DRILL_EMERGENCY)
 */
export function calculateDayDrillHours(slots: SlotStatus[]): number {
  return slots.reduce((acc, status) => {
    return status === 'DRILL_EMERGENCY' ? acc + 0.5 : acc;
  }, 0);
}

/**
 * Convert 48 slot status array to total rest hours
 */
export function calculateDayRestHours(slots: SlotStatus[]): number {
  return slots.reduce((acc, status) => {
    return status === 'REST' || status === 'DRILL_EMERGENCY' ? acc + 0.5 : acc;
  }, 0);
}

/**
 * Analyze contiguous rest and work blocks in a 48-slot array
 */
export function analyzeDayRestStructure(slots: SlotStatus[]) {
  const restBlocks: { start: number; end: number; duration: number }[] = [];
  const workBlocks: { start: number; end: number; duration: number }[] = [];

  let inRest = false;
  let blockStart = 0;

  for (let i = 0; i < slots.length; i++) {
    const isRest = slots[i] === 'REST' || slots[i] === 'DRILL_EMERGENCY';
    
    if (isRest && !inRest) {
      if (i > 0) {
        workBlocks.push({
          start: blockStart,
          end: i - 1,
          duration: (i - blockStart) * 0.5,
        });
      }
      inRest = true;
      blockStart = i;
    } else if (!isRest && inRest) {
      restBlocks.push({
        start: blockStart,
        end: i - 1,
        duration: (i - blockStart) * 0.5,
      });
      inRest = false;
      blockStart = i;
    }
  }

  // Handle final block
  if (inRest) {
    restBlocks.push({
      start: blockStart,
      end: slots.length - 1,
      duration: (slots.length - blockStart) * 0.5,
    });
  } else {
    workBlocks.push({
      start: blockStart,
      end: slots.length - 1,
      duration: (slots.length - blockStart) * 0.5,
    });
  }

  const longestRestPeriod = restBlocks.reduce((max, b) => Math.max(max, b.duration), 0);
  const longestWorkInterval = workBlocks.reduce((max, b) => Math.max(max, b.duration), 0);

  return {
    restPeriodCount: restBlocks.length,
    longestRestPeriod,
    longestWorkInterval,
    restBlocks,
    workBlocks,
  };
}

/**
 * Validate daily and rolling STCW 2010 / MLC 2006 / OPA 90 compliance
 * @param targetDate YYYY-MM-DD or crewId_YYYY-MM-DD
 * @param workLogs Record of all dates logged
 * @param vessel Vessel settings & regulation mode
 * @param crewId Optional crew ID parameter for dictionary lookup
 */
export function validateDayCompliance(
  targetDate: string,
  workLogs: Record<string, WorkLogDay>,
  vessel: VesselInfo,
  crewId?: string
): {
  rolling24hRest: number;
  rolling7dRest: number;
  rolling72hRest: number;
  nonConformities: NonConformity[];
  longestRestPeriod: number;
  restPeriodCount: number;
} {
  // Extract pure YYYY-MM-DD date string if targetDate contains crewId prefix
  let pureDateStr = targetDate;
  let effectiveCrewId = crewId;

  if (targetDate.includes('_')) {
    const parts = targetDate.split('_');
    pureDateStr = parts.pop()!;
    if (!effectiveCrewId) {
      effectiveCrewId = parts.join('_');
    }
  }

  // Helper to retrieve log for a specific date string for the specific crew member
  const getLogForDate = (dStr: string): WorkLogDay | undefined => {
    if (effectiveCrewId && workLogs[`${effectiveCrewId}_${dStr}`]) {
      return workLogs[`${effectiveCrewId}_${dStr}`];
    }
    if (workLogs[dStr]) {
      return workLogs[dStr];
    }
    return undefined;
  };

  const currentLog = getLogForDate(pureDateStr);
  const slots = currentLog ? currentLog.slots : new Array(48).fill('REST');

  const totalWork = calculateDayWorkHours(slots);
  const totalRest = calculateDayRestHours(slots);

  const nonConformities: NonConformity[] = [];

  // 1. Single Day Structure Checks
  // STCW 2010 A-VIII/1: 10h rest in 24h divided into max 2 periods, one >= 6h, interval <= 14h.
  const { restPeriodCount, longestRestPeriod, longestWorkInterval, restBlocks } = analyzeDayRestStructure(slots);

  // Check if a valid 10h rest structure exists in <= 2 periods
  const hasValid2PeriodStructure = () => {
    // If a single rest block is >= 10.0 hours
    if (restBlocks.some((b) => b.duration >= 10.0)) return true;

    // Check pairs of rest blocks
    for (let i = 0; i < restBlocks.length; i++) {
      for (let j = i + 1; j < restBlocks.length; j++) {
        const b1 = restBlocks[i];
        const b2 = restBlocks[j];
        if (b1.duration + b2.duration >= 10.0 && (b1.duration >= 6.0 || b2.duration >= 6.0)) {
          const intervalSlots = Math.abs(b2.start - (b1.end + 1));
          const intervalHours = intervalSlots * 0.5;
          if (intervalHours <= 14.0) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Rule: Rest divided into max 2 periods if worked
  if (totalWork > 0 && restPeriodCount > 2 && !hasValid2PeriodStructure()) {
    nonConformities.push({
      id: `${pureDateStr}_MAX_2_PERIODS`,
      date: pureDateStr,
      ruleId: 'MAX_2_PERIODS',
      ruleName: '最少10小时休息最多分两段 (Max 2 Rest Periods)',
      description: `休息过于分散 (${restPeriodCount}段)。最少10小时休息最多划分成2段，且两段间隔不超过14小时。`,
      details: `STCW A-VIII/1 第2款规定：最少10小时休息最多分成2段，且其中一段必须至少连续6小时，两段休息之间间隔不超过14小时。`,
      severity: 'CRITICAL',
    });
  }

  // Rule: One rest period must be at least 6 hours
  if (totalWork > 0 && longestRestPeriod < 6.0) {
    nonConformities.push({
      id: `${pureDateStr}_MIN_6H_PERIOD`,
      date: pureDateStr,
      ruleId: 'MIN_6H_PERIOD',
      ruleName: '主休息段至少连续6小时 (Min 6h Continuous Rest)',
      description: `最长连续休息时间仅为 ${longestRestPeriod.toFixed(1)}小时（要求至少连续6.0小时）。`,
      details: `STCW A-VIII/1 第2款规定：24小时内的休息时间划分中，必须包含至少一段不少于6小时的连续休息。`,
      severity: 'CRITICAL',
    });
  }

  // Rule: Interval between consecutive rest periods shall not exceed 14 hours
  if (totalWork > 0 && longestWorkInterval > 14.0) {
    nonConformities.push({
      id: `${pureDateStr}_MAX_14H_INTERVAL`,
      date: pureDateStr,
      ruleId: 'MAX_14H_INTERVAL',
      ruleName: '休息间隔不超过14小时 (Max 14h Interval)',
      description: `连续休息段之间的最长工作/活动间隔为 ${longestWorkInterval.toFixed(1)}小时（规定不超过14.0小时）。`,
      details: `STCW A-VIII/1 第3款规定：两段连续休息时间之间的间隔（工作/站班时间）不得超过14小时。`,
      severity: 'CRITICAL',
    });
  }

  // 2. Continuous Rolling 24-Hour Window Calculation across 3 consecutive days [Prev, Current, Next]
  const prevDate = getShiftedDateStr(pureDateStr, -1);
  const nextDate = getShiftedDateStr(pureDateStr, 1);

  const prevLog = getLogForDate(prevDate);
  const nextLog = getLogForDate(nextDate);

  const prevSlots = prevLog ? prevLog.slots : slots;
  const nextSlots = nextLog ? nextLog.slots : slots;

  // Combined array of 144 slots (Day -1: 0..47, Day 0: 48..95, Day +1: 96..143)
  const combinedSlots = [...prevSlots, ...slots, ...nextSlots];

  // Check every 48-slot (24h) window that overlaps with Day 0 (startSlot from 1 to 95)
  let min24hRest = 24.0;
  let worstWindowStartSlot = 48;

  for (let startSlot = 1; startSlot <= 95; startSlot++) {
    const windowSlots = combinedSlots.slice(startSlot, startSlot + 48);
    const windowRest = windowSlots.reduce((acc, s) => (s === 'REST' || s === 'DRILL_EMERGENCY' ? acc + 0.5 : acc), 0);
    if (windowRest < min24hRest) {
      min24hRest = windowRest;
      worstWindowStartSlot = startSlot;
    }
  }

  const rolling24hRest = min24hRest;

  if (rolling24hRest < 10.0) {
    nonConformities.push({
      id: `${pureDateStr}_MIN_24H_REST`,
      date: pureDateStr,
      ruleId: 'MIN_24H_REST',
      ruleName: '10-Hour Rest in 24h Window',
      description: `Minimum rest in rolling 24-hour window was ${rolling24hRest.toFixed(1)}h (min 10.0h required).`,
      details: `STCW A-VIII/1 section 2 / MLC 2006 requires minimum 10 hours rest in any 24-hour period.`,
      severity: 'CRITICAL',
    });
  }

  // 3. Rolling 7-Day (168 hours) Rest Calculation
  // Sum rest for pureDateStr and previous 6 days
  let total7dRest = 0;
  for (let i = 0; i < 7; i++) {
    const dStr = getShiftedDateStr(pureDateStr, -i);
    const dLog = getLogForDate(dStr);
    const dSlots = dLog ? dLog.slots : slots;
    total7dRest += calculateDayRestHours(dSlots);
  }

  const min7dRequirement = vessel.allowSTCWException ? 70.0 : 77.0;
  if (total7dRest < min7dRequirement) {
    nonConformities.push({
      id: `${pureDateStr}_MIN_7D_REST`,
      date: pureDateStr,
      ruleId: 'MIN_7D_REST',
      ruleName: `77-Hour Rest in 7 Days${vessel.allowSTCWException ? ' (STCW Exception 70h)' : ''}`,
      description: `Total rest in 7-day rolling period was ${total7dRest.toFixed(1)}h (min ${min7dRequirement}h required).`,
      details: `STCW 2010 A-VIII/1.3 / MLC 2006 requires at least 77 hours rest in any 7-day period.`,
      severity: 'CRITICAL',
    });
  }

  // 4. OPA 90 72-Hour Check (if OPA 90 mode selected)
  let total72hRest = 0;
  for (let i = 0; i < 3; i++) {
    const dStr = getShiftedDateStr(pureDateStr, -i);
    const dLog = getLogForDate(dStr);
    const dSlots = dLog ? dLog.slots : slots;
    total72hRest += calculateDayRestHours(dSlots);
  }

  if (vessel.regulationMode === 'OPA_90' && total72hRest < 36.0) {
    nonConformities.push({
      id: `${pureDateStr}_OPA90_36H_72H`,
      date: pureDateStr,
      ruleId: 'OPA90_36H_72H',
      ruleName: 'OPA 90 (36h Rest in 72h)',
      description: `Total rest in 72-hour period was ${total72hRest.toFixed(1)}h (min 36.0h required for US Tanker compliance).`,
      details: `Oil Pollution Act 1990 (OPA 90) Section 4114 mandates at least 36 hours rest in any 72-hour period for licensed personnel in US waters.`,
      severity: 'CRITICAL',
    });
  }

  return {
    rolling24hRest,
    rolling7dRest: total7dRest,
    rolling72hRest: total72hRest,
    nonConformities,
    longestRestPeriod,
    restPeriodCount,
  };
}

/**
 * Utility: Shift YYYY-MM-DD string by offset days safely
 */
export function getShiftedDateStr(dateStr: string, offsetDays: number): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return '2026-08-04';
  }
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length !== 3) {
    return dateStr;
  }
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return dateStr;
  }

  const utcDate = new Date(Date.UTC(y, m, d + offsetDays));
  if (isNaN(utcDate.getTime())) {
    return dateStr;
  }
  return utcDate.toISOString().split('T')[0];
}

/**
 * Utility: Get all dates in a month YYYY-MM safely
 */
export function getMonthDates(year: number, month: number): string[] {
  const y = Number(year) || 2026;
  const m = Number(month) || 8;
  const daysInMonth = new Date(y, m, 0).getDate();
  if (isNaN(daysInMonth) || daysInMonth <= 0) return [];

  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${y}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    dates.push(dStr);
  }

  return dates;
}
