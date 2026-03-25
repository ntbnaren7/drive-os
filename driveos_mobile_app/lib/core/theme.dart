import 'package:flutter/material.dart';

class DriveOSTheme {
  // Neon-Blue Aero-Dark Palette (matching CarPlay UI)
  static const Color backgroundBlack = Color(0xFF050505);
  static const Color surfaceDark = Color(0xFF0C0E14);
  static const Color surfaceCard = Color(0xFF111318);
  static const Color borderSubtle = Color(0x18FFFFFF);
  static const Color accentBlue = Color(0xFF3A9BFF);
  static const Color accentBlueDim = Color(0x333A9BFF);
  static const Color alertRed = Color(0xFFFF453A);
  static const Color greenOk = Color(0xFF30D158);
  static const Color amberWarn = Color(0xFFFF9F0A);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0x88FFFFFF);
  static const Color textTertiary = Color(0x4DFFFFFF);

  // Legacy aliases for backward compat
  static const Color accentAmber = accentBlue;

  static ThemeData get aeroDark => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: backgroundBlack,
    primaryColor: accentBlue,
    colorScheme: const ColorScheme.dark(
      primary: accentBlue,
      secondary: alertRed,
      surface: surfaceDark,
    ),
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: textPrimary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
      ),
      iconTheme: IconThemeData(color: textPrimary),
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(color: textPrimary, fontSize: 32, fontWeight: FontWeight.bold),
      headlineMedium: TextStyle(color: textPrimary, fontSize: 22, fontWeight: FontWeight.w600),
      titleMedium: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w500),
      bodyLarge: TextStyle(color: textSecondary, fontSize: 15),
      bodyMedium: TextStyle(color: textSecondary, fontSize: 13),
      labelSmall: TextStyle(color: textTertiary, fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w600),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: surfaceDark.withOpacity(0.9),
      indicatorColor: accentBlueDim,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: accentBlue, letterSpacing: 0.5);
        }
        return const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: textTertiary, letterSpacing: 0.5);
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: accentBlue, size: 22);
        }
        return const IconThemeData(color: textTertiary, size: 22);
      }),
    ),
    useMaterial3: true,
  );
}
