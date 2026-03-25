import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';
import { CheckCircle2 } from 'lucide-react';
import { EncryptionService } from '../../services/encryption';
import './HazardFeed.css';

interface LiveHazard {
  id: string;
  type: string;
  severity: number;
  confidence: number;
  votes: number;
  verified: boolean;
  lat: number;
  lon: number;
  timestamp: number;
}

/* Custom hazard severity icons - clean geometric shapes */
const SeverityIcon = ({ severity }: { severity: number }) => {
  const size = 16;
  if (severity > 0.7) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.75" fill="currentColor" />
      </svg>
    );
  } else if (severity > 0.4) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="10.5" r="0.75" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  );
};

const getSeverityClass = (sev: number) => sev > 0.7 ? 'high' : sev > 0.4 ? 'med' : 'low';

const HazardFeed: React.FC = () => {
  const [hazards, setHazards] = useState<LiveHazard[]>([]);

  useEffect(() => {
    const eventsRef = ref(db, 'events');
    const unsub = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setHazards([]); return; }

      const parsed: LiveHazard[] = [];
      Object.entries(data).forEach(([key, wrapper]: [string, any]) => {
        if (wrapper && wrapper.e2ee_payload) {
          const ev = EncryptionService.decryptPayload(wrapper.e2ee_payload);
          if (ev && ev.detection?.subtype === 'pothole' && ev.location) {
            parsed.push({
              id: key,
              type: ev.detection.subtype,
              severity: ev.detection.severity ?? 0,
              confidence: ev.detection.confidence ?? 0,
              votes: ev.validation?.votes ?? 1,
              verified: ev.validation?.verified ?? false,
              lat: ev.location.lat,
              lon: ev.location.lon,
              timestamp: ev.timestamp,
            });
          }
        }
      });

      // Sort by timestamp descending
      parsed.sort((a, b) => b.timestamp - a.timestamp);
      setHazards(parsed.slice(0, 5)); // Max 5 in feed
    });

    return () => unsub();
  }, []);

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
          H-FEED (SWARM MESH)
        </div>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>
          {hazards.length > 0 ? `${hazards.length} Active` : 'Scanning'}
        </span>
      </div>

      <div className="hazard__list">
        {hazards.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
            No active hazards detected...
          </div>
        ) : (
          hazards.map((event, i) => (
            <motion.div
              className={`hazard-item hazard-item--${getSeverityClass(event.severity)}`}
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            >
              <div className="hazard-item__icon">
                <SeverityIcon severity={event.severity} />
              </div>
              
              <div className="hazard-item__details">
                <div className="hazard-item__type">
                  {event.severity > 0.7 ? 'Severe Pothole' : event.severity > 0.4 ? 'Surface Anomaly' : 'Minor Defect'}
                  {event.verified && <CheckCircle2 size={11} color="#30d158" style={{marginLeft: 4, verticalAlign: 'text-top'}} />}
                </div>
                <div className="hazard-item__meta">
                  <span className="hazard-item__dist">
                    {event.votes > 1 ? `${event.votes} votes` : '1 vote'}
                  </span>
                  <span className="hazard-item__conf">
                    {(event.confidence * 100).toFixed(0)}% Conf.
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default HazardFeed;
