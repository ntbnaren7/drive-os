import React from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  CloudMoon,
  Moon,
  CloudSun,
  Sun
} from 'lucide-react';
import './WidgetsPanel.css';

const FORECAST = [
  { time: '23:00', icon: <CloudMoon size={18} />, temp: '13°' },
  { time: '00:00', icon: <Moon size={18} />, temp: '12°' },
  { time: '01:00', icon: <Cloud size={18} />, temp: '11°' },
  { time: '02:00', icon: <Cloud size={18} />, temp: '10°' },
  { time: '04:00', icon: <CloudMoon size={18} />, temp: '10°' },
  { time: '06:00', icon: <CloudSun size={18} />, temp: '12°' },
];

const EVENTS = [
  { name: 'Workshop', time: '9:41', emoji: '📐', color: '#ff9f0a' },
  { name: 'Lunch', time: '12:00', emoji: '🍽️', color: '#636366' },
  { name: 'UX Team meeting', time: '13:30', emoji: '🇱🇹', color: '#ff453a' },
  { name: 'Gym', time: '17:00', emoji: '🏋️', color: '#30d158' },
  { name: 'Shopping', time: '19:30', emoji: '🛍️', color: '#5e5ce6' },
];

const WidgetsPanel: React.FC = () => {
  return (
    <div className="widgets-container">
      {/* Weather Widget */}
      <motion.div
        className="weather-widget"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      >
        <div className="weather__header">
          <div>
            <div className="weather__location">Vilnius</div>
            <div className="weather__temp-row">
              <span className="weather__temp">13°</span>
            </div>
            <div className="weather__temp-range">17° · 10°</div>
          </div>
          <div className="weather__info">
            <Cloud className="weather__icon" />
            <div className="weather__condition">Mostly cloudy</div>
            <div className="weather__humidity">💧 64%</div>
          </div>
        </div>

        <div className="weather__forecast">
          {FORECAST.map((item, i) => (
            <div className="forecast-item" key={i}>
              <span className="forecast-item__time">{item.time}</span>
              <span className="forecast-item__icon">{item.icon}</span>
              <span className="forecast-item__temp">{item.temp}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Schedule Widget */}
      <motion.div
        className="schedule-widget"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
      >
        <div className="schedule__title">Wed, May 1</div>
        <div className="schedule__list">
          {EVENTS.map((event, i) => (
            <motion.div
              className="schedule-item"
              key={event.name}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
            >
              <div
                className="schedule-item__indicator"
                style={{ background: event.color }}
              />
              <span className="schedule-item__emoji">{event.emoji}</span>
              <div className="schedule-item__details">
                <div className="schedule-item__name">{event.name}</div>
                <div className="schedule-item__time">{event.time}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default WidgetsPanel;
