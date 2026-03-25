import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './SystemDock.css';

/* ----------------------------------------------------------------
 * Premium custom SVG icons — designed with consistent 1.5px stroke,
 * filled active states, and automotive-grade visual weight.
 * ---------------------------------------------------------------- */

const IconSeat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 18v-2c0-1 .5-3 3-3h4c2.5 0 3 2 3 3v2" />
    <path d="M7 18H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h2" />
    <path d="M17 18h2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2" />
    <path d="M7 11V6.5A2.5 2.5 0 0 1 9.5 4h5A2.5 2.5 0 0 1 17 6.5V11" />
    <path d="M10 18v2" />
    <path d="M14 18v2" />
  </svg>
);

const IconCar = ({ active = false }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17h14v-5l-2-6H7l-2 6v5z" fill={active ? "currentColor" : "none"} />
    <path d="M5 17v2h3v-2" />
    <path d="M16 17v2h3v-2" />
    <circle cx="7.5" cy="14.5" r="1" fill={active ? "#0d0d0d" : "none"} stroke={active ? "#0d0d0d" : "currentColor"} />
    <circle cx="16.5" cy="14.5" r="1" fill={active ? "#0d0d0d" : "none"} stroke={active ? "#0d0d0d" : "currentColor"} />
  </svg>
);

const IconNav = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </svg>
);

const IconVolume = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const IconGrid = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconPhone = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconMusic = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconSeatMirror = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
    <path d="M7 18v-2c0-1 .5-3 3-3h4c2.5 0 3 2 3 3v2" />
    <path d="M7 18H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h2" />
    <path d="M17 18h2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2" />
    <path d="M7 11V6.5A2.5 2.5 0 0 1 9.5 4h5A2.5 2.5 0 0 1 17 6.5V11" />
    <path d="M10 18v2" />
    <path d="M14 18v2" />
  </svg>
);

const IconRadar = ({ active = false }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20" stroke={active ? "#0d0d0d" : "currentColor"} />
    <path d="M2 12h20" stroke={active ? "#0d0d0d" : "currentColor"} />
    <circle cx="12" cy="12" r="10" />
    <path d="M12 12L19 5" stroke={active ? "#0d0d0d" : "currentColor"} strokeWidth="2" />
  </svg>
);

interface SystemDockProps {
  activeApp?: 'DASHBOARD' | 'BENTHIC';
  onAppChange?: (app: 'DASHBOARD' | 'BENTHIC') => void;
}

const SystemDock: React.FC<SystemDockProps> = ({ activeApp = 'DASHBOARD', onAppChange }) => {
  return (
    <motion.div
      className="system-dock"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
    >
      {/* Left Climate */}
      <div className="climate-control">
        <button className="dock__chevron">
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span className="dock__temp-val">22.5°</span>
        <button className="dock__chevron">
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Center Navigation Icons */}
      <div className="dock__center">
        <button className="dock__icon" aria-label="Seat heater">
          <IconSeat />
        </button>

        <button className="dock__icon dock__icon--active" aria-label="Vehicle">
          <IconCar active />
        </button>

        <button className="dock__icon" aria-label="Navigate">
          <IconNav />
        </button>

        <div className="dock__volume-group">
          <button className="dock__chevron dock__chevron--dim">
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <button className="dock__icon" aria-label="Volume">
            <IconVolume />
          </button>
          <button className="dock__chevron dock__chevron--dim">
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>

        <button 
          className={`dock__icon ${activeApp === 'DASHBOARD' ? 'dock__icon--active' : ''}`} 
          aria-label="Apps"
          onClick={() => onAppChange && onAppChange('DASHBOARD')}
        >
          <IconGrid />
        </button>

        <button 
          className={`dock__icon ${activeApp === 'BENTHIC' ? 'dock__icon--active' : ''}`} 
          aria-label="Benthic Vision"
          onClick={() => onAppChange && onAppChange('BENTHIC')}
        >
          <IconRadar active={activeApp === 'BENTHIC'} />
        </button>

        <button className="dock__icon" aria-label="Music">
          <IconMusic />
        </button>

        <button className="dock__icon" aria-label="Phone">
          <IconPhone />
        </button>

        <button className="dock__icon" aria-label="Settings">
          <IconSettings />
        </button>

        <button className="dock__icon" aria-label="Passenger seat">
          <IconSeatMirror />
        </button>
      </div>

      {/* Right Climate */}
      <div className="climate-control">
        <button className="dock__chevron">
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span className="dock__temp-val">22.5°</span>
        <button className="dock__chevron">
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  );
};

export default SystemDock;
