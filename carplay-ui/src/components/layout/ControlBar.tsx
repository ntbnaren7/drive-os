import React from 'react';
import GlassCard from './GlassCard';
import { Play, SkipBack, SkipForward, Music, Thermometer, Wind, Grid } from 'lucide-react';

const ControlBar: React.FC = () => {
  return (
    <GlassCard className="control-bar" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', padding: '0 var(--spacing-lg)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-xl)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Thermometer size={20} color="var(--text-muted)" />
          <span style={{ fontWeight: 600 }}>22.5°</span>
        </div>
        
        <div style={{ height: '24px', width: '1px', background: 'var(--glass-border)' }} />
        
        <div style={{ display: 'flex', gap: 'var(--spacing-xl)' }}>
          <Grid size={24} />
          <Wind size={24} />
          <Music size={24} color="var(--accent)" />
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
        <SkipBack size={20} />
        <Play size={24} fill="white" />
        <SkipForward size={20} />
        <div style={{ marginLeft: 'var(--spacing-md)', textAlign: 'left' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Rock & Roll Queen</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>The Subways</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 'var(--spacing-xl)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{ fontWeight: 600 }}>22.5°</span>
          <Thermometer size={20} color="var(--text-muted)" />
        </div>
      </div>
    </GlassCard>
  );
};

export default ControlBar;
