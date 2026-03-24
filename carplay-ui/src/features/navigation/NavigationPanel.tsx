import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Navigation as NavIcon, X, MapPin } from 'lucide-react';
import './NavigationPanel.css';
import MapComponent, { type MapComponentHandle } from './MapComponent';

const SW = 1.2;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN; 

interface SearchResult {
  place_name: string;
  center: [number, number];
}

const NavigationPanel: React.FC = () => {
  const mapHandleRef = useRef<MapComponentHandle>(null);
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [destination, setDestination] = useState<{lat: number, lng: number, name: string} | null>(null);
  // Live Search handler
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=poi,address,place&limit=4`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.features || []);
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPOI = (res: SearchResult) => {
    setDestination({
      lng: res.center[0],
      lat: res.center[1],
      name: res.place_name.split(',')[0] // Short name
    });
    setQuery('');
    setResults([]);
  };

  const handleSetStart = (e: React.MouseEvent, res: SearchResult) => {
    e.stopPropagation();
    mapHandleRef.current?.setManualOrigin(res.center[0], res.center[1]);
    setQuery('');
    setResults([]);
  };

  const clearDestination = () => {
    setDestination(null);
  };

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
          <Search strokeWidth={SW} style={{ opacity: 0.6 }} />
          <input 
            className="nav-search__input" 
            placeholder={destination ? "Navigating to " + destination.name : "Search destination..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {destination ? (
          <button className="nav-search__action" onClick={clearDestination}>
            <X strokeWidth={SW} color="#ff453a" />
          </button>
        ) : (
          <button className="nav-search__action">
            <NavIcon strokeWidth={SW} />
          </button>
        )}
      </div>

      {/* Live Mapbox Integration */}
      <div className="nav-map">
        <MapComponent destination={destination} ref={mapHandleRef} />

        {/* Zoom */}
        <div className="nav-zoom">
          <button className="nav-zoom__btn" onClick={() => mapHandleRef.current?.zoomIn()}>+</button>
          <button className="nav-zoom__btn" onClick={() => mapHandleRef.current?.zoomOut()}>−</button>
        </div>
      </div>

      {/* POI Suggestions (Live from Search) */}
      <div className="nav-pois">
        <AnimatePresence>
          {results.map((poi, i) => (
            <motion.div
              key={poi.place_name + i}
              className="nav-poi"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleSelectPOI(poi)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <MapPin size={14} color="#3a9bff" />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span className="nav-poi__name" style={{ fontSize: '0.85rem' }}>{poi.place_name.split(',')[0]}</span>
                <span className="nav-poi__dist" style={{ fontSize: '0.65rem', opacity: 0.6 }}>{poi.place_name.split(',').slice(1).join(',').trim() || 'POI'}</span>
              </div>
              <button 
                onClick={(e) => handleSetStart(e, poi)}
                className="nav-poi-start-btn"
                style={{
                  background: 'rgba(58, 155, 255, 0.15)',
                  border: '1px solid rgba(58, 155, 255, 0.4)',
                  color: '#3a9bff',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Set Start
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NavigationPanel;
