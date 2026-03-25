import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/v2x_event.dart';
import '../models/vehicle.dart';
import 'encryption_service.dart';

class V2XService extends ChangeNotifier {
  final List<V2XEvent> _events = [];
  final List<Vehicle> _vehicles = [];
  final Map<String, VehicleHealth> _healthMap = {};
  bool _isConnected = false;
  DatabaseReference? _eventsRef;
  DatabaseReference? _vehiclesRef;
  DatabaseReference? _healthRef;
  
  final MapController mapController = MapController();
  
  final StreamController<V2XEvent> _alertStreamController = StreamController<V2XEvent>.broadcast();
  Stream<V2XEvent> get hazardAlerts => _alertStreamController.stream;

  List<V2XEvent> get events => _events;
  List<Vehicle> get vehicles => _vehicles;
  Map<String, VehicleHealth> get healthMap => _healthMap;
  bool get isConnected => _isConnected;

  /// Get the "ego" vehicle's health (veh_103) or first available
  VehicleHealth? get egoHealth {
    if (_healthMap.containsKey('veh_103')) return _healthMap['veh_103'];
    if (_healthMap.isNotEmpty) return _healthMap.values.first;
    return null;
  }

  /// Overall fleet vitality (average of all vehicles)
  int get fleetVitality {
    if (_healthMap.isEmpty) return 100;
    final sum = _healthMap.values.fold<int>(0, (s, h) => s + h.vitalityIndex);
    return (sum / _healthMap.length).round();
  }

  V2XService() {
    _initFirebase();
  }

  void centerOnFleet() {
    if (_vehicles.isNotEmpty) {
      mapController.move(const LatLng(11.922, 79.630), 15.0);
    } else {
      mapController.move(const LatLng(11.922, 79.630), 14.5);
    }
  }

  double _calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371e3;
    final phi1 = lat1 * math.pi / 180;
    final phi2 = lat2 * math.pi / 180;
    final deltaPhi = (lat2 - lat1) * math.pi / 180;
    final deltaLambda = (lon2 - lon1) * math.pi / 180;
    final a = math.sin(deltaPhi / 2) * math.sin(deltaPhi / 2) +
        math.cos(phi1) * math.cos(phi2) * math.sin(deltaLambda / 2) * math.sin(deltaLambda / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return R * c;
  }

  void _checkProximity(V2XEvent event) {
    final distanceMeters = _calculateDistanceMeters(11.922, 79.630, event.latitude, event.longitude);
    if (distanceMeters < 500.0) {
      _alertStreamController.add(event);
    }
  }

  Map<String, dynamic> _municipalData = {};
  List<Map<String, dynamic>> _roadSegments = [];

  DatabaseReference? _municipalRef;
  DatabaseReference? _rshiRef;

  Map<String, dynamic> get municipalData => _municipalData;
  List<Map<String, dynamic>> get roadSegments => _roadSegments;

  Future<void> _initFirebase() async {
    try {
      _eventsRef = FirebaseDatabase.instance.ref('events');
      _vehiclesRef = FirebaseDatabase.instance.ref('vehicles');
      _healthRef = FirebaseDatabase.instance.ref('vehicle_health');
      _municipalRef = FirebaseDatabase.instance.ref('municipal_dashboard/city_overview');
      _rshiRef = FirebaseDatabase.instance.ref('rshi');
      
      _eventsRef!.onChildAdded.listen((event) {
        if (event.snapshot.value != null) {
          final snapshotData = Map<dynamic, dynamic>.from(event.snapshot.value as Map);
          if (snapshotData.containsKey('e2ee_payload')) {
            final dataMap = EncryptionService.decryptPayload(snapshotData['e2ee_payload'] as String);
            if (dataMap != null) {
              final newEvent = V2XEvent.fromJson(event.snapshot.key!, dataMap);
              _events.insert(0, newEvent);
              if (_events.length > 50) _events.removeLast();
              _checkProximity(newEvent);
              notifyListeners();
            }
          }
        }
      });

      _vehiclesRef!.onValue.listen((event) {
        if (event.snapshot.value != null) {
          final wrapperData = Map<dynamic, dynamic>.from(event.snapshot.value as Map);
          _vehicles.clear();
          wrapperData.forEach((key, value) {
            final childMap = Map<dynamic, dynamic>.from(value);
            if (childMap.containsKey('e2ee_payload')) {
              final data = EncryptionService.decryptPayload(childMap['e2ee_payload'] as String);
              if (data != null) {
                _vehicles.add(Vehicle.fromJson(key, data));
              }
            }
          });
          _isConnected = true;
          notifyListeners();
        }
      });

      _healthRef!.onValue.listen((event) {
        if (event.snapshot.value != null) {
          final wrapperData = Map<dynamic, dynamic>.from(event.snapshot.value as Map);
          _healthMap.clear();
          wrapperData.forEach((key, value) {
            final childMap = Map<dynamic, dynamic>.from(value);
            if (childMap.containsKey('e2ee_payload')) {
              final data = EncryptionService.decryptPayload(childMap['e2ee_payload'] as String);
              if (data != null) {
                _healthMap[key] = VehicleHealth.fromJson(data);
              }
            }
          });
          notifyListeners();
        }
      });

      _municipalRef!.onValue.listen((event) {
        if (event.snapshot.value != null) {
          final wrapperMap = Map<dynamic, dynamic>.from(event.snapshot.value as Map);
          if (wrapperMap.containsKey('e2ee_payload')) {
            final dec = EncryptionService.decryptPayload(wrapperMap['e2ee_payload'] as String);
            if (dec != null) {
              _municipalData = dec;
              notifyListeners();
            }
          }
        }
      });

      _rshiRef!.onValue.listen((event) {
        if (event.snapshot.value != null) {
          final wrapperData = Map<dynamic, dynamic>.from(event.snapshot.value as Map);
          _roadSegments.clear();
          wrapperData.entries.forEach((e) {
            final childMap = Map<String, dynamic>.from(e.value as Map);
            if (childMap.containsKey('e2ee_payload')) {
              final data = EncryptionService.decryptPayload(childMap['e2ee_payload'] as String);
              if (data != null) {
                data['id'] = e.key;
                _roadSegments.add(data);
              }
            }
          });
          _roadSegments.sort((a, b) => (b['repair_priority'] ?? 0).compareTo(a['repair_priority'] ?? 0));
          notifyListeners();
        }
      });

    } catch (e) {
      if (kDebugMode) print("Firebase Error: $e");
      _isConnected = false;
      _startSimulatedStream();
    }
  }

  void _startSimulatedStream() {
    Timer.periodic(const Duration(seconds: 4), (timer) {
      final simEvent = V2XEvent(
        id: 'sim_${DateTime.now().millisecondsSinceEpoch}',
        type: 'surface_anomaly',
        latitude: 11.922 + (math.Random().nextDouble() * 0.005 - 0.002),
        longitude: 79.630 + (math.Random().nextDouble() * 0.005 - 0.002),
        severity: 0.8 + (math.Random().nextDouble() * 0.2),
        timestamp: DateTime.now().millisecondsSinceEpoch,
        source: 'sim_mobile_mesh',
      );
      
      _events.insert(0, simEvent);
      if (_events.length > 10) _events.removeLast();
      _checkProximity(simEvent);
      notifyListeners();
    });
  }

  Future<void> flagHazard(double lat, double lng, String type, double severity) async {
    final payload = {
      'type': type,
      'latitude': lat,
      'longitude': lng,
      'severity': severity,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'source': 'mobile_app',
    };

    if (_eventsRef != null && _isConnected) {
      final encryptedString = EncryptionService.encryptPayload(payload);
      await _eventsRef!.push().set({'e2ee_payload': encryptedString});
    } else {
      payload['id'] = 'local_echo';
      final pseudoEvent = V2XEvent.fromJson('local_echo', payload);
      _events.insert(0, pseudoEvent);
      _checkProximity(pseudoEvent);
      notifyListeners();
    }
  }
  
  @override
  void dispose() {
    _alertStreamController.close();
    super.dispose();
  }
}
