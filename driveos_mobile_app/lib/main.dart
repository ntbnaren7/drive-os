import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/theme.dart';
import 'screens/live_view_screen.dart';
import 'screens/health_screen.dart';
import 'screens/swarm_screen.dart';
import 'screens/municipal_screen.dart';
import 'screens/sensor_screen.dart';
import 'services/v2x_service.dart';
import 'services/sensor_service.dart';
import 'firebase_options.dart';
import 'package:lucide_icons/lucide_icons.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => V2XService()),
        ChangeNotifierProvider(create: (_) => SensorService()),
      ],
      child: const DriveOSMobileApp(),
    ),
  );
}

class DriveOSMobileApp extends StatelessWidget {
  const DriveOSMobileApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DriveOS',
      debugShowCheckedModeBanner: false,
      theme: DriveOSTheme.aeroDark,
      home: const AppShell(),
    );
  }
}

class AppShell extends StatefulWidget {
  const AppShell({Key? key}) : super(key: key);
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = const [
    LiveViewScreen(),
    HealthScreen(),
    MunicipalScreen(),
    SensorScreen(),
    SwarmScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: Colors.white.withOpacity(0.06), width: 0.5),
          ),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (i) => setState(() => _currentIndex = i),
          height: 72,
          destinations: const [
            NavigationDestination(
              icon: Icon(LucideIcons.map),
              selectedIcon: Icon(LucideIcons.map),
              label: 'LIVE',
            ),
            NavigationDestination(
              icon: Icon(LucideIcons.heartPulse),
              selectedIcon: Icon(LucideIcons.heartPulse),
              label: 'HEALTH',
            ),
            NavigationDestination(
              icon: Icon(LucideIcons.landmark),
              selectedIcon: Icon(LucideIcons.landmark),
              label: 'CITY',
            ),
            NavigationDestination(
              icon: Icon(LucideIcons.activity),
              selectedIcon: Icon(LucideIcons.activity),
              label: 'SENSORS',
            ),
            NavigationDestination(
              icon: Icon(LucideIcons.radio),
              selectedIcon: Icon(LucideIcons.radio),
              label: 'SWARM',
            ),
          ],
        ),
      ),
    );
  }
}
