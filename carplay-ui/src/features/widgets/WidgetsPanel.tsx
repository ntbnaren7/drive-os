import React from 'react';
import RoadIntelligence from './RoadIntelligence';
import HazardFeed from './HazardFeed';
import './WidgetsPanel.css';

const WidgetsPanel: React.FC = () => {
  return (
    <div className="widgets-container">
      <RoadIntelligence />
      <HazardFeed />
    </div>
  );
};

export default WidgetsPanel;
