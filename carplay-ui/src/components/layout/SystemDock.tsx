import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Car,
  Navigation,
  Volume2,
  LayoutGrid,
  Bluetooth,
  Music,
  Settings,
  Wrench,
} from 'lucide-react';
import './SystemDock.css';

const SystemDock: React.FC = () => {
  return (
    <motion.div
      className="system-dock"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
    >
      {/* Left Temperature */}
      <div className="dock__temp">
        <span className="dock__temp-arrow"><ChevronLeft /></span>
        <span>22.5°</span>
        <span className="dock__temp-arrow"><ChevronRight /></span>
      </div>

      <div className="dock__divider" />

      {/* Left Section */}
      <div className="dock__section">
        <button className="dock__item"><Phone /></button>
        <button className="dock__item dock__item--active"><Car /></button>
      </div>

      <div className="dock__divider" />

      {/* Center Section */}
      <div className="dock__section dock__section--center">
        <button className="dock__item"><Navigation /></button>

        <div className="dock__temp">
          <span className="dock__temp-arrow"><ChevronLeft /></span>
          <Volume2 size={18} />
          <span className="dock__temp-arrow"><ChevronRight /></span>
        </div>

        <button className="dock__item">
          <LayoutGrid />
          <span className="dock__item-label">Auto</span>
        </button>

        <button className="dock__item"><Bluetooth /></button>
        <button className="dock__item"><Music /></button>
        <button className="dock__item"><Phone /></button>
        <button className="dock__item"><Settings /></button>
        <button className="dock__item"><Wrench /></button>
      </div>

      <div className="dock__divider" />

      {/* Right Temperature */}
      <div className="dock__temp">
        <span className="dock__temp-arrow"><ChevronLeft /></span>
        <span>22.5°</span>
        <span className="dock__temp-arrow"><ChevronRight /></span>
      </div>
    </motion.div>
  );
};

export default SystemDock;
