import React from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  ChevronLeft,
  ChevronRight,
  Zap,
  Compass,
  Mic,
  Camera,
  TriangleAlert,
  Lightbulb,
  Sun
} from 'lucide-react';
import './DashboardPanel.css';

const SPEED = 47;
const MAX_SPEED = 180;
const RADIUS = 90; // Larger radius for premium feel
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * 0.65; // ~234 degrees
const PROGRESS = (SPEED / MAX_SPEED) * ARC_LENGTH;
const SW = 1.2;

const DashboardPanel: React.FC = () => {
  return (
    <motion.div
      className="dashboard-panel"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      
      {/* =========================================
          TOP SECTION: PRND & SPEEDOMETER
      ========================================= */}
      <div className="dash__top-section">
        
        {/* Left Telltales & Vertical PRND */}
        <div className="dash__left-rail">
          <div className="dash__telltales">
            <TriangleAlert size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
            <Lightbulb size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
            <Sun size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
          </div>
          <div className="dash__prnd-vertical">
            <span>P</span>
            <span>R</span>
            <span>N</span>
            <span className="dash__prnd-active">D</span>
          </div>
        </div>

        {/* Speedometer Area */}
        <div className="dash__speedo-container">
          
          <div className="dash__speedo-arc-wrap">
            <svg viewBox="0 0 220 180" className="dash__speedo-svg">
              <defs>
                {/* Thick glow inner arc */}
                <radialGradient id="arcGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="60%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="90%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>

                <linearGradient id="arcProgress" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>

                <filter id="glowBlur">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>

              {/* Background Track */}
              <circle
                cx="110" cy="110" r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="4"
                strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                transform="rotate(153 110 110)"
              />

              {/* Active Progress */}
              <motion.circle
                cx="110" cy="110" r={RADIUS}
                fill="none"
                stroke="url(#arcProgress)"
                strokeWidth="4"
                strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                transform="rotate(153 110 110)"
                initial={{ strokeDashoffset: ARC_LENGTH }}
                animate={{ strokeDashoffset: ARC_LENGTH - PROGRESS }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
              />

              {/* Outer Glow */}
              <motion.circle
                cx="110" cy="110" r={RADIUS}
                fill="none"
                stroke="#ffffff"
                strokeWidth="8"
                strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                transform="rotate(153 110 110)"
                initial={{ strokeDashoffset: ARC_LENGTH }}
                animate={{ strokeDashoffset: ARC_LENGTH - PROGRESS }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                opacity="0.15"
                filter="url(#glowBlur)"
              />
            </svg>

            {/* Speeds & Limits */}
            <div className="dash__speed-center">
              <div className="dash__speed-num">{SPEED}</div>
              <div className="dash__speed-unit">km/h</div>
            </div>

            <div className="dash__limit-badge">50</div>
          </div>

          {/* Drive Modes & Target Speed */}
          <div className="dash__controls">
            <div className="dash__target-speed">
              <ChevronLeft size={14} className="dash__chevron-dim" strokeWidth={2} />
              <span className="dash__target-val">50</span>
              <ChevronRight size={14} className="dash__chevron-dim" strokeWidth={2} />
            </div>

            <div className="dash__modes-row">
              <span className="dash__mode">Eco</span>
              <span className="dash__mode dash__mode--active">Comfort</span>
              <span className="dash__mode">Sport</span>
            </div>
          </div>
          
        </div>
      </div>

      {/* =========================================
          BOTTOM SECTION: CAR & AMBIENT BEAM
      ========================================= */}
      <div className="dash__car-wrap">
        {/* Overhead beam linking speedo to car */}
        <div className="dash__speedo-beam" />

        {/* Lane markings */}
        <div className="dash__lane dash__lane--left">
          <div className="dash__lane-dash" />
          <div className="dash__lane-dash" />
          <div className="dash__lane-dash" />
        </div>
        <div className="dash__lane dash__lane--right">
          <div className="dash__lane-dash" />
          <div className="dash__lane-dash" />
          <div className="dash__lane-dash" />
        </div>

        <svg viewBox="0 0 220 420" className="dash__car-svg">
          <defs>
            <linearGradient id="metalPaint" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3a3d42" />
              <stop offset="15%" stopColor="#5a5f68" />
              <stop offset="35%" stopColor="#7d838e" />
              <stop offset="50%" stopColor="#9199a5" />
              <stop offset="65%" stopColor="#7d838e" />
              <stop offset="85%" stopColor="#5a5f68" />
              <stop offset="100%" stopColor="#3a3d42" />
            </linearGradient>

            <linearGradient id="glassPano" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d1015" />
              <stop offset="30%" stopColor="#171c24" />
              <stop offset="70%" stopColor="#0d1219" />
              <stop offset="100%" stopColor="#090c10" />
            </linearGradient>

            <linearGradient id="wsReflect" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* Glowing headlight beams coming from the car */}
            <radialGradient id="hlGlow" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="rgba(180,210,255,0.6)" />
              <stop offset="40%" stopColor="rgba(180,210,255,0.1)" />
              <stop offset="100%" stopColor="rgba(180,210,255,0)" />
            </radialGradient>

            <radialGradient id="tlGlow" cx="50%" cy="100%" r="50%">
              <stop offset="0%" stopColor="rgba(255,20,20,0.9)" />
              <stop offset="60%" stopColor="rgba(255,20,20,0.15)" />
              <stop offset="100%" stopColor="rgba(255,20,20,0)" />
            </radialGradient>

            <filter id="softGlow">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <filter id="heavyBlur">
              <feGaussianBlur stdDeviation="15" />
            </filter>
          </defs>

          {/* Car Ambient Beams */}
          <ellipse cx="110" cy="20" rx="100" ry="100" fill="url(#hlGlow)" filter="url(#heavyBlur)" opacity="0.8" />
          <ellipse cx="110" cy="380" rx="70" ry="40" fill="url(#tlGlow)" filter="url(#heavyBlur)" opacity="0.6" />
          <ellipse cx="110" cy="370" rx="55" ry="12" fill="rgba(0,0,0,0.7)" filter="url(#softGlow)" />

          {/* Car Body */}
          <path
            d="M 68 100 C 68 72, 152 72, 152 100 L 158 220 C 162 270, 158 340, 150 355 C 140 368, 80 368, 70 355 C 62 340, 58 270, 62 220 Z"
            fill="url(#metalPaint)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
          />

          {/* Wheels */}
          <ellipse cx="62" cy="140" rx="6" ry="18" fill="#1a1a1a" />
          <ellipse cx="158" cy="140" rx="6" ry="18" fill="#1a1a1a" />
          <ellipse cx="62" cy="310" rx="6" ry="18" fill="#1a1a1a" />
          <ellipse cx="158" cy="310" rx="6" ry="18" fill="#1a1a1a" />

          {/* Mirrors */}
          <path d="M 62 168 C 50 165, 50 178, 64 178 Z" fill="#333" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <path d="M 158 168 C 170 165, 170 178, 156 178 Z" fill="#333" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

          {/* Windshield & Roof */}
          <path
            d="M 76 150 C 76 128, 144 128, 144 150 L 140 300 C 140 310, 80 310, 80 300 Z"
            fill="url(#glassPano)"
            stroke="rgba(0,0,0,0.8)"
            strokeWidth="1.5"
          />
          <path
            d="M 76 150 C 76 128, 144 128, 144 150 L 142 185 C 142 185, 78 185, 78 185 Z"
            fill="url(#wsReflect)"
            opacity="0.9"
          />

          {/* Rear Window */}
          <path
            d="M 82 315 C 82 308, 138 308, 138 315 L 136 338 C 136 342, 84 342, 84 338 Z"
            fill="#0a0d11"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
          />

          {/* Lights */}
          <path d="M 72 95 C 72 88, 88 85, 88 95 Z" fill="rgba(220,240,255,0.8)" />
          <path d="M 148 95 C 148 88, 132 85, 132 95 Z" fill="rgba(220,240,255,0.8)" />
          <path d="M 68 350 C 68 360, 82 360, 82 355 L 78 348 Z" fill="#ff1a1a" opacity="0.9" />
          <path d="M 152 350 C 152 360, 138 360, 138 355 L 142 348 Z" fill="#ff1a1a" opacity="0.9" />
          <path d="M 68 350 C 68 360, 82 360, 82 355 L 78 348 Z" fill="#ff4444" opacity="0.6" filter="url(#softGlow)" />
          <path d="M 152 350 C 152 360, 138 360, 138 355 L 142 348 Z" fill="#ff4444" opacity="0.6" filter="url(#softGlow)" />

          <rect x="96" y="215" width="28" height="28" rx="6" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        </svg>

        <div className="dash__lock-icon">
          <Lock size={14} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />
        </div>
      </div>

      {/* Utility Bottom Row */}
      <div className="dash__bottom-row">
        <Zap size={18} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <Compass size={18} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <Mic size={18} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <Camera size={18} strokeWidth={1.5} style={{ opacity: 0.3 }} />
      </div>

      <div className="dash__dots">
        <span className="dash__dot dash__dot--active" />
        <span className="dash__dot" />
        <span className="dash__dot" />
      </div>

    </motion.div>
  );
};

export default DashboardPanel;
