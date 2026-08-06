/**
 * Statutory Holidays Helper according to Chinese Maritime & Labor Standards
 * 1. Statutory National Holidays:
 *    - New Year's Day (元旦): Jan 1 (1 day)
 *    - Spring Festival (春节): Lunar Eve, Day 1, Day 2 (3 days - mapped to typical dates e.g. Feb 15, 16, 17 in sample calendar)
 *    - Tomb Sweeping Day (清明节): Apr 4 or Apr 5 (1 day)
 *    - Labor Day (劳动节): May 1 (1 day)
 *    - Dragon Boat Festival (端午节): Jun 10 (1 day)
 *    - Mid-Autumn Festival (中秋节): Sep 17 (1 day)
 *    - National Day (国庆节): Oct 1, Oct 2, Oct 3 (3 days)
 */

export interface StatutoryHoliday {
  datePattern: string; // MM-DD or YYYY-MM-DD
  name: string;
  nameEn: string;
}

export const STATUTORY_HOLIDAYS: StatutoryHoliday[] = [
  { datePattern: '01-01', name: '元旦 (New Year\'s Day)', nameEn: 'New Year\'s Day' },
  { datePattern: '02-15', name: '除夕 (Spring Festival Eve)', nameEn: 'Lunar New Year Eve' },
  { datePattern: '02-16', name: '春节 初一 (Spring Festival Day 1)', nameEn: 'Spring Festival Day 1' },
  { datePattern: '02-17', name: '春节 初二 (Spring Festival Day 2)', nameEn: 'Spring Festival Day 2' },
  { datePattern: '04-04', name: '清明节 (Tomb Sweeping Day)', nameEn: 'Tomb Sweeping Day' },
  { datePattern: '05-01', name: '劳动节 (Labor Day)', nameEn: 'Labor Day' },
  { datePattern: '06-10', name: '端午节 (Dragon Boat Festival)', nameEn: 'Dragon Boat Festival' },
  { datePattern: '09-17', name: '中秋节 (Mid-Autumn Festival)', nameEn: 'Mid-Autumn Festival' },
  { datePattern: '10-01', name: '国庆节 第1天 (National Day)', nameEn: 'National Day Day 1' },
  { datePattern: '10-02', name: '国庆节 第2天 (National Day)', nameEn: 'National Day Day 2' },
  { datePattern: '10-03', name: '国庆节 第3天 (National Day)', nameEn: 'National Day Day 3' },
];

/**
 * Checks if a given YYYY-MM-DD date string is a statutory holiday
 */
export function getStatutoryHolidayInfo(dateStr: string): StatutoryHoliday | null {
  if (!dateStr || dateStr.length < 10) return null;
  const monthDay = dateStr.substring(5); // MM-DD
  const holiday = STATUTORY_HOLIDAYS.find(
    (h) => h.datePattern === monthDay || h.datePattern === dateStr
  );
  return holiday || null;
}

export function isStatutoryHoliday(dateStr: string): boolean {
  return getStatutoryHolidayInfo(dateStr) !== null;
}

/**
 * Calculate total overtime hours for a given crew member in a specific month YYYY-MM
 * Standard work day is 8 hours. Any work beyond 8 hours on normal days counts as Overtime.
 * All work hours on Statutory Holidays count as Overtime.
 */
export function calculateMonthlyOvertimeStats(
  crewId: string,
  monthStr: string, // YYYY-MM
  workLogs: Record<string, any>
): {
  totalOvertimeHours: number;
  totalWorkHours: number;
  totalRestHours: number;
  statutoryHolidayHours: number;
  exceedsMonthlyLimit: boolean; // limit is 75 hours
} {
  let totalOvertime = 0;
  let totalWork = 0;
  let totalRest = 0;
  let statutoryHolidayHours = 0;

  Object.entries(workLogs).forEach(([key, log]) => {
    // Key format: crewId_YYYY-MM-DD
    if (key.startsWith(`${crewId}_${monthStr}`)) {
      const dateStr = key.replace(`${crewId}_`, '');
      const isHoliday = isStatutoryHoliday(dateStr);
      
      const slots = log.slots || [];
      let dayWork = 0;
      let dayOt = 0;

      slots.forEach((s: string) => {
        if (s === 'WORK') dayWork += 0.5;
        if (s === 'OVERTIME') dayOt += 0.5;
      });

      const totalDayWork = dayWork + dayOt;
      totalWork += totalDayWork;
      totalRest += (24 - totalDayWork);

      if (isHoliday) {
        // All work on statutory holidays is overtime
        totalOvertime += totalDayWork;
        statutoryHolidayHours += totalDayWork;
      } else {
        // Explicit overtime + normal work exceeding 8 hours
        const excessWork = Math.max(0, totalDayWork - 8);
        totalOvertime += Math.max(dayOt, excessWork);
      }
    }
  });

  return {
    totalOvertimeHours: totalOvertime,
    totalWorkHours: totalWork,
    totalRestHours: totalRest,
    statutoryHolidayHours,
    exceedsMonthlyLimit: totalOvertime > 75,
  };
}
