import React from 'react';
import { VesselInfo, RegulationMode, VesselStatusLog } from '../types';
import { Ship, ShieldCheck, Download, Upload, Settings, Printer, RefreshCw, AlertTriangle, FileText, Anchor, Layers, MapPin, Building2, Clock } from 'lucide-react';

interface HeaderProps {
  vessel: VesselInfo;
  activeTab: 'grid' | 'matrix' | 'report' | 'planner' | 'analytics';
  setActiveTab: (tab: 'grid' | 'matrix' | 'report' | 'planner' | 'analytics') => void;
  onOpenSettings: () => void;
  onOpenBatchAssign?: () => void;
  onOpenVesselStatus?: () => void;
  activeVesselStatusLog?: VesselStatusLog;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetData: () => void;
  totalNcCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  vessel,
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenBatchAssign,
  onOpenVesselStatus,
  activeVesselStatusLog,
  onExportBackup,
  onImportBackup,
  onResetData,
  totalNcCount,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getStatusBadgeLabel = (log?: VesselStatusLog) => {
    if (!log) return { label: '🌊 在航航行', color: 'bg-blue-950 text-blue-300 border-blue-700' };
    switch (log.statusType) {
      case 'at_anchor':
        return { label: `⚓ 锚泊: ${log.locationName}`, color: 'bg-amber-950 text-amber-300 border-amber-700' };
      case 'port_berthing':
        return { label: `🏙️ 码头靠泊: ${log.locationName}`, color: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
      case 'cargo_ops':
        return { label: `🏗️ 装卸作业: ${log.locationName}`, color: 'bg-purple-950 text-purple-300 border-purple-700' };
      case 'drydock':
        return { label: `🛠️ 进坞修船: ${log.locationName}`, color: 'bg-slate-800 text-slate-300 border-slate-600' };
      default:
        return { label: `🌊 在航: ${log.locationName}`, color: 'bg-blue-950 text-blue-300 border-blue-700' };
    }
  };

  const statusBadge = getStatusBadgeLabel(activeVesselStatusLog);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      {/* Top Banner: Vessel Info & Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold shadow-inner">
            <Anchor className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100 tracking-wide text-base">{vessel.name}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                IMO {vessel.imoNumber}
              </span>

              {/* Vessel Operational Status Quick Badge */}
              {onOpenVesselStatus && (
                <button
                  onClick={onOpenVesselStatus}
                  title="点击管理船舶停靠码头、锚泊与航行日志"
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 hover:opacity-90 ${statusBadge.color}`}
                >
                  <span>{statusBadge.label}</span>
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>船长: {vessel.masterName}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">履约标准: {vessel.regulationMode.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Offline & System Badges & Export/Import */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenVesselStatus && (
            <button
              onClick={onOpenVesselStatus}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 text-xs font-bold transition cursor-pointer shadow-sm"
              title="设置船舶停靠码头、锚泊时间与港口值班"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>停靠码头/锚泊日志</span>
            </button>
          )}

          {onOpenBatchAssign && (
            <button
              onClick={onOpenBatchAssign}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 text-xs font-bold transition cursor-pointer shadow-sm"
              title="批量排班、演习与特别作业录入"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>批量排班 / 特别作业</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>离线存储就绪</span>
          </div>

          {totalNcCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/90 border border-rose-800 text-rose-300 text-xs font-semibold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{totalNcCount} 项违规警告</span>
            </div>
          )}

          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={onExportBackup}
            title="导出离线 JSON 数据备份"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">导出备份</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="恢复离线数据库备份"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-xs font-medium cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">导入恢复</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onImportBackup}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={onOpenSettings}
            title="船舶信息与公约设置"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onResetData}
            title="重置样本数据"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-slate-950 border-t border-slate-800/80 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'grid'
                ? 'bg-slate-900 text-blue-400 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-transparent'
            }`}
          >
            <Ship className="w-4 h-4" />
            <span>24小时值班工时记录</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-slate-900 text-blue-400 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>月度合规工时总表</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'report'
                ? 'bg-slate-900 text-blue-400 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-transparent'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>IMO / ILO 官方记录表与签章</span>
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'planner'
                ? 'bg-slate-900 text-blue-400 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-transparent'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>排班预测与合规测算</span>
          </button>
        </div>
      </div>
    </header>
  );
};
