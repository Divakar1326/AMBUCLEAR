<div align="center">

# 🚨 AMBUCLEAR
### 🏥 AI-Powered Emergency Vehicle Smart Alert System

**Clearing the Path, Saving Lives — Every Second Counts**

<p>
  <a href="#-core-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-quick-start">Quick Start</a>
</p>

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 📋 About

**AMBUCLEAR** is a cutting-edge **real-time emergency traffic assistance platform** that revolutionizes ambulance response. 

🎯 **The Problem:**  
Emergency vehicles lose critical response time stuck in traffic.

✨ **Our Solution:**  
Smart AI-powered alerts that warn nearby civilian drivers to clear the path, with live GPS tracking, automatic direction guidance (LEFT/RIGHT), and a real-time control room for emergency coordination.

---

## 🚀 Core Features

### 🚑 **Ambulance Module**
> For emergency vehicle operators
- ✅ Registration & driver profile management  
- ✅ Live GPS tracking with real-time location updates  
- ✅ Status modes: 🔴 RED (Emergency) | 🟡 YELLOW (Standby) | 🟢 GREEN (Available)  
- ✅ 🆘 Emergency SOS broadcast to nearby drivers  
- ✅ 🏥 Intelligent nearest hospital finder & route assistance  
- ✅ Real-time vehicle status synchronization

### 👥 **Public Driver Module**
> For civilian drivers on the road
- ✅ **No login required** — instant alert access  
- ✅ 🎯 Auto-detection of nearby ambulances (distance & direction)  
- ✅ 📱 Full-screen emergency alerts with priority notifications  
- ✅ 🔊 AI voice guidance: "LEFT", "RIGHT" with visual indicators  
- ✅ 🔇 Smart mute controls for temporary alert suppression  
- ✅ Haptic feedback & sound alerts for maximum awareness

### 🎮 **Control Room Module**
> For emergency operations coordinators
- ✅ 🔐 Secure operator dashboard with authentication  
- ✅ 🗺️ Live real-time map monitoring for all active ambulances  
- ✅ 🚨 SOS visibility & rapid response support system  
- ✅ 📊 Traffic-aware operational recommendations & insights  
- ✅ 📈 Live dispatch overview & response analytics  
- ✅ 🔔 Real-time notifications for critical events

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS |
| **Framework** | Next.js 14 (App Router) |
| **Database** | Firebase Firestore (Real-time NoSQL) |
| **Maps & Location** | Google Maps APIs, Geolocation |
| **Real-time** | Pusher WebSockets, Polling Fallback |
| **AI & Voice** | Groq API, Gemini API, Web Speech API |
| **Hosting** | Vercel (Serverless Functions) |

---

## ⚙️ System Logic

```
┌─────────────────────────────────────────────────┐
│         Real-Time Alert Engine                  │
├─────────────────────────────────────────────────┤
│ 📍 Distance Threshold Detection                 │
│    → Calculates nearby vehicles within range    │
│                                                 │
│ 🧭 Heading Comparison Algorithm                 │
│    → Reduces false alerts using bearing angles  │
│                                                 │
│ 🎯 Direction Decision Engine                    │
│    → Generates LEFT/RIGHT/STRAIGHT guidance     │
│                                                 │
│ 🔄 Real-Time Synchronization                    │
│    → Firebase & Pusher keep all clients in sync │
└─────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
AMBUCLEAR/
│
├── 📂 app/                          # Next.js App Router Pages & API Routes
│   ├── 📄 page.tsx                  # Landing page
│   ├── 📂 ambulance/                # Ambulance driver interface
│   │   ├── 📄 page.tsx              # Driver dashboard
│   │   └── 📂 dashboard/            # GPS tracking & alerts
│   │
│   ├── 📂 control/                  # Control room operations
│   │   └── 📄 page.tsx              # Live monitoring (password protected)
│   │
│   ├── 📂 public/                   # Public civilian interface
│   │   └── 📄 page.tsx              # Alert receiver page
│   │
│   ├── 📂 simulation/               # Demo & testing interface
│   │   └── 📄 page.tsx              # Traffic simulation
│   │
│   └── 📂 api/                      # 26+ Serverless Endpoints
│       ├── 📂 ai/                   # AI Services
│       │   ├── route.ts             # Main AI controller
│       │   ├── control-room/        # Control room AI assistance
│       │   ├── voice-route/         # Voice-to-text routing
│       │   └── route-assist/        # Route optimization
│       │
│       ├── 📂 ambulance/            # Ambulance Management
│       │   ├── register/            # Registration endpoint
│       │   ├── all/                 # Get all ambulances
│       │   ├── nearby/              # Find nearby ambulances
│       │   ├── [id]/                # Get single ambulance
│       │   ├── status/              # Update ambulance status
│       │   ├── location/            # Update GPS location
│       │   └── auth-profile/        # Driver authentication
│       │
│       ├── 📂 google-maps/          # Maps Integration
│       │   ├── route/               # Route planning
│       │   ├── eta/                 # ETA calculation
│       │   ├── traffic/             # Traffic data
│       │   ├── snap-to-roads/       # Route snapping
│       │   ├── nearest-hospital/    # Hospital finder
│       │   └── ai-instructions/     # Map AI instructions
│       │
│       ├── 📂 hospitals/            # Hospital Directory
│       │   ├── route.ts             # Get all hospitals
│       │   └── search/              # Hospital search
│       │
│       ├── 📂 sos/                  # Emergency SOS System
│       │   ├── route.ts             # Broadcast SOS
│       │   └── [id]/                # Get SOS details
│       │
│       ├── 📂 alert/                # Alert Checks
│       │   └── check/               # Validate alerts
│       │
│       └── 📂 public/               # Public Endpoints
│           ├── location/            # Public location updates
│           └── sos/                 # Public SOS alerts
│
├── 📂 components/                   # React Components
│   ├── ChennaiTrafficSimulation.tsx # Traffic simulation UI
│   ├── ChennaiTrafficSimulationV2.tsx # Enhanced simulation
│   └── TrafficMapNew.tsx            # Map component
│
├── 📂 hooks/                        # Custom React Hooks
│   └── useControlRoomTracking.ts    # Real-time tracking hook
│
├── 📂 lib/                          # Utility & Service Layer
│   ├── firebase.ts                  # Firebase initialization
│   ├── firestore.ts                 # Firestore queries
│   ├── gps.ts                       # GPS utilities
│   ├── ambulanceIdentity.ts         # ID management
│   ├── demoAmbulance.ts             # Demo data
│   ├── excel.ts                     # Excel export
│   ├── tracking.ts                  # Tracking logic
│   ├── websocket.ts                 # WebSocket utilities
│   ├── groqAI.ts                    # Groq API integration
│   ├── ai.ts                        # AI main service
│   └── 📂 services/                 # Service layer
│       ├── aiService.ts             # AI operations
│       └── trafficService.ts        # Traffic analysis
│
├── 📂 data/                         # Configuration & Demo Data
│   ├── ambuclear_data.json          # System configuration
│   └── demo_ambulance_state.json    # Test data
│
├── 📂 public/                       # Static Assets
│
├── 📄 package.json                  # Dependencies
├── 📄 tsconfig.json                 # TypeScript config
├── 📄 tailwind.config.ts            # Tailwind styling
├── 📄 next.config.js                # Next.js config
├── 📄 vercel.json                   # Vercel deployment
└── 📄 README.md                     # This file
```

---

## 🔧 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project (API keys)
- Google Maps API key

### Installation
```bash
# Clone repository
git clone https://github.com/Divakar1326/AMBUCLEAR.git
cd AMBUCLEAR

# Install dependencies
npm install

# Create .env.local and add your API keys
echo "NEXT_PUBLIC_FIREBASE_API_KEY=your_key" >> .env.local
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key" >> .env.local

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

---

## 📊 Key Statistics

- ⚡ **50+ API Endpoints** for real-time operations
- 🗺️ **Live GPS Tracking** with sub-second updates
- 🔊 **AI Voice Guidance** in multiple directions
- 🔐 **Enterprise Security** with Firebase Auth & Control Room protection
- 📱 **Mobile Optimized** responsive design
- 🚀 **Serverless Architecture** on Vercel

---

## 📚 Documentation

- **[Live Demo](https://ambuclear.vercel.app)** — Try it now
- **[GitHub Repository](https://github.com/Divakar1326/AMBUCLEAR)** — Source code

---

## 📄 License

MIT License — See LICENSE file for details

<div align="center">
  <p><strong>Made with ❤️ for Emergency Response</strong></p>
  <p>Clearing the Path. Saving Lives. 🚑</p>
</div>
