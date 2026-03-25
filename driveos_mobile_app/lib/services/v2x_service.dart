import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/v2x_event.dart';
import '../models/vehicle.dart';

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

  Future<void> _initFirebase() async {
    try {
      _eventsRef = FirebaseDatabase.instance.ref('events');
      _vehiclesRef = FirebaseDatabase.instance.ref('vehicles');
      _healthRef = FirebaseDatabase.instance.ref('vehicle_health');
      
      _eventsRef!.onChildAdded.listen((event) {
        if (event.snapshot.value != null) {
          final data = Map<dynamic, dynamic>.from(event.snapshot.value as Map);
          final newEvent = V2XEvent.fromJson(event.snapshot.key!, data);
          _events.insert(0, newEvent);
          if (_events.length > 50) _events.removeLast();
          _checkProximity(newEvent);
          notifyListeners();
        }
      });

      _vehiclesRef!.onValue.listen((event) {
        if (event.snapshot.value != null) {
          final data = Map<dynamic, dynamic>.from(event.snapshot.value as Map);
          _vehicles.clear();
          data.forEach((key, value) {
            _vehicles.add(Vehicle.fromJson(key, Map<dynamic, dynamic>.from(value)));
          });
          _isConnected = true;
          notifyListeners();
        }
      });

      // Listen for vehicle health telemetry
      _healthRef!.onValue.listen((event) {
        if (event.snapshot.value != null) {
          final data = Map<dynamic, dynamic>.from(event.snapshot.value as Map);
          _healthMap.clear();
          data.forEach((key, value) {
            _healthMap[key] = VehicleHealth.fromJson(Map<dynamic, dynamic>.from(value));
          });
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
    final payload = V2XEvent(
      id: '',
      type: type,
      latitude: lat,
      longitude: lng,
      severity: severity,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      source: 'mobile_app',
    ).toJson();

    if (_eventsRef != null && _isConnected) {
      await _eventsRef!.push().set(payload);
    } else {
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
