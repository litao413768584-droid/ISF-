import { AppData, SlotStatus, VesselInfo, CrewMember, WatchPattern, VesselStatusLog } from '../types';

export const DEFAULT_VESSEL: VesselInfo = {
  name: 'M/V Ocean Guardian (远洋卫士轮)',
  imoNumber: '9854321',
  flagState: 'Marshall Islands',
  callSign: 'V7AB9',
  shipowner: 'Global Maritime Navigation Line',
  vesselType: 'Container Vessel (4,500 TEU)',
  masterName: 'Capt. Alexander Vance',
  chiefEngineerName: 'Eng. Marcus Thorne',
  regulationMode: 'STCW_2010',
  allowSTCWException: false,
};

export const INITIAL_VESSEL_STATUS_LOGS: VesselStatusLog[] = [
  {
    id: 'vsl_001',
    startDate: '2026-08-01',
    startTime: '06:00',
    endDate: '2026-08-03',
    endTime: '14:00',
    statusType: 'at_anchor',
    locationName: '上海吴淞口 2号防台锚地',
    notes: '抛锚候泊，安排甲板机舱防漂锚班',
  },
  {
    id: 'vsl_002',
    startDate: '2026-08-03',
    startTime: '14:00',
    endDate: '2026-08-06',
    endTime: '22:00',
    statusType: 'port_berthing',
    locationName: '上海洋山集装箱码头 #3泊位',
    notes: '靠泊装卸作业，甲板系缆与压载水调配',
  },
  {
    id: 'vsl_003',
    startDate: '2026-08-06',
    startTime: '22:00',
    endDate: '2026-08-15',
    endTime: '18:00',
    statusType: 'at_sea',
    locationName: '东海至新加坡航线 (En Route to Singapore)',
    notes: '常规航行有人值班，轮机部 4-8 值班',
  },
];

// Helper to generate 48 slots array based on active work ranges [startSlot, endSlot] inclusive
function createSlotsPattern(workRanges: [number, number][], overtimeRanges: [number, number][] = []): SlotStatus[] {
  const slots: SlotStatus[] = new Array(48).fill('REST');
  
  workRanges.forEach(([start, end]) => {
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < 48) slots[i] = 'WORK';
    }
  });

  overtimeRanges.forEach(([start, end]) => {
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < 48) slots[i] = 'OVERTIME';
    }
  });

  return slots;
}

export const STANDARD_PATTERNS: WatchPattern[] = [
  {
    id: 'pattern_4_8_1',
    name: '0-On 4-Off (00-04 / 12-16)',
    description: '二副 / 二管轮 / 值班水手一班 (00:00-04:00 & 12:00-16:00)',
    slots: createSlotsPattern([[0, 7], [24, 31]]), // 00:00-04:00 & 12:00-16:00
  },
  {
    id: 'pattern_4_8_2',
    name: '4-On 8-Off (04-08 / 16-20)',
    description: '大副 / 大管轮 / 值班水手二班 (04:00-08:00 & 16:00-20:00)',
    slots: createSlotsPattern([[8, 15], [32, 39]]), // 04:00-08:00 & 16:00-20:00
  },
  {
    id: 'pattern_4_8_3',
    name: '8-On 12-Off (08-12 / 20-24)',
    description: '三副 / 三管轮 / 值班水手三班 (08:00-12:00 & 20:00-24:00)',
    slots: createSlotsPattern([[16, 23], [40, 47]]), // 08:00-12:00 & 20:00-24:00
  },
  {
    id: 'pattern_6_6',
    name: '0-On 6-Off (00-06 / 12-18)',
    description: '狭水道、引航与高密度航道两班倒 A 组 (00:00-06:00 & 12:00-18:00)',
    slots: createSlotsPattern([[0, 11], [24, 35]]), // 00:00-06:00 & 12:00-18:00
  },
  {
    id: 'pattern_6_6_2',
    name: '6-On 12-Off (06-12 / 18-24)',
    description: '狭水道、引航与高密度航道两班倒 B 组 (06:00-12:00 & 18:00-24:00)',
    slots: createSlotsPattern([[12, 23], [36, 47]]), // 06:00-12:00 & 18:00-24:00
  },
  {
    id: 'pattern_daywork',
    name: 'Day Work (08:00 - 17:00)',
    description: '船长 / 轮机长 / 水手长 / 铜匠 / 日勤水手 8 小时班组',
    slots: createSlotsPattern([[16, 23], [26, 33]]), // 08:00-12:00 & 13:00-17:00
  },
  {
    id: 'pattern_engine_manned',
    name: 'UMS Safety Watch / 无人机舱待命 (On Call)',
    description: '轮机部无人机舱集控巡检 8 小时常规班组',
    slots: createSlotsPattern([[16, 23], [28, 35]]), // 08:00-12:00 & 14:00-18:00
  },
  {
    id: 'pattern_cook',
    name: 'Cook / 厨工 (06:00-12:00 / 16:00-18:00)',
    description: '膳食部大厨 / 伙食工 MLC 标准 8 小时班组',
    slots: createSlotsPattern([[12, 23], [32, 35]]), // 06:00-12:00 & 16:00-18:00
  },
  {
    id: 'pattern_steward',
    name: 'Steward / 服务员 (07:00-13:00 / 17:00-19:00)',
    description: '餐厅服务员标准餐饮 8 小时班组',
    slots: createSlotsPattern([[14, 25], [34, 37]]), // 07:00-13:00 & 17:00-19:00
  },
  {
    id: 'pattern_daywork_ot',
    name: 'Day Work + Port Overtime (08:00 - 21:00)',
    description: '常日勤并附加 4 小时夜间靠泊/压排水/装卸加班',
    slots: createSlotsPattern([[16, 23], [26, 33]], [[36, 43]]), // 08:00-12:00, 13:00-17:00, OT 18:00-22:00
  },
];

export const INITIAL_CREW: CrewMember[] = [
  {
    id: 'crew_001',
    name: 'Capt. Alexander Vance (张远 船长)',
    rank: 'Master (船长)',
    department: 'Deck',
    isWatchkeeper: false,
    nationalSeamanBookNo: 'SB-884210',
    passportNo: 'P-992144',
    defaultPatternId: 'pattern_daywork',
    joinDate: '2026-01-15',
    signOffDate: '2026-09-15',
    handoverNotes: '合同期9个月，计划9月中旬在上海港换班',
    seafarerSignature: {
      signedAt: '2026-08-01T10:00:00Z',
      typedName: 'Alexander Vance',
    },
    masterApproval: {
      approvedAt: '2026-08-01T10:05:00Z',
      masterName: 'Alexander Vance',
    },
  },
  {
    id: 'crew_002',
    name: 'Dmitri Ivanov (李强 大副)',
    rank: 'Chief Officer (大副)',
    department: 'Deck',
    isWatchkeeper: true,
    nationalSeamanBookNo: 'SB-773129',
    passportNo: 'P-882190',
    defaultPatternId: 'pattern_4_8_1',
    joinDate: '2026-02-01',
    signOffDate: '2026-10-01',
    handoverNotes: '货舱及压载水管理负责人',
    seafarerSignature: {
      signedAt: '2026-08-02T14:30:00Z',
      typedName: 'Dmitri Ivanov',
    },
  },
  {
    id: 'crew_003',
    name: 'Carlos Ruiz (王伟 二副)',
    rank: '2nd Officer (二副)',
    department: 'Deck',
    isWatchkeeper: true,
    nationalSeamanBookNo: 'SB-664812',
    passportNo: 'P-773120',
    defaultPatternId: 'pattern_4_8_2',
    joinDate: '2026-03-10',
    signOffDate: '2026-11-10',
    handoverNotes: '海图与导航仪器交接完成',
  },
  {
    id: 'crew_004',
    name: 'Elena Rostova (陈晨 三副)',
    rank: '3rd Officer (三副)',
    department: 'Deck',
    isWatchkeeper: true,
    nationalSeamanBookNo: 'SB-559102',
    passportNo: 'P-661299',
    defaultPatternId: 'pattern_4_8_3',
    joinDate: '2026-04-05',
    signOffDate: '2026-12-05',
    handoverNotes: '消防救生设备责任区交接',
  },
  {
    id: 'crew_005',
    name: 'Marcus Thorne (刘洋 轮机长)',
    rank: 'Chief Engineer (轮机长)',
    department: 'Engine',
    isWatchkeeper: false,
    nationalSeamanBookNo: 'SB-441029',
    passportNo: 'P-552100',
    defaultPatternId: 'pattern_daywork',
    joinDate: '2026-01-20',
    signOffDate: '2026-09-20',
    handoverNotes: '有人机舱安全管理，主副机保养完好',
  },
  {
    id: 'crew_006',
    name: 'Kenji Sato (赵磊 大管轮)',
    rank: '1st Asst Engineer (大管轮)',
    department: 'Engine',
    isWatchkeeper: true,
    nationalSeamanBookNo: 'SB-332918',
    passportNo: 'P-441029',
    defaultPatternId: 'pattern_4_8_1',
    joinDate: '2026-02-15',
    signOffDate: '2026-10-15',
    handoverNotes: '机舱有人值班一班负责，主机运行正常',
  },
  {
    id: 'crew_007',
    name: 'Li Wei (李伟 三管轮)',
    rank: '3rd Engineer (三管轮)',
    department: 'Engine',
    isWatchkeeper: true,
    nationalSeamanBookNo: 'SB-338821',
    passportNo: 'P-449102',
    defaultPatternId: 'pattern_4_8_3',
    joinDate: '2026-03-01',
    signOffDate: '2026-11-01',
    handoverNotes: '机舱有人值班三班，兼顾辅机加油作业',
  },
  {
    id: 'crew_008',
    name: 'Mateo Santos (孙杰 水手长)',
    rank: 'Bosun (水手长)',
    department: 'Deck',
    isWatchkeeper: false,
    nationalSeamanBookNo: 'SB-229104',
    passportNo: 'P-339102',
    defaultPatternId: 'pattern_daywork',
    joinDate: '2026-01-15',
    signOffDate: '2026-09-15',
    handoverNotes: '甲板甲板设备保养与甲板班组管理',
  },
  {
    id: 'crew_009',
    name: 'Wang Qiang (王强 木匠)',
    rank: 'Carpenter (木匠)',
    department: 'Deck',
    isWatchkeeper: false,
    nationalSeamanBookNo: 'SB-228833',
    passportNo: 'P-331190',
    defaultPatternId: 'pattern_daywork',
    joinDate: '2026-02-20',
    signOffDate: '2026-10-20',
    handoverNotes: '负责抛起锚作业备车与淡水舱测深',
  },
  {
    id: 'crew_010',
    name: 'Viktor Chen (陈建 一等水手)',
    rank: 'Able Seaman (AB 1)',
    department: 'Deck',
    isWatchkeeper: true,
    nationalSeamanBookNo: 'SB-119283',
    passportNo: 'P-228190',
    defaultPatternId: 'pattern_4_8_2',
    joinDate: '2026-03-15',
    signOffDate: '2026-11-15',
    handoverNotes: '操舵与航行值班水手',
  },
  {
    id: 'crew_011',
    name: 'Zhang Ming (张明 大厨)',
    rank: 'Chief Cook (大厨)',
    department: 'Catering',
    isWatchkeeper: false,
    nationalSeamanBookNo: 'SB-998811',
    passportNo: 'P-112233',
    defaultPatternId: 'pattern_cook',
    joinDate: '2026-01-10',
    signOffDate: '2026-09-10',
    handoverNotes: '伙食管理与厨房卫生合规',
  },
  {
    id: 'crew_012',
    name: 'Sun Yong (孙勇 服务员)',
    rank: 'Messroom Steward (服务员)',
    department: 'Catering',
    isWatchkeeper: false,
    nationalSeamanBookNo: 'SB-887722',
    passportNo: 'P-223344',
    defaultPatternId: 'pattern_steward',
    joinDate: '2026-02-05',
    signOffDate: '2026-10-05',
    handoverNotes: '餐厅服务与卫生清理',
  },
];

/**
 * Pre-populates realistic work logs for all crew members for the past 30 days
 */
export function generateInitialWorkLogs(crew: CrewMember[]): Record<string, any> {
  const logs: Record<string, any> = {};
  const baseTime = Date.UTC(2026, 7, 4); // 2026-08-04
  
  crew.forEach((c) => {
    const pattern = STANDARD_PATTERNS.find(p => p.id === c.defaultPatternId) || STANDARD_PATTERNS[0];
    
    // Generate 30 days back
    for (let i = 0; i < 30; i++) {
      const dateStr = new Date(baseTime - i * 86400000).toISOString().split('T')[0];
      const key = `${c.id}_${dateStr}`;
      
      let slots = [...pattern.slots];

      // Introduce an intentional Non-Conformity (port arrival & emergency mooring) on day -3 for Chief Officer (crew_002)
      if (c.id === 'crew_002' && i === 3) {
        // Extended work slots during port arrival: worked 00-04, 08-12, 12-16, 18-23
        slots = createSlotsPattern(
          [[0, 7], [16, 23], [24, 31]], 
          [[36, 45]] // Overtime 18:00 - 23:00 -> Causes <10h rest in 24h & <6h period
        );
      }

      logs[key] = {
        date: dateStr,
        slots,
        totalWorkHours: 0,
        totalRestHours: 0,
        longestRestPeriod: 0,
        restPeriodCount: 0,
        rolling24hRest: 0,
        rolling7dRest: 0,
        nonConformities: [],
        notes: c.id === 'crew_002' && i === 3 ? 'Port Arrival & Heavy Weather Emergency Mooring Operations' : undefined,
      };
    }
  });

  return logs;
}
