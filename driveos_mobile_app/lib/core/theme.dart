import 'package:flutter/material.dart';

class DriveOSTheme {
  // Brand Colors
  static const Color backgroundBlack = Color(0xFF0A0A0A);
  static const Color surfaceDark = Color(0xFF141414);
  static const Color borderSubtle = Color(0x33FFFFFF);
  static const Color accentAmber = Color(0xFFF0A500);
  static const Color alertRed = Color(0xFFFF4D4D);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA0A0A0);

  static ThemeData get aeroDark => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: backgroundBlack,
        primaryColor: accentAmber,
        colorScheme: const ColorScheme.dark(
          primary: accentAmber,
          secondary: alertRed,
          surface: surfaceDark,
          background: backgroundBlack,
        ),
        fontFamily: 'Inter',
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.5,
          ),
          iconTheme: IconThemeData(color: textPrimary),
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(color: textPrimary, fontSize: 32, fontWeight: FontWeight.bold),
          headlineMedium: TextStyle(color: textPrimary, fontSize: 24, fontWeight: FontWeight.w600),
          titleMedium: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w500),
          bodyLarge: TextStyle(color: textSecondary, fontSize: 16),
          bodyMedium: TextStyle(color: textSecondary, fontSize: 14),
        ),
        useMaterial3: true,
      );
}
