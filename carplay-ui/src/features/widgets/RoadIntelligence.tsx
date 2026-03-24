import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, ref, onValue } from '../../services/firebase';
import { AlertOctagon, Activity, Thermometer, Droplets, Wind } from 'lucide-react';
import './RoadIntelligence.css';

interface V2XEvent {
  detection: { subtype: string; severity: number; confidence: number; };
  location: { lat: number; lon: number; geohash: string; };
  timestamp: number;
}

const RoadIntelligence: React.FC = () => {
  const [latestHazard, setLatestHazard] = useState<V2XEvent | null>(null);

  useEffect(() => {
    const eventsRef = ref(db, 'events');
    const unsub = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const now = Math.floor(Date.now() / 1000);
      let newestEvent: V2XEvent | null = null;

      Object.values(data).forEach((ev: any) => {
        if (ev.detection?.subtype === 'pothole') {
          // Only show if it happened in the last 60 seconds
          if (now - ev.timestamp <= 60) {
            if (!newestEvent || ev.timestamp > newestEvent.timestamp) {
              newestEvent = ev;
            }
          }
        }
      });

      setLatestHazard(newestEvent);
    });

    return () => unsub();
  }, []);

  return (
    <motion.div
      className={`road-intel-widget ${latestHazard ? 'hazard-active' : ''}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
    >
      <AnimatePresence mode="wait">
        {latestHazard ? (
          <motion.div 
            key="hazard"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="v2x-hazard-alert"
          >
            <div className="hazard-header">
              <AlertOctagon color="#ff453a" size={24} />
              <div className="hazard-title">ROAD HAZARD DETECTED</div>
            </div>
            <div className="hazard-type">{latestHazard.detection.subtype.toUpperCase()}</div>
            <div className="hazard-stats">
              <div className="h-stat">
                <span className="lbl">SEVERITY</span>
                <span className="val" style={{color: latestHazard.detection.severity > 0.7 ? '#ff453a' : '#ff9f0a'}}>
                  {(latestHazard.detection.severity * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-div"/>
              <div className="h-stat">
                <span className="lbl">CONFIDENCE</span>
                <span className="val">{(latestHazard.detection.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="hazard-footer">
              <span className="pulse-dot"></span> V2X Network
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="normal"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="road-intel__header">
              <div className="road-intel__main">
                <div className="road-intel__icon">
                  <Activity size={22} color="#fff" />
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
                  <Thermometer size={13} /> Surface
                </div>
                <div className="intel-metric__value">14.2°C</div>
              </div>

              <div className="intel-metric">
                <div className="intel-metric__label">
                  <Droplets size={13} /> Moisture
                </div>
                <div className="intel-metric__value">12%</div>
              </div>

              <div className="intel-metric">
                <div className="intel-metric__label">
                  <Wind size={13} /> Ambient
                </div>
                <div className="intel-metric__value">13.0°C</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RoadIntelligence;
