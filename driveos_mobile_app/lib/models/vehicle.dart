class Vehicle {
  final String id;
  final double latitude;
  final double longitude;
  final double heading;
  final double speed;
  final int lastSeen;
  final bool online;

  Vehicle({
    required this.id,
    required this.latitude,
    required this.longitude,
    required this.heading,
    required this.speed,
    required this.lastSeen,
    required this.online,
  });

  factory Vehicle.fromJson(String id, Map<dynamic, dynamic> json) {
    // Handling nested location/status/motion objects from simulation.ts schema
    final location = json['location'] as Map?;
    final status = json['status'] as Map?;
    
    // In some syncs, motion might be separate or flat. 
    // We prioritize the simulation.ts structure
    return Vehicle(
      id: id,
      latitude: (location?['lat'] ?? 0.0).toDouble(),
      longitude: (location?['lon'] ?? 0.0).toDouble(),
      heading: (json['heading'] ?? 0.0).toDouble(), // Heading might be in root or motion
      speed: (json['speed'] ?? 0.0).toDouble(),
      lastSeen: json['last_seen'] ?? 0,
      online: status?['online'] ?? false,
    );
  }
}
