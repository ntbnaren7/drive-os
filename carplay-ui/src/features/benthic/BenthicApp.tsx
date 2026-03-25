import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../services/firebase';
import { ref, push, set, onValue } from 'firebase/database';
import * as ort from 'onnxruntime-web';
import { ScanEye, Waves, FileSearch, Crosshair, ScrollText, Play, Square } from 'lucide-react';
import { BentoCard } from './BentoCard';
import './BenthicApp.css';

declare global {
  interface Window {
    lastV2XTime?: number;
  }
}
// Classes that indicate road hazards
const HAZARD_CLASSES = new Set([
  'person','bicycle','car','motorcycle','bus','truck','dog','cat',
  'stop sign','traffic light','fire hydrant','bench','skateboard','umbrella','suitcase','backpack'
]);

// ──────────────────────────────────────────────────
// V2X EVENT SCHEMA v1
// ──────────────────────────────────────────────────
interface V2XEvent {
  type: string;
  detection: {
    subtype: string;
    severity: number;
    confidence: number;
  };
  location: {
    lat: number;
    lon: number;
    geohash: string;
  };
  node_id: string;
  timestamp: number;
  ttl: number;
}

function BenthicApp() {
  // ── Vision Engine State ──
  const [visionThreshold, setVisionThreshold] = useState(65);
  const [visionScore, setVisionScore] = useState(0);
  const [roadStatus, setRoadStatus] = useState<'CLEAN' | 'WORN' | 'HAZARD'>('CLEAN');
  const [hazardFrames, setHazardFrames] = useState(0);
  
  const [sensorMode, setSensorMode] = useState<'SIM' | 'WEBCAM'>('SIM');
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [uptime, setUptime] = useState(0);
  const [meshStatus, setMeshStatus] = useState<'CONNECTED' | 'SYNCING' | 'OFFLINE'>('OFFLINE');
  const [vehicleLat, setVehicleLat] = useState(11.9210);
  const [vehicleLon, setVehicleLon] = useState(79.6280);
  const [flashDetect, setFlashDetect] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [simAnomalies, setSimAnomalies] = useState<{ id: number; type: string; x: number; y: number }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [videoDevices, setVideoDevices] = useState<{deviceId: string, label: string}[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [modelReady, setModelReady] = useState(false);
  const [lastDetections, setLastDetections] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const anomalyIdRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const onnxSessionRef = useRef<ort.InferenceSession | null>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  // ── Engine Init: Load ONNX Model ──
  useEffect(() => {
    addLog('SYSTEM: Initializing YOLOv8s ONNX Engine v8...');
    ort.InferenceSession.create('/models/pothole/pothole_v8s_best.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    }).then(session => {
      onnxSessionRef.current = session;
      setModelReady(true);
      addLog('SYSTEM: YOLOv8 ONNX Model (v8) Loaded. On-Device AI Ready.');
    }).catch(err => {
      addLog(`SYSTEM: ONNX model load failed - ${err}`);
      setModelReady(false);
    });
  }, [addLog]);

  // ── Uptime Tracker ──
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Subscribe to Vehicle Telemetry ──
  useEffect(() => {
    const vehRef = ref(db, 'vehicles');
    const unsub = onValue(vehRef, (snap) => {
      const data = snap.val();
      if (data) {
        const firstVeh = Object.values(data)[0] as any;
        if (firstVeh?.location) {
          setVehicleLat(firstVeh.location.lat);
          setVehicleLon(firstVeh.location.lon);
          setMeshStatus('CONNECTED');
        }
      }
    });
    return () => unsub();
  }, []);

  // ── Webcam Hardware Interface ──
  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, [loadDevices]);

  const toggleWebcam = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setIsStreaming(false);
      setSensorMode('SIM');
      addLog('HW: Webcam shutter closed.');
      return;
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId }, width: 1280, height: 720 } 
          : { facingMode: 'environment', width: 1280, height: 720 }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsStreaming(true);
      setSensorMode('WEBCAM');
      addLog('HW: Webcam active. Resolution: 720p HD.');
      loadDevices(); // Refresh to get labels after permission is granted
    } catch (err) {
      addLog(`HW: Camera access denied - ${err}`);
    }
  }, [selectedDeviceId, addLog, loadDevices]);

  // ── Manual Detection Override (Click-to-Flag) ──
  const manualOverride = useCallback(() => {
    if (sensorMode !== 'WEBCAM' || !videoRef.current) return;
    addLog('OVERRIDE: Manual Human-Verified AI Trigger Initiated.');
    
    // Capture Evidence instantly
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 320;
    offscreenCanvas.height = 180;
    const ctx = offscreenCanvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 180);
        setEvidenceUrl(offscreenCanvas.toDataURL('image/jpeg', 0.6));
    }
    
    const payload: V2XEvent = {
        type: 'HAZARD',
        detection: { subtype: 'pothole', severity: 0.95, confidence: 1.0 },
        location: {
          lat: vehicleLat + (Math.random() - 0.5) * 0.0002,
          lon: vehicleLon + (Math.random() - 0.5) * 0.0002,
          geohash: `t${vehicleLat.toFixed(2)}${vehicleLon.toFixed(2)}`.replace(/\./g, ''),
        },
        node_id: 'BENTHIC_01V',
        timestamp: Date.now(),
        ttl: 10000,
    };
    
    const eventsRef = ref(db, 'events');
    set(push(eventsRef), payload);
    
    setDetectionCount(prev => prev + 1);
    setFlashDetect(true);
    setTimeout(() => setFlashDetect(false), 500);
    addLog(`AI: Detected Hazard [MANUAL] @ ${payload.location.lat.toFixed(5)}, ${payload.location.lon.toFixed(5)}`);
  }, [sensorMode, vehicleLat, vehicleLon, addLog]);

  // ── ML Inference Engine ──
  const runInference = useCallback(async () => {
    if (!videoRef.current && sensorMode === 'WEBCAM') return;

    setIsScanning(true);
    setScannedCount(prev => prev + 1);
    const start = performance.now();

    let currentScore = 0;
    let newStatus: 'CLEAN' | 'WORN' | 'HAZARD' = 'CLEAN';

    if (sensorMode === 'WEBCAM' && videoRef.current) {
        // ── Capture frame to canvas ──
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = 416;
        captureCanvas.height = 416;
        const captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
        if (captureCtx) {
          captureCtx.drawImage(videoRef.current, 0, 0, 416, 416);
        }

        // ── Sobel Texture Analyzer (PRIMARY pothole detector) ──
        let sobelScore = 0;
        let sobelStatus: 'CLEAN' | 'WORN' | 'HAZARD' = 'CLEAN';
        const debugCanvas = document.createElement('canvas');
        debugCanvas.width = 160;
        debugCanvas.height = 120;
        const debugSrcCtx = debugCanvas.getContext('2d', { willReadFrequently: true });
        if (debugSrcCtx) {
          debugSrcCtx.drawImage(videoRef.current, 0, 0, 160, 120);
          const imgData = debugSrcCtx.getImageData(0, 0, 160, 120);
          const data = imgData.data;
          const totalPx = 160 * 120;
          const debugCtx = debugCanvasRef.current?.getContext('2d');
          const debugImgData = debugCtx ? debugCtx.createImageData(160, 120) : null;
          
          let totalLuma = 0;
          for (let p = 0; p < data.length; p += 4) {
            totalLuma += 0.299 * data[p] + 0.587 * data[p+1] + 0.114 * data[p+2];
          }
          const avgLuma = totalLuma / totalPx;
          
          let edgeCount = 0;
          let deepDarkCount = 0;
          
          for (let y = 1; y < 119; y++) {
            for (let x = 1; x < 159; x++) {
              const i = (y * 160 + x) * 4;
              const cL = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
              if (cL < avgLuma * 0.65) deepDarkCount++;
              
              const rL = 0.299 * data[i+4] + 0.587 * data[i+5] + 0.114 * data[i+6];
              const bL = 0.299 * data[i+640] + 0.587 * data[i+641] + 0.114 * data[i+642];
              const edge = Math.abs(cL - rL) + Math.abs(cL - bL);
              
              if (edge > 25) {
                edgeCount++;
                if (debugImgData) {
                  debugImgData.data[i] = 0; debugImgData.data[i+1] = 255; debugImgData.data[i+2] = 200; debugImgData.data[i+3] = 255;
                }
              } else if (debugImgData) {
                debugImgData.data[i] = cL*0.3; debugImgData.data[i+1] = cL*0.3; debugImgData.data[i+2] = cL*0.3; debugImgData.data[i+3] = 255;
              }
            }
          }
          if (debugCtx && debugImgData) debugCtx.putImageData(debugImgData, 0, 0);
          
          const edgeRatio = edgeCount / totalPx;
          const darkRatio = deepDarkCount / totalPx;
          sobelScore = Math.min(100, Math.round((darkRatio * 150) + (edgeRatio * 200)));
          
          if (edgeRatio > 0.06 && darkRatio > 0.02) {
            sobelStatus = 'HAZARD';
          } else if (edgeRatio > 0.04 || darkRatio > 0.03) {
            sobelStatus = 'WORN';
          }
        }

        // ── ONNX YOLOv8 inference (on-device, v8 640x640) ──
        let onnxLabels: string[] = [];
        let onnxMaxConf = 0;
        if (onnxSessionRef.current && captureCtx) {
          try {
            // Resize image to 640x640 for v8 model
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = 640;
            offscreenCanvas.height = 640;
            const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
            if (offscreenCtx) {
                offscreenCtx.drawImage(videoRef.current, 0, 0, 640, 640);
                const imgData = offscreenCtx.getImageData(0, 0, 640, 640);
                const pixels = imgData.data;
                
                const input = new Float32Array(3 * 640 * 640);
                for (let i = 0; i < 640 * 640; i++) {
                  input[i]                 = pixels[i * 4]     / 255.0;
                  input[i + 640 * 640]     = pixels[i * 4 + 1] / 255.0;
                  input[i + 2 * 640 * 640] = pixels[i * 4 + 2] / 255.0;
                }
                
                const tensor = new ort.Tensor('float32', input, [1, 3, 640, 640]);
                const results = await onnxSessionRef.current.run({ images: tensor });
                
                const output = results[Object.keys(results)[0]];
                const rawData = output.data as Float32Array;
                const numDetections = output.dims[2];
                const P_CLASSES = ['pothole']; // v8 model only has 1 class
                
                for (let i = 0; i < numDetections; i++) {
                  let bestClassScore = 0;
                  let bestClassIdx = 0;
                  // Output has 4 bbox coordinates + 1 class score
                  for (let c = 0; c < 1; c++) {
                    const score = rawData[(4 + c) * numDetections + i];
                    if (score > bestClassScore) {
                      bestClassScore = score;
                      bestClassIdx = c;
                    }
                  }
                  if (bestClassScore > 0.40) { // Slight bump to threshold for pothole v8
                    const className = P_CLASSES[bestClassIdx] || `class_${bestClassIdx}`;
                    onnxLabels.push(`${className}(${Math.round(bestClassScore * 100)}%)`);
                    if (bestClassScore > onnxMaxConf) onnxMaxConf = bestClassScore;
                  }
                }
            }
          } catch (err) {
            addLog(`ONNX: ${err}`);
          }
        }

        // ── Hybrid Decision: Combine ONNX + Sobel ──
        const allLabels: string[] = [];
        
        // Add Sobel pothole detection
        if (sobelStatus === 'HAZARD') {
          allLabels.push(`pothole(texture:${sobelScore}%)`);
          newStatus = 'HAZARD';
          currentScore = sobelScore;
        } else if (sobelStatus === 'WORN') {
          allLabels.push(`surface_wear(${sobelScore}%)`);
          if (newStatus === 'CLEAN') newStatus = 'WORN';
          currentScore = Math.max(currentScore, sobelScore);
        }
        
        // Add ONNX detections
        if (onnxLabels.length > 0) {
          allLabels.push(...onnxLabels.slice(0, 3));
          const hasHazard = onnxLabels.some(l => HAZARD_CLASSES.has(l.split('(')[0]));
          if (hasHazard || onnxMaxConf > 0.5) {
            newStatus = 'HAZARD';
            currentScore = Math.max(currentScore, Math.round(onnxMaxConf * 100));
          }
        }
        
        if (allLabels.length > 0) {
          setLastDetections(allLabels.slice(0, 5));
          setVisionScore(currentScore);
          if (newStatus === 'HAZARD') {
            addLog(`HYBRID: [${allLabels.slice(0, 3).join(', ')}]`);
          }
        } else {
          setLastDetections(['Scanning...']);
          setVisionScore(0);
        }
    } else {
      // Logic Simulation: Detect simulated anomalies
      const target = simAnomalies.find(a => a.y > 45 && a.y < 55);
      if (target) {
        newStatus = 'HAZARD';
        setVisionScore(85);
      } else {
        const wear = simAnomalies.find(a => a.y > 20 && a.y < 80 && Math.random() > 0.7);
        if (wear) {
           newStatus = 'WORN';
           setVisionScore(40);
        } else {
           newStatus = 'CLEAN';
           setVisionScore(12);
        }
      }
    }
    
    setRoadStatus(newStatus);
    setInferenceTime(Math.round(performance.now() - start));

    // EVIDENCE CAPTURE
    if (videoRef.current && sensorMode === 'WEBCAM' && newStatus === 'HAZARD') {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = 320;
        offscreenCanvas.height = 180;
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 320, 180);
            setEvidenceUrl(offscreenCanvas.toDataURL('image/jpeg', 0.6));
        }
    }

    // Temporal Verification → V2X Uplink
    if (newStatus === 'HAZARD') {
        setHazardFrames(prev => {
            const newCount = prev + 1;
            // Require 5 consecutive high-speed frames to confirm Hazard
            if (newCount >= 5) {
                // Throttle V2X payloads to max 1 per 3000ms
                const now = Date.now();
                if (!window.lastV2XTime || now - window.lastV2XTime > 3000) {
                  window.lastV2XTime = now;
                  const payload: V2XEvent = {
                    type: 'HAZARD',
                    detection: {
                      subtype: lastDetections.length > 0 ? lastDetections[0] : 'pothole',
                      severity: 0.7 + Math.random() * 0.2,
                      confidence: 0.8 + (currentScore / 500),
                    },
                    location: {
                      lat: vehicleLat + (Math.random() - 0.5) * 0.0002,
                      lon: vehicleLon + (Math.random() - 0.5) * 0.0002,
                      geohash: `t${vehicleLat.toFixed(2)}${vehicleLon.toFixed(2)}`.replace(/\./g, ''),
                    },
                    node_id: 'BENTHIC_01V',
                    timestamp: now,
                    ttl: 10000,
                  };

                  const eventsRef = ref(db, 'events');
                  set(push(eventsRef), payload);
                  
                  setDetectionCount(d => d + 1);
                  setFlashDetect(true);
                  setTimeout(() => setFlashDetect(false), 800);
                  addLog(`AI: V2X Alert → ${payload.detection.subtype} @ ${payload.location.lat.toFixed(5)}, ${payload.location.lon.toFixed(5)}`);
                }
                
                return 5; // Cap at 5 until CLEAN
            }
            return newCount;
        });
    } else {
        setHazardFrames(0); // Reset immediately on clean frame
    }

    setTimeout(() => setIsScanning(false), 200);
  }, [sensorMode, simAnomalies, vehicleLat, vehicleLon, visionThreshold, modelReady, lastDetections, addLog]);

  // ── Master Clock: Continuous High-Speed Inference ──
  useEffect(() => {
    let animationFrameId: number;
    let isProcessing = false;

    const loop = async () => {
      if (!isProcessing) {
        isProcessing = true;
        await runInference();
        isProcessing = false;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [runInference]);

  // ── Simulated Road Animation ──
  useEffect(() => {
    if (sensorMode !== 'SIM') return;
    const spawnX = () => 20 + Math.random() * 60;
    const interval = setInterval(() => {
      const newA = { id: anomalyIdRef.current++, type: 'ANOMALY', x: spawnX(), y: -10 };
      setSimAnomalies(prev => [...prev, newA]);
    }, 4000);
    return () => clearInterval(interval);
  }, [sensorMode]);

  useEffect(() => {
    const frame = setInterval(() => {
      setSimAnomalies(prev => prev.map(a => ({ ...a, y: a.y + 1.5 })).filter(a => a.y < 120));
    }, 50);
    return () => clearInterval(frame);
  }, []);

  const formatUptime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="benthic-root">
      <main className="benthic-main">
        {/* CORE VISION VIEWPORT (8 Columns Wide, 2 Rows High) */}
        <BentoCard gridArea="1 / 1 / 3 / 9" className={`grid-vision sensor-feed ${flashDetect ? 'flash-detect' : ''}`} flexCol={true}>
          {/* Floating V2X Mesh Pill */}
          <div className="mesh-pill-overlay">
            <div className={`mesh-status status-${meshStatus.toLowerCase()}`}>
              <span className="mesh-dot" />
              V2X: {meshStatus}
            </div>
          </div>
          <div className="feed-header">
            <span className="feed-label">CONTINUOUS PIPELINE [{inferenceTime > 0 ? Math.min(60, Math.round(1000 / inferenceTime)) : '--'} FPS]</span>
            <span className="feed-mode">{sensorMode}</span>
          </div>

          <div className="feed-viewport">
            <div className="scanlines" />
            
            <div className={`scan-overlay ${isScanning ? 'scanning' : ''}`}>
              <div className="scan-line" />
              <div className="scan-label">{isScanning ? 'INFERENCE ACTIVE...' : 'READY'}</div>
            </div>

            <div className="reticle">
              <div className="reticle-h" />
              <div className="reticle-v" />
              <div className={`reticle-center status-${roadStatus.toLowerCase()}`} />
              <div className="reticle-label">
                AUTO-CLASSIFIER: <span className={`status-text-${roadStatus.toLowerCase()}`}>{roadStatus}</span>
              </div>
            </div>

            {sensorMode === 'SIM' && (
              <div className="sim-road">
                <div className="road-surface" />
                <div className="road-line center" />
                {simAnomalies.map(a => (
                  <div key={a.id} className="sim-anomaly" style={{ left: `${a.x}%`, top: `${a.y}%` }}>
                    <div className="anomaly-box" />
                  </div>
                ))}
              </div>
            )}

            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`webcam-video ${sensorMode === 'WEBCAM' ? 'active' : ''}`}
              onClick={manualOverride}
              style={{ cursor: sensorMode === 'WEBCAM' ? 'crosshair' : 'default' }}
            />
          </div>

          <div className="feed-controls">
            <button className="ctrl-btn" onClick={toggleWebcam}>
              {isStreaming ? <><Square size={12} style={{marginRight: 6}}/> STOP HARDWARE</> : <><Play size={12} style={{marginRight: 6}}/> START HARDWARE</>}
            </button>
            {videoDevices.length > 0 && (
              <select 
                value={selectedDeviceId} 
                onChange={e => setSelectedDeviceId(e.target.value)}
                disabled={isStreaming}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: '#3a9bff',
                  border: '1px solid #3a9bff',
                  marginLeft: '10px',
                  padding: '4px 8px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  fontSize: '0.8rem',
                  maxWidth: '150px'
                }}
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
            <div className="shutter-label">SHUTTER: 1.0s / ISO: AUTO</div>
          </div>
        </BentoCard>

        {/* TELEMETRY CARDS (Right 4 Columns) */}
        
        {/* ML Engine Status */}
        <BentoCard 
          gridArea="1 / 9 / 2 / 13" 
          title="ENGINE STATUS" 
          icon={<ScanEye size={16} strokeWidth={1.2} />}
          className={`grid-engine ${visionScore > visionThreshold ? 'glow-alert' : ''}`}
        >
          <div className="diag-grid">
            <div className="diag-item">
              <span className="diag-label">SURFACE STATE</span>
              <span className={`diag-value status-text-${roadStatus.toLowerCase()}`} style={{ fontWeight: 'bold' }}>{roadStatus}</span>
            </div>
            <div className="diag-item">
              <span className="diag-label">TEMPORAL BUFFER</span>
              <span className="diag-value">[{hazardFrames}/2] FRMS</span>
            </div>
            <div className="diag-item">
              <span className="diag-label">ML DETECTIONS</span>
              <span className="diag-value mono" style={{ fontSize: '0.65rem' }}>{lastDetections.length > 0 ? lastDetections.join(', ') : 'NONE'}</span>
            </div>
            <div className="diag-item">
              <span className="diag-label">ANOMALY_SCORE</span>
              <span className={`diag-value ${visionScore > visionThreshold ? 'warn' : 'accent'}`} style={{ fontSize: '1.4rem' }}>{visionScore}</span>
            </div>
          </div>
          
          <div className="diag-grid" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="diag-item wide">
              <span className="diag-label">OVERRIDE THRESHOLD ({visionThreshold}%)</span>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={visionThreshold} 
                onChange={(e) => setVisionThreshold(Number(e.target.value))}
                className="threshold-slider"
                style={{ width: '100%', accentColor: '#3a9bff' }}
              />
            </div>
          </div>
        </BentoCard>

        {/* Swarm & Snapshot Demetrics */}
        <BentoCard 
          gridArea="2 / 9 / 3 / 13" 
          title="DEMETRICS & SWARM" 
          icon={<Waves size={16} strokeWidth={1.2} />}
          className="grid-swarm"
        >
          <div className="diag-grid">
            <div className="diag-item">
              <span className="diag-label">UPTIME</span>
              <span className="diag-value">{formatUptime(uptime)}</span>
            </div>
            <div className="diag-item">
              <span className="diag-label">BANDWIDTH SAVED</span>
              <span className="diag-value warn">{scannedCount - detectionCount} FRMS</span>
            </div>
            <div className="diag-item">
              <span className="diag-label">AVG LATENCY</span>
              <span className="diag-value" style={{ color: '#30d158' }}>{inferenceTime}ms</span>
            </div>
            <div className="diag-item">
              <span className="diag-label">DETECTED</span>
              <span className="diag-value warn">{detectionCount}</span>
            </div>
          </div>

          <div className="diag-grid" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="diag-item wide">
              <span className="diag-label">AI ENGINE</span>
              <span className="diag-value" style={{ fontSize: '0.7rem', color: modelReady ? '#3a9bff' : '#ff6b6b' }}>
                {modelReady ? 'YOLOv8n ONNX v6 ✓' : 'Loading Model...'}
              </span>
            </div>
            <div className="diag-item wide">
              <span className="diag-label">GPS SYNC</span>
              <span className="diag-value mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {vehicleLat.toFixed(5)}, {vehicleLon.toFixed(5)}
              </span>
            </div>
          </div>
        </BentoCard>

        {/* BOTTOM ROW (Spans full width) */}
        
        {/* Latest Evidence */}
        <BentoCard 
          gridArea="3 / 1 / 4 / 5" 
          title="EVIDENCE" 
          icon={<FileSearch size={16} strokeWidth={1.2} />}
          className="grid-evidence"
        >
          <div className="evidence-frame">
            {evidenceUrl ? (
              <img src={evidenceUrl} alt="Evidence" className="evidence-img" />
            ) : (
              <div className="evidence-placeholder" style={{color: 'rgba(58, 155, 255, 0.4)'}}>AWAITING HAZARD DETECTION</div>
            )}
          </div>
        </BentoCard>

        {/* X-Ray Debugger */}
        <BentoCard 
          gridArea="3 / 5 / 4 / 9" 
          title="X-RAY" 
          icon={<Crosshair size={16} strokeWidth={1.2} />}
          className="grid-xray"
        >
          <div className="evidence-frame" style={{ border: '1px solid rgba(58, 155, 255, 0.3)', background: 'rgba(0,15,30,0.5)' }}>
            <canvas ref={debugCanvasRef} width={160} height={120} style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', opacity: 0.8 }} />
          </div>
        </BentoCard>

        {/* System Logs */}
        <BentoCard 
          gridArea="3 / 9 / 4 / 13" 
          title="LOG" 
          icon={<ScrollText size={16} strokeWidth={1.2} />}
          className="grid-logs"
        >
          <div className="log-feed">
            {logs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
          </div>
        </BentoCard>

      </main>
    </div>
  );
}

export default BenthicApp;
