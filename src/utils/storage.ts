import { AppData, VesselInfo, CrewMember, WorkLogDay } from '../types';
import { DEFAULT_VESSEL, INITIAL_CREW, STANDARD_PATTERNS, INITIAL_VESSEL_STATUS_LOGS, generateInitialWorkLogs } from '../data/sampleData';
import { validateDayCompliance } from './complianceEngine';

const STORAGE_KEY = 'isf_watchkeeper_3_app_data_v1';

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: AppData = JSON.parse(raw);
      if (parsed.vessel && parsed.crew && parsed.workLogs) {
        // Re-evaluate compliance for all work logs to ensure engine rules match state
        const updatedWorkLogs = reevaluateAllLogs(parsed.workLogs, parsed.vessel);
        return {
          ...parsed,
          watchPatterns: STANDARD_PATTERNS,
          vesselStatusLogs: parsed.vesselStatusLogs || INITIAL_VESSEL_STATUS_LOGS,
          workLogs: updatedWorkLogs,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse localStorage data for ISF Watchkeeper, resetting to initial dataset:', e);
  }

  // Fallback / Initial sample dataset
  const initialWorkLogs = generateInitialWorkLogs(INITIAL_CREW);
  const evaluatedInitialLogs = reevaluateAllLogs(initialWorkLogs, DEFAULT_VESSEL);

  const initialData: AppData = {
    vessel: DEFAULT_VESSEL,
    crew: INITIAL_CREW,
    workLogs: evaluatedInitialLogs,
    watchPatterns: STANDARD_PATTERNS,
    vesselStatusLogs: INITIAL_VESSEL_STATUS_LOGS,
  };

  saveAppData(initialData);
  return initialData;
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save ISF Watchkeeper data to localStorage:', e);
  }
}

/**
 * Re-evaluates compliance metrics for all work logs in state
 */
export function reevaluateAllLogs(
  workLogs: Record<string, WorkLogDay>,
  vessel: VesselInfo
): Record<string, WorkLogDay> {
  const updatedLogs: Record<string, WorkLogDay> = {};

  Object.entries(workLogs).forEach(([key, log]) => {
    const [crewId, dateStr] = key.split('_');
    if (!dateStr) {
      updatedLogs[key] = log;
      return;
    }

    const valResult = validateDayCompliance(dateStr, workLogs, vessel, crewId);

    updatedLogs[key] = {
      ...log,
      rolling24hRest: valResult.rolling24hRest,
      rolling7dRest: valResult.rolling7dRest,
      nonConformities: valResult.nonConformities,
      longestRestPeriod: valResult.longestRestPeriod,
      restPeriodCount: valResult.restPeriodCount,
    };
  });

  return updatedLogs;
}

/**
 * Download app data as JSON file for offline backup / vessel transfer
 */
export function exportAppDataJSON(data: AppData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ISF_Watchkeeper3_Backup_${data.vessel.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Reset application data back to initial sample state
 */
export function resetAppDataToDefault(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  return loadAppData();
}
