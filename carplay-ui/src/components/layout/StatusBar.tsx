import React from 'react';
import { Battery, Signal } from 'lucide-react';

const StatusBar: React.FC = () => {
  return (
    <>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Battery size={14} />
        <span>97%</span>
        <Signal size={12} />
        <span>491 km</span>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
        <span>23:41</span>
      </div>
    </>
  );
};

export default StatusBar;
