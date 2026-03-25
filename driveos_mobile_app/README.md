# 📱 DriveOS Mobile Companion

[![Platform](https://img.shields.io/badge/platform-Android-green.svg)](https://flutter.dev)
[![Architecture](https://img.shields.io/badge/ui-Bento%20Grid-blue.svg)](#)

The **DriveOS Mobile Companion** is a high-performance Android application designed to extend the DriveOS V2X Mesh to the driver's pocket. It provide real-time vehicle fleet tracking, hazard synchronization, and manual anomaly reporting via a premium, Aero-Dark glassmorphic interface.

---

## ✨ Key Features

- **🛰️ V2X Fleet Tracking**: Real-time visualization of all active vehicle nodes (`veh_101`, `102`, etc.) with heading-aware navigation markers.
- **🍱 Bento-Grid Dashboard**: A structured, minimalist UI that organizes telemetry into glassmorphic tiles (connection status, hazard metrics, and live feeds).
- **🚨 Proximity Alerts**: Instant push-style notifications when a surface anomaly (pothole) is detected within 500m of the device's location.
- **🗺️ Auto-Center Mesh**: Intelligent map logic that automatically pans to the active deployment "hotzone" (SH 332 / Pakkam) upon connection.
- **🛠️ Manual Flagging**: Empowers users to report road hazards directly to the V2X mesh with a single tap.

---

## 🎨 Design Philosophy: Aero-Dark & Bento
The mobile app follows the **Aero-Dark** design language established in the CarPlay UI, optimized for handheld interaction:
- **Glassmorphism**: 60% blur / 10% opacity components with luminous borders.
- **Bento Layout**: Structured tiles for data density without visual clutter.
- **Neon Accents**: High-contrast amber for hazards and neon-blue for vehicle navigation.

---

## 🛠️ Tech Stack

- **Framework**: [Flutter](https://flutter.dev) (Dart)
- **Mapping**: [flutter_map](https://pub.dev/packages/flutter_map) (OpenStreetMap via CartoDB Dark Matter)
- **Backend**: Firebase Realtime Database
- **Iconography**: Lucide Icons
- **Theming**: Custom `DriveOSTheme` with glassmorphic extensions.

---

## 🚀 Getting Started

### Prerequisites
- Flutter SDK (Stable)
- Android Studio / VS Code
- A physical Android device with USB debugging enabled.

### Setup
1. **Initialize Dependencies**:
   ```bash
   flutter pub get
   ```
2. **Firebase Configuration**:
   - Ensure `google-services.json` is present in `android/app/`.
   - Ensure `lib/firebase_options.dart` is correctly configured for your project.
3. **Run the App**:
   ```bash
   flutter run
   ```

---

## 🛡️ Security & Privacy
Sensitive Firebase configuration files (`google-services.json`, `firebase_options.dart`) are explicitly excluded from version control to protect project credentials.
