import React from 'react';
import { motion } from 'framer-motion';
import './HazardFeed.css';

interface HazardEvent {
  id: string;
  type: string;
  severity: 'high' | 'med' | 'low';
  distance: string;
  confidence: number;
}

const EVENTS: HazardEvent[] = [
  { id: '1', type: 'Severe Pothole', severity: 'high', distance: '120m', confidence: 94 },
  { id: '2', type: 'Surface Crack', severity: 'med', distance: '340m', confidence: 82 },
  { id: '3', type: 'Uneven Road', severity: 'low', distance: '850m', confidence: 76 },
  { id: '4', type: 'Debris Detected', severity: 'high', distance: '1.2km', confidence: 88 },
];

/* Custom hazard severity icons - clean geometric shapes */
const SeverityIcon = ({ severity }: { severity: string }) => {
  const size = 16;
  switch (severity) {
    case 'high':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill="currentColor" />
        </svg>
      );
    case 'med':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="10.5" r="0.75" fill="currentColor" />
        </svg>
      );
    case 'low':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
};

const HazardFeed: React.FC = () => {
  return (
    <motion.div
      className="hazard-feed"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
    >
      <div className="hazard__header">
        <div className="hazard__title">
          <div className="hazard__pulse-dot" />
          H-FEED (LOCAL MESH)
        </div>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>Sync: Active</span>
      </div>

      <div className="hazard__list">
        {EVENTS.map((event, i) => (
          <motion.div
            className={`hazard-item hazard-item--${event.severity}`}
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
          >
            <div className="hazard-item__icon">
              <SeverityIcon severity={event.severity} />
            </div>
            
            <div className="hazard-item__details">
              <div className="hazard-item__type">{event.type}</div>
              <div className="hazard-item__meta">
                <span className="hazard-item__dist">{event.distance}</span>
                <span className="hazard-item__conf">
                  {event.confidence}% Conf.
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default HazardFeed;
