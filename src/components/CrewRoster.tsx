import React from 'react';
import { Worker } from '../types';

interface CrewRosterProps {
  workers: Worker[];
  selectedWorker: string;
  onSelectWorker: (id: string) => void;
}

const CrewRoster: React.FC<CrewRosterProps> = ({ workers, selectedWorker, onSelectWorker }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">船员花名册</h3>
      <div className="flex flex-wrap gap-2">
        {workers.map((worker) => (
          <button
            key={worker.id}
            onClick={() => onSelectWorker(worker.id)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              selectedWorker === worker.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {worker.name} ({worker.rank})
          </button>
        ))}
      </div>
    </div>
  );
};

export default CrewRoster;