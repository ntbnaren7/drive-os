class V2XEvent {
  final String id;
  final String type;
  final double latitude;
  final double longitude;
  final double severity;
  final int timestamp;
  final String source;

  V2XEvent({
    required this.id,
    required this.type,
    required this.latitude,
    required this.longitude,
    required this.severity,
    required this.timestamp,
    required this.source,
  });

  factory V2XEvent.fromJson(String id, Map<dynamic, dynamic> json) {
    // Determine type: check nested 'detection' or fallback to root 'type'
    final detection = json['detection'] as Map?;
    final String parsedType = detection?['subtype'] ?? json['type'] ?? 'unknown';

    // Determine location: check nested 'location' or fallback to root 'lat/lng'
    final location = json['location'] as Map?;
    final double lat = (location?['lat'] ?? json['lat'] ?? 0.0).toDouble();
    final double lng = (location?['lon'] ?? json['lng'] ?? 0.0).toDouble();

    // Determine severity
    final double sev = (detection?['severity'] ?? json['severity'] ?? 0.0).toDouble();

    // Determine source
    final sData = json['source'];
    final String parsedSource = (sData is Map) ? (sData['mode'] ?? 'unknown') : (sData ?? 'mobile_app');

    return V2XEvent(
      id: id,
      type: parsedType,
      latitude: lat,
      longitude: lng,
      severity: sev,
      timestamp: json['timestamp'] ?? DateTime.now().millisecondsSinceEpoch,
      source: parsedSource,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'lat': latitude,
      'lng': longitude,
      'severity': severity,
      'timestamp': timestamp,
      'source': source,
    };
  }
}
