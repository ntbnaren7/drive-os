import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../services/v2x_service.dart';
import '../core/theme.dart';
import 'package:lucide_icons/lucide_icons.dart';

class RadarMap extends StatefulWidget {
  const RadarMap({Key? key}) : super(key: key);

  @override
  State<RadarMap> createState() => _RadarMapState();
}

class _RadarMapState extends State<RadarMap> {
  bool _hasInitialFocus = false;

  @override
  Widget build(BuildContext context) {
    return Consumer<V2XService>(
      builder: (context, v2x, child) {
        // Auto-Center on Pakkam/ECR zone once
        if (!_hasInitialFocus && v2x.isConnected) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            v2x.centerOnFleet();
          });
          _hasInitialFocus = true;
        }

        // 1. Hazard Markers (Potholes)
        List<Marker> hazardMarkers = v2x.events.map((event) {
          final bool isManual = event.type == 'manual_flag';
          final double size = isManual ? 42.0 : 34.0;
          
          return Marker(
            point: LatLng(event.latitude, event.longitude),
            width: size,
            height: size,
            child: Icon(
              isManual ? LucideIcons.alertTriangle : LucideIcons.circle,
              color: isManual ? DriveOSTheme.alertRed : DriveOSTheme.accentAmber.withOpacity(0.8),
              size: size * 0.7,
            ),
          );
        }).toList();

        // 2. Vehicle Markers (Live Fleet)
        List<Marker> vehicleMarkers = v2x.vehicles.map((veh) {
          return Marker(
            point: LatLng(veh.latitude, veh.longitude),
            width: 40,
            height: 40,
            child: Transform.rotate(
              angle: (veh.heading * (math.pi / 180)),
              child: const Icon(
                LucideIcons.navigation,
                color: Colors.blueAccent,
                size: 28,
              ),
            ),
          );
        }).toList();

        return ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: FlutterMap(
            mapController: v2x.mapController,
            options: const MapOptions(
              initialCenter: LatLng(11.922, 79.630), 
              initialZoom: 14.5,
              interactionOptions: InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.driveos.driveos_mobile_app',
              ),
              MarkerLayer(markers: hazardMarkers),
              MarkerLayer(markers: vehicleMarkers),
            ],
          ),
        );
      },
    );
  }
}


