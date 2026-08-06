import React, { useState } from 'react';
import { NonConformity } from '../types';
import { AlertTriangle, ShieldAlert, FileText, Check, Trash2 } from 'lucide-react';

interface NCDetailsModalProps {
  nc: NonConformity | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveComment: (ncId: string, comment: string) => void;
}

export const NCDetailsModal: React.FC<NCDetailsModalProps> = ({
  nc,
  isOpen,
  onClose,
  onSaveComment,
}) => {
  if (!isOpen || !nc) return null;

  const [comment, setComment] = useState<string>(nc.masterComment || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveComment(nc.id, comment);
    onClose();
  };

  const handleClear = () => {
    setComment('');
    onSaveComment(nc.id, '');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border-2 border-rose-600 rounded-xl p-5 max-w-lg w-full shadow-2xl text-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-rose-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <h3 className="font-extrabold text-base text-rose-200 uppercase tracking-wide">
              Non-Conformity Violation Inspector
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-rose-900/60">
            <div className="flex justify-between items-center text-slate-400 font-mono mb-1">
              <span>Rule Violation: <strong className="text-rose-300">{nc.ruleId}</strong></span>
              <span className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded font-bold">{nc.date}</span>
            </div>
            <h4 className="font-bold text-sm text-slate-100">{nc.ruleName}</h4>
            <p className="text-rose-300 font-medium mt-1">{nc.description}</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">STCW Regulation Mechanics</div>
            <p className="text-slate-300 text-xs leading-relaxed">{nc.details}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2 pt-2">
            <label className="block font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Master's Justification Comment / Exception Remark</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Provide mandatory official remark for Port State Control (PSC) inspection (e.g. STCW A-VIII/1.8 override due to emergency mooring, essential shipboard drill, or safety of vessel).
            </p>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Overtime required for emergency engine room repair and vessel safety under Master's command..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={!comment}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-rose-900/60 disabled:opacity-40 text-slate-300 hover:text-rose-200 text-xs font-medium cursor-pointer transition flex items-center gap-1"
                title="删除/清空此不合格项说明"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除备注</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow flex items-center gap-1 text-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>保存说明</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
