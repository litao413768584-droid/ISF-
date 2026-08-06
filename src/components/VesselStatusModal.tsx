import React, { useState } from 'react';
import { VesselStatusLog, VesselStatusType, CrewMember, SlotStatus } from '../types';
import { Anchor, Ship, Building2, Layers, Plus, Trash2, X, Clock, MapPin, CheckCircle, Zap } from 'lucide-react';

interface VesselStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusLogs: VesselStatusLog[];
  crew: CrewMember[];
  onAddStatusLog: (log: VesselStatusLog) => void;
  onDeleteStatusLog: (id: string) => void;
  onApplyStatusWatch: (statusType: VesselStatusType, startDate: string, endDate: string) => void;
}

export function VesselStatusModal({
  isOpen,
  onClose,
  statusLogs,
  crew,
  onAddStatusLog,
  onDeleteStatusLog,
  onApplyStatusWatch,
}: VesselStatusModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  // New Log Form State
  const [formData, setFormData] = useState<{
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    statusType: VesselStatusType;
    locationName: string;
    notes: string;
  }>({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '20:00',
    statusType: 'at_anchor',
    locationName: '上海吴淞口 2号防台锚地',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: VesselStatusLog = {
      id: 'vsl_' + Date.now(),
      startDate: formData.startDate,
      startTime: formData.startTime,
      endDate: formData.endDate,
      endTime: formData.endTime,
      statusType: formData.statusType,
      locationName: formData.locationName.trim() || '未指定地点/港口',
      notes: formData.notes.trim(),
    };
    onAddStatusLog(newLog);
    setActiveTab('list');
  };

  const getStatusBadge = (type: VesselStatusType) => {
    switch (type) {
      case 'at_sea':
        return { label: '在航航行 (At Sea)', color: 'bg-blue-950 text-blue-300 border-blue-700', icon: Ship };
      case 'at_anchor':
        return { label: '锚泊候泊 (At Anchor)', color: 'bg-amber-950 text-amber-300 border-amber-700', icon: Anchor };
      case 'weigh_anchor':
        return { label: '⚓ 抛起锚作业 (Anchoring & Weighing)', color: 'bg-amber-900 text-amber-200 border-amber-500 font-bold', icon: Anchor };
      case 'port_berthing':
        return { label: '停靠码头 (Port Berthing)', color: 'bg-emerald-950 text-emerald-300 border-emerald-700', icon: Building2 };
      case 'mooring_ops':
        return { label: '🚢 靠离泊系泊操作 (Berthing & Unberthing)', color: 'bg-emerald-900 text-emerald-200 border-emerald-500 font-bold', icon: Building2 };
      case 'cargo_ops':
        return { label: '港口装卸 (Cargo Ops)', color: 'bg-purple-950 text-purple-300 border-purple-700', icon: Layers };
      case 'drydock':
        return { label: '进坞修船 (Drydock)', color: 'bg-slate-800 text-slate-300 border-slate-600', icon: Clock };
      default:
        return { label: '未知状态', color: 'bg-slate-800 text-slate-300', icon: Ship };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-2xl w-full shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base text-slate-100">船舶作业状态与停靠锚泊日志</h3>
              <p className="text-[11px] text-slate-400">设置船舶停靠码头、锚泊、航行等时间段，联动调整全船值班与加班安排</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 mt-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Ship className="w-3.5 h-3.5" />
            <span>状态日志列表 ({statusLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>登记新状态段 (如码头停靠/抛锚)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 custom-scrollbar">
          {activeTab === 'list' && (
            <div className="space-y-3">
              {statusLogs.map((log) => {
                const badge = getStatusBadge(log.statusType);
                const IconComponent = badge.icon;

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 relative group hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border flex items-center gap-1 ${badge.color}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          {log.locationName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onApplyStatusWatch(log.statusType, log.startDate, log.endDate)}
                          title="自动套用该状态下的全船/部门值班模式"
                          className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-[11px] font-semibold rounded flex items-center gap-1 transition cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>一键排班</span>
                        </button>

                        <button
                          onClick={() => onDeleteStatusLog(log.id)}
                          className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                          title="删除记录"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-300 flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>
                        {log.startDate} {log.startTime} 至 {log.endDate} {log.endTime}
                      </span>
                    </div>

                    {log.notes && (
                      <p className="text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded">
                        备注说明: {log.notes}
                      </p>
                    )}
                  </div>
                );
              })}

              {statusLogs.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  暂无船舶作业状态记录，点击顶部按钮新增停靠码头、锚泊或航行日志。
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>新增船舶作业状态与停靠锚泊记录</span>
              </h4>

              <div>
                <label className="block text-slate-400 font-medium mb-1">船舶状态类型 (Status Category)</label>
                <select
                  value={formData.statusType}
                  onChange={(e) => setFormData({ ...formData, statusType: e.target.value as VesselStatusType })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="at_anchor">⚓ 锚泊候泊 (At Anchor - 锚地/备车)</option>
                  <option value="weigh_anchor">⚓ 抛起锚作业 (Anchoring / Weighing Anchor - 抛起锚备车/站班)</option>
                  <option value="port_berthing">🏙️ 停靠码头 (Port Berthing - 靠泊系缆/岸电)</option>
                  <option value="mooring_ops">🚢 靠离泊系泊操作 (Berthing / Unberthing Operations - 前后解系缆站值班)</option>
                  <option value="cargo_ops">🏗️ 港口装卸作业 (Cargo Operations - 装货/卸货/压排水)</option>
                  <option value="at_sea">🌊 在航航行 (At Sea - 正常航行班)</option>
                  <option value="drydock">🛠️ 进坞修船 (Drydock / Shipyard)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">停靠码头 / 锚地名称 (Port / Anchorage Location)</label>
                <input
                  type="text"
                  required
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                  placeholder="例如: 上海洋山集装箱码头 #3泊位 或 吴淞口2号锚地"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">开始日期 (Start Date)</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">开始时间 (Start Time)</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">结束日期 (End Date)</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">结束时间 (End Time)</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">作业与值班特别说明 (Notes)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="例如: 港口靠泊需要加配装卸防污染与甲板系缆班"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  保存状态日志
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>提示: 船舶处于码头靠泊或锚泊时，可通过【一键排班】快速将班组调整为锚泊班或港口加班</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium"
          >
            关闭
          </button>
        </div>

      </div>
    </div>
  );
}
