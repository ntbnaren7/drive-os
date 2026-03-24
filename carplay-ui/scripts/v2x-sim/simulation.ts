import * as dotenv from 'dotenv';
import geohash from 'ngeohash';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove, Database } from 'firebase/database';

dotenv.config({ path: './.env' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let db: Database | null = null;
if (firebaseConfig.databaseURL) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("🔥 Firebase Client Connected. Syncing V2X to Cloud...");
  } catch (err: any) {
    console.warn("⚠️ Firebase Init Failed:", err.message);
  }
} else {
  console.log("⚠️ No VITE_FIREBASE_DATABASE_URL. Dry-Run mode.");
}

// ========================================
// V2X SCHEMA TYPES
// ========================================
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

interface Waypoint { lat: number; lon: number; }

// ========================================
// VIRTUAL TRAFFIC ENGINE V2
// ========================================
const EVENT_TTL_SECONDS = 10; // Pothole markers decay after 10s
const POTHOLE_PROBABILITY = 0.02; // 2% chance per tick per vehicle
const TICK_INTERVAL_MS = 2000;

class VirtualTrafficEngine {
  // -------------------------------------------------------
  // HIGH-DENSITY SPLINE PATHS (SH 332 / Pakkam Area)
  // Coordinates mapped tightly to actual road geometry
  // -------------------------------------------------------
  private routes: Waypoint[][] = [
    // Route A — Villupuram - Puducherry Rd (SH 332) Westbound
    [
      { lat: 11.9200, lon: 79.6308 },
      { lat: 11.9202, lon: 79.6300 },
      { lat: 11.9205, lon: 79.6292 },
      { lat: 11.9208, lon: 79.6280 },
      { lat: 11.9211, lon: 79.6272 },
      { lat: 11.9214, lon: 79.6264 },
      { lat: 11.9216, lon: 79.6256 },
      { lat: 11.9218, lon: 79.6248 },
      { lat: 11.9216, lon: 79.6256 },
      { lat: 11.9214, lon: 79.6264 },
      { lat: 11.9211, lon: 79.6272 },
      { lat: 11.9208, lon: 79.6280 },
      { lat: 11.9205, lon: 79.6292 },
      { lat: 11.9202, lon: 79.6300 },
    ],
    // Route B — Cuddalore - Pallinetiyanur Rd (North-South Loop)
    [
      { lat: 11.9260, lon: 79.6288 },
      { lat: 11.9255, lon: 79.6290 },
      { lat: 11.9248, lon: 79.6293 },
      { lat: 11.9238, lon: 79.6297 },
      { lat: 11.9228, lon: 79.6302 },
      { lat: 11.9218, lon: 79.6306 },
      { lat: 11.9208, lon: 79.6310 },
      { lat: 11.9198, lon: 79.6315 },
      { lat: 11.9188, lon: 79.6319 },
      { lat: 11.9198, lon: 79.6315 },
      { lat: 11.9208, lon: 79.6310 },
      { lat: 11.9218, lon: 79.6306 },
      { lat: 11.9228, lon: 79.6302 },
      { lat: 11.9238, lon: 79.6297 },
      { lat: 11.9248, lon: 79.6293 },
      { lat: 11.9255, lon: 79.6290 },
    ],
    // Route C — Inner RC-19 / Local Grid Array
    [
      { lat: 11.9234, lon: 79.6303 },
      { lat: 11.9236, lon: 79.6312 },
      { lat: 11.9238, lon: 79.6321 },
      { lat: 11.9239, lon: 79.6331 },
      { lat: 11.9240, lon: 79.6341 },
      { lat: 11.9241, lon: 79.6351 },
      { lat: 11.9242, lon: 79.6361 },
      { lat: 11.9241, lon: 79.6351 },
      { lat: 11.9240, lon: 79.6341 },
      { lat: 11.9239, lon: 79.6331 },
      { lat: 11.9238, lon: 79.6321 },
      { lat: 11.9236, lon: 79.6312 },
    ]
  ];

  private vehicles: Map<string, any> = new Map();
  private activeEvents: Map<string, { timestamp: number }> = new Map();
  private totalPotholes = 0;

  constructor() {
    console.log("🟢 V2X Virtual Traffic Engine V2 Starting...");
    console.log("🛣️  Routes locked to SH 332 / ECR / Puducherry Grid.");
    console.log(`⏱️  Event TTL: ${EVENT_TTL_SECONDS}s | Pothole Rate: ${POTHOLE_PROBABILITY * 100}%`);
    this.initVehicles();
    this.startSimulationLoop();
    this.startDecayWorker();
  }

  private initVehicles() {
    const fleet = ['veh_101', 'veh_102', 'veh_103'];
    fleet.forEach((id, index) => {
      const startPt = this.routes[index][0];
      this.vehicles.set(id, {
        lat: startPt.lat,
        lon: startPt.lon,
        routeIndex: index,
        waypointIndex: 1,
        heading: 0,
        speed: 35 + Math.random() * 25, // 35-60 km/h
        eventsGenerated: 0
      });
    });
  }

  private generateId() {
    return 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // -------------------------------------------------------
  // MAIN SIMULATION TICK
  // -------------------------------------------------------
  private startSimulationLoop() {
    setInterval(() => {
      const now = Math.floor(Date.now() / 1000);

      this.vehicles.forEach((vehicle, id) => {
        const route = this.routes[vehicle.routeIndex];
        const targetWp = route[vehicle.waypointIndex];

        const dx = targetWp.lon - vehicle.lon;
        const dy = targetWp.lat - vehicle.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const trueHeading = Math.atan2(dx, dy) * (180 / Math.PI);
        vehicle.heading = trueHeading >= 0 ? trueHeading : 360 + trueHeading;

        const moveDist = (vehicle.speed / 3600) * 0.008;

        if (dist < moveDist) {
          vehicle.lat = targetWp.lat;
          vehicle.lon = targetWp.lon;
          vehicle.waypointIndex = (vehicle.waypointIndex + 1) % route.length;
          vehicle.speed = 35 + Math.random() * 25; // Randomize speed at each turn
        } else {
          const ratio = moveDist / dist;
          vehicle.lon += dx * ratio;
          vehicle.lat += dy * ratio;
        }

        const gh = geohash.encode(vehicle.lat, vehicle.lon, 7);

        const nodePayload: VehicleNode = {
          vehicle_id: id,
          last_seen: now,
          location: { lat: Number(vehicle.lat.toFixed(6)), lon: Number(vehicle.lon.toFixed(6)) },
          status: { online: true, connection: "V2V | Cloud" },
          stats: {
            events_generated: vehicle.eventsGenerated,
            events_verified: Math.floor(vehicle.eventsGenerated * 0.6)
          }
        };

        // Pothole detection (2% chance)
        if (Math.random() < POTHOLE_PROBABILITY) {
          vehicle.eventsGenerated++;
          this.totalPotholes++;
          const severity = Number((0.5 + Math.random() * 0.5).toFixed(2));

          const eventPayload: V2XEvent = {
            event_id: this.generateId(),
            vehicle_id: id,
            timestamp: now,
            location: {
              lat: Number(vehicle.lat.toFixed(6)),
              lon: Number(vehicle.lon.toFixed(6)),
              geohash: gh
            },
            motion_context: {
              speed: Number(vehicle.speed.toFixed(1)),
              heading: Math.round(vehicle.heading % 360)
            },
            detection: {
              type: "surface_anomaly",
              subtype: "pothole",
              severity,
              confidence: Number((0.7 + Math.random() * 0.25).toFixed(2))
            },
            signals: {
              imu_peak: Number((2.0 + Math.random() * 2).toFixed(1)),
              audio_peak: Number((0.4 + Math.random() * 0.4).toFixed(2)),
              duration_ms: Math.floor(80 + Math.random() * 100)
            },
            validation: { status: "pending", votes: 1, verified: false },
            source: { mode: "edge_detected", device: "UNO_Q_v1" }
          };

          this.activeEvents.set(eventPayload.event_id, { timestamp: now });
          this.publishEvent(eventPayload);
        }

        this.publishVehicle(nodePayload);
      });
    }, TICK_INTERVAL_MS);
  }

  // -------------------------------------------------------
  // DATA DECAY WORKER — removes stale events every 2s
  // -------------------------------------------------------
  private startDecayWorker() {
    setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      this.activeEvents.forEach((meta, eventId) => {
        if (now - meta.timestamp > EVENT_TTL_SECONDS) {
          if (db) {
            remove(ref(db, `events/${eventId}`)).catch(() => {});
          }
          this.activeEvents.delete(eventId);
        }
      });
    }, 2000);
  }

  private publishVehicle(node: VehicleNode) {
    process.stdout.write(`\r📡 [V2V] ${node.vehicle_id} @ (${node.location.lat}, ${node.location.lon}) | Potholes: ${this.totalPotholes} | Active: ${this.activeEvents.size}  `);
    if (db) {
      set(ref(db, `vehicles/${node.vehicle_id}`), node).catch(() => {});
    }
  }

  private publishEvent(event: V2XEvent) {
    console.log(`\n🚨 [ANOMALY] ${event.vehicle_id} Pothole! Sev: ${event.detection.severity} | (${event.location.lat}, ${event.location.lon}) | TTL: ${EVENT_TTL_SECONDS}s`);
    if (db) {
      set(ref(db, `events/${event.event_id}`), event).catch((e) => console.warn("\nSync fail:", e.message));
    }
  }
}

new VirtualTrafficEngine();
