class Vehicle {
  final String id;
  final double latitude;
  final double longitude;
  final double heading;
  final double speed;
  final int lastSeen;
  final bool online;
  final String role;

  Vehicle({
    required this.id,
    required this.latitude,
    required this.longitude,
    required this.heading,
    required this.speed,
    required this.lastSeen,
    required this.online,
    this.role = 'unknown',
  });

  factory Vehicle.fromJson(String id, Map<dynamic, dynamic> json) {
    final location = json['location'] as Map?;
    final status = json['status'] as Map?;
    
    return Vehicle(
      id: id,
      latitude: (location?['lat'] ?? 0.0).toDouble(),
      longitude: (location?['lon'] ?? 0.0).toDouble(),
      heading: (json['heading'] ?? 0.0).toDouble(),
      speed: (json['speed'] ?? 0.0).toDouble(),
      lastSeen: json['last_seen'] ?? 0,
      online: status?['online'] ?? false,
      role: json['role'] ?? 'unknown',
    );
  }
}

class VehicleHealth {
  final double suspensionHealth;
  final double brakeIntegrity;
  final double tirePressure;
  final int vitalityIndex;
  final List<double> imuBuffer;
  final double lastImpactG;
  final int kmSinceService;
  final int predictedKmToFailure;
  final String status;

  VehicleHealth({
    required this.suspensionHealth,
    required this.brakeIntegrity,
    required this.tirePressure,
    required this.vitalityIndex,
    required this.imuBuffer,
    required this.lastImpactG,
    required this.kmSinceService,
    required this.predictedKmToFailure,
    required this.status,
  });

  factory VehicleHealth.fromJson(Map<dynamic, dynamic> json) {
    final rawBuffer = json['imu_buffer'];
    List<double> buffer = [];
    if (rawBuffer is List) {
      buffer = rawBuffer.map((e) => (e as num).toDouble()).toList();
    }
    
    return VehicleHealth(
      suspensionHealth: (json['suspension_health'] ?? 100).toDouble(),
      brakeIntegrity: (json['brake_integrity'] ?? 100).toDouble(),
      tirePressure: (json['tire_pressure'] ?? 100).toDouble(),
      vitalityIndex: (json['vitality_index'] ?? 100).toInt(),
      imuBuffer: buffer,
      lastImpactG: (json['last_impact_g'] ?? 0).toDouble(),
      kmSinceService: (json['km_since_service'] ?? 0).toInt(),
      predictedKmToFailure: (json['predicted_km_to_failure'] ?? 15000).toInt(),
      status: json['status'] ?? 'OPTIMAL',
    );
  }
}
