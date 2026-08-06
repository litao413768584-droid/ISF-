import React, { useState } from 'react';
import { CrewMember, VesselInfo } from '../types';
import { ShieldAlert, Info, Zap, AlertTriangle, CheckCircle2, Compass, Clock, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface SmartRankAdviceProps {
  crew: CrewMember;
  vessel: VesselInfo;
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset?: (patternId: string) => void;
}

export const SmartRankAdviceModal: React.FC<SmartRankAdviceProps> = ({
  crew,
  vessel,
  isOpen,
  onClose,
  onApplyPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'rank' | 'rules' | 'flag'>('rank');

  if (!isOpen) return null;

  const isChiefMate = crew.rank.toLowerCase().includes('chief officer') || crew.rank.toLowerCase().includes('chief mate') || crew.rank.includes('大副');
  const isSecondMate = crew.rank.toLowerCase().includes('2nd officer') || crew.rank.toLowerCase().includes('2nd mate') || crew.rank.includes('二副');
  const isThirdMate = crew.rank.toLowerCase().includes('3rd officer') || crew.rank.toLowerCase().includes('3rd mate') || crew.rank.includes('三副');
  const isCook = crew.rank.toLowerCase().includes('cook') || crew.rank.includes('厨工') || crew.rank.includes('大厨');
  const isSteward = crew.rank.toLowerCase().includes('steward') || crew.rank.includes('服务员') || crew.rank.includes('管事');
  const isCarpenterOr3E = crew.rank.toLowerCase().includes('carpenter') || crew.rank.toLowerCase().includes('3rd engineer') || crew.rank.includes('木匠') || crew.rank.includes('三管轮');
  const isEngineWatch = crew.department === 'Engine' && crew.isWatchkeeper;

  const isPanama = vessel.flagState.toLowerCase().includes('panama') || vessel.flagState.includes('巴拿马');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto print:hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-950 border border-blue-800 rounded-lg text-blue-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                <span>MLC 2006 / STCW 排班与加班合规指导手册</span>
                <span className="text-xs bg-blue-900 text-blue-300 font-normal px-2 py-0.5 rounded border border-blue-700">
                  {crew.rank}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                根据船公司体系指导与国际海事劳工公约（MLC 2006）规范定制的加班与休息提示
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 rounded hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('rank')}
            className={`px-4 py-2 border-b-2 cursor-pointer transition ${
              activeTab === 'rank'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            当前职务 ({crew.rank}) 加班技巧
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 border-b-2 cursor-pointer transition ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            公约要点与AMSA预警
          </button>
          <button
            onClick={() => setActiveTab('flag')}
            className={`px-4 py-2 border-b-2 cursor-pointer transition ${
              activeTab === 'flag'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            船旗国 (24h起始点) 规定
          </button>
        </div>

        {/* Tab 1: Current Rank Advice */}
        {activeTab === 'rank' && (
          <div className="space-y-3 text-xs leading-relaxed">
            {isChiefMate && (
              <div className="bg-blue-950/50 border border-blue-800 rounded-lg p-3.5 space-y-2">
                <div className="font-extrabold text-blue-300 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>大副 (Chief Officer) 加班排班黄金法则</span>
                </div>
                <p className="text-slate-300">
                  大副常规值班为 <strong className="text-amber-400">0400-0800</strong> 与 <strong className="text-amber-400">1600-2000</strong>。为了保证休息时间不被拆分为 3 段以上：
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono pl-1">
                  <li>推荐加班时间：<strong className="text-emerald-400">14:00 - 16:00</strong> 或 <strong className="text-emerald-400">20:00 - 24:00</strong>（与值班前后相连）。</li>
                  <li>避免在 08:00 - 12:00 之间单独安排短时间加班，否则将导致休息时间碎片化违法。</li>
                  {isPanama && (
                    <li className="text-amber-300 font-sans">
                      巴拿马旗特别要求：非值班工作放在 20:00-24:00，以保证 08:00-16:00 获得连续 8 小时优质睡眠。
                    </li>
                  )}
                </ul>
              </div>
            )}

            {isSecondMate && (
              <div className="bg-blue-950/50 border border-blue-800 rounded-lg p-3.5 space-y-2">
                <div className="font-extrabold text-blue-300 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>二副 (2nd Officer) 加班排班黄金法则</span>
                </div>
                <p className="text-slate-300">
                  二副常规值班为 <strong className="text-amber-400">0000-0400</strong> 与 <strong className="text-amber-400">1200-1600</strong>。
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono pl-1">
                  <li>推荐加班时间：<strong className="text-emerald-400">16:00 - 18:00</strong>（紧贴下午值班结束，不破坏夜间睡眠）。</li>
                </ul>
              </div>
            )}

            {isThirdMate && (
              <div className="bg-blue-950/50 border border-blue-800 rounded-lg p-3.5 space-y-2">
                <div className="font-extrabold text-blue-300 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>三副 (3rd Officer) 加班排班黄金法则</span>
                </div>
                <p className="text-slate-300">
                  三副常规值班为 <strong className="text-amber-400">0800-1200</strong> 与 <strong className="text-amber-400">2000-2400</strong>。
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono pl-1">
                  <li>推荐加班时间：<strong className="text-emerald-400">12:00 - 16:00</strong> 之间进行。</li>
                </ul>
              </div>
            )}

            {isCook && (
              <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-3.5 space-y-2">
                <div className="font-extrabold text-amber-300 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>厨工 (Cook) 船上工作安排预设标准</span>
                </div>
                <p className="text-slate-300">
                  根据公约与体系要求，厨工在《船上工作安排表》中的标准时间安排为：
                </p>
                <div className="bg-slate-950 p-2 rounded font-mono text-emerald-400 border border-slate-800">
                  06:00 - 12:00 ; 16:00 - 18:00 (每天 8 小时)
                </div>
              </div>
            )}

            {isSteward && (
              <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-3.5 space-y-2">
                <div className="font-extrabold text-amber-300 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>服务员 (Steward) 船上工作安排预设标准</span>
                </div>
                <p className="text-slate-300">
                  根据公约与体系要求，服务员在《船上工作安排表》中的标准时间安排为：
                </p>
                <div className="bg-slate-950 p-2 rounded font-mono text-emerald-400 border border-slate-800">
                  07:00 - 13:00 ; 17:00 - 19:00 (每天 8 小时)
                </div>
              </div>
            )}

            {isCarpenterOr3E && (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-3.5 space-y-2">
                <div className="font-extrabold text-rose-300 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>木匠 / 三管轮：连续压排水轮换调剂警告</span>
                </div>
                <p className="text-slate-300">
                  对木匠、三管轮等人员连续 1-2 天压排水作业，切忌长时间集中记录在一人名下。
                </p>
                <p className="text-slate-300">
                  <strong className="text-emerald-400">体系建议：</strong> 由水手长 (Bosun)、一水 (AB)、机工长 (Oiler) 或其他轮机员适当轮换替换，分散工作时长以适应 MLC 2006 公约要求。
                </p>
              </div>
            )}

            {isEngineWatch && (
              <div className="bg-purple-950/40 border border-purple-800/80 rounded-lg p-3.5 space-y-2">
                <div className="font-extrabold text-purple-300 flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>无人机舱 (UMS) 安全班 (随时待命) 记录要点</span>
                </div>
                <p className="text-slate-300">
                  无人机舱安全班属于 MLC 2006 标准 A2.3 第8条规定的 <strong className="text-amber-300">“待命 (On Call)”</strong> 状态。
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>待命期间不计入工作时间。</li>
                  <li>若在此期间被招去参加保养或处理警报（需较长时间），则实际处理时间必须如实计入工作时间。</li>
                  <li className="text-rose-300 font-semibold">
                    防检查提示：请务必确保机舱警报记录打印件的时间与工作休息时间记录表相符，防止 PSC 检查官交叉比对！
                  </li>
                </ul>
              </div>
            )}

            {/* General tips for everyone */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 text-slate-300">
              <div className="font-bold text-slate-200">通用月度加班限制提示</div>
              <p>
                每月加班时间建议控制在 <strong className="text-amber-400">75 小时以内</strong>（满足公司工资科及人力资源考核标准）。法定节假日当天的所有工作均需记为加班。
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: MLC Conventions & AMSA Warning */}
        {activeTab === 'rules' && (
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="bg-rose-950/50 border border-rose-800 rounded-lg p-3.5 space-y-2">
              <div className="font-extrabold text-rose-300 flex items-center gap-2 text-sm">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>澳大利亚海事局 (AMSA) 执法特别警示</span>
              </div>
              <p className="text-slate-300">
                请特别注意：<strong className="text-rose-300">AMSA 不认可</strong> 船舶的正常操作状况（如抵港进出港、靠离泊、抛起锚及货物装卸）作为越权处置（Force Majeure Exception）的合法理由。
              </p>
              <p className="text-slate-400 italic">
                在澳大利亚港口，正常港口作业导致的超时工作必须通过合理安排值班轮换或补休来解决，否则将被开具 30 项 (Detention) 缺陷！
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="font-bold text-blue-400 text-sm">MLC 2006 / STCW 2010 核心标准速查</div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex justify-between border-b border-slate-800 pb-1">
                  <span>正常工时标准：</span>
                  <span className="font-mono font-bold text-emerald-400">每天 8 小时，节假日休息</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-1">
                  <span>最长工作时间：</span>
                  <span className="font-mono font-bold text-amber-400">24小时内不超过 14 小时，7天内不超过 72 小时</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-1">
                  <span>最短休息时间：</span>
                  <span className="font-mono font-bold text-emerald-400">24小时内不少于 10 小时，7天内不少于 77 小时</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-1">
                  <span>休息时间分段：</span>
                  <span className="font-mono font-bold text-blue-300">最多分 2 段，其中 1 段至少 6 小时，间隔 ≤ 14 小时</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Flag State 24h Definition */}
        {activeTab === 'flag' && (
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="font-bold text-slate-200 text-sm">船旗国 24 小时起始点定义</div>
              
              <div className="space-y-2 pt-1">
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                  <div className="font-bold text-emerald-400">五星旗 (中国) / 新加坡旗 (Singapore Flag)</div>
                  <p className="text-slate-300 mt-1">
                    常规二副、三副及非值班船员 24 小时起始点设定为 <strong className="font-mono">00:00</strong>；对于大副值班班组（04-08/16-20），可将 24 小时起始点确定为 <strong className="font-mono">04:00</strong>（即 0400–0400 时段）。
                  </p>
                </div>

                <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                  <div className="font-bold text-amber-400">巴拿马旗 (Panama Flag)</div>
                  <p className="text-slate-300 mt-1">
                    巴拿马立法明确定义“24小时时段是指从 00:00 到 24:00 时的时段”。因此对大副班组，非值班职责应安排在 <strong className="font-mono text-emerald-400">20:00–24:00</strong> 之间，确保 08:00–16:00 获得良好的连续睡眠。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">当前船旗国: <strong className="text-slate-200">{vessel.flagState}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer"
          >
            知道了 / 关 闭
          </button>
        </div>
      </div>
    </div>
  );
};
