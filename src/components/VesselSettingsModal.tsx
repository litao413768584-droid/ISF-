import React, { useState } from 'react';
import { VesselInfo, RegulationMode } from '../types';
import { Settings, Anchor, Check, Shield } from 'lucide-react';

interface VesselSettingsModalProps {
  vessel: VesselInfo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (vessel: VesselInfo) => void;
}

export const VesselSettingsModal: React.FC<VesselSettingsModalProps> = ({
  vessel,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<VesselInfo>({ ...vessel });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-slate-100">船舶信息与国际公约履约设置</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">船舶中文/英文名称 (Vessel Name)</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">IMO 编号</label>
              <input
                type="text"
                required
                value={formData.imoNumber}
                onChange={(e) => setFormData({ ...formData, imoNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">船旗国 (Flag State)</label>
              <input
                type="text"
                required
                value={formData.flagState}
                onChange={(e) => setFormData({ ...formData, flagState: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">船长姓名 (Master)</label>
              <input
                type="text"
                required
                value={formData.masterName}
                onChange={(e) => setFormData({ ...formData, masterName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">轮机长姓名 (Chief Engineer)</label>
              <input
                type="text"
                required
                value={formData.chiefEngineerName}
                onChange={(e) => setFormData({ ...formData, chiefEngineerName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">适用公约与履约标准 (Regulation Framework)</label>
            <select
              value={formData.regulationMode}
              onChange={(e) => setFormData({ ...formData, regulationMode: e.target.value as RegulationMode })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="STCW_2010">STCW 2010 马尼拉修正案 (默认标准，任何24h不少于10h休息，分段不超过2段)</option>
              <option value="MLC_2006">MLC 2006 海事劳工公约 (最大工作14h/24h, 72h/7天)</option>
              <option value="OPA_90">OPA 90 (美国1990年油污法案 - 油轮进入美国水域适用)</option>
            </select>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="stcwException"
              checked={formData.allowSTCWException}
              onChange={(e) => setFormData({ ...formData, allowSTCWException: e.target.checked })}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <label htmlFor="stcwException" className="font-bold text-slate-200 cursor-pointer">
                Enable STCW Section A-VIII/1.9 Exception Allowance
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Allows rest hours to be reduced to minimum 70 hours in any 7-day period (for up to 2 consecutive weeks).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default VesselSettingsModal;