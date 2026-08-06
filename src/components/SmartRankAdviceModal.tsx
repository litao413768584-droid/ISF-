import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { Worker } from '../types';

interface SmartRankAdviceModalProps {
  open: boolean;
  onClose: () => void;
  workers: Worker[];
}

const SmartRankAdviceModal: React.FC<SmartRankAdviceModalProps> = ({ open, onClose, workers }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            智能排班建议
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            智能排班建议功能开发中...
          </p>
          <div className="space-y-2">
            {workers.map((worker) => (
              <div key={worker.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex justify-between items-center">
                <span className="text-gray-800 dark:text-white">{worker.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{worker.rank}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartRankAdviceModal;