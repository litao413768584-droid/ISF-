import React, { useState, useEffect } from 'react';
import { Moon, Sun, Download, Settings, Ship, FileText, Users, Sparkles, ClipboardList } from 'lucide-react';

interface HeaderProps {
  onExport?: () => void;
  onOpenVesselSettings?: () => void;
  onOpenVesselStatus?: () => void;
  onOpenOfficialReport?: () => void;
  onOpenSmartRank?: () => void;
  onOpenBatchAssign?: () => void;
  onOpenNCDetails?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onExport,
  onOpenVesselSettings,
  onOpenVesselStatus,
  onOpenOfficialReport,
  onOpenSmartRank,
  onOpenBatchAssign,
  onOpenNCDetails,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const buttonClass = "p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-all hover:scale-105 active:scale-95";

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* 左侧 Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-gray-800 dark:text-white">
              海员休息工作时间记录
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold">
                ISF 2026
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              24小时网格 · 排班计划 · 合规统计 · 智能分析
            </p>
          </div>
        </div>

        {/* 右侧按钮组 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={onOpenVesselSettings} className={buttonClass} title="船舶设置">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={onOpenVesselStatus} className={buttonClass} title="船舶状态">
            <Ship className="w-4 h-4" />
          </button>
          <button onClick={onOpenOfficialReport} className={buttonClass} title="正式报告">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={onOpenNCDetails} className={buttonClass} title="不符合项详情">
            <ClipboardList className="w-4 h-4" />
          </button>
          <button onClick={onOpenSmartRank} className={`${buttonClass} bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-300`} title="智能排班建议">
            <Sparkles className="w-4 h-4" />
          </button>
          <button onClick={onOpenBatchAssign} className={`${buttonClass} bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300`} title="批量分配">
            <Users className="w-4 h-4" />
          </button>
          <button onClick={onExport} className={`${buttonClass} bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-300`} title="导出报表">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={toggleDarkMode} className={buttonClass} title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;