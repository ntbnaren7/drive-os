import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:noise_meter/noise_meter.dart';
import 'package:permission_handler/permission_handler.dart';

/// Threshold for G-force spike detection (in m/s²)
const double kGForceThreshold = 15.0;

/// Cooldown between consecutive triggers (ms)
const int kTriggerCooldownMs = 3000;

class SensorService extends ChangeNotifier {
  // Live sensor readings
  double _gForce = 0;
  double _peakG = 0;
  double _accelX = 0, _accelY = 0, _accelZ = 0;
  double _gyroX = 0, _gyroY = 0, _gyroZ = 0;
  
  // Trigger state
  bool _triggered = false;
  int _triggerCount = 0;
  int _lastTriggerTime = 0;
  
  // Calibration
  double _sensitivity = kGForceThreshold;

  // New features
  double _decibel = 0;
  
  // Stream subscriptions
  StreamSubscription? _accelSub;
  StreamSubscription? _gyroSub;
  StreamSubscription? _noiseSub;

  // Getters
  double get gForce => _gForce;
  double get peakG => _peakG;
  double get decibel => _decibel;
  double get accelX => _accelX;
  double get accelY => _accelY;
  double get accelZ => _accelZ;
  double get gyroX => _gyroX;
  double get gyroY => _gyroY;
  double get gyroZ => _gyroZ;
  bool get triggered => _triggered;
  int get triggerCount => _triggerCount;
  double get sensitivity => _sensitivity;

  // G-Force history for waveform display (last 100 samples)
  final List<double> _gHistory = List.generate(100, (_) => 0.0, growable: true);
  List<double> get gHistory => _gHistory;

  SensorService() {
    _startListening();
  }

  void setSensitivity(double val) {
    _sensitivity = val;
    notifyListeners();
  }

  void _startListening() {
    // Accelerometer (user acceleration, excludes gravity)
    _accelSub = userAccelerometerEventStream(
      samplingPeriod: const Duration(milliseconds: 20), // 50Hz
    ).listen((event) {
      _accelX = event.x;
      _accelY = event.y;
      _accelZ = event.z;
      
      // Calculate composite G-force magnitude
      _gForce = math.sqrt(event.x * event.x + event.y * event.y + event.z * event.z);
      
      // Update peak
      if (_gForce > _peakG) _peakG = _gForce;
      
      // Update history
      _gHistory.add(_gForce);
      _gHistory.removeAt(0);
      
      // Check trigger threshold with cooldown
      final now = DateTime.now().millisecondsSinceEpoch;
      if (_gForce > _sensitivity && (now - _lastTriggerTime > kTriggerCooldownMs)) {
        _triggered = true;
        _triggerCount++;
        _lastTriggerTime = now;
        
        // Push pending verification to Firebase
        _publishPendingVerification(_gForce);
        
        // Auto-reset trigger visual after 1.5s
        Future.delayed(const Duration(milliseconds: 1500), () {
          _triggered = false;
          notifyListeners();
        });
      }
      
      notifyListeners();
    });

    // Gyroscope for rotation detection
    _gyroSub = gyroscopeEventStream(
      samplingPeriod: const Duration(milliseconds: 50),
    ).listen((event) {
      _gyroX = event.x;
      _gyroY = event.y;
      _gyroZ = event.z;
    });

    // Noise Meter (Acoustic Validation)
    // Note: This requires RECORD_AUDIO permission
    () async {
      try {
        var status = await Permission.microphone.status;
        if (!status.isGranted) {
          status = await Permission.microphone.request();
        }
        if (status.isGranted) {
          final noiseMeter = NoiseMeter();
          _noiseSub = noiseMeter.noise.listen((event) {
            _decibel = event.meanDecibel;
            notifyListeners();
          }, onError: (e) {
            if (kDebugMode) print('NoiseMeter error: $e');
          });
        }
      } catch (e) {
        if (kDebugMode) print('Could not start NoiseMeter: $e');
      }
    }();
  }

  Future<void> _publishPendingVerification(double magnitude) async {
    try {
      final dbRef = FirebaseDatabase.instance.ref('pending_verifications');
      await dbRef.push().set({
        'type': 'SHAKE_TRIGGER',
        'magnitude_g': double.parse(magnitude.toStringAsFixed(2)),
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'source': 'mobile_imu',
        'status': 'PENDING_CONFIRMATION',
        'location': {
          'lat': 11.922, // Will be replaced with actual GPS in production
          'lon': 79.630,
        },
      });
    } catch (e) {
      if (kDebugMode) print('SensorService: Firebase push failed: $e');
    }
  }

  void resetPeak() {
    _peakG = 0;
    notifyListeners();
  }

  @override
  void dispose() {
    _accelSub?.cancel();
    _gyroSub?.cancel();
    _noiseSub?.cancel();
    super.dispose();
  }
}
