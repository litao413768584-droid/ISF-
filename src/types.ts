export type RegulationMode = 'STCW_2010' | 'MLC_2006' | 'OPA_90';

export type Department = 'Deck' | 'Engine' | 'Catering' | 'Medical' | 'Radio';

export type SlotStatus = 'REST' | 'WORK' | 'OVERTIME' | 'DRILL_EMERGENCY';

export type ComplianceStatus = 'COMPLIANT' | 'NON_CONFORMANT' | 'WARNING';

export type VesselStatusType = 'at_sea' | 'at_anchor' | 'weigh_anchor' | 'port_berthing' | 'mooring_ops' | 'cargo_ops' | 'drydock';

export interface TimeSlot {
  /** Index from 0 to 47 representing 30-minute blocks (0 = 00:00-00:30, 47 = 23:30-24:00) */
  index: number;
  status: SlotStatus;
  note?: string;
}

export interface NonConformity {
  id: string;
  date: string; // YYYY-MM-DD
  ruleId: 'MIN_24H_REST' | 'MAX_2_PERIODS' | 'MIN_6H_PERIOD' | 'MAX_14H_INTERVAL' | 'MIN_7D_REST' | 'OPA90_36H_72H';
  ruleName: string;
  description: string;
  details: string;
  severity: 'CRITICAL' | 'WARNING';
  acknowledgedByMaster?: boolean;
  masterComment?: string;
}

export interface WorkLogDay {
  date: string; // YYYY-MM-DD
  slots: SlotStatus[]; // 48 slots array
  totalWorkHours: number;
  totalRestHours: number;
  longestRestPeriod: number;
  restPeriodCount: number;
  rolling24hRest: number; // min rest in rolling 24h window spanning into adjacent days
  rolling7dRest: number;  // rest in 7-day rolling window (168 hours)
  nonConformities: NonConformity[];
  isLocked?: boolean;
  notes?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  rank: string;
  department: Department;
  isWatchkeeper: boolean;
  nationalSeamanBookNo?: string;
  passportNo?: string;
  defaultPatternId?: string;
  customPatternSlots?: SlotStatus[]; // 48 items custom individual watch schedule
  joinDate?: string;          // 上船/登轮日期 (YYYY-MM-DD)
  joinDateTime?: string;      // 精确上船时间 (YYYY-MM-DDTHH:mm)
  signOffDate?: string;       // 预计离船/休假日期 (YYYY-MM-DD)
  signOffDateTime?: string;   // 精确休假时间 (YYYY-MM-DDTHH:mm)
  handoverStartDateTime?: string; // 交接班开始时间 (YYYY-MM-DDTHH:mm)
  handoverEndDateTime?: string;   // 交接班结束时间 (YYYY-MM-DDTHH:mm)
  handoverNotes?: string;     // 换班/交接说明
  relievedCrewId?: string;    // 本人接替哪位休假船员 (Relieved Crew Member)
  relieverCrewId?: string;    // 本人由哪位新船员接替 (Reliever Crew Member)
  handoverStatus?: 'scheduled' | 'in_progress' | 'completed'; // 职能交接进度
  seafarerSignature?: {
    signedAt: string;
    signatureDataUrl?: string; // base64 canvas signature
    typedName?: string;
  };
  deptHeadApproval?: {
    approvedAt: string;
    deptHeadName?: string;
    signatureDataUrl?: string;
  };
  masterApproval?: {
    approvedAt: string;
    masterName: string;
    signatureDataUrl?: string;
  };
}

export interface VesselStatusLog {
  id: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string;   // YYYY-MM-DD
  endTime: string;   // HH:mm
  statusType: VesselStatusType;
  locationName: string; // e.g. "上海洋山港3号泊位" or "吴淞口2号锚地"
  notes?: string;
}

export interface WatchPattern {
  id: string;
  name: string;
  description: string;
  slots: SlotStatus[]; // 48 items default slots template
}

export interface VesselInfo {
  name: string;
  imoNumber: string;
  flagState: string;
  callSign: string;
  shipowner: string;
  vesselType: string;
  masterName: string;
  chiefEngineerName: string;
  regulationMode: RegulationMode;
  allowSTCWException: boolean; // STCW A-VIII/1.9 exception (70h in 7d allowance)
}

export interface AppData {
  vessel: VesselInfo;
  crew: CrewMember[];
  // Keyed by crewId_YYYY-MM-DD
  workLogs: Record<string, WorkLogDay>;
  watchPatterns: WatchPattern[];
  vesselStatusLogs?: VesselStatusLog[];
}

export interface BatchAssignParams {
  crewIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  assignmentType: 'event_preset' | 'time_slot' | 'watch_pattern';
  patternId?: string; // or 'use_crew_default'
  startSlot?: number; // 0..47
  endSlot?: number;   // 0..47
  slotStatus?: SlotStatus;
  eventId?: 'safety_training' | 'safety_meeting' | 'anchor_mooring' | 'crew_handover' | 'drill_fire' | 'port_berthing' | 'engine_bunkering' | 'cargo_ballasting' | string;
  actionStyle: 'overlay' | 'overwrite'; // overlay = preserve existing schedule outside range; overwrite = wipe whole day first
  noteText?: string;
}

