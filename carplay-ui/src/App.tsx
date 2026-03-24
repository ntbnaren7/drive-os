import MainLayout from './components/layout/MainLayout';
import StatusBar from './components/layout/StatusBar';
import DashboardPanel from './features/dashboard/DashboardPanel';
import NavigationPanel from './features/navigation/NavigationPanel';
import WidgetsPanel from './features/widgets/WidgetsPanel';
import MediaBar from './components/layout/MediaBar';
import SystemDock from './components/layout/SystemDock';

function App() {
  return (
    <MainLayout
      StatusBar={<StatusBar />}
      Dashboard={<DashboardPanel />}
      Navigation={<NavigationPanel />}
      Widgets={<WidgetsPanel />}
      MediaBar={<MediaBar />}
      Dock={<SystemDock />}
    />
  );
}

export default App;
