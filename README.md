# Zaara - Ride-Hailing Platform 🚗

Zaara is a comprehensive, modern ride-hailing solution designed for the Pakistan market. This repository contains both the **Android Application** (built with Kotlin/Java) and a **Robust Backend Server** (Node.js).

## 🌟 Features

- **Real-time Tracking**: Live GPS tracking for both riders and drivers using WebSockets.
- **Dynamic Pricing**: Intelligent fare calculation based on distance and vehicle type.
- **Multiple Vehicle Categories**: Support for Bikes, Rickshaws, Standard Cars, and Premium rides.
- **Secure Authentication**: JWT-based authentication system for users and drivers.
- **KYC Verification**: Driver onboarding flow with document verification support.
- **Earnings Dashboard**: Real-time earnings tracking for drivers.
- **Admin Panel API**: Comprehensive administrative controls for platform management.

## 📁 Project Structure

```text
├── android/            # Android Mobile Application (Kotlin)
├── server/             # Node.js Backend Server
│   ├── db/             # Database schema and seeding logic
│   ├── routes/         # API endpoints (Auth, Rider, Driver, Trips)
│   ├── services/       # Real-time WebSocket manager
│   └── middleware/     # Auth and validation middleware
└── google-services.json # Firebase configuration (Required)
```

## 🚀 Getting Started

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Android App Setup

1. Open the `android` folder in Android Studio.
2. Ensure you have your own `google-services.json` file in `android/app/`.
3. Build and run the app on an emulator or physical device.

## 🛠️ Technologies Used

- **Backend**: Node.js, Express, WebSockets (ws), JWT.
- **Mobile**: Android SDK, Firebase (FCM, Auth), Google Maps API.
- **Database**: In-memory JSON-based DB (MVP) / Ready for PostgreSQL migration.

## 🔒 Security

Sensitive information like API keys and Firebase configurations are excluded from this repository. Please provide your own `google-services.json` and set up environment variables in the `server/.env` file.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
*Developed with ❤️ for the Zaara Ride-Hailing ecosystem.*
