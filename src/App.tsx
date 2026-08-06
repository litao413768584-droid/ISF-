import React, { useState, useEffect } from 'react';
import WorkGrid24h from './components/WorkGrid24h';
import Header from './components/Header';
import CrewRoster from './components/CrewRoster';
import MonthlyTimesheet from './components/MonthlyTimesheet';
import SchedulePlanner from './components/SchedulePlanner';
import VesselSettingsModal from './components/VesselSettingsModal';
import VesselStatusModal from './components/VesselStatusModal';
import OfficialReportModal from './components/OfficialReportModal';
import SmartRankAdviceModal from './components/SmartRankAdviceModal';
import BatchAssignModal from './components/BatchAssignModal';
import NCDetailsModal from './components/NCDetailsModal';
import { Worker, Vessel, WorkSchedule, WorkStatus, NCReport } from './types';

// 模拟数据
const mockWorkers: Worker[] = [
  { id: 'w001', name: '张船长', rank: '船长', vesselId: 'v001', department: '甲板部', joinDate: '2024-01-15', contractEnd: '2025-01-15' },
  { id: 'w002', name: '李大幅', rank: '大副', vesselId: 'v001', department: '甲板部', joinDate: '2024-03-01', contractEnd: '2025-03-01' },
  { id: 'w003', name: '王二副', rank: '二副', vesselId: 'v001', department: '甲板部', joinDate: '2024-05-10', contractEnd: '2025-05-10' },
  { id: 'w004', name: '陈老轨', rank: '轮机长', vesselId: 'v001', department: '轮机部', joinDate: '2024-02-01', contractEnd: '2025-02-01' },
  { id: 'w005', name: '林大管', rank: '大管轮', vesselId: 'v001', department: '轮机部', joinDate: '2024-04-15', contractEnd: '2025-04-15' },
];

const mockVessels: Vessel[] = [
  { id: 'v001', name: '海丰号', imo: 'IMO9876543', type: '集装箱船', flag: '巴拿马', status: 'at_sea', location: '南海' },
  { id: 'v002', name: '远洋号', imo: 'IMO1234567', type: '散货船', flag: '中国', status: 'in_port', location: '上海港' },
];

function App() {
  const [workers] = useState<Worker[]>(mockWorkers);
  const [vessels, setVessels] = useState<Vessel[]>(mockVessels);
  const [selectedWorker, setSelectedWorker] = useState<string>('w001');
  const [schedule, setSchedule] = useState<WorkSchedule[]>([]);
  const [selectedDate] = useState<Date>(new Date());
  const [ncReports, setNCReports] = useState<NCReport[]>([]);

  const [showVesselSettings, setShowVesselSettings] = useState(false);
  const [showVesselStatus, setShowVesselStatus] = useState(false);
  const [showOfficialReport, setShowOfficialReport] = useState(false);
  const [showSmartRank, setShowSmartRank] = useState(false);
  const [showBatchAssign, setShowBatchAssign] = useState(false);
  const [showNCDetails, setShowNCDetails] = useState(false);

  useEffect(() => {
    const initialSchedule: WorkSchedule[] = [];
    const statuses: WorkStatus[] = ['rest', 'work', 'rest', 'work', 'work', 'overtime', 'none', 'drill'];
    
    workers.forEach(worker => {
      for (let i = 0; i < 48; i++) {
        const hour = Math.floor(i / 2);
        const minute = i % 2 === 0 ? 0 : 30;
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const randomIndex = Math.floor(Math.random() * statuses.length);
        initialSchedule.push({
          workerId: worker.id,
          time,
          status: statuses[randomIndex] as WorkStatus,
        });
      }
    });
    setSchedule(initialSchedule);
  }, [workers]);

  const handleExport = () => {
    console.log('📊 导出数据:', { workers, vessels, schedule, ncReports });
    alert('导出功能已触发，数据已输出到控制台');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        onExport={handleExport}
        onOpenVesselSettings={() => setShowVesselSettings(true)}
        onOpenVesselStatus={() => setShowVesselStatus(true)}
        onOpenOfficialReport={() => setShowOfficialReport(true)}
        onOpenSmartRank={() => setShowSmartRank(true)}
        onOpenBatchAssign={() => setShowBatchAssign(true)}
        onOpenNCDetails={() => setShowNCDetails(true)}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <CrewRoster 
          workers={workers}
          selectedWorker={selectedWorker}
          onSelectWorker={setSelectedWorker}
        />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <WorkGrid24h 
            workers={workers}
            schedule={schedule}
            selectedWorker={selectedWorker}
            onUpdateSchedule={setSchedule}
          />
        </div>

        <MonthlyTimesheet 
          workers={workers}
          schedule={schedule}
          selectedDate={selectedDate}
          onDateChange={() => {}}
        />

        <SchedulePlanner 
          workers={workers}
          vessels={vessels}
          schedule={schedule}
          onUpdateSchedule={setSchedule}
        />
      </main>

      <VesselSettingsModal
        open={showVesselSettings}
        onClose={() => setShowVesselSettings(false)}
        vessels={vessels}
        onUpdateVessels={setVessels}
      />

      <VesselStatusModal
        open={showVesselStatus}
        onClose={() => setShowVesselStatus(false)}
        vessels={vessels}
      />

      <OfficialReportModal
        open={showOfficialReport}
        onClose={() => setShowOfficialReport(false)}
        onSave={(report) => setNCReports([...ncReports, { ...report, id: `nc${Date.now()}` }])}
      />

      <SmartRankAdviceModal
        open={showSmartRank}
        onClose={() => setShowSmartRank(false)}
        workers={workers}
      />

      <BatchAssignModal
        open={showBatchAssign}
        onClose={() => setShowBatchAssign(false)}
        workers={workers}
        vessels={vessels}
        onAssign={(assignments) => {
          console.log('批量分配:', assignments);
          alert('批量分配成功！');
        }}
      />

      <NCDetailsModal
        open={showNCDetails}
        onClose={() => setShowNCDetails(false)}
        ncReports={ncReports}
      />
    </div>
  );
}

export default App;