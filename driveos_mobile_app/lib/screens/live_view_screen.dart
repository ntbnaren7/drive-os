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

class LiveViewScreen extends StatefulWidget {
  const LiveViewScreen({Key? key}) : super(key: key);

  @override
  State<LiveViewScreen> createState() => _LiveViewScreenState();
}

class _LiveViewScreenState extends State<LiveViewScreen> {
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
                const Icon(LucideIcons.alertTriangle, color: Colors.white, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'PROXIMITY ALERT: ${event.type.toUpperCase()} <500m',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ),
              ],
            ),
            backgroundColor: DriveOSTheme.alertRed,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
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

  @override
  Widget build(BuildContext context) {
    return Consumer<V2XService>(
      builder: (context, v2x, child) {
        return Stack(
          fit: StackFit.expand,
          children: [
            const RadarMap(),

            // Top gradient
            Positioned(
              top: 0, left: 0, right: 0, height: 120,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      DriveOSTheme.backgroundBlack.withOpacity(0.85),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),

            // Floating top bar
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 16, right: 16,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _glassCircleButton(LucideIcons.menu, () {}),
                  _statusPill(v2x.isConnected),
                  _glassCircleButton(LucideIcons.layers, v2x.centerOnFleet),
                ],
              ),
            ),

            // Fleet vitality chip (bottom-left)
            Positioned(
              left: 16, bottom: 16,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: DriveOSTheme.surfaceDark.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.radio, color: DriveOSTheme.accentBlue, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          '${v2x.vehicles.length} NODES',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: Colors.white),
                        ),
                        const SizedBox(width: 12),
                        Container(width: 1, height: 14, color: Colors.white.withOpacity(0.1)),
                        const SizedBox(width: 12),
                        Icon(LucideIcons.alertOctagon, color: DriveOSTheme.alertRed, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          '${v2x.events.length} HAZARDS',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // FAB
            Positioned(
              right: 16, bottom: 16,
              child: FloatingActionButton.small(
                backgroundColor: DriveOSTheme.alertRed,
                child: const Icon(LucideIcons.alertTriangle, color: Colors.white, size: 20),
                onPressed: () => v2x.flagHazard(11.92, 79.62, 'manual_flag', 1.0),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _glassCircleButton(IconData icon, VoidCallback onTap) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(50),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: DriveOSTheme.surfaceDark.withOpacity(0.6),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: IconButton(
            icon: Icon(icon, color: Colors.white, size: 20),
            onPressed: onTap,
          ),
        ),
      ),
    );
  }

  Widget _statusPill(bool isConnected) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(30),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: DriveOSTheme.surfaceDark.withOpacity(0.6),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7, height: 7,
                decoration: BoxDecoration(
                  color: isConnected ? DriveOSTheme.greenOk : DriveOSTheme.textSecondary,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: (isConnected ? DriveOSTheme.greenOk : Colors.transparent).withOpacity(0.5),
                      blurRadius: 8,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                isConnected ? 'MESH LIVE' : 'SIMULATION',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
