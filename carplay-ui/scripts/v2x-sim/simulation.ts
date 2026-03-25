import * as dotenv from 'dotenv';
import geohash from 'ngeohash';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove, Database } from 'firebase/database';
import CryptoJS from 'crypto-js';

const SHARED_KEY_STRING = 'driveos_hackathon_e2e_secret_key';
const KEY = CryptoJS.enc.Utf8.parse(SHARED_KEY_STRING);

function encryptData(data: any): { e2ee_payload: string } {
  const jsonString = JSON.stringify(data);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(jsonString, KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const combined = iv.clone().concat(encrypted.ciphertext);
  return { e2ee_payload: CryptoJS.enc.Base64.stringify(combined) };
}

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
    console.log("🔥 Firebase Client Connected. V2X Swarm Director Online.");
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
interface Validation { status: string; votes: number; verified: boolean; sources: string[]; }
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
  // ADAS fields
  escape_vector?: { recommended_action: string; lane_offset: number; confidence: number; };
  rshi_segment?: string; // Road Surface Health Index segment ID
}

interface VehicleNode {
  vehicle_id: string;
  last_seen: number;
  location: Location;
  speed: number;
  heading: number;
  role: 'scout' | 'validator' | 'ego';
  status: { online: boolean; connection: string; };
  stats: { events_generated: number; events_verified: number; };
}

interface ComponentHealth {
  suspension_health: number;   // 0-100
  brake_integrity: number;     // 0-100
  tire_pressure: number;       // 0-100
  vitality_index: number;      // Weighted composite 0-100
  imu_buffer: number[];        // Last 64 samples for 1-D CNN
  last_impact_g: number;
  km_since_service: number;
  predicted_km_to_failure: number;
  status: 'OPTIMAL' | 'CAUTION' | 'CRITICAL';
}

interface Waypoint { lat: number; lon: number; }

// ========================================
// DETERMINISTIC ROUTE DEFINITIONS
// Actual road coordinates on SH 332 / ECR
// ========================================

// All three vehicles travel the SAME road, staggered in time.
// This is the key to the "Scout -> Validator -> Ego" narrative.
const SHARED_ROUTE: Waypoint[] = [
  // SH 332, Puducherry-Villupuram Road (Westbound stretch near Pakkam)
  { lat: 11.9260, lon: 79.6340 },
  { lat: 11.9255, lon: 79.6330 },
  { lat: 11.9250, lon: 79.6320 },
  { lat: 11.9245, lon: 79.6310 },
  { lat: 11.9240, lon: 79.6300 }, // <-- POTHOLE ZONE (hazard planted here)
  { lat: 11.9235, lon: 79.6290 },
  { lat: 11.9230, lon: 79.6280 },
  { lat: 11.9225, lon: 79.6270 },
  { lat: 11.9220, lon: 79.6260 },
  { lat: 11.9215, lon: 79.6250 },
  { lat: 11.9210, lon: 79.6240 },
  { lat: 11.9205, lon: 79.6230 },
  // -- Return leg (loop back)
  { lat: 11.9210, lon: 79.6240 },
  { lat: 11.9215, lon: 79.6250 },
  { lat: 11.9220, lon: 79.6260 },
  { lat: 11.9225, lon: 79.6270 },
  { lat: 11.9230, lon: 79.6280 },
  { lat: 11.9235, lon: 79.6290 },
  { lat: 11.9240, lon: 79.6300 }, // <-- POTHOLE ZONE (again on return)
  { lat: 11.9245, lon: 79.6310 },
  { lat: 11.9250, lon: 79.6320 },
  { lat: 11.9255, lon: 79.6330 },
];

// Fixed pothole locations (deterministic, not random)
const POTHOLE_LOCATIONS: { coord: Waypoint; severity: number; id: string }[] = [
  { coord: { lat: 11.9240, lon: 79.6300 }, severity: 0.85, id: 'pothole_alpha' },
  { coord: { lat: 11.9225, lon: 79.6270 }, severity: 0.62, id: 'pothole_beta'  },
  { coord: { lat: 11.9215, lon: 79.6250 }, severity: 0.45, id: 'pothole_gamma' },
];

// Detection radius (in degrees, ~5 meters)
const DETECTION_RADIUS = 0.0005;
const TICK_INTERVAL_MS = 2000;
const SWARM_CONFIDENCE_THRESHOLD = 0.75; // Lane-switch triggers above this

// ========================================
// SWARM INTELLIGENCE DIRECTOR
// ========================================
class SwarmDirector {
  private vehicles: Map<string, {
    lat: number;
    lon: number;
    waypointIndex: number;
    heading: number;
    speed: number;
    role: 'scout' | 'validator' | 'ego';
    eventsGenerated: number;
    eventsVerified: number;
    detectedPotholes: Set<string>;
    // Health State
    health: {
      suspension: number;
      brakes: number;
      tires: number;
      imuBuffer: number[];
      lastImpactG: number;
      kmDriven: number;
    };
  }> = new Map();

  // Master event registry (shared across all vehicles)
  private potholeRegistry: Map<string, {
    event_id: string;
    location: Location;
    severity: number;
    confidence: number;
    votes: number;
    sources: string[];
    verified: boolean;
    timestamp: number;
    escape_active: boolean;
  }> = new Map();

  private tickCount = 0;

  constructor() {
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║   🧠 DRIVEOS SWARM INTELLIGENCE v3.0    ║");
    console.log("║   Deterministic V2X Director Online      ║");
    console.log("╠══════════════════════════════════════════╣");
    console.log("║  Scout:     veh_101 (First Detector)     ║");
    console.log("║  Validator: veh_102 (Confidence Booster)  ║");
    console.log("║  Ego Car:   veh_103 (ADAS Receiver)      ║");
    console.log("╚══════════════════════════════════════════╝\n");

    this.initVehicles();
    this.clearPreviousData();
    this.startSimulationLoop();
    this.startRSHIWorker();
    this.startHealthWorker();
  }

  private initVehicles() {
    // Scout starts first, Validator 3 waypoints behind, Ego 6 waypoints behind
    const fleet: { id: string; startIndex: number; speed: number; role: 'scout' | 'validator' | 'ego' }[] = [
      { id: 'veh_101', startIndex: 0,  speed: 45, role: 'scout' },
      { id: 'veh_102', startIndex: 0,  speed: 42, role: 'validator' }, // Starts same place, slightly slower
      { id: 'veh_103', startIndex: 0,  speed: 55, role: 'ego' },       // Ego is faster (highway)
    ];

    fleet.forEach((v, i) => {
      // Stagger start positions along the route  
      const staggeredIndex = Math.min(v.startIndex + (i * 3), SHARED_ROUTE.length - 1);
      const startPt = SHARED_ROUTE[staggeredIndex];
      this.vehicles.set(v.id, {
        lat: startPt.lat,
        lon: startPt.lon,
        waypointIndex: staggeredIndex + 1,
        heading: 0,
        speed: v.speed,
        role: v.role,
        eventsGenerated: 0,
        eventsVerified: 0,
        detectedPotholes: new Set(),
        health: {
          suspension: 92 + Math.random() * 8,
          brakes: 88 + Math.random() * 12,
          tires: 90 + Math.random() * 10,
          imuBuffer: Array(64).fill(0).map(() => 0.1 + Math.random() * 0.3),
          lastImpactG: 0,
          kmDriven: Math.floor(Math.random() * 5000),
        },
      });
    });
  }

  private async clearPreviousData() {
    if (!db) return;
    try {
      await remove(ref(db, 'events'));
      await remove(ref(db, 'vehicles'));
      await remove(ref(db, 'rshi'));
      await remove(ref(db, 'adas'));
      console.log("🧹 Cleared previous simulation data.\n");
    } catch (e) {}
  }

  private generateId() {
    return 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // -------------------------------------------------------
  // CORE: Check if a vehicle is near a pothole
  // -------------------------------------------------------
  private checkPotholeProximity(vehicleId: string, lat: number, lon: number): void {
    const vehicle = this.vehicles.get(vehicleId)!;

    for (const pothole of POTHOLE_LOCATIONS) {
      const dist = Math.sqrt(
        Math.pow(lat - pothole.coord.lat, 2) + Math.pow(lon - pothole.coord.lon, 2)
      );

      if (dist < DETECTION_RADIUS && !vehicle.detectedPotholes.has(pothole.id)) {
        vehicle.detectedPotholes.add(pothole.id);
        
        const existing = this.potholeRegistry.get(pothole.id);
        
        if (!existing) {
          // FIRST DETECTION (Scout finds it)
          const initialConfidence = 0.30 + Math.random() * 0.15; // 30-45%
          const imuPeak = 1.5 + Math.random() * 2.5;
          
          const entry = {
            event_id: this.generateId(),
            location: {
              lat: pothole.coord.lat,
              lon: pothole.coord.lon,
              geohash: geohash.encode(pothole.coord.lat, pothole.coord.lon, 7)
            },
            severity: pothole.severity,
            confidence: initialConfidence,
            votes: 1,
            sources: [vehicleId],
            verified: false,
            timestamp: Math.floor(Date.now() / 1000),
            escape_active: false,
          };
          
          this.potholeRegistry.set(pothole.id, entry);
          vehicle.eventsGenerated++;
          
          console.log(`\n🔍 [SCOUT] ${vehicleId} FIRST DETECTION of ${pothole.id}!`);
          console.log(`   📍 (${pothole.coord.lat}, ${pothole.coord.lon}) | Conf: ${(initialConfidence * 100).toFixed(0)}% | IMU: ${imuPeak.toFixed(1)}G`);
          console.log(`   ⏳ Awaiting validation from swarm...\n`);

          this.publishEvent(entry, vehicleId, imuPeak);
          this.applyImpactDamage(vehicleId, pothole.severity);
          
        } else if (!existing.sources.includes(vehicleId)) {
          // VALIDATION (Another vehicle confirms it)
          existing.votes++;
          existing.sources.push(vehicleId);
          vehicle.eventsVerified++;
          
          // Confidence increases logarithmically with each validation
          const boost = 0.25 / Math.sqrt(existing.votes); 
          existing.confidence = Math.min(0.98, existing.confidence + boost);
          existing.timestamp = Math.floor(Date.now() / 1000);
          
          const wasVerified = existing.verified;
          existing.verified = existing.confidence >= SWARM_CONFIDENCE_THRESHOLD;
          
          console.log(`\n✅ [VALIDATOR] ${vehicleId} CONFIRMED ${pothole.id}!`);
          console.log(`   📊 Confidence: ${(existing.confidence * 100).toFixed(0)}% | Votes: ${existing.votes} | Sources: [${existing.sources.join(', ')}]`);
          
          if (existing.verified && !wasVerified) {
            existing.escape_active = true;
            console.log(`   🚨 *** SWARM THRESHOLD REACHED! ADAS ESCAPE VECTOR NOW ACTIVE ***`);
            console.log(`   🛡️  All following vehicles will receive lane-switch guidance.\n`);
            this.publishAdasAlert(existing);
          } else {
            console.log(`   ⏳ Need more validations for ADAS trigger (${(SWARM_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% required)\n`);
          }

          this.publishEvent(existing, vehicleId, 2.0 + Math.random() * 1.5);
          this.applyImpactDamage(vehicleId, pothole.severity);
        }
      }
    }
  }

  // -------------------------------------------------------
  // ADAS Escape Vector Publication
  // -------------------------------------------------------
  private publishAdasAlert(pothole: typeof this.potholeRegistry extends Map<string, infer V> ? V : never) {
    if (!db) return;
    
    const adasPayload = {
      hazard_id: pothole.event_id,
      location: pothole.location,
      confidence: pothole.confidence,
      verified: true,
      recommended_action: 'LANE_SWITCH_LEFT',
      lane_offset_m: 1.5,
      stopping_distance_m: 45, // At 60km/h
      alert_level: 'CRITICAL',
      timestamp: Math.floor(Date.now() / 1000),
    };

    set(ref(db, `adas/active_alert`), encryptData(adasPayload)).catch(() => {});
  }

  // -------------------------------------------------------
  // RSHI + MUNICIPAL ROI ENGINE
  // Road Surface Health Index + Economic Impact Calculator
  // -------------------------------------------------------
  private startRSHIWorker() {
    setInterval(() => {
      if (!db) return;
      
      const segmentSize = 4;
      const segments: any[] = [];
      let totalDamageCost = 0;
      let totalRepairBudget = 0;
      let totalCO2Impact = 0;
      let criticalSegments = 0;
      
      for (let i = 0; i < SHARED_ROUTE.length; i += segmentSize) {
        const segWaypoints = SHARED_ROUTE.slice(i, i + segmentSize);
        const segCenter = segWaypoints[Math.floor(segWaypoints.length / 2)];
        
        let potholeCount = 0;
        let maxSeverity = 0;
        let totalConfidence = 0;
        let totalSeverity = 0;
        
        this.potholeRegistry.forEach((pothole) => {
          for (const wp of segWaypoints) {
            const dist = Math.sqrt(
              Math.pow(pothole.location.lat - wp.lat, 2) + Math.pow(pothole.location.lon - wp.lon, 2)
            );
            if (dist < 0.001) {
              potholeCount++;
              maxSeverity = Math.max(maxSeverity, pothole.severity);
              totalSeverity += pothole.severity;
              totalConfidence += pothole.confidence;
              break;
            }
          }
        });
        
        // Health Score: 100 = perfect road, 0 = critically damaged
        const healthScore = Math.max(0, 100 - (potholeCount * 30) - (maxSeverity * 20));
        const status = healthScore > 70 ? 'GOOD' : healthScore > 40 ? 'FAIR' : 'CRITICAL';

        // ── MUNICIPAL ROI CALCULATIONS ──
        // Vehicle Damage Cost: $80-$350 per pothole hit depending on severity
        const segDamageCost = potholeCount > 0
          ? Math.round(potholeCount * (80 + totalSeverity / potholeCount * 270))
          : 0;
        
        // Repair Priority: weighted by density, severity, and traffic volume (simulated)
        const trafficMultiplier = 1.2 + Math.random() * 0.6; // 1.2-1.8x
        const repairPriority = Math.min(100, Math.round(
          (potholeCount * 25 + maxSeverity * 40 + (100 - healthScore) * 0.35) * trafficMultiplier
        ));
        
        // CO2 Impact: braking + acceleration waste per pothole (~0.15kg per event)
        const co2Kg = Number((potholeCount * 0.15 * trafficMultiplier).toFixed(2));
        
        // Repair budget estimate: $2,500 per pothole (municipal average)
        const repairBudget = potholeCount * 2500;
        
        totalDamageCost += segDamageCost;
        totalRepairBudget += repairBudget;
        totalCO2Impact += co2Kg;
        if (status === 'CRITICAL') criticalSegments++;

        segments.push({
          segment_id: `seg_${Math.floor(i / segmentSize)}`,
          center: { lat: segCenter.lat, lon: segCenter.lon },
          bounds: { start: segWaypoints[0], end: segWaypoints[segWaypoints.length - 1] },
          health_score: Math.round(healthScore),
          status,
          pothole_count: potholeCount,
          max_severity: Number(maxSeverity.toFixed(2)),
          avg_confidence: potholeCount > 0 ? Number((totalConfidence / potholeCount).toFixed(2)) : 0,
          // Municipal ROI fields
          est_damage_cost: segDamageCost,
          repair_priority: repairPriority,
          repair_budget: repairBudget,
          co2_impact_kg: co2Kg,
          last_updated: Math.floor(Date.now() / 1000),
        });
      }

      // Publish individual segments
      segments.forEach((seg) => {
        set(ref(db!, `rshi/${seg.segment_id}`), encryptData(seg)).catch(() => {});
      });

      // Publish aggregate MUNICIPAL DASHBOARD
      const totalPotholes = Array.from(this.potholeRegistry.values()).length;
      const verifiedPotholes = Array.from(this.potholeRegistry.values()).filter(p => p.verified).length;
      
      const mdPayload = {
        total_potholes_detected: totalPotholes,
        verified_potholes: verifiedPotholes,
        total_road_segments: segments.length,
        critical_segments: criticalSegments,
        est_vehicle_damage_total: totalDamageCost,
        est_repair_budget_needed: totalRepairBudget,
        damage_prevented_pct: verifiedPotholes > 0 ? Math.round((verifiedPotholes / Math.max(1, totalPotholes)) * 85) : 0,
        co2_saved_kg: Number(totalCO2Impact.toFixed(2)),
        fleet_coverage_km: Number((SHARED_ROUTE.length * 0.12).toFixed(1)),
        active_fleet_size: this.vehicles.size,
        last_updated: Math.floor(Date.now() / 1000),
      };
      
      set(ref(db!, 'municipal_dashboard/city_overview'), encryptData(mdPayload)).catch(() => {});

    }, 5000);
  }

  // -------------------------------------------------------
  // MAIN SIMULATION TICK
  // -------------------------------------------------------
  private startSimulationLoop() {
    setInterval(() => {
      this.tickCount++;
      const now = Math.floor(Date.now() / 1000);

      this.vehicles.forEach((vehicle, id) => {
        const route = SHARED_ROUTE;
        const targetWp = route[vehicle.waypointIndex];

        // Calculate vector to next waypoint
        const dx = targetWp.lon - vehicle.lon;
        const dy = targetWp.lat - vehicle.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate true heading
        const trueHeading = Math.atan2(dx, dy) * (180 / Math.PI);
        vehicle.heading = trueHeading >= 0 ? trueHeading : 360 + trueHeading;

        // Movement interpolation
        const moveDist = (vehicle.speed / 3600) * 0.008;

        if (dist < moveDist) {
          vehicle.lat = targetWp.lat;
          vehicle.lon = targetWp.lon;
          vehicle.waypointIndex = (vehicle.waypointIndex + 1) % route.length;
        } else {
          const ratio = moveDist / dist;
          vehicle.lon += dx * ratio;
          vehicle.lat += dy * ratio;
        }

        // Check for pothole proximity (deterministic detection)
        this.checkPotholeProximity(id, vehicle.lat, vehicle.lon);

        // Publish vehicle telemetry
        const gh = geohash.encode(vehicle.lat, vehicle.lon, 7);
        const nodePayload: VehicleNode = {
          vehicle_id: id,
          last_seen: now,
          location: { lat: Number(vehicle.lat.toFixed(6)), lon: Number(vehicle.lon.toFixed(6)), geohash: gh },
          speed: vehicle.speed,
          heading: Math.round(vehicle.heading % 360),
          role: vehicle.role,
          status: { online: true, connection: "V2V | Cloud" },
          stats: {
            events_generated: vehicle.eventsGenerated,
            events_verified: vehicle.eventsVerified
          }
        };

        this.publishVehicle(nodePayload);
      });

      // Status line
      const regSize = this.potholeRegistry.size;
      const verified = [...this.potholeRegistry.values()].filter(p => p.verified).length;
      process.stdout.write(`\r🛰️  Tick ${this.tickCount} | Potholes: ${regSize} (${verified} verified) | ADAS: ${verified > 0 ? '🟢 ACTIVE' : '⏳ STANDBY'}  `);

    }, TICK_INTERVAL_MS);
  }

  private publishVehicle(node: VehicleNode) {
    if (db) {
      set(ref(db, `vehicles/${node.vehicle_id}`), encryptData(node)).catch(() => {});
    }
  }

  private publishEvent(
    entry: { event_id: string; location: Location; severity: number; confidence: number; votes: number; sources: string[]; verified: boolean; timestamp: number; escape_active: boolean },
    vehicleId: string,
    imuPeak: number
  ) {
    if (!db) return;

    const eventPayload: V2XEvent = {
      event_id: entry.event_id,
      vehicle_id: vehicleId,
      timestamp: entry.timestamp,
      location: entry.location,
      motion_context: {
        speed: this.vehicles.get(vehicleId)?.speed ?? 0,
        heading: Math.round(this.vehicles.get(vehicleId)?.heading ?? 0)
      },
      detection: {
        type: "surface_anomaly",
        subtype: "pothole",
        severity: entry.severity,
        confidence: entry.confidence
      },
      signals: {
        imu_peak: Number(imuPeak.toFixed(1)),
        audio_peak: Number((0.4 + Math.random() * 0.4).toFixed(2)),
        duration_ms: Math.floor(80 + Math.random() * 100)
      },
      validation: {
        status: entry.verified ? "swarm_verified" : "pending",
        votes: entry.votes,
        verified: entry.verified,
        sources: entry.sources
      },
      source: { mode: "edge_detected", device: "UNO_Q_v1" },
    };

    if (entry.escape_active) {
      eventPayload.escape_vector = {
        recommended_action: 'LANE_SWITCH_LEFT',
        lane_offset: 1.5,
        confidence: entry.confidence,
      };
    }

    set(ref(db, `events/${entry.event_id}`), encryptData(eventPayload)).catch((e) =>
      console.warn("\nSync fail:", e.message)
    );
  }

  // -------------------------------------------------------
  // HEALTH DEGRADATION on Pothole Impact
  // -------------------------------------------------------
  private applyImpactDamage(vehicleId: string, severity: number) {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return;

    const h = vehicle.health;
    const impactG = 1.5 + severity * 3.5 + Math.random() * 1.5;
    h.lastImpactG = Number(impactG.toFixed(1));

    // Degradation proportional to severity and speed
    const speedFactor = vehicle.speed / 60;
    const suspDmg = severity * 3.5 * speedFactor;
    const brakeDmg = severity * 1.8 * speedFactor;
    const tireDmg = severity * 2.2 * speedFactor;

    h.suspension = Math.max(0, h.suspension - suspDmg);
    h.brakes = Math.max(0, h.brakes - brakeDmg);
    h.tires = Math.max(0, h.tires - tireDmg);

    // Inject impact spike into IMU buffer
    const spikeLen = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < spikeLen; i++) {
      h.imuBuffer.push(impactG * (0.6 + Math.random() * 0.4));
      h.imuBuffer.shift();
    }
  }

  // -------------------------------------------------------
  // HEALTH TELEMETRY WORKER
  // Publishes component health to Firebase every 3s
  // -------------------------------------------------------
  private startHealthWorker() {
    setInterval(() => {
      if (!db) return;

      this.vehicles.forEach((vehicle, id) => {
        const h = vehicle.health;

        // Natural wear per tick (very gradual)
        h.suspension = Math.max(0, h.suspension - 0.02);
        h.brakes = Math.max(0, h.brakes - 0.015);
        h.tires = Math.max(0, h.tires - 0.01);
        h.kmDriven += (vehicle.speed / 3600) * 3;

        // Add normal road noise to IMU buffer
        h.imuBuffer.push(0.1 + Math.random() * 0.4);
        h.imuBuffer.shift();

        // Calculate Vitality Index (weighted average)
        const vitality = Math.round(
          h.suspension * 0.45 + h.brakes * 0.30 + h.tires * 0.25
        );

        // Predict remaining km based on degradation rate
        const avgHealth = (h.suspension + h.brakes + h.tires) / 3;
        const predictedKm = Math.max(0, Math.round((avgHealth / 100) * 15000));

        const status: 'OPTIMAL' | 'CAUTION' | 'CRITICAL' =
          vitality > 75 ? 'OPTIMAL' : vitality > 45 ? 'CAUTION' : 'CRITICAL';

        const payload: ComponentHealth = {
          suspension_health: Math.round(h.suspension * 10) / 10,
          brake_integrity: Math.round(h.brakes * 10) / 10,
          tire_pressure: Math.round(h.tires * 10) / 10,
          vitality_index: vitality,
          imu_buffer: h.imuBuffer.map(v => Number(v.toFixed(2))),
          last_impact_g: h.lastImpactG,
          km_since_service: Math.round(h.kmDriven),
          predicted_km_to_failure: predictedKm,
          status,
        };

        set(ref(db!, `vehicle_health/${id}`), encryptData(payload)).catch(() => {});
      });
    }, 3000);
  }
}

new SwarmDirector();
