import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../services/v2x_service.dart';
import '../models/v2x_event.dart';
import 'package:lucide_icons/lucide_icons.dart';

class SwarmScreen extends StatelessWidget {
  const SwarmScreen({Key? key}) : super(key: key);

  String _formatTimestamp(int ms) {
    final date = DateTime.fromMillisecondsSinceEpoch(ms);
    return "${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}:${date.second.toString().padLeft(2, '0')}";
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<V2XService>(
      builder: (context, v2x, _) {
        return Scaffold(
          backgroundColor: DriveOSTheme.backgroundBlack,
          body: SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Row(
                    children: [
                      Icon(LucideIcons.radio, color: DriveOSTheme.accentBlue, size: 22),
                      const SizedBox(width: 10),
                      const Text(
                        'SWARM INTELLIGENCE',
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
                          '${v2x.events.length} EVENTS',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: DriveOSTheme.accentBlue, letterSpacing: 1),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Quick Metrics
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      _metricChip('NODES', '${v2x.vehicles.length}', LucideIcons.radio, DriveOSTheme.accentBlue),
                      const SizedBox(width: 10),
                      _metricChip('FLEET HP', '${v2x.fleetVitality}', LucideIcons.heartPulse, DriveOSTheme.greenOk),
                      const SizedBox(width: 10),
                      _metricChip('HAZARDS', '${v2x.events.length}', LucideIcons.alertOctagon, DriveOSTheme.alertRed),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Fleet Vehicles
                if (v2x.vehicles.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Text('ACTIVE FLEET', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: DriveOSTheme.textTertiary)),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 80,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: v2x.vehicles.length,
                      itemBuilder: (context, index) {
                        final veh = v2x.vehicles[index];
                        final health = v2x.healthMap[veh.id];
                        return _vehicleChip(veh, health);
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Events Feed
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text('RECENT CAPTURES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: DriveOSTheme.textTertiary)),
                ),
                const SizedBox(height: 10),

                Expanded(
                  child: v2x.events.isEmpty
                      ? Center(
                          child: Text(
                            'Scanning mesh for intelligence...',
                            style: TextStyle(color: DriveOSTheme.textTertiary),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          itemCount: v2x.events.length,
                          itemBuilder: (context, index) {
                            final event = v2x.events[index];
                            return _eventTile(event);
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _metricChip(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: DriveOSTheme.surfaceCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
            Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, letterSpacing: 1, color: DriveOSTheme.textTertiary)),
          ],
        ),
      ),
    );
  }

  Widget _vehicleChip(dynamic veh, dynamic health) {
    final vitality = health?.vitalityIndex ?? 100;
    final color = vitality > 75 ? DriveOSTheme.greenOk : vitality > 45 ? DriveOSTheme.amberWarn : DriveOSTheme.alertRed;
    return Container(
      width: 130,
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(LucideIcons.car, color: DriveOSTheme.accentBlue, size: 14),
              const SizedBox(width: 6),
              Text(veh.id.toString().replaceAll('veh_', '#'),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
            ],
          ),
          Row(
            children: [
              Text('HP $vitality', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
              const Spacer(),
              Text('${veh.speed.toStringAsFixed(0)} km/h',
                style: TextStyle(fontSize: 10, color: DriveOSTheme.textTertiary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _eventTile(V2XEvent event) {
    final isPothole = event.type == 'surface_anomaly' || event.type == 'pothole';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (isPothole ? DriveOSTheme.amberWarn : DriveOSTheme.alertRed).withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isPothole ? LucideIcons.circle : LucideIcons.alertTriangle,
              color: isPothole ? DriveOSTheme.amberWarn : DriveOSTheme.alertRed,
              size: 18,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isPothole ? 'Pothole Detected' : event.type.toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Colors.white),
                ),
                const SizedBox(height: 3),
                Text(
                  '${event.latitude.toStringAsFixed(4)}, ${event.longitude.toStringAsFixed(4)}',
                  style: TextStyle(color: DriveOSTheme.textTertiary, fontSize: 11),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(_formatTimestamp(event.timestamp), style: TextStyle(color: DriveOSTheme.textTertiary, fontSize: 11)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${(event.severity * 100).toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
