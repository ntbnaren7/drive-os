import React from 'react';
import { motion } from 'framer-motion';
import './RoadIntelligence.css';

/* Custom premium icons for road intelligence metrics */
const IconActivity = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconThermo = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 9.5V3a2 2 0 0 0-4 0v6.5a3.5 3.5 0 1 0 4 0Z" />
    <circle cx="8" cy="11.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconDrop = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2C8 2 3.5 7.5 3.5 10a4.5 4.5 0 0 0 9 0C12.5 7.5 8 2 8 2Z" />
  </svg>
);

const IconWind = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 3.5a2 2 0 1 1 0 2H2" />
    <path d="M12.5 10.5a2 2 0 1 0 0-2H2" />
  </svg>
);

const RoadIntelligence: React.FC = () => {
  return (
    <motion.div
      className="road-intel-widget"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
    >
      <div className="road-intel__header">
        <div className="road-intel__main">
          <div className="road-intel__icon">
            <IconActivity />
          </div>
          <div>
            <div className="road-intel__score">0.82</div>
            <div className="road-intel__label">SURFACE FRICTION (μ)</div>
          </div>
        </div>
      </div>

      <div className="road-intel__metrics">
        <div className="intel-metric">
          <div className="intel-metric__label">
            <IconThermo /> Surface
          </div>
          <div className="intel-metric__value">14.2°C</div>
        </div>

        <div className="intel-metric">
          <div className="intel-metric__label">
            <IconDrop /> Moisture
          </div>
          <div className="intel-metric__value">12%</div>
        </div>

        <div className="intel-metric">
          <div className="intel-metric__label">
            <IconWind /> Ambient
          </div>
          <div className="intel-metric__value">13.0°C</div>
        </div>
      </div>
    </motion.div>
  );
};

export default RoadIntelligence;
