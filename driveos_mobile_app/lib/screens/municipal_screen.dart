import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../services/v2x_service.dart';
import 'package:lucide_icons/lucide_icons.dart';

class MunicipalScreen extends StatelessWidget {
  const MunicipalScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<V2XService>(
      builder: (context, v2x, _) {
        return Scaffold(
          backgroundColor: DriveOSTheme.backgroundBlack,
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Icon(LucideIcons.landmark, color: DriveOSTheme.accentBlue, size: 22),
                      const SizedBox(width: 10),
                      const Text(
                        'MUNICIPAL ROI',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: Colors.white),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: DriveOSTheme.accentBlue.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'B2G ENGINE',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: DriveOSTheme.accentBlue, letterSpacing: 1),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Primary ROI Metrics
                  Row(
                    children: [
                      _roiCard(
                        'DAMAGE PREVENTED',
                        '\$${v2x.municipalData['est_vehicle_damage_total'] ?? 0}',
                        LucideIcons.shieldCheck,
                        DriveOSTheme.greenOk,
                      ),
                      const SizedBox(width: 12),
                      _roiCard(
                        'REPAIR BUDGET',
                        '\$${v2x.municipalData['est_repair_budget_needed'] ?? 0}',
                        LucideIcons.wrench,
                        DriveOSTheme.amberWarn,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _roiCard(
                        'CO₂ SAVED',
                        '${v2x.municipalData['co2_saved_kg'] ?? 0} kg',
                        LucideIcons.leaf,
                        DriveOSTheme.greenOk,
                      ),
                      const SizedBox(width: 12),
                      _roiCard(
                        'COVERAGE',
                        '${v2x.municipalData['fleet_coverage_km'] ?? 0} km',
                        LucideIcons.mapPin,
                        DriveOSTheme.accentBlue,
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Road Health Summary
                  _sectionTitle('ROAD INTELLIGENCE'),
                  const SizedBox(height: 12),
                  _statTile('Potholes Detected', '${v2x.municipalData['total_potholes_detected'] ?? 0}', LucideIcons.alertOctagon, DriveOSTheme.alertRed),
                  const SizedBox(height: 8),
                  _statTile('Verified (Swarm)', '${v2x.municipalData['verified_potholes'] ?? 0}', LucideIcons.checkCircle, DriveOSTheme.greenOk),
                  const SizedBox(height: 8),
                  _statTile('Critical Segments', '${v2x.municipalData['critical_segments'] ?? 0}', LucideIcons.alertTriangle, DriveOSTheme.alertRed),
                  const SizedBox(height: 8),
                  _statTile('Total Segments', '${v2x.municipalData['total_road_segments'] ?? 0}', LucideIcons.layout, DriveOSTheme.accentBlue),
                  const SizedBox(height: 8),
                  _statTile('Active Fleet', '${v2x.municipalData['active_fleet_size'] ?? 0} vehicles', LucideIcons.car, DriveOSTheme.accentBlue),
                  const SizedBox(height: 28),

                  // Damage Prevention Gauge
                  _sectionTitle('DAMAGE PREVENTION RATE'),
                  const SizedBox(height: 12),
                  _preventionGauge(v2x.municipalData['damage_prevented_pct'] ?? 0),

                  const SizedBox(height: 28),

                  // Road Segments Heatmap
                  _sectionTitle('ROAD SEGMENT HEALTH'),
                  const SizedBox(height: 12),
                  ...v2x.roadSegments.map((seg) => _segmentTile(seg)),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _sectionTitle(String text) {
    return Text(
      text,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: DriveOSTheme.textTertiary),
    );
  }

  Widget _roiCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: DriveOSTheme.surfaceCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1, color: DriveOSTheme.textTertiary)),
          ],
        ),
      ),
    );
  }

  Widget _statTile(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(fontSize: 13, color: Colors.white)),
          const Spacer(),
          Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }

  Widget _preventionGauge(int pct) {
    final color = pct > 60 ? DriveOSTheme.greenOk : pct > 30 ? DriveOSTheme.amberWarn : DriveOSTheme.alertRed;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('$pct%', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: color)),
              Icon(LucideIcons.trendingUp, color: color, size: 24),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct / 100,
              backgroundColor: Colors.white.withOpacity(0.06),
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Of detected hazards have been verified and flagged for municipal repair',
            style: TextStyle(fontSize: 11, color: DriveOSTheme.textTertiary),
          ),
        ],
      ),
    );
  }

  Widget _segmentTile(Map<String, dynamic> seg) {
    final healthScore = seg['health_score'] ?? 100;
    final status = seg['status'] ?? 'GOOD';
    final color = status == 'CRITICAL'
        ? DriveOSTheme.alertRed
        : status == 'FAIR'
            ? DriveOSTheme.amberWarn
            : DriveOSTheme.greenOk;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Container(
            width: 10, height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: color.withOpacity(0.4), blurRadius: 6)]),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${seg['segment_id']?.toString().toUpperCase() ?? 'SEG'}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                ),
                Text(
                  'Potholes: ${seg['pothole_count'] ?? 0} • Priority: ${seg['repair_priority'] ?? 0}',
                  style: TextStyle(fontSize: 10, color: DriveOSTheme.textTertiary),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('$healthScore', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: color)),
              Text(status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color, letterSpacing: 0.5)),
            ],
          ),
        ],
      ),
    );
  }
}
