import * as dotenv from 'dotenv';
import geohash from 'ngeohash';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, Database } from 'firebase/database';

dotenv.config({ path: './.env' }); // Adjusted path for running from carplay-ui root

// Firebase config from .env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase Client
let db: Database | null = null;
if (firebaseConfig.databaseURL) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("🔥 Firebase Client Connected. Syncing V2X to Cloud...");
  } catch (err: any) {
    console.warn("⚠️ Firebase Initialization Failed:", err.message);
  }
} else {
  console.log("⚠️ No VITE_FIREBASE_DATABASE_URL in .env. Running in Dry-Run mode.");
}

// V2X Schema Types
interface Location { lat: number; lon: number; geohash?: string; }
interface MotionContext { speed: number; heading: number; }
interface Detection { type: string; subtype: string; severity: number; confidence: number; }
interface Signals { imu_peak: number; audio_peak: number; duration_ms: number; }
interface Validation { status: string; votes: number; verified: boolean; }
interface Source { mode: string; device: string; }

interface V2XEvent {
  event_id: string;
  vehicle_id: string;
  timestamp: number;
  location: Location;
  motion_context: MotionContext;
  detection: Detection;
  signals: Signals;
  validation: Validation;
  source: Source;
}

interface VehicleNode {
  vehicle_id: string;
  last_seen: number;
  location: Location;
  status: { online: boolean; connection: string; };
  stats: { events_generated: number; events_verified: number; };
}

class VirtualTrafficEngine {
  private baseLat = 11.9200; 
  private baseLon = 79.6300;
  
  private vehicles: Map<string, any> = new Map();
  private eventLog: V2XEvent[] = [];

  constructor() {
    console.log("🟢 V2X Virtual Traffic Engine Starting...");
    this.initVehicles();
    this.startSimulationLoop();
  }

  private initVehicles() {
    const fleet = ['veh_101', 'veh_102', 'veh_103'];
    fleet.forEach((id) => {
      this.vehicles.set(id, {
        lat: this.baseLat + (Math.random() - 0.5) * 0.01,
        lon: this.baseLon + (Math.random() - 0.5) * 0.01,
        heading: Math.random() * 360,
        speed: 30 + Math.random() * 20, 
        eventsGenerated: 0
      });
    });
  }

  private generateId() {
    return 'evt_' + Math.random().toString(16).slice(2, 10);
  }

  private startSimulationLoop() {
    setInterval(() => {
      const now = Math.floor(Date.now() / 1000);

      this.vehicles.forEach((vehicle, id) => {
        const distanceDegrees = (vehicle.speed / 3600) * 0.01;
        vehicle.lat += Math.cos(vehicle.heading * (Math.PI / 180)) * distanceDegrees;
        vehicle.lon += Math.sin(vehicle.heading * (Math.PI / 180)) * distanceDegrees;
        vehicle.heading += (Math.random() - 0.5) * 10;

        const currentGeohash = geohash.encode(vehicle.lat, vehicle.lon, 6);

        const nodePayload: VehicleNode = {
          vehicle_id: id,
          last_seen: now,
          location: { lat: vehicle.lat, lon: vehicle.lon },
          status: { online: true, connection: "V2V | Cloud" },
          stats: { 
            events_generated: vehicle.eventsGenerated, 
            events_verified: Math.floor(vehicle.eventsGenerated * 0.6) 
          }
        };

        if (Math.random() < 0.10) {
          vehicle.eventsGenerated++;
          const severity = Number((0.5 + Math.random() * 0.5).toFixed(2));
          
          const eventPayload: V2XEvent = {
            event_id: this.generateId(),
            vehicle_id: id,
            timestamp: now,
            location: {
              lat: Number(vehicle.lat.toFixed(6)),
              lon: Number(vehicle.lon.toFixed(6)),
              geohash: currentGeohash
            },
            motion_context: {
              speed: Number(vehicle.speed.toFixed(1)),
              heading: Math.round(vehicle.heading % 360)
            },
            detection: {
              type: "surface_anomaly",
              subtype: "pothole",
              severity: severity,
              confidence: Number((0.7 + Math.random() * 0.25).toFixed(2))
            },
            signals: {
              imu_peak: Number((2.0 + Math.random() * 2).toFixed(1)),
              audio_peak: Number((0.4 + Math.random() * 0.4).toFixed(2)),
              duration_ms: Math.floor(80 + Math.random() * 100)
            },
            validation: {
              status: "pending",
              votes: 1,
              verified: false
            },
            source: {
              mode: "edge_detected",
              device: "UNO_Q_v1"
            }
          };

          this.eventLog.push(eventPayload);
          this.publishEventToFirebase(eventPayload);
        }

        this.publishVehicleToFirebase(nodePayload);
      });

    }, 2000);
  }

  private publishVehicleToFirebase(node: VehicleNode) {
    process.stdout.write(`\r📡 [V2V SYNC] Vehicle ${node.vehicle_id} updated. Total Potholes Detected: ${this.eventLog.length}`);
    if (db) {
      set(ref(db, `vehicles/${node.vehicle_id}`), node).catch(() => {});
    }
  }

  private publishEventToFirebase(event: V2XEvent) {
    console.log(`\n🚨 [ANOMALY DETECTED] ${event.vehicle_id} hit a Pothole! Severity: ${event.detection.severity} | Geohash: ${event.location.geohash}`);
    if (db) {
      set(ref(db, `events/${event.event_id}`), event).catch((e) => console.warn("\nFailed to sync event:", e.message));
    }
  }
}

new VirtualTrafficEngine();
