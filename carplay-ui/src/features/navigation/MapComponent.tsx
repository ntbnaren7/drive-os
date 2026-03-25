import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation2, MapPin } from 'lucide-react';
import { db } from '../../services/firebase';
import { ref as fbRef, onValue } from 'firebase/database';
import './MapComponent.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN; 

interface RouteData {
  distance: number;
  duration: number;
}

interface MapComponentProps {
  destination: { lng: number; lat: number; name: string } | null;
}

export interface MapComponentHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  setManualOrigin: (lng: number, lat: number) => void;
}

const MapComponent = React.forwardRef<MapComponentHandle, MapComponentProps>(({ destination }, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  // V2X Remote Tracking Refs
  const remoteVehiclesRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const v2vCoordsRef = useRef<number[][]>([]);
  
  const [telemetry, setTelemetry] = useState({ lat: 54.6872, lng: 25.2798, alt: '0' });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteData | null>(null);
  
  type GpsStatusType = 'searching' | 'active' | 'ip-fallback' | 'error' | 'denied';
  const [gpsStatus, setGpsStatus] = useState<GpsStatusType>('searching');
  
  const [isManualLocation, setIsManualLocation] = useState(false);
  const isManualRef = useRef(false);
  const realGpsRef = useRef<{lat: number, lng: number} | null>(null);
  const hasLockedRef = useRef(false);

  // Note: Nuclear Console removed, logging goes to normal console now
  const addLog = (msg: string) => {
    console.log(msg);
  };

  React.useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn({ duration: 300 }),
    zoomOut: () => mapRef.current?.zoomOut({ duration: 300 }),
    setManualOrigin: (lng: number, lat: number) => {
      setIsManualLocation(true);
      isManualRef.current = true;
      setIsFollowing(false);
      setUserLocation({ lat, lng });
      setTelemetry({
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        alt: 'MANUAL'
      });
      window.dispatchEvent(new CustomEvent('manual-origin-snap', { detail: { lng, lat } }));
      if (mapRef.current) {
        mapRef.current.easeTo({
          center: [lng, lat],
          zoom: 16.5,
          pitch: 60,
          padding: { top: 300, bottom: 50, left: 0, right: 0 },
          duration: 1500
        });
      }
    }
  }));

  // Create a stable ref so JSX can call the emergency teleport
  const applyLockRef = useRef<((lng: number, lat: number, t: GpsStatusType, s: string) => void) | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let animationFrameId: number;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Simulation center: SH 332 / Pakkam area
    const SIM_CENTER: [number, number] = [79.6300, 11.9240];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: SIM_CENTER,
      zoom: 16.5,
      pitch: 60,
      bearing: -17.6, 
      attributionControl: false,
      dragPan: true,
      scrollZoom: true,
      touchZoomRotate: true,
      doubleClickZoom: true,
    });

    mapRef.current = map;
    addLog('[MAP] Engine Initialized');

    // ==========================================
    // SIMULATION-CENTRIC TRACKING
    // No browser GPS needed — we follow the Swarm
    // ==========================================
    const applyLocationLock = (lng: number, lat: number, type: GpsStatusType, sourceLabel: string) => {
      hasLockedRef.current = true;
      setGpsStatus(type);
      setUserLocation({ lat, lng });
      window.dispatchEvent(new CustomEvent('manual-origin-snap', { detail: { lng, lat } }));
      setTelemetry({
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        alt: sourceLabel
      });
    };
    applyLockRef.current = applyLocationLock;

    // Lock to simulation center immediately
    applyLocationLock(SIM_CENTER[0], SIM_CENTER[1], 'active', 'V2X-SIM');
    addLog('[V2X] Simulation Mode — Tracking Ego Car (veh_103)');

    // Global Tracking Variables
    let currentLoc = { lng: 79.628, lat: 11.921 };
    let targetLoc = { lng: 79.628, lat: 11.921 };
    let currentHeading = 0;
    let targetHeading = 0;

    map.on('load', () => {
      addLog('[MAP] Style Loaded. Adding Layers...');
      try {
        const layers = map.getStyle()?.layers;
        let labelLayerId;
        if (layers) {
          for (let i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout && (layers[i].layout as any)['text-field']) {
              labelLayerId = layers[i].id;
              break;
            }
          }
        }

        map.addLayer(
          {
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#2a2d34',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.8
            }
          },
          labelLayerId 
        );

        // The navigation-night-v1 style ALREADY includes 'mapbox-traffic' natively!
        // We do NOT need to call addSource again. Just add the layers.


        // The navigation-night-v1 style handles traffic internally.
        // We do not need to manually add traffic layers.

        addLog('[MAP] Layers Attached Successfully.');

        addLog('[MAP] Injecting Cursor Marker...');
        const el = document.createElement('div');
        el.className = 'map-anchored-cursor';
        el.innerHTML = `
          <div class="cursor-pulse-ring"></div>
          <svg viewBox="0 0 40 40" fill="none" style="width: 44px; height: 44px; filter: drop-shadow(0 4px 12px rgba(58, 155, 255, 0.4)); position: relative; z-index: 2;">
            <circle cx="20" cy="20" r="18" fill="rgba(58, 155, 255, 0.2)" />
            <path d="M20 4 L32 32 L20 26 L8 32 Z" fill="#3a9bff" stroke="rgba(255,255,255,0.2)" stroke-width="0.5" />
            <path d="M20 4 L32 32 L20 26 L8 32 Z" fill="url(#arrowGlow)" opacity="0.6" />
            <defs>
              <linearGradient id="arrowGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6bb5ff" />
                <stop offset="100%" stop-color="#3a9bff" />
              </linearGradient>
            </defs>
          </svg>
        `;

        try {
          const cursorMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
          })
          .setLngLat(currentLoc)
          .addTo(map);
          
          markerRef.current = cursorMarker;
          addLog('[MAP] Cursor Mounted.');
        } catch (err: any) {
          addLog(`[ERR] Marker fail: ${err.message}`);
        }

      } catch (e: any) {
        addLog(`[CRASH] Mapbox Layer Error: ${e.message}`);
      }

      map.on('dragstart', () => setIsFollowing(false));
      map.on('wheel', () => setIsFollowing(false));

      map.on('contextmenu', (e) => {
        const { lng, lat } = e.lngLat;
        setIsManualLocation(true);
        isManualRef.current = true;
        setIsFollowing(false);
        setUserLocation({ lat, lng });
        
        targetLoc = new mapboxgl.LngLat(lng, lat);
        currentLoc = targetLoc;

        setTelemetry({
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5)),
          alt: 'MANUAL'
        });
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isManualRef.current) return;
        
        const DRIVE_SPEED = 0.0001;
        const TURN_SPEED = 5;
        const rad = targetHeading * (Math.PI / 180);

        if (e.key === 'ArrowUp') {
           targetLoc.lng += Math.sin(rad) * DRIVE_SPEED / Math.cos(targetLoc.lat * Math.PI / 180);
           targetLoc.lat += Math.cos(rad) * DRIVE_SPEED;
        } else if (e.key === 'ArrowDown') {
           targetLoc.lng -= Math.sin(rad) * DRIVE_SPEED / Math.cos(targetLoc.lat * Math.PI / 180);
           targetLoc.lat -= Math.cos(rad) * DRIVE_SPEED;
        } else if (e.key === 'ArrowLeft') {
           targetHeading -= TURN_SPEED;
        } else if (e.key === 'ArrowRight') {
           targetHeading += TURN_SPEED;
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      (mapRef.current as any)._cleanupKeys = () => window.removeEventListener('keydown', handleKeyDown);

      const handleManualSnap = (e: any) => {
        const { lng, lat } = e.detail;
        targetLoc = { lng, lat };
      };
      window.addEventListener('manual-origin-snap', handleManualSnap);
      (mapRef.current as any)._cleanupSnap = () => window.removeEventListener('manual-origin-snap', handleManualSnap);
      
      // ==========================================
      // V2X EVENT & VEHICLE CLOUD SYNCHRONIZATION
      // ==========================================
      
      map.addSource('v2v-links', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'v2v-beam-glow',
        type: 'line',
        source: 'v2v-links',
        paint: {
          'line-color': '#3a9bff',
          'line-width': 6,
          'line-opacity': 0.3,
          'line-blur': 4
        }
      });
      
      map.addLayer({
        id: 'v2v-beam-core',
        type: 'line',
        source: 'v2v-links',
        paint: {
          'line-color': '#8ebcfc',
          'line-width': 2,
          'line-dasharray': [2, 4]
        }
      });

      // GeoJSON source for absolute-locked pothole markers
      map.addSource('v2x-potholes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Layer 1: Sonar glow ring (pulsing outer circle)
      map.addLayer({
        id: 'pothole-sonar-glow',
        type: 'circle',
        source: 'v2x-potholes',
        paint: {
          'circle-radius': 18,
          'circle-color': 'rgba(255, 69, 58, 0.0)',
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255, 69, 58, 0.4)',
          'circle-blur': 0.6,
          'circle-pitch-alignment': 'map'
        }
      });

      // Layer 2: Core dot (bright red, small)
      map.addLayer({
        id: 'pothole-core',
        type: 'circle',
        source: 'v2x-potholes',
        paint: {
          'circle-radius': 5,
          'circle-color': '#ff453a',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
          'circle-pitch-alignment': 'map'
        }
      });

      // Layer 3: Coordinate labels
      map.addLayer({
        id: 'pothole-labels',
        type: 'symbol',
        source: 'v2x-potholes',
        layout: {
          'text-field': ['get', 'coordLabel'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          'text-allow-overlap': true
        },
        paint: {
          'text-color': 'rgba(255, 255, 255, 0.8)',
          'text-halo-color': 'rgba(0, 0, 0, 0.9)',
          'text-halo-width': 1.5
        }
      });

      const vehiclesRef = fbRef(db, 'vehicles');
      let hasInitialZoom = false;
      const unsubVehicles = onValue(vehiclesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        const coords: number[][] = [];
        
        Object.keys(data).forEach((vid) => {
          const veh = data[vid];
          if (veh.location) {
             coords.push([veh.location.lon, veh.location.lat]);
             
             // Create role-aware markers
             let marker = remoteVehiclesRef.current[vid];
             if (!marker) {
               const el = document.createElement('div');
               el.className = 'v2x-vehicle-marker';
               const color = veh.role === 'ego' ? '#30d158' : veh.role === 'scout' ? '#ff9f0a' : '#3a9bff';
               const label = veh.role === 'ego' ? 'EGO' : veh.role === 'scout' ? 'SCT' : 'VAL';
               el.innerHTML = `<div style="position:relative;"><div style="width:14px; height:14px; background:${color}; border:2px solid #fff; border-radius:50%; box-shadow:0 0 12px ${color}80;"></div><div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:8px;font-family:'JetBrains Mono',monospace;color:${color};font-weight:700;letter-spacing:0.5px;white-space:nowrap;">${label}</div></div>`;
               marker = new mapboxgl.Marker({ element: el })
                 .setLngLat([veh.location.lon, veh.location.lat])
                 .addTo(mapRef.current!);
               remoteVehiclesRef.current[vid] = marker;
             } else {
               marker.setLngLat([veh.location.lon, veh.location.lat]);
             }

             // Track Ego Car for map center
             if (vid === 'veh_103' && veh.location) {
               targetLoc = { lng: veh.location.lon, lat: veh.location.lat };
               targetHeading = veh.heading || 0;
               applyLockRef.current?.(veh.location.lon, veh.location.lat, 'active', 'V2X-SIM');
             }
          }
        });

        v2vCoordsRef.current = coords;

        // Auto-zoom to fleet bounding box on first data
        if (!hasInitialZoom && coords.length > 1 && mapRef.current) {
          hasInitialZoom = true;
          const lngs = coords.map(c => c[0]);
          const lats = coords.map(c => c[1]);
          mapRef.current.fitBounds(
            [[Math.min(...lngs) - 0.002, Math.min(...lats) - 0.002], [Math.max(...lngs) + 0.002, Math.max(...lats) + 0.002]],
            { padding: { top: 100, bottom: 80, left: 250, right: 280 }, duration: 2000, pitch: 55 }
          );
        }
      });

      const eventsRef = fbRef(db, 'events');
      const unsubEvents = onValue(eventsRef, (snapshot) => {
        const data = snapshot.val();
        
        // Build GeoJSON FeatureCollection from live events
        const features: any[] = [];
        if (data) {
          Object.values(data).forEach((ev: any) => {
            if (ev.detection?.subtype === 'pothole' && ev.location) {
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [ev.location.lon, ev.location.lat]
                },
                properties: {
                  coordLabel: `${ev.location.lat.toFixed(4)}, ${ev.location.lon.toFixed(4)}`,
                  severity: ev.detection.severity
                }
              });
            }
          });
        }
        
        // Update the GeoJSON source — markers are now baked into the WebGL canvas
        if (mapRef.current && mapRef.current.getSource('v2x-potholes')) {
          (mapRef.current.getSource('v2x-potholes') as mapboxgl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features
          });
        }
      });

      (mapRef.current as any)._cleanupV2X = () => {
        unsubVehicles();
        unsubEvents();
        Object.values(remoteVehiclesRef.current).forEach(m => m.remove());
      };
    });

    const animateMarker = () => {
      currentLoc.lng += (targetLoc.lng - currentLoc.lng) * 0.1;
      currentLoc.lat += (targetLoc.lat - currentLoc.lat) * 0.1;
      
      if (!isNaN(targetHeading) && !isNaN(currentHeading)) {
        let diff = targetHeading - currentHeading;
        while (diff < -180) diff += 360;
        while (diff > 180) diff -= 360;
        currentHeading += diff * 0.1;
      }

      try {
        if (markerRef.current) {
          markerRef.current.setLngLat([currentLoc.lng, currentLoc.lat]);
          markerRef.current.setRotation(currentHeading);
        }
        
        // Update V2V Data Beams
        if (mapRef.current && mapRef.current.getSource('v2v-links')) {
          const coords = v2vCoordsRef.current;
          if (coords.length > 1) {
             // Draw lines connecting vehicles in a loop to form a "mesh network"
             const lineCoords = [...coords, coords[0]]; 
             const source = mapRef.current.getSource('v2v-links') as mapboxgl.GeoJSONSource;
             source.setData({
               type: 'FeatureCollection',
               features: [{
                 type: 'Feature',
                 properties: {},
                 geometry: { type: 'LineString', coordinates: lineCoords }
               }]
             });
          }
        }
      } catch (e) {
      }

      animationFrameId = requestAnimationFrame(animateMarker);
    };
    animateMarker();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (mapRef.current) {
        if ((mapRef.current as any)._cleanupKeys) (mapRef.current as any)._cleanupKeys();
        if ((mapRef.current as any)._cleanupSnap) (mapRef.current as any)._cleanupSnap();
        if ((mapRef.current as any)._cleanupV2X) (mapRef.current as any)._cleanupV2X();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !destination) {
      if (!destination && mapRef.current?.getSource('route')) {
        const source = mapRef.current.getSource('route') as mapboxgl.GeoJSONSource;
        source.setData({ type: 'FeatureCollection', features: [] });
        setRouteInfo(null);
        if (destMarkerRef.current) destMarkerRef.current.remove();
      }
      return;
    }

    const origin = userLocation || { 
      lng: mapRef.current.getCenter().lng, 
      lat: mapRef.current.getCenter().lat 
    };

    const fetchRoute = async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          setRouteInfo({ distance: route.distance, duration: route.duration });
          
          const map = mapRef.current!;
          
          if (destMarkerRef.current) destMarkerRef.current.remove();
          
          const el = document.createElement('div');
          el.className = 'map-dest-marker';
          el.innerHTML = `<div style="width:16px; height:16px; background:#ff453a; border:2px solid #fff; border-radius:50%; box-shadow:0 0 10px rgba(255,69,58,0.8);"></div>`;
          destMarkerRef.current = new mapboxgl.Marker(el)
            .setLngLat([destination.lng, destination.lat])
            .addTo(map);

          if (map.getSource('route')) {
            const source = map.getSource('route') as mapboxgl.GeoJSONSource;
            source.setData(route.geometry);
          } else {
            map.addSource('route', { type: 'geojson', data: route.geometry });
            
            map.addLayer({
              id: 'route-glow',
              type: 'line',
              source: 'route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#3a9bff', 'line-width': 12, 'line-opacity': 0.3, 'line-blur': 8 }
            }, '3d-buildings'); 

            map.addLayer({
              id: 'route-line',
              type: 'line',
              source: 'route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#6bb5ff', 'line-width': 5 }
            }, 'route-glow');
          }

          map.fitBounds([
             [Math.min(origin.lng, destination.lng), Math.min(origin.lat, destination.lat)],
             [Math.max(origin.lng, destination.lng), Math.max(origin.lat, destination.lat)]
          ], { padding: { top: 150, bottom: 100, left: 50, right: 50 }, duration: 2000, pitch: 45 });
        }
      } catch (err) {
      }
    };

    fetchRoute();
  }, [destination]);

  const handleRecentre = () => {
    setIsFollowing(true);
    setIsManualLocation(false);
    isManualRef.current = false;

    const target = realGpsRef.current || userLocation;

    if (mapRef.current && target) {
      if (realGpsRef.current) setUserLocation(realGpsRef.current);

      mapRef.current.flyTo({
        center: [target.lng, target.lat],
        zoom: 16.5,
        pitch: 60,
        padding: { top: 300, bottom: 50, left: 0, right: 0 },
        duration: 1500,
        essential: true
      });
    }
  };

  return (
    <div className="map-component">
      <div ref={mapContainerRef} className="map-container" />
      
      <div className="map-overlay-vignette" />

      {routeInfo && destination && (
        <div className="map-nav-hud">
          <div className="map-nav-hud-dest">
            <MapPin size={16} color="#ff453a" />
            <span>{destination.name}</span>
          </div>
          <div className="map-nav-hud-stats">
            <div className="gps-coord">
              <span className="lbl">LAT</span>
              <span className="val">{telemetry.lat.toFixed(5)}°</span>
            </div>
            <div className="gps-coord">
              <span className="lbl">LON</span>
              <span className="val">{telemetry.lng.toFixed(5)}°</span>
            </div>
            <div className="stat-div" />
            <div className="stat">
              <span className="val">{Math.round(routeInfo.duration / 60)}</span>
              <span className="lbl">MIN</span>
            </div>
            <div className="stat-div" />
            <div className="stat">
              <span className="val">{(routeInfo.distance / 1000).toFixed(1)}</span>
              <span className="lbl">KM</span>
            </div>
            <div className="stat-div" />
            <div className="stat">
              <span className="val">{new Date(Date.now() + routeInfo.duration * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              <span className="lbl">ETA</span>
            </div>
          </div>
        </div>
      )}

      <button className={`map-recentre-btn ${isFollowing ? 'active-following' : ''}`} onClick={handleRecentre}>
        <Navigation2 strokeWidth={isFollowing ? 2 : 1.5} />
      </button>

      {isManualLocation && (
        <div className="map-manual-badge">
          MANUAL GPS
        </div>
      )}

      <div className="map-telemetry">
        <div className="map-telemetry-row">
          <span className="map-telemetry-label">GPS</span>
          <div className="gps-status-container">
            <span className={`gps-badge status-${gpsStatus}`}>
              {gpsStatus === 'searching' && 'SEARCHING'}
              {gpsStatus === 'active' && 'LOCKED'}
              {gpsStatus === 'ip-fallback' && 'IP-GUESS'}
              {gpsStatus === 'error' && 'OFFLINE'}
              {gpsStatus === 'denied' && 'DENIED'}
            </span>
            {(gpsStatus === 'error' || gpsStatus === 'denied') && (
              <button className="gps-retry-link" onClick={() => window.location.reload()}>RETRY</button>
            )}
          </div>
        </div>
        <div className="map-telemetry-row">
          <span className="map-telemetry-label">LAT</span>
          <span className="map-telemetry-value">{telemetry.lat.toFixed(5)}°</span>
        </div>
        <div className="map-telemetry-row">
          <span className="map-telemetry-label">LON</span>
          <span className="map-telemetry-value">{telemetry.lng.toFixed(5)}°</span>
        </div>
      </div>
    </div>
  );
});

export default MapComponent;
