import React from 'react';
import { motion } from 'framer-motion';
import {
  ParkingSquare,
  Snowflake,
  Navigation,
  Compass,
  Mic,
  Camera,
  Lock,
} from 'lucide-react';
import './DashboardPanel.css';

const SPEED = 47;
const MAX_SPEED = 180;
const RADIUS = 62;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * 0.75; // 270 degrees
const PROGRESS = (SPEED / MAX_SPEED) * ARC_LENGTH;

const DashboardPanel: React.FC = () => {
  return (
    <motion.div
      className="dashboard-panel"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top Icons */}
      <div className="dashboard__top-icons">
        <ParkingSquare />
        <Snowflake />
      </div>

      {/* Speedometer */}
      <div className="speedometer-section">
        <div className="speedometer-container">
          <svg className="speedometer-svg" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#555555" />
                <stop offset="60%" stopColor="#888888" />
                <stop offset="100%" stopColor="#cccccc" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              className="speedometer-track"
              cx="70"
              cy="70"
              r={RADIUS}
              strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
              strokeDashoffset={0}
              transform="rotate(135 70 70)"
            />
            {/* Progress */}
            <motion.circle
              className="speedometer-progress"
              cx="70"
              cy="70"
              r={RADIUS}
              strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
              initial={{ strokeDashoffset: ARC_LENGTH }}
              animate={{ strokeDashoffset: ARC_LENGTH - PROGRESS }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              transform="rotate(135 70 70)"
            />
          </svg>
          <div className="speedometer-value">
            <motion.div
              className="speedometer-value__number"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {SPEED}
            </motion.div>
            <div className="speedometer-value__unit">km/h</div>
          </div>
        </div>

        {/* Gear Indicators */}
        <div className="gear-indicators">
          <span className="gear-indicator">D</span>
          <div className="speed-limit">
            <div className="speed-limit__badge">50</div>
          </div>
        </div>
        <div className="drive-mode">Comfort</div>
      </div>

      {/* Car Visualization */}
      <div className="car-visualization">
        <div className="car-image-container">
          <div className="car-ambient-light" />
          <svg className="car-body" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
            {/* Car body - top view */}
            <defs>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3a3a3a"/>
                <stop offset="30%" stopColor="#2a2a2a"/>
                <stop offset="70%" stopColor="#222222"/>
                <stop offset="100%" stopColor="#1a1a1a"/>
              </linearGradient>
              <linearGradient id="windshieldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a1a2e"/>
                <stop offset="100%" stopColor="#0d0d1a"/>
              </linearGradient>
              <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#333"/>
                <stop offset="100%" stopColor="#282828"/>
              </linearGradient>
            </defs>

            {/* Shadow */}
            <ellipse cx="100" cy="380" rx="70" ry="12" fill="rgba(0,0,0,0.3)" />

            {/* Main body */}
            <rect x="40" y="40" width="120" height="320" rx="50" ry="50" fill="url(#bodyGrad)" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>

            {/* Front windshield */}
            <path d="M55 85 Q100 65, 145 85 L140 130 Q100 120, 60 130 Z" fill="url(#windshieldGrad)" opacity="0.9"/>

            {/* Roof panel */}
            <rect x="55" y="140" width="90" height="100" rx="10" fill="url(#roofGrad)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>

            {/* Rear windshield */}
            <path d="M60 260 Q100 250, 140 260 L145 305 Q100 320, 55 305 Z" fill="url(#windshieldGrad)" opacity="0.9"/>

            {/* Side mirrors */}
            <ellipse cx="35" cy="120" rx="8" ry="5" fill="#2a2a2a" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
            <ellipse cx="165" cy="120" rx="8" ry="5" fill="#2a2a2a" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>

            {/* Headlights */}
            <rect x="48" y="52" width="24" height="4" rx="2" fill="rgba(255,255,220,0.3)"/>
            <rect x="128" y="52" width="24" height="4" rx="2" fill="rgba(255,255,220,0.3)"/>

            {/* Tail lights */}
            <rect x="48" y="340" width="24" height="4" rx="2" fill="rgba(255,60,60,0.5)"/>
            <rect x="128" y="340" width="24" height="4" rx="2" fill="rgba(255,60,60,0.5)"/>
            {/* Tail light glow */}
            <rect x="48" y="340" width="24" height="4" rx="2" fill="rgba(255,60,60,0.3)" filter="url(#tailGlow)"/>
            <rect x="128" y="340" width="24" height="4" rx="2" fill="rgba(255,60,60,0.3)" filter="url(#tailGlow)"/>

            {/* Center line detail */}
            <line x1="100" y1="150" x2="100" y2="230" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>

            {/* Door lines */}
            <line x1="45" y1="170" x2="45" y2="240" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
            <line x1="155" y1="170" x2="155" y2="240" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          </svg>

          {/* Lock icon overlay */}
          <div className="car-lock-icon">
            <Lock />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="dashboard__bottom-controls">
        <Compass />
        <Mic />
        <Camera />
      </div>

      {/* Page Dots */}
      <div className="dashboard__page-dots">
        <div className="page-dot page-dot--active" />
        <div className="page-dot" />
        <div className="page-dot" />
      </div>
    </motion.div>
  );
};

export default DashboardPanel;
