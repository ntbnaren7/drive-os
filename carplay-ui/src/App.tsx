import { useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import StatusBar from './components/layout/StatusBar';
import DashboardPanel from './features/dashboard/DashboardPanel';
import NavigationPanel from './features/navigation/NavigationPanel';
import WidgetsPanel from './features/widgets/WidgetsPanel';
import MediaBar from './components/layout/MediaBar';
import SystemDock from './components/layout/SystemDock';
import BenthicApp from './features/benthic/BenthicApp';
import ValidationModal from './components/layout/ValidationModal';

export type AppFeature = 'DASHBOARD' | 'BENTHIC';

function App() {
  const [activeApp, setActiveApp] = useState<AppFeature>('DASHBOARD');

  return (
    <>
      <ValidationModal />
      <div style={{ display: activeApp === 'DASHBOARD' ? 'block' : 'none', height: '100%' }}>
        <MainLayout
          StatusBar={<StatusBar />}
          Dashboard={<DashboardPanel />}
          Navigation={<NavigationPanel />}
          Widgets={<WidgetsPanel />}
          MediaBar={<MediaBar />}
          Dock={<SystemDock activeApp={activeApp} onAppChange={setActiveApp} />}
        />
      </div>
      {activeApp === 'BENTHIC' && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#050505' }}>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <BenthicApp />
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            <SystemDock activeApp={activeApp} onAppChange={setActiveApp} />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
