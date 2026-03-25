import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';
import { AlertOctagon, Activity, Shield, Radar, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import './RoadIntelligence.css';

interface V2XEvent {
  detection: { subtype: string; severity: number; confidence: number; };
  location: { lat: number; lon: number; geohash: string; };
  validation: { status: string; votes: number; verified: boolean; sources: string[]; };
  escape_vector?: { recommended_action: string; lane_offset: number; confidence: number; };
  timestamp: number;
}

interface AdasAlert {
  hazard_id: string;
  location: { lat: number; lon: number; };
  confidence: number;
  verified: boolean;
  recommended_action: string;
  lane_offset_m: number;
  stopping_distance_m: number;
  alert_level: string;
  timestamp: number;
}

// Helper: Animated Sine Wave
const TelemetryWave = () => (
  <div className="telemetry-wave">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="wave-bar"
        animate={{ height: ['20%', '100%', '20%'] }}
        transition={{ duration: 0.8 + Math.random() * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
      />
    ))}
  </div>
);

const RoadIntelligence: React.FC = () => {
  const [latestHazard, setLatestHazard] = useState<V2XEvent | null>(null);
  const [adasAlert, setAdasAlert] = useState<AdasAlert | null>(null);
  const [activeNodes, setActiveNodes] = useState(0);

  useEffect(() => {
    // Listen to events
    const eventsRef = ref(db, 'events');
    const unsub = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const now = Math.floor(Date.now() / 1000);
      let newestEvent: V2XEvent | null = null;

      Object.values(data).forEach((ev: any) => {
        if (ev.detection?.subtype === 'pothole') {
          if (now - ev.timestamp <= 60) {
            if (!newestEvent || ev.timestamp > newestEvent.timestamp) {
              newestEvent = ev;
            }
          }
        }
      });

      setLatestHazard(newestEvent);
    });

    // Listen to ADAS alerts
    const adasRef = ref(db, 'adas/active_alert');
    const unsubAdas = onValue(adasRef, (snapshot) => {
      const data = snapshot.val();
      setAdasAlert(data || null);
    });

    // Listen to active vehicle count
    const vehiclesRef = ref(db, 'vehicles');
    const unsubVehicles = onValue(vehiclesRef, (snapshot) => {
      const data = snapshot.val();
      setActiveNodes(data ? Object.keys(data).length : 0);
    });

    return () => { unsub(); unsubAdas(); unsubVehicles(); };
  }, []);

  // ADAS mode takes priority
  if (adasAlert && adasAlert.verified) {
    return (
      <motion.div
        className="road-intel-widget adas-active"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      >
        <motion.div
          key="adas"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="v2x-adas-alert"
        >
          <div className="adas-header">
            <Shield color="#3a9bff" size={24} />
            <div className="adas-title">ADAS: ESCAPE VECTOR</div>
          </div>
          <div className="adas-action">
            <ArrowLeftRight size={18} color="#3a9bff" />
            <span>{adasAlert.recommended_action.replace(/_/g, ' ')}</span>
          </div>
          <div className="adas-stats">
            <div className="a-stat">
              <span className="lbl">SWARM CONF</span>
              <span className="val" style={{color: '#3a9bff'}}>
                {(adasAlert.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-div"/>
            <div className="a-stat">
              <span className="lbl">OFFSET</span>
              <span className="val">{adasAlert.lane_offset_m}m</span>
            </div>
            <div className="h-div"/>
            <div className="a-stat">
              <span className="lbl">STOP DIST</span>
              <span className="val">{adasAlert.stopping_distance_m}m</span>
            </div>
          </div>
          <div className="adas-footer">
            <CheckCircle2 size={12} color="#30d158" />
            <span>SWARM VERIFIED • {activeNodes} NODES</span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

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
            <div className="hazard-coords">
              LAT {latestHazard.location.lat.toFixed(4)} / LON {latestHazard.location.lon.toFixed(4)}
            </div>
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
              <div className="h-div"/>
              <div className="h-stat">
                <span className="lbl">VOTES</span>
                <span className="val">{latestHazard.validation?.votes ?? 1}</span>
              </div>
            </div>
            <div className="hazard-footer">
              <span className="pulse-dot"></span> 
              {latestHazard.validation?.verified 
                ? <><CheckCircle2 size={11} color="#30d158" style={{marginRight: 4}}/> SWARM VERIFIED</>
                : 'PENDING VALIDATION'
              }
               | {activeNodes} NODES
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
                  <Radar size={22} color="#3a9bff" />
                </div>
                <div>
                  <div className="road-intel__score">CLEAR</div>
                  <div className="road-intel__label">SWARM SCANNING...</div>
                </div>
              </div>
              <TelemetryWave />
            </div>

            <div className="road-intel__metrics">
              <div className="intel-metric">
                <div className="intel-metric__label">
                  <Activity size={13} /> Active Nodes
                </div>
                <div className="intel-metric__value">{activeNodes}</div>
              </div>

              <div className="intel-metric">
                <div className="intel-metric__label">
                  <Shield size={13} /> ADAS Status
                </div>
                <div className="intel-metric__value" style={{color: '#30d158'}}>STANDBY</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RoadIntelligence;
