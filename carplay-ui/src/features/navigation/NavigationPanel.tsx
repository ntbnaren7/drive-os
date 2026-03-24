import React from 'react';
import { motion } from 'framer-motion';
import { Search, Navigation as NavIcon } from 'lucide-react';
import './NavigationPanel.css';

const POIS = [
  { name: 'Pizza Munch', dist: '4 min' },
  { name: 'Free parking', dist: '1 min' },
  { name: 'Restorant Arax', dist: '10 min' },
];

const STREET_LABELS = [
  { text: 'Gediminas Ave', x: '20%', y: '25%', rotate: -15 },
  { text: 'Tilto g.', x: '72%', y: '18%', rotate: 70 },
  { text: 'Vilniaus g.', x: '35%', y: '55%', rotate: -20 },
  { text: 'Gelezinio Vilko g.', x: '8%', y: '42%', rotate: -40 },
  { text: 'Vilniaus Šv. Konstantino', x: '15%', y: '75%', rotate: 0 },
  { text: 'ir Michailo cerkve', x: '30%', y: '80%', rotate: 0 },
  { text: 'NAUJAMIESTIS', x: '25%', y: '90%', rotate: 0 },
];

const NavigationPanel: React.FC = () => {
  return (
    <motion.div
      className="navigation-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
    >
      {/* Search */}
      <div className="nav-search">
        <div className="nav-search__input-wrapper">
          <Search />
          <input className="nav-search__input" placeholder="Navigate" readOnly />
        </div>
        <button className="nav-search__action">
          <NavIcon />
        </button>
      </div>

      {/* Map */}
      <div className="nav-map">
        <div className="nav-map__grid" />

        {/* SVG Roads */}
        <svg className="nav-map__roads" viewBox="0 0 600 500" preserveAspectRatio="none">
          {/* Main horizontal road */}
          <path className="nav-map__road nav-map__road--main" d="M0 150 Q200 140, 350 180 Q500 220, 600 200" />
          {/* Cross roads */}
          <path className="nav-map__road" d="M150 0 Q160 200, 180 500" />
          <path className="nav-map__road" d="M380 0 Q360 150, 350 180 Q340 220, 320 500" />
          <path className="nav-map__road" d="M500 0 Q490 180, 480 500" />
          {/* Diagonal */}
          <path className="nav-map__road" d="M0 300 Q200 280, 350 350 Q450 400, 600 420" />
          <path className="nav-map__road" d="M0 80 Q150 100, 250 250 Q300 350, 320 500" />
          {/* Minor roads */}
          <path className="nav-map__road" d="M250 0 L260 200" />
          <path className="nav-map__road" d="M0 250 L200 240" />
          <path className="nav-map__road" d="M400 300 L600 310" />
        </svg>

        {/* Street Labels */}
        {STREET_LABELS.map((label, i) => (
          <span
            key={i}
            className="nav-map__label"
            style={{
              left: label.x,
              top: label.y,
              transform: `rotate(${label.rotate}deg)`,
            }}
          >
            {label.text}
          </span>
        ))}

        {/* Navigation Arrow */}
        <motion.div
          className="nav-arrow"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <svg className="nav-arrow__marker" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 4 L32 32 L20 26 L8 32 Z"
              fill="#3a9bff"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.5"
            />
            <path
              d="M20 4 L32 32 L20 26 L8 32 Z"
              fill="url(#arrowGlow)"
              opacity="0.5"
            />
            <defs>
              <linearGradient id="arrowGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6bb5ff" />
                <stop offset="100%" stopColor="#3a9bff" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Zoom */}
        <div className="nav-zoom">
          <button className="nav-zoom__btn">+</button>
          <button className="nav-zoom__btn">−</button>
        </div>
      </div>

      {/* POI Suggestions */}
      <div className="nav-pois">
        {POIS.map((poi, i) => (
          <motion.div
            key={poi.name}
            className="nav-poi"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
          >
            <span className="nav-poi__name">{poi.name}</span>
            <span className="nav-poi__dist">{poi.dist}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default NavigationPanel;
