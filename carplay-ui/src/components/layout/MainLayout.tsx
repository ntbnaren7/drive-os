import React from 'react';
import './MainLayout.css';

interface MainLayoutProps {
  StatusBar: React.ReactNode;
  Dashboard: React.ReactNode;
  Navigation: React.ReactNode;
  Widgets: React.ReactNode;
  MediaBar: React.ReactNode;
  Dock: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  StatusBar,
  Dashboard,
  Navigation,
  Widgets,
  MediaBar,
  Dock,
}) => {
  return (
    <div className="main-layout">
      <div className="status-bar">{StatusBar}</div>
      <div className="layout-grid">
        <aside className="dashboard-area">{Dashboard}</aside>
        <main className="navigation-area">{Navigation}</main>
        <section className="widgets-area">{Widgets}</section>
      </div>
      <div className="media-bar-area">{MediaBar}</div>
      <div className="dock-area">{Dock}</div>
    </div>
  );
};

export default MainLayout;
