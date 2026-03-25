import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../services/sensor_service.dart';
import 'package:lucide_icons/lucide_icons.dart';

class SensorScreen extends StatelessWidget {
  const SensorScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<SensorService>(
      builder: (context, sensor, _) {
        final isTriggered = sensor.triggered;
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
                      Icon(LucideIcons.activity, color: DriveOSTheme.accentBlue, size: 22),
                      const SizedBox(width: 10),
                      const Text(
                        'MULTI-MODAL SENSORS',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Live G-Force Display
                  Center(
                    child: Container(
                      width: 180, height: 180,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: DriveOSTheme.surfaceCard,
                        border: Border.all(
                          color: isTriggered ? DriveOSTheme.alertRed : Colors.white.withOpacity(0.06),
                          width: isTriggered ? 2 : 1,
                        ),
                        boxShadow: isTriggered
                            ? [BoxShadow(color: DriveOSTheme.alertRed.withOpacity(0.3), blurRadius: 30)]
                            : [],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            sensor.gForce.toStringAsFixed(1),
                            style: TextStyle(
                              fontSize: 44,
                              fontWeight: FontWeight.w700,
                              color: isTriggered ? DriveOSTheme.alertRed : Colors.white,
                            ),
                          ),
                          Text(
                            'm/s²',
                            style: TextStyle(fontSize: 12, color: DriveOSTheme.textTertiary),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isTriggered ? '⚡ IMPACT DETECTED' : 'G-FORCE',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.2,
                              color: isTriggered ? DriveOSTheme.alertRed : DriveOSTheme.textTertiary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // G-Force Waveform
                  _sectionTitle('VIBRATION WAVEFORM'),
                  const SizedBox(height: 10),
                  Container(
                    height: 80,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: DriveOSTheme.surfaceCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: CustomPaint(
                        painter: _GWaveformPainter(data: sensor.gHistory, threshold: sensor.sensitivity),
                        size: Size.infinite,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Axis Breakdown
                  _sectionTitle('ACCELEROMETER AXES'),
                  const SizedBox(height: 10),
                  _axisTile('X', sensor.accelX, Colors.redAccent),
                  const SizedBox(height: 8),
                  _axisTile('Y', sensor.accelY, Colors.greenAccent),
                  const SizedBox(height: 8),
                  _axisTile('Z', sensor.accelZ, Colors.blueAccent),
                  const SizedBox(height: 24),

                  // Gyroscope
                  _sectionTitle('GYROSCOPE'),
                  const SizedBox(height: 10),
                  _axisTile('Pitch', sensor.gyroX, Colors.purpleAccent),
                  const SizedBox(height: 8),
                  _axisTile('Roll', sensor.gyroY, Colors.orangeAccent),
                  const SizedBox(height: 8),
                  _axisTile('Yaw', sensor.gyroZ, Colors.cyanAccent),
                  const SizedBox(height: 24),

                  // Stats
                  _sectionTitle('TRIGGER STATS'),
                  const SizedBox(height: 10),
                  _statRow('Peak G-Force', '${sensor.peakG.toStringAsFixed(2)} m/s²', DriveOSTheme.alertRed),
                  const SizedBox(height: 8),
                  _statRow('Sound Level', '${sensor.decibel.toStringAsFixed(1)} dB', sensor.decibel > 80 ? DriveOSTheme.alertRed : DriveOSTheme.accentBlue),
                  const SizedBox(height: 8),
                  _statRow('Total Triggers', '${sensor.triggerCount}', DriveOSTheme.amberWarn),
                  const SizedBox(height: 24),

                  // Sensitivity Slider
                  _sectionTitle('TRIGGER SENSITIVITY'),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: DriveOSTheme.surfaceCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Threshold', style: TextStyle(fontSize: 13, color: Colors.white)),
                            Text('${sensor.sensitivity.toStringAsFixed(1)} m/s²',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: DriveOSTheme.accentBlue)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        SliderTheme(
                          data: SliderTheme.of(context).copyWith(
                            activeTrackColor: DriveOSTheme.accentBlue,
                            inactiveTrackColor: Colors.white.withOpacity(0.06),
                            thumbColor: DriveOSTheme.accentBlue,
                            overlayColor: DriveOSTheme.accentBlue.withOpacity(0.1),
                          ),
                          child: Slider(
                            value: sensor.sensitivity,
                            min: 5.0,
                            max: 35.0,
                            onChanged: (v) => sensor.setSensitivity(v),
                          ),
                        ),
                        Text(
                          'Lower = more sensitive (more triggers). Higher = only severe impacts.',
                          style: TextStyle(fontSize: 10, color: DriveOSTheme.textTertiary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Reset Peak button
                  Center(
                    child: TextButton.icon(
                      onPressed: sensor.resetPeak,
                      icon: Icon(LucideIcons.rotateCcw, color: DriveOSTheme.accentBlue, size: 16),
                      label: Text('RESET PEAK', style: TextStyle(color: DriveOSTheme.accentBlue, fontWeight: FontWeight.w700, letterSpacing: 1, fontSize: 12)),
                    ),
                  ),
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

  Widget _axisTile(String axis, double value, Color color) {
    final absVal = value.abs().clamp(0.0, 20.0);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Row(
        children: [
          Text(axis, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(width: 14),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: absVal / 20,
                backgroundColor: Colors.white.withOpacity(0.06),
                valueColor: AlwaysStoppedAnimation(color.withOpacity(0.6)),
                minHeight: 4,
              ),
            ),
          ),
          const SizedBox(width: 14),
          SizedBox(
            width: 60,
            child: Text(
              value.toStringAsFixed(2),
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white, fontFamily: 'monospace'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statRow(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: DriveOSTheme.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Row(
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Colors.white)),
          const Spacer(),
          Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────
// G-FORCE WAVEFORM PAINTER
// ──────────────────────────────────────────────
class _GWaveformPainter extends CustomPainter {
  final List<double> data;
  final double threshold;
  _GWaveformPainter({required this.data, required this.threshold});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;
    final maxVal = math.max(data.reduce(math.max), threshold * 1.2).clamp(5.0, 40.0);
    final step = size.width / (data.length - 1);

    // Threshold line
    final threshY = size.height - (threshold / maxVal) * size.height * 0.9;
    final threshPaint = Paint()
      ..color = Colors.redAccent.withOpacity(0.3)
      ..strokeWidth = 1;
    canvas.drawLine(Offset(0, threshY), Offset(size.width, threshY), threshPaint);

    // Waveform
    final path = Path();
    for (int i = 0; i < data.length; i++) {
      final x = i * step;
      final y = size.height - (data[i] / maxVal) * size.height * 0.9 - 2;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    final paint = Paint()
      ..color = DriveOSTheme.accentBlue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawPath(path, paint);

    // Fill gradient
    final gradPath = Path.from(path);
    gradPath.lineTo(size.width, size.height);
    gradPath.lineTo(0, size.height);
    gradPath.close();
    final gradPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [DriveOSTheme.accentBlue.withOpacity(0.15), Colors.transparent],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawPath(gradPath, gradPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
