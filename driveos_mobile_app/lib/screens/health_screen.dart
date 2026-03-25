import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../services/v2x_service.dart';
import '../models/vehicle.dart';
import 'package:lucide_icons/lucide_icons.dart';

class HealthScreen extends StatelessWidget {
  const HealthScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<V2XService>(
      builder: (context, v2x, _) {
        final health = v2x.egoHealth;
        final vitality = health?.vitalityIndex ?? 100;
        final statusColor = vitality > 75
            ? DriveOSTheme.greenOk
            : vitality > 45
                ? DriveOSTheme.amberWarn
                : DriveOSTheme.alertRed;

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
                      Icon(LucideIcons.heartPulse, color: DriveOSTheme.accentBlue, size: 22),
                      const SizedBox(width: 10),
                      const Text(
                        'VEHICLE HEALTH',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: Colors.white),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: statusColor.withOpacity(0.3)),
                        ),
                        child: Text(
                          health?.status ?? 'OPTIMAL',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: statusColor, letterSpacing: 1),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Vitality Ring
                  Center(
                    child: SizedBox(
                      width: 200, height: 200,
                      child: CustomPaint(
                        painter: _VitalityRingPainter(
                          progress: vitality / 100,
                          color: statusColor,
                        ),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '$vitality',
                                style: TextStyle(fontSize: 48, fontWeight: FontWeight.w700, color: statusColor),
                              ),
                              Text(
                                'VITALITY INDEX',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.5, color: DriveOSTheme.textTertiary),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Component Bars
                  _componentBar('Suspension', health?.suspensionHealth ?? 100, LucideIcons.arrowDownUp),
                  const SizedBox(height: 14),
                  _componentBar('Brake Integrity', health?.brakeIntegrity ?? 100, LucideIcons.octagon),
                  const SizedBox(height: 14),
                  _componentBar('Tire Pressure', health?.tirePressure ?? 100, LucideIcons.circle),
                  const SizedBox(height: 28),

                  // IMU Waveform
                  _sectionTitle('IMU VIBRATION (1-D CNN Input)'),
                  const SizedBox(height: 12),
                  Container(
                    height: 100,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: DriveOSTheme.surfaceCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: CustomPaint(
                        painter: _WaveformPainter(data: health?.imuBuffer ?? []),
                        size: Size.infinite,
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Prognostics
                  _sectionTitle('AI PROGNOSTICS'),
                  const SizedBox(height: 12),
                  _prognosticTile(
                    'Last Impact Force',
                    '${health?.lastImpactG.toStringAsFixed(1) ?? "0.0"}G',
                    LucideIcons.zap,
                    (health?.lastImpactG ?? 0) > 3 ? DriveOSTheme.alertRed : DriveOSTheme.greenOk,
                  ),
                  const SizedBox(height: 10),
                  _prognosticTile(
                    'KM Since Service',
                    '${health?.kmSinceService ?? 0} km',
                    LucideIcons.gauge,
                    DriveOSTheme.accentBlue,
                  ),
                  const SizedBox(height: 10),
                  _prognosticTile(
                    'Predicted KM to Service',
                    '${health?.predictedKmToFailure ?? 15000} km',
                    LucideIcons.timer,
                    (health?.predictedKmToFailure ?? 15000) < 3000 ? DriveOSTheme.amberWarn : DriveOSTheme.greenOk,
                  ),

                  // Fleet Health Grid
                  if (v2x.healthMap.length > 1) ...[
                    const SizedBox(height: 28),
                    _sectionTitle('FLEET HEALTH'),
                    const SizedBox(height: 12),
                    ...v2x.healthMap.entries.map((e) => _fleetHealthTile(e.key, e.value)),
                  ],
                  const SizedBox(height: 24),
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

  Widget _componentBar(String label, double value, IconData icon) {
    final color = value > 75 ? DriveOSTheme.greenOk : value > 45 ? DriveOSTheme.amberWarn : DriveOSTheme.alertRed;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: value / 100,
                    backgroundColor: Colors.white.withOpacity(0.06),
                    valueColor: AlwaysStoppedAnimation(color),
                    minHeight: 5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '${value.toStringAsFixed(1)}%',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  Widget _prognosticTile(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 13, color: Colors.white)),
          ),
          Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }

  Widget _fleetHealthTile(String vehicleId, VehicleHealth health) {
    final color = health.vitalityIndex > 75
        ? DriveOSTheme.greenOk
        : health.vitalityIndex > 45
            ? DriveOSTheme.amberWarn
            : DriveOSTheme.alertRed;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Icon(LucideIcons.car, color: DriveOSTheme.accentBlue, size: 18),
          const SizedBox(width: 10),
          Text(vehicleId.toUpperCase(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: Colors.white)),
          const Spacer(),
          Text('${health.vitalityIndex}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(health.status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color, letterSpacing: 0.5)),
          ),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────
// CUSTOM PAINTERS
// ──────────────────────────────────────────────

class _VitalityRingPainter extends CustomPainter {
  final double progress;
  final Color color;
  _VitalityRingPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 12;
    final strokeWidth = 8.0;

    // Background arc
    final bgPaint = Paint()
      ..color = Colors.white.withOpacity(0.06)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -math.pi / 2, 2 * math.pi, false, bgPaint);

    // Progress arc
    final fgPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -math.pi / 2, 2 * math.pi * progress, false, fgPaint);

    // Glow
    final glowPaint = Paint()
      ..color = color.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth + 6
      ..strokeCap = StrokeCap.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -math.pi / 2, 2 * math.pi * progress, false, glowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class _WaveformPainter extends CustomPainter {
  final List<double> data;
  _WaveformPainter({required this.data});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;
    final maxVal = data.reduce(math.max).clamp(1.0, 10.0);
    final step = size.width / (data.length - 1);

    final path = Path();
    for (int i = 0; i < data.length; i++) {
      final x = i * step;
      final y = size.height - (data[i] / maxVal) * size.height * 0.85 - 4;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    final paint = Paint()
      ..color = DriveOSTheme.accentBlue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(path, paint);

    // Glow underneath
    final gradPath = Path.from(path);
    gradPath.lineTo(size.width, size.height);
    gradPath.lineTo(0, size.height);
    gradPath.close();

    final gradPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [DriveOSTheme.accentBlue.withOpacity(0.2), Colors.transparent],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawPath(gradPath, gradPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
