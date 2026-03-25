import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/glassmorphic_card.dart';
import '../widgets/radar_map.dart';
import '../core/theme.dart';
import '../services/v2x_service.dart';
import '../models/v2x_event.dart';
import 'package:lucide_icons/lucide_icons.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  StreamSubscription<V2XEvent>? _alertSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final v2x = context.read<V2XService>();
      _alertSub = v2x.hazardAlerts.listen((event) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(LucideIcons.alertTriangle, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'PROXIMITY ALERT: ${event.type.toUpperCase()} detected < 500m away!',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            backgroundColor: DriveOSTheme.alertRed,
            duration: const Duration(seconds: 4),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      });
    });
  }

  @override
  void dispose() {
    _alertSub?.cancel();
    super.dispose();
  }

  String _formatTimestamp(int ms) {
    final date = DateTime.fromMillisecondsSinceEpoch(ms);
    return "${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}:${date.second.toString().padLeft(2, '0')}";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DriveOSTheme.backgroundBlack,
      body: Consumer<V2XService>(
        builder: (context, v2x, child) {
          return Stack(
            fit: StackFit.expand,
            children: [
              // 1. FULL SCREEN BACKDROP (Live Radar Map)
              const RadarMap(),

              // 2. GRADIENT OVERLAYS (For readability at edges)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: 140,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        DriveOSTheme.backgroundBlack.withOpacity(0.9),
                        DriveOSTheme.backgroundBlack.withOpacity(0.0),
                      ],
                    ),
                  ),
                ),
              ),

              // 3. FLOATING TOP HEADER & STATUS PILL
              Positioned(
                top: MediaQuery.of(context).padding.top + 10,
                left: 20,
                right: 20,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Profile/Menu Action
                    Container(
                      decoration: BoxDecoration(
                        color: DriveOSTheme.surfaceDark.withOpacity(0.7),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: IconButton(
                        icon: const Icon(LucideIcons.menu, color: Colors.white, size: 22),
                        onPressed: () {},
                      ),
                    ),
                    
                    // Status Pill
                    ClipRRect(
                      borderRadius: BorderRadius.circular(30),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: DriveOSTheme.surfaceDark.withOpacity(0.6),
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: v2x.isConnected ? DriveOSTheme.accentAmber : DriveOSTheme.textSecondary,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: (v2x.isConnected ? DriveOSTheme.accentAmber : Colors.transparent).withOpacity(0.5),
                                      blurRadius: 8,
                                    )
                                  ]
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                v2x.isConnected ? 'MESH UPLINK LIVE' : 'SIMULATION MODE',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.2,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Layer Action
                    Container(
                      decoration: BoxDecoration(
                        color: DriveOSTheme.surfaceDark.withOpacity(0.7),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: IconButton(
                        icon: const Icon(LucideIcons.layers, color: Colors.white, size: 22),
                        onPressed: v2x.centerOnFleet,
                      ),
                    ),
                  ],
                ),
              ),

              // 4. FLOATING ACTION BUTTON (Manual Flag)
              Positioned(
                right: 20,
                bottom: 120, // Sit above the bottom sheet
                child: FloatingActionButton(
                  backgroundColor: DriveOSTheme.alertRed,
                  child: const Icon(LucideIcons.alertTriangle, color: Colors.white),
                  onPressed: () => v2x.flagHazard(11.92, 79.62, 'manual_flag', 1.0),
                ),
              ),

              // 5. DRAGGABLE BENTO SHEET (Metrics & Feed)
              DraggableScrollableSheet(
                initialChildSize: 0.28,
                minChildSize: 0.15,
                maxChildSize: 0.65,
                builder: (context, scrollController) {
                  return GlassmorphicCard(
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.all(20),
                    borderRadius: 32, // Top corners rounded
                    child: SingleChildScrollView(
                      controller: scrollController,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Handle
                          Center(
                            child: Container(
                              width: 40,
                              height: 5,
                              margin: const EdgeInsets.only(bottom: 24),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                          
                          // Quick Metrics Row (Bento Grid)
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(LucideIcons.radio, color: DriveOSTheme.accentAmber, size: 20),
                                      const SizedBox(height: 12),
                                      Text(
                                        '${v2x.vehicles.length}',
                                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                      const Text('Active Nodes', style: TextStyle(color: DriveOSTheme.textSecondary, fontSize: 12)),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(LucideIcons.alertOctagon, color: DriveOSTheme.alertRed, size: 20),
                                      const SizedBox(height: 12),
                                      Text(
                                        '${v2x.events.length}',
                                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                      const Text('Tracked Hazards', style: TextStyle(color: DriveOSTheme.textSecondary, fontSize: 12)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // Target Feed Title
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'RECENT CAPTURES',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.2,
                                  color: DriveOSTheme.textSecondary,
                                ),
                              ),
                              const Icon(LucideIcons.slidersHorizontal, color: DriveOSTheme.textSecondary, size: 16),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Captured Events List
                          if (v2x.events.isEmpty)
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.all(32.0),
                                child: Text('Scanning mesh for intelligence...', style: TextStyle(color: DriveOSTheme.textSecondary)),
                              ),
                            )
                          else
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: v2x.events.length,
                              itemBuilder: (context, index) {
                                final event = v2x.events[index];
                                final isPothole = event.type == 'surface_anomaly' || event.type == 'pothole';
                                
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12.0),
                                  padding: const EdgeInsets.all(16.0),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.03),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: isPothole ? DriveOSTheme.accentAmber.withOpacity(0.2) : DriveOSTheme.alertRed.withOpacity(0.2),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(
                                          isPothole ? LucideIcons.radio : LucideIcons.alertTriangle, 
                                          color: isPothole ? DriveOSTheme.accentAmber : DriveOSTheme.alertRed,
                                          size: 20,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              isPothole ? 'Pothole Detected' : event.type.toUpperCase(),
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${event.latitude.toStringAsFixed(4)}, ${event.longitude.toStringAsFixed(4)}',
                                              style: const TextStyle(color: DriveOSTheme.textSecondary, fontSize: 13),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            _formatTimestamp(event.timestamp),
                                            style: const TextStyle(color: DriveOSTheme.textSecondary, fontSize: 12),
                                          ),
                                          const SizedBox(height: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.white.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Text(
                                              '${(event.severity * 100).toStringAsFixed(0)}% Sev',
                                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          const SizedBox(height: 80), // Padding for the FAB
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

