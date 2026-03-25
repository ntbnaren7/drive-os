import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../services/firebase';
import { ref, onValue, update, push, set } from 'firebase/database';
import { AlertTriangle, Check, X, Smartphone } from 'lucide-react';
import { EncryptionService } from '../../services/encryption';
import './ValidationModal.css';

interface PendingTrigger {
  id: string;
  type: string;
  magnitude_g: number;
  timestamp: number;
  location: { lat: number; lon: number };
}

const ValidationModal: React.FC = () => {
  const [trigger, setTrigger] = useState<PendingTrigger | null>(null);

  useEffect(() => {
    const triggersRef = ref(db, 'pending_verifications');
    const unsub = onValue(triggersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setTrigger(null);
        return;
      }
      
      const now = Date.now();
      let active: PendingTrigger | null = null;
      
      // Find latest pending trigger within last 15 seconds
      Object.entries(data).forEach(([key, wrapper]: [string, any]) => {
        if (wrapper && wrapper.e2ee_payload) {
          const val = EncryptionService.decryptPayload(wrapper.e2ee_payload);
          if (val && val.status === 'PENDING_CONFIRMATION' && (now - val.timestamp) < 15000) {
            if (!active || val.timestamp > active.timestamp) {
              active = { id: key, ...val };
            }
          }
        }
      });
      
      setTrigger(active);
    });
    
    return () => unsub();
  }, []);

  const handleConfirm = async () => {
    if (!trigger) return;
    
    // 1. Mark as resolved
    const updatePayload = { ...trigger, status: 'CONFIRMED' };
    await update(ref(db, `pending_verifications/${trigger.id}`), { e2ee_payload: EncryptionService.encryptPayload(updatePayload) });
    
    // 2. Push human-verified hazard to V2X mesh
    const payload = {
      type: 'HAZARD',
      detection: { subtype: 'pothole', severity: 0.9, confidence: 1.0 },
      location: trigger.location,
      validation: { status: 'VERIFIED', votes: 1, verified: true, sources: ['HUMAN_OVERRIDE'] },
      node_id: 'VEH_103',
      timestamp: Date.now(),
      ttl: 15000,
    };
    
    await set(push(ref(db, 'events')), { e2ee_payload: EncryptionService.encryptPayload(payload) });
    setTrigger(null);
  };

  const handleDismiss = async () => {
    if (!trigger) return;
    const updatePayload = { ...trigger, status: 'DISMISSED' };
    await update(ref(db, `pending_verifications/${trigger.id}`), { e2ee_payload: EncryptionService.encryptPayload(updatePayload) });
    setTrigger(null);
  };

  return (
    <AnimatePresence>
      {trigger && (
        <motion.div 
          className="validation-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="validation-modal"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <div className="v-modal-header">
              <div className="v-modal-icon-bg">
                <AlertTriangle size={32} color="#ff9f0a" />
              </div>
              <div className="v-modal-title">SENSOR IMPACT DETECTED</div>
            </div>
            
            <div className="v-modal-body">
              A high-G kinetic impact was recently detected by your mobile device. Was this a road hazard?
            </div>
            
            <div className="v-modal-stats">
              <div className="v-stat">
                <Smartphone size={14} color="#3a9bff"/>
                <span>{trigger.magnitude_g} G-FORCE</span>
              </div>
              <div className="v-stat">
                <span>IMPACT AT {new Date(trigger.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
              </div>
            </div>
            
            <div className="v-modal-actions">
              <button className="v-btn v-btn-dismiss" onClick={handleDismiss}>
                <X size={18} style={{marginRight: 6}}/> DISMISS FALSE ALARM
              </button>
              <button className="v-btn v-btn-confirm" onClick={handleConfirm}>
                <Check size={18} style={{marginRight: 6}}/> CONFIRM HAZARD
              </button>
            </div>
            
            <div className="v-modal-footer">
              Validating this adds it to the V2X mesh immediately.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ValidationModal;
