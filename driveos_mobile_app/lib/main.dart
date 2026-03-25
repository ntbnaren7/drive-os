import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/theme.dart';
import 'screens/dashboard_screen.dart';
import 'services/v2x_service.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => V2XService()),
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
      home: const DashboardScreen(),
    );
  }
}
