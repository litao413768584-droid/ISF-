import { CrewMember, SlotStatus } from '../types';

export type CrewDayContractStatus =
  | 'NOT_YET_SIGNED_ON' // 尚未登轮上船 (在船合约开始前)
  | 'HANDOVER_IN_PROGRESS' // 职务交接进行中 (交接窗口期)
  | 'ACTIVE_ONBOARD' // 在船正常履职期
  | 'SIGNED_OFF'; // 已交接完毕休假离船 (停止记录工时)

/**
 * Evaluates a seafarer's contract lifecycle status for a given calendar date (YYYY-MM-DD)
 */
export function getCrewContractDayStatus(crew: CrewMember, dateStr: string): CrewDayContractStatus {
  const joinDateOnly = crew.joinDateTime ? crew.joinDateTime.split('T')[0] : (crew.joinDate || '');
  const signOffDateOnly = crew.signOffDateTime ? crew.signOffDateTime.split('T')[0] : (crew.signOffDate || '');
  
  const handoverStartDateOnly = crew.handoverStartDateTime ? crew.handoverStartDateTime.split('T')[0] : '';
  const handoverEndDateOnly = crew.handoverEndDateTime ? crew.handoverEndDateTime.split('T')[0] : '';

  // 1. If date is before sign-on date
  if (joinDateOnly && dateStr < joinDateOnly) {
    return 'NOT_YET_SIGNED_ON';
  }

  // 2. If date is after sign-off date
  if (signOffDateOnly && dateStr > signOffDateOnly) {
    return 'SIGNED_OFF';
  }

  // 3. If date is within handover start & end date window
  if (handoverStartDateOnly && handoverEndDateOnly && dateStr >= handoverStartDateOnly && dateStr <= handoverEndDateOnly) {
    return 'HANDOVER_IN_PROGRESS';
  }

  // 4. Otherwise active onboard
  return 'ACTIVE_ONBOARD';
}

/**
 * Returns human readable badge & text for the status
 */
export function getContractStatusBadge(status: CrewDayContractStatus) {
  switch (status) {
    case 'NOT_YET_SIGNED_ON':
      return {
        label: '未登轮上船 (无需记录工时)',
        color: 'bg-slate-800 text-slate-400 border-slate-700',
        canEditLogs: false,
        desc: '该船员尚未到上船日期时间，无需填写时间表',
      };
    case 'HANDOVER_IN_PROGRESS':
      return {
        label: '🤝 职务交接进行中',
        color: 'bg-indigo-950 text-indigo-300 border-indigo-700 font-bold',
        canEditLogs: true,
        desc: '双方正在进行离船/上船职务与防污染交接，双人共同记录交接工时',
      };
    case 'SIGNED_OFF':
      return {
        label: '🌴 已休假离船 (终止记录工时)',
        color: 'bg-emerald-950 text-emerald-400 border-emerald-800',
        canEditLogs: false,
        desc: '交接完毕，该船员已休假离船，后续日期终止工时记录',
      };
    case 'ACTIVE_ONBOARD':
    default:
      return {
        label: '⚓ 在船正常履职',
        color: 'bg-blue-950 text-blue-300 border-blue-800',
        canEditLogs: true,
        desc: '在船履行劳动合约与常规班组值班',
      };
  }
}

/**
 * Helper to auto-fill handover work slots during exact handover hours on a given day
 */
export function applyHandoverSlotHours(
  crew: CrewMember,
  dateStr: string,
  baseSlots: SlotStatus[]
): SlotStatus[] {
  if (!crew.handoverStartDateTime || !crew.handoverEndDateTime) {
    return baseSlots;
  }

  const newSlots = [...baseSlots];
  const handoverStart = new Date(crew.handoverStartDateTime);
  const handoverEnd = new Date(crew.handoverEndDateTime);

  // Check each 30-min slot (0..47) of dateStr
  for (let slotIdx = 0; slotIdx < 48; slotIdx++) {
    const slotHour = Math.floor(slotIdx / 2);
    const slotMin = (slotIdx % 2) * 30;
    
    // Create slot Date object
    const slotDateTimeStr = `${dateStr}T${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}:00`;
    const slotDateTime = new Date(slotDateTimeStr);

    // If this slot falls inside handover window, ensure it is set to WORK
    if (slotDateTime >= handoverStart && slotDateTime <= handoverEnd) {
      if (newSlots[slotIdx] === 'REST') {
        newSlots[slotIdx] = 'WORK';
      }
    }
  }

  return newSlots;
}
