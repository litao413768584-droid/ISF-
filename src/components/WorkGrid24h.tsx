import React from 'react';
import { Worker, WorkSchedule, WorkStatus } from '../types';

interface WorkGrid24hProps {
  workers: Worker[];
  schedule: WorkSchedule[];
  selectedWorker: string;
  onUpdateSchedule: (schedule: WorkSchedule[]) => void;
}

const WorkGrid24h: React.FC<WorkGrid24hProps> = ({
  workers,
  schedule,
  selectedWorker,
  onUpdateSchedule,
}) => {
  // 生成48个半小时时间槽
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? 0 : 30;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });

  // 获取状态
  const getSlotStatus = (workerId: string, time: string): WorkStatus => {
    const entry = schedule.find((s) => s.workerId === workerId && s.time === time);
    return entry ? entry.status : 'none';
  };

  // 切换状态
  const toggleSlotStatus = (workerId: string, time: string) => {
    const statuses: WorkStatus[] = ['none', 'rest', 'work', 'overtime', 'drill'];
    const current = getSlotStatus(workerId, time);
    const currentIndex = statuses.indexOf(current);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    const newSchedule = schedule.map((s) => {
      if (s.workerId === workerId && s.time === time) {
        return { ...s, status: nextStatus };
      }
      return s;
    });
    onUpdateSchedule(newSchedule);
  };

  // 获取颜色
  const getStatusColor = (status: WorkStatus) => {
    switch (status) {
      case 'rest':
        return 'bg-green-500';
      case 'work':
        return 'bg-blue-500';
      case 'overtime':
        return 'bg-yellow-500';
      case 'drill':
        return 'bg-purple-500';
      default:
        return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  // 获取中文标签
  const getStatusLabel = (status: WorkStatus) => {
    switch (status) {
      case 'rest':
        return '休';
      case 'work':
        return '工';
      case 'overtime':
        return '加';
      case 'drill':
        return '演';
      default:
        return '';
    }
  };

  const workerName = workers.find((w) => w.id === selectedWorker)?.name || '未选择';

  return (
    <div className="w-full">
      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          24-Hour Work / Rest Grid (30-Min Resolution)
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          当前船员: {workerName}
        </span>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 bg-green-500 rounded"></span> 休息
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 bg-blue-500 rounded"></span> 工作
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 bg-yellow-500 rounded"></span> 加班
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 bg-purple-500 rounded"></span> 演习
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></span> 空闲
        </span>
        <span className="text-xs text-gray-400 ml-2">💡 点击切换状态</span>
      </div>

      {/* ===== 关键修改：横向滚动网格 ===== */}
      <div className="overflow-x-auto pb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex flex-nowrap gap-0 min-w-max">
          {timeSlots.map((time, index) => {
            const status = getSlotStatus(selectedWorker, time);
            const hour = Math.floor(index / 2);
            const isHour = index % 2 === 0;

            return (
              <div
                key={index}
                className="flex-shrink-0 w-14 border-r border-gray-200 dark:border-gray-700 last:border-r-0 cursor-pointer"
                onClick={() => toggleSlotStatus(selectedWorker, time)}
                title={`${time} - ${status}`}
              >
                {/* 时间标签 */}
                <div className="text-[10px] bg-gray-50 dark:bg-gray-800 py-0.5 text-center font-mono text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  {isHour ? `${String(hour).padStart(2, '0')}:00` : ''}
                </div>
                {/* 状态色块 */}
                <div
                  className={`h-14 ${getStatusColor(
                    status
                  )} transition-colors hover:opacity-80 flex items-center justify-center`}
                >
                  {status !== 'none' && (
                    <span className="text-white text-xs font-bold">
                      {getStatusLabel(status)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        共 {timeSlots.length} 个时间槽 · 每个槽 30 分钟 · 横向滚动查看全部
      </div>
    </div>
  );
};

export default WorkGrid24h;