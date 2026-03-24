import React from 'react';
import { motion } from 'framer-motion';
import {
  SkipBack,
  Pause,
  SkipForward,
  Search,
  Shuffle,
  Repeat,
} from 'lucide-react';
import './MediaBar.css';

const MediaBar: React.FC = () => {
  return (
    <motion.div
      className="media-bar"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
    >
      {/* Playback Controls */}
      <div className="media__controls">
        <button className="media__btn">
          <SkipBack size={18} />
        </button>
        <button className="media__btn media__btn--play">
          <Pause size={22} />
        </button>
        <button className="media__btn">
          <SkipForward size={18} />
        </button>
      </div>

      {/* Track Info */}
      <div className="media__track">
        <div className="media__album-art">🎸</div>
        <div className="media__track-info">
          <div className="media__track-name">Rock & Roll Queen</div>
          <div className="media__track-artist">The Subways</div>
        </div>
      </div>

      {/* Queue Controls */}
      <div className="media__queue">
        <button className="media__btn"><Search size={18} /></button>
        <button className="media__btn"><Shuffle size={18} /></button>
        <button className="media__btn"><Repeat size={18} /></button>
      </div>
    </motion.div>
  );
};

export default MediaBar;
