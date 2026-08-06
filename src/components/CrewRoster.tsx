import React, { useState } from 'react';
import { CrewMember, Department, WorkLogDay, WatchPattern, SlotStatus } from '../types';
import { Users, UserPlus, CheckCircle, AlertCircle, Clock, ShieldAlert, Edit2, Trash2, Search, Anchor, Layers, X } from 'lucide-react';

export interface RankOption {
  rank: string;
  department: Department;
  isWatchkeeper: boolean;
  defaultPatternId: string;
}

export const STANDARD_SHIPBOARD_RANKS: RankOption[] = [
  // 甲板部 (Deck)
  { rank: '船长 (Master)', department: 'Deck', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },
  { rank: '大副 (Chief Officer)', department: 'Deck', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_2' },
  { rank: '二副 (2nd Officer)', department: 'Deck', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_1' },
  { rank: '三副 (3rd Officer)', department: 'Deck', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_3' },
  { rank: '见习三副 / 实习驾驶员 (Deck Cadet)', department: 'Deck', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_3' },
  { rank: '水手长 (Bosun)', department: 'Deck', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },
  { rank: '木匠 / 舵工 (Carpenter / Quartermaster)', department: 'Deck', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },
  { rank: '一等水手 / 值班水手 (Able Seaman - AB)', department: 'Deck', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_1' },
  { rank: '普通水手 (Ordinary Seaman - OS)', department: 'Deck', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },

  // 轮机部 (Engine)
  { rank: '轮机长 (Chief Engineer)', department: 'Engine', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },
  { rank: '大管轮 (2nd Engineer)', department: 'Engine', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_2' },
  { rank: '二管轮 (3rd Engineer)', department: 'Engine', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_1' },
  { rank: '三管轮 (4th Engineer)', department: 'Engine', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_3' },
  { rank: '见习三管轮 / 实习轮机员 (Engine Cadet)', department: 'Engine', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_3' },
  { rank: '机匠长 / 铜匠 (Fitter / Engine Foreman)', department: 'Engine', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },
  { rank: '一等机工 / 值班机工 (Motorman / Oiler)', department: 'Engine', isWatchkeeper: true, defaultPatternId: 'pattern_4_8_1' },
  { rank: '擦机工 / 抹油工 (Wiper)', department: 'Engine', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },

  // 电气与无线电部 (Electrical / Radio)
  { rank: '电子电气员 / 电工 (ETO / Electrician)', department: 'Engine', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },
  { rank: '报务员 / 电子员 (Radio Officer)', department: 'Radio', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },

  // 膳食部 / 事务部 (Catering / Steward)
  { rank: '管事 / 事务长 (Chief Steward)', department: 'Catering', isWatchkeeper: false, defaultPatternId: 'pattern_steward' },
  { rank: '大厨 / 主厨 (Chief Cook)', department: 'Catering', isWatchkeeper: false, defaultPatternId: 'pattern_cook' },
  { rank: '二厨 / 伙食工 (Second Cook / Messman)', department: 'Catering', isWatchkeeper: false, defaultPatternId: 'pattern_cook' },
  { rank: '服务员 / 餐厅水手 (Messroom Steward)', department: 'Catering', isWatchkeeper: false, defaultPatternId: 'pattern_steward' },

  // 医务部 / 随船人员 / 引航员 (Medical & Others)
  { rank: '船医 (Ship Doctor)', department: 'Medical', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },
  { rank: '引航员 / 水先人 (Pilot)', department: 'Deck', isWatchkeeper: true, defaultPatternId: 'pattern_daywork' },
  { rank: '随船修船技师 (Riding Repair Crew)', department: 'Engine', isWatchkeeper: false, defaultPatternId: 'pattern_daywork' },
];

interface CrewRosterProps {
  crew: CrewMember[];
  selectedCrewId: string;
  onSelectCrew: (crewId: string) => void;
  onAddCrew: (crewMember: CrewMember) => void;
  onUpdateCrew: (crewMember: CrewMember) => void;
  onDeleteCrew: (crewId: string) => void;
  workLogs: Record<string, WorkLogDay>;
  watchPatterns: WatchPattern[];
  selectedMonthStr: string; // YYYY-MM
  onOpenBatchAssign?: () => void;
}

export const CrewRoster: React.FC<CrewRosterProps> = ({
  crew,
  selectedCrewId,
  onSelectCrew,
  onAddCrew,
  onUpdateCrew,
  onDeleteCrew,
  workLogs,
  watchPatterns,
  selectedMonthStr,
  onOpenBatchAssign,
}) => {
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);

  // Modal Form State
  const [formData, setFormData] = useState<{
    name: string;
    rank: string;
    department: Department;
    isWatchkeeper: boolean;
    nationalSeamanBookNo: string;
    passportNo: string;
    defaultPatternId: string;
    joinDate: string;
    joinDateTime: string;
    signOffDate: string;
    signOffDateTime: string;
    handoverStartDateTime: string;
    handoverEndDateTime: string;
    handoverNotes: string;
    relievedCrewId: string;
    customPatternSlots: SlotStatus[];
  }>({
    name: '',
    rank: '一等水手 (Able Seaman)',
    department: 'Deck',
    isWatchkeeper: true,
    nationalSeamanBookNo: '',
    passportNo: '',
    defaultPatternId: watchPatterns[0]?.id || 'pattern_4_8_1',
    joinDate: '2026-01-15',
    joinDateTime: '2026-01-15T08:00',
    signOffDate: '2026-09-15',
    signOffDateTime: '2026-09-15T12:00',
    handoverStartDateTime: '2026-01-15T08:00',
    handoverEndDateTime: '2026-01-15T16:00',
    handoverNotes: '',
    relievedCrewId: '',
    customPatternSlots: new Array(48).fill('REST'),
  });

  const handleOpenAddModal = () => {
    setEditingCrew(null);
    setFormData({
      name: '',
      rank: '三副 (3rd Officer)',
      department: 'Deck',
      isWatchkeeper: true,
      nationalSeamanBookNo: 'SB-' + Math.floor(100000 + Math.random() * 900000),
      passportNo: 'P-' + Math.floor(100000 + Math.random() * 900000),
      defaultPatternId: watchPatterns[0]?.id || '',
      joinDate: '2026-01-15',
      joinDateTime: '2026-01-15T08:00',
      signOffDate: '2026-09-15',
      signOffDateTime: '2026-09-15T12:00',
      handoverStartDateTime: '2026-01-15T08:00',
      handoverEndDateTime: '2026-01-15T16:00',
      handoverNotes: '',
      customPatternSlots: new Array(48).fill('REST'),
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: CrewMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCrew(c);
    const pattern = watchPatterns.find((p) => p.id === c.defaultPatternId);
    const initialSlots = c.customPatternSlots || (pattern ? pattern.slots : new Array(48).fill('REST'));

    setFormData({
      name: c.name,
      rank: c.rank,
      department: c.department,
      isWatchkeeper: c.isWatchkeeper,
      nationalSeamanBookNo: c.nationalSeamanBookNo || '',
      passportNo: c.passportNo || '',
      defaultPatternId: c.defaultPatternId || watchPatterns[0]?.id || '',
      joinDate: c.joinDate || '2026-01-15',
      joinDateTime: c.joinDateTime || `${c.joinDate || '2026-01-15'}T08:00`,
      signOffDate: c.signOffDate || '2026-09-15',
      signOffDateTime: c.signOffDateTime || `${c.signOffDate || '2026-09-15'}T12:00`,
      handoverStartDateTime: c.handoverStartDateTime || `${c.joinDate || '2026-01-15'}T08:00`,
      handoverEndDateTime: c.handoverEndDateTime || `${c.joinDate || '2026-01-15'}T16:00`,
      handoverNotes: c.handoverNotes || '',
      relievedCrewId: c.relievedCrewId || '',
      customPatternSlots: [...initialSlots],
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const updatedCrewData: Partial<CrewMember> = {
      name: formData.name.trim(),
      rank: formData.rank.trim(),
      department: formData.department,
      isWatchkeeper: formData.isWatchkeeper,
      nationalSeamanBookNo: formData.nationalSeamanBookNo.trim(),
      passportNo: formData.passportNo.trim(),
      defaultPatternId: formData.defaultPatternId,
      customPatternSlots: formData.customPatternSlots,
      joinDate: formData.joinDateTime ? formData.joinDateTime.split('T')[0] : formData.joinDate,
      joinDateTime: formData.joinDateTime,
      signOffDate: formData.signOffDateTime ? formData.signOffDateTime.split('T')[0] : formData.signOffDate,
      signOffDateTime: formData.signOffDateTime,
      handoverStartDateTime: formData.handoverStartDateTime,
      handoverEndDateTime: formData.handoverEndDateTime,
      handoverNotes: formData.handoverNotes.trim(),
      relievedCrewId: formData.relievedCrewId,
    };

    if (editingCrew) {
      onUpdateCrew({
        ...editingCrew,
        ...updatedCrewData,
      } as CrewMember);
    } else {
      const newMember: CrewMember = {
        id: `crew_${Date.now()}`,
        ...(updatedCrewData as CrewMember),
      };
      onAddCrew(newMember);
      onSelectCrew(newMember.id);
    }

    setIsModalOpen(false);
  };

  const filteredCrew = crew.filter((c) => {
    const matchesDept = filterDept === 'ALL' || c.department === filterDept;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.rank.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  // Calculate month compliance for crew member
  const getCrewMonthStatus = (crewId: string) => {
    let ncCount = 0;
    Object.entries(workLogs).forEach(([key, log]) => {
      const workLog = log as WorkLogDay;
      if (key.startsWith(`${crewId}_${selectedMonthStr}`)) {
        if (workLog && workLog.nonConformities && workLog.nonConformities.length > 0) {
          ncCount += workLog.nonConformities.length;
        }
      }
    });
    return ncCount;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col h-full">
      {/* Header & Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-slate-100 text-sm tracking-wide">船员花名册与换班信息</h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
            {crew.length} 人
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenBatchAssign && (
            <button
              onClick={onOpenBatchAssign}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 font-medium text-xs transition cursor-pointer shadow-xs"
              title="批量排班、演习与特别作业录入"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>批量排班</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition cursor-pointer shadow"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>新增船员</span>
          </button>
        </div>
      </div>

      {/* Search & Department Filter */}
      <div className="py-2.5 space-y-2 border-b border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="搜索姓名、职务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 text-[11px] overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: 'ALL', label: '全部部门' },
            { id: 'Deck', label: '甲板部 (Deck)' },
            { id: 'Engine', label: '轮机部 (Engine)' },
            { id: 'Catering', label: '膳食部 (Catering)' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id)}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer whitespace-nowrap ${
                filterDept === d.id
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Crew List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1 custom-scrollbar min-h-[300px]">
        {filteredCrew.map((c) => {
          const isSelected = c.id === selectedCrewId;
          const ncCount = getCrewMonthStatus(c.id);

          return (
            <div
              key={c.id}
              onClick={() => onSelectCrew(c.id)}
              className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between gap-2 group ${
                isSelected
                  ? 'bg-blue-950/70 border-blue-600 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs text-slate-100 truncate">{c.name}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                    c.department === 'Deck'
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      : c.department === 'Engine'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {c.department === 'Deck' ? '甲板部' : c.department === 'Engine' ? '轮机部' : '膳食部'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-300">{c.rank}</span>
                  <span>•</span>
                  <span>{c.isWatchkeeper ? '值班人员' : '日勤人员'}</span>
                </div>

                {/* Join and Sign-off dates display */}
                <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap items-center gap-2 font-mono">
                  <span>上船: {c.joinDate || '未指定'}</span>
                  <span>|</span>
                  <span>预计下船: {c.signOffDate || '未指定'}</span>
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center gap-1.5">
                {ncCount > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    {ncCount} 项警告
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    合规
                  </span>
                )}

                <button
                  onClick={(e) => handleOpenEditModal(c, e)}
                  title="编辑船员与换班信息"
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition opacity-0 group-hover:opacity-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredCrew.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            未找到匹配的船员记录。
          </div>
        )}
      </div>

      {/* Add / Edit Crew Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto">
            {/* Modal Header - Sticky Top */}
            <div className="px-4 sm:px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Anchor className="w-4.5 h-4.5 text-blue-400" />
                <span>{editingCrew ? '编辑船员与换班信息' : '录入新船员信息'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 text-xs transition cursor-pointer flex items-center gap-1 shadow"
                title="关闭弹窗"
              >
                <X className="w-3.5 h-3.5" />
                <span>关闭</span>
              </button>
            </div>

            {/* Modal Form Body - Scrollable */}
            <form id="crew-modal-form" onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">船员姓名 (Name)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: 李强 (Chief Officer)"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick Preset Rank Dropdown */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold text-xs">
                    ⚓ 快捷选择海员职务职衔 (Select Common Rank)
                  </label>
                  <span className="text-[10px] text-blue-400">自动带出部门与值班属性</span>
                </div>
                <select
                  onChange={(e) => {
                    const selectedRankVal = e.target.value;
                    const preset = STANDARD_SHIPBOARD_RANKS.find((r) => r.rank === selectedRankVal);
                    if (preset) {
                      setFormData((prev) => {
                        const newPattern = watchPatterns.find((p) => p.id === preset.defaultPatternId);
                        const newSlots = newPattern ? [...newPattern.slots] : prev.customPatternSlots;
                        return {
                          ...prev,
                          rank: preset.rank,
                          department: preset.department,
                          isWatchkeeper: preset.isWatchkeeper,
                          defaultPatternId: preset.defaultPatternId,
                          customPatternSlots: newSlots,
                        };
                      });
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
                >
                  <option value="" disabled>-- 快速选择标准职务 (也可在下方自定义修改) --</option>
                  <optgroup label="甲板部 (Deck Department)">
                    {STANDARD_SHIPBOARD_RANKS.filter((r) => r.department === 'Deck').map((r) => (
                      <option key={r.rank} value={r.rank}>{r.rank}</option>
                    ))}
                  </optgroup>
                  <optgroup label="轮机部 (Engine Department)">
                    {STANDARD_SHIPBOARD_RANKS.filter((r) => r.department === 'Engine').map((r) => (
                      <option key={r.rank} value={r.rank}>{r.rank}</option>
                    ))}
                  </optgroup>
                  <optgroup label="膳食部 / 事务部 (Catering Department)">
                    {STANDARD_SHIPBOARD_RANKS.filter((r) => r.department === 'Catering').map((r) => (
                      <option key={r.rank} value={r.rank}>{r.rank}</option>
                    ))}
                  </optgroup>
                  <optgroup label="医务部 / 无线电部 / 随船人员 (Medical & Others)">
                    {STANDARD_SHIPBOARD_RANKS.filter((r) => r.department === 'Medical' || r.department === 'Radio').map((r) => (
                      <option key={r.rank} value={r.rank}>{r.rank}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">职务 / 职衔 (Rank)</label>
                  <input
                    type="text"
                    required
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    placeholder="如: 大副 / 大管轮"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">所属部门 (Department)</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as Department })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Deck">甲板部 (Deck)</option>
                    <option value="Engine">轮机部 (Engine)</option>
                    <option value="Catering">膳食部 (Catering)</option>
                    <option value="Medical">医务部 (Medical)</option>
                    <option value="Radio">无线电部 (Radio)</option>
                  </select>
                </div>
              </div>

              {/* Join DateTime and Sign-off DateTime */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">精确上船时间 (Sign-On DateTime)</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.joinDateTime}
                    onChange={(e) => setFormData({ ...formData, joinDateTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">精确休假/离船时间 (Sign-Off)</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.signOffDateTime}
                    onChange={(e) => setFormData({ ...formData, signOffDateTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Relieved Crew Member Selection (接替/交接班对象) */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-medium text-xs">
                  🤝 换班接班对关联 (Relieving / Handover Pair)
                </label>
                <select
                  value={formData.relievedCrewId}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    const targetMember = crew.find((cm) => cm.id === targetId);
                    if (targetMember) {
                      setFormData({
                        ...formData,
                        relievedCrewId: targetId,
                        // Sync handover datetimes if target member has them
                        handoverStartDateTime: targetMember.handoverStartDateTime || formData.handoverStartDateTime,
                        handoverEndDateTime: targetMember.handoverEndDateTime || formData.handoverEndDateTime,
                        joinDateTime: targetMember.signOffDateTime || formData.joinDateTime,
                      });
                    } else {
                      setFormData({ ...formData, relievedCrewId: targetId });
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
                >
                  <option value="">-- 无 (独立上船 / 新签合同) --</option>
                  {crew
                    .filter((cm) => cm.id !== editingCrew?.id)
                    .map((cm) => (
                      <option key={cm.id} value={cm.id}>
                        接替: {cm.name} ({cm.rank} - {cm.department}) [休假/离船时间: {cm.signOffDate || '未定'}]
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  选择被接班的休假船员后，自动同步其离船时间与交接班窗口。交接完毕后，休假船员自动止报工时。
                </p>
              </div>

              {/* Handover Window Datetime */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">交接班开始 (Handover Start)</label>
                  <input
                    type="datetime-local"
                    value={formData.handoverStartDateTime}
                    onChange={(e) => setFormData({ ...formData, handoverStartDateTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">交接班结束 (Handover End)</label>
                  <input
                    type="datetime-local"
                    value={formData.handoverEndDateTime}
                    onChange={(e) => setFormData({ ...formData, handoverEndDateTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">水手/船员海员证号</label>
                  <input
                    type="text"
                    value={formData.nationalSeamanBookNo}
                    onChange={(e) => setFormData({ ...formData, nationalSeamanBookNo: e.target.value })}
                    placeholder="如: SB-123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">护照号码</label>
                  <input
                    type="text"
                    value={formData.passportNo}
                    onChange={(e) => setFormData({ ...formData, passportNo: e.target.value })}
                    placeholder="如: P-987654"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">换班/职务交接说明 (Handover Notes)</label>
                <input
                  type="text"
                  value={formData.handoverNotes}
                  onChange={(e) => setFormData({ ...formData, handoverNotes: e.target.value })}
                  placeholder="如: 合同期9个月，上海港完成交接与海图设备盘点"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isWatchkeeper"
                  checked={formData.isWatchkeeper}
                  onChange={(e) => setFormData({ ...formData, isWatchkeeper: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isWatchkeeper" className="text-slate-300 font-medium cursor-pointer">
                  航行/机舱指定值班人员 (Designated Watchkeeper)
                </label>
              </div>

              {/* Individual Custom Schedule Section */}
              <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">
                    该船员个性化常态值班时间 (Custom Duty Hours)
                  </label>
                  <span className="text-[10px] text-slate-400">支持大厨/服务员/具体船员自主排班</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">快捷模板:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newS: SlotStatus[] = new Array(48).fill('REST');
                      for (let i = 0; i <= 7; i++) newS[i] = 'WORK';   // 00:00-04:00
                      for (let i = 24; i <= 31; i++) newS[i] = 'WORK'; // 12:00-16:00
                      setFormData({ ...formData, customPatternSlots: newS, defaultPatternId: 'pattern_4_8_1' });
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] rounded border border-slate-700 cursor-pointer"
                  >
                    0-On 4-Off (00-04/12-16)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newS: SlotStatus[] = new Array(48).fill('REST');
                      for (let i = 8; i <= 15; i++) newS[i] = 'WORK';  // 04:00-08:00
                      for (let i = 32; i <= 39; i++) newS[i] = 'WORK'; // 16:00-20:00
                      setFormData({ ...formData, customPatternSlots: newS, defaultPatternId: 'pattern_4_8_2' });
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] rounded border border-slate-700 cursor-pointer"
                  >
                    4-On 8-Off (04-08/16-20)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newS: SlotStatus[] = new Array(48).fill('REST');
                      for (let i = 16; i <= 23; i++) newS[i] = 'WORK'; // 08:00-12:00
                      for (let i = 40; i <= 47; i++) newS[i] = 'WORK'; // 20:00-24:00
                      setFormData({ ...formData, customPatternSlots: newS, defaultPatternId: 'pattern_4_8_3' });
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] rounded border border-slate-700 cursor-pointer"
                  >
                    8-On 12-Off (08-12/20-24)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newS: SlotStatus[] = new Array(48).fill('REST');
                      for (let i = 0; i <= 11; i++) newS[i] = 'WORK';  // 00:00-06:00
                      for (let i = 24; i <= 35; i++) newS[i] = 'WORK'; // 12:00-18:00
                      setFormData({ ...formData, customPatternSlots: newS, defaultPatternId: 'pattern_6_6' });
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] rounded border border-slate-700 cursor-pointer"
                  >
                    0-On 6-Off (00-06/12-18)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newS: SlotStatus[] = new Array(48).fill('REST');
                      for (let i = 12; i <= 23; i++) newS[i] = 'WORK'; // 06:00-12:00
                      for (let i = 36; i <= 47; i++) newS[i] = 'WORK'; // 18:00-24:00
                      setFormData({ ...formData, customPatternSlots: newS, defaultPatternId: 'pattern_6_6_2' });
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] rounded border border-slate-700 cursor-pointer"
                  >
                    6-On 12-Off (06-12/18-24)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newS: SlotStatus[] = new Array(48).fill('REST');
                      for (let i = 16; i <= 23; i++) newS[i] = 'WORK'; // 08:00-12:00
                      for (let i = 26; i <= 33; i++) newS[i] = 'WORK'; // 13:00-17:00
                      setFormData({ ...formData, customPatternSlots: newS, defaultPatternId: 'pattern_daywork' });
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] rounded border border-slate-700 cursor-pointer"
                  >
                    常日勤 (08-12/13-17)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newS: SlotStatus[] = new Array(48).fill('REST');
                      for (let i = 12; i <= 23; i++) newS[i] = 'WORK'; // 06:00-12:00
                      for (let i = 32; i <= 35; i++) newS[i] = 'WORK'; // 16:00-18:00
                      setFormData({ ...formData, customPatternSlots: newS, defaultPatternId: 'pattern_cook' });
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] rounded border border-slate-700 cursor-pointer"
                  >
                    🍳 大厨班 (06-12/16-18)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newS: SlotStatus[] = new Array(48).fill('REST');
                      for (let i = 14; i <= 25; i++) newS[i] = 'WORK'; // 07:00-13:00
                      for (let i = 34; i <= 37; i++) newS[i] = 'WORK'; // 17:00-19:00
                      setFormData({ ...formData, customPatternSlots: newS, defaultPatternId: 'pattern_steward' });
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] rounded border border-slate-700 cursor-pointer"
                  >
                    ☕ 服务员 (07-13/17-19)
                  </button>
                </div>

                {/* 48-slot visual painter preview */}
                <div className="pt-2">
                  <div className="overflow-x-auto custom-scrollbar pb-1">
                    <div
                      className="grid grid-cols-24 gap-0.5 bg-slate-900 p-1.5 rounded border border-slate-800 min-w-[450px]"
                      style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                    >
                      {formData.customPatternSlots.map((st, idx) => {
                        const hour = Math.floor(idx / 2);
                        const isHalf = idx % 2 === 1;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const newS = [...formData.customPatternSlots];
                              newS[idx] = newS[idx] === 'WORK' ? 'REST' : 'WORK';
                              setFormData({ ...formData, customPatternSlots: newS });
                            }}
                            title={`${hour.toString().padStart(2, '0')}:${isHalf ? '30' : '00'} - 点击切换作息状态 (${st})`}
                            className={`h-6 rounded-xs transition cursor-pointer text-[9px] font-mono flex items-center justify-center ${
                              st === 'WORK' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-500'
                            }`}
                          >
                            {!isHalf ? hour : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    点击上方半小时格子可独立自定义该船员的具体工作时间。
                  </p>
                </div>
              </div>
            </form>

            {/* Modal Footer - Sticky Bottom */}
            <div className="px-4 sm:px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
              {editingCrew ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`确认删除船员 ${editingCrew.name}？`)) {
                      onDeleteCrew(editingCrew.id);
                      setIsModalOpen(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除船员</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  form="crew-modal-form"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer transition"
                >
                  保存船员信息
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
