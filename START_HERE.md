# 🚑 AMBUCLEAR - Emergency Vehicle Smart Alert System

> **Save lives through faster traffic clearance for emergency vehicles**

A complete Next.js prototype application that automatically alerts nearby public drivers when an ambulance approaches within 500 meters on the same route direction.

---

## ⚡ Quick Links

- 📋 **[Documentation Index](INDEX.md)** - Complete documentation guide
- 🚀 **[Quick Start](QUICKSTART.md)** - Get running in 5 minutes
- 🔧 **[Setup Guide](SETUP.md)** - Detailed installation
- 📖 **[Full Documentation](README.md)** - Complete reference
- 🏗️ **[Architecture](ARCHITECTURE.md)** - Technical details
- ✅ **[Project Summary](PROJECT_SUMMARY.md)** - What's delivered

---

## ⚠️ IMPORTANT: Before You Start

**Node.js is required but NOT currently installed on your system.**

### 1. Install Node.js First

1. Download from: https://nodejs.org/
2. Install the **LTS version** (20.x recommended)
3. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

### 2. Then Install Project

```powershell
cd c:\Users\diva1\Desktop\ambulance-sim\ev-assist
npm install
npm run dev
```

**→ See [SETUP.md](SETUP.md) for detailed instructions**

---

## 🎯 What is AMBUCLEAR?

AMBUCLEAR is an emergency vehicle alert system with three user roles:

### 🚑 Ambulance Driver
- Register and login
- Set status: 🔴 Red (Emergency) | 🟡 Yellow (Non-emergency) | 🟢 Green (Available)
- Auto GPS tracking
- Navigate to hospitals
- Send SOS alerts

### 🚗 Public Driver
- No login required
- Enable GPS permission
- Receive automatic alerts when ambulance < 500m
- Full-screen emergency notification
- Audio + visual + vibration alerts

### 🎛️ Control Room
- Password protected (admin123)
- Monitor all active ambulances
- Manage SOS alerts
- Real-time dashboard

---

## 💻 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 + React 18 + TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes (Serverless) |
| Database | Excel (.xlsx) file storage |
| Real-time | Pusher WebSockets |
| Maps | Google Maps API |
| AI Voice | OpenAI GPT-3.5 |
| Deployment | Vercel |

---

## 📁 Project Structure

```
ev-assist/
├── 📄 Documentation
│   ├── INDEX.md              # Documentation index
│   ├── SETUP.md             # Installation guide
│   ├── QUICKSTART.md        # Quick start
│   ├── README.md            # Main docs
│   ├── ARCHITECTURE.md      # Technical details
│   └── PROJECT_SUMMARY.md   # Deliverables
│
├── 🎨 Application Code
│   ├── app/                 # Next.js pages & API
│   ├── lib/                 # Core utilities
│   ├── components/          # UI components
│   ├── public/              # Static files
│   └── data/                # Excel database
│
└── ⚙️ Configuration
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.js
    └── .env.local
```

---

## 🚀 Installation

### Option 1: Quick Install (Automated)

```powershell
cd ev-assist
.\install.ps1
```

### Option 2: Manual Install

```powershell
# 1. Navigate to project
cd c:\Users\diva1\Desktop\ambulance-sim\ev-assist

# 2. Install dependencies
npm install

# 3. Configure environment (optional)
# Edit .env.local with your API keys

# 4. Start development server
npm run dev

# 5. Open browser
# http://localhost:3000
```

**→ See [SETUP.md](SETUP.md) for detailed steps**

---

## 🧪 Testing

### Manual Testing
1. Go to `http://localhost:3000`
2. Test all three user roles
3. Enable GPS permissions
4. Test alert system

### Automated Testing
```javascript
// Open browser console (F12)
// Load simulator
const script = document.createElement('script');
script.src = '/simulator.js';
document.head.appendChild(script);

// Run tests
ambulanceSimulator.runAllTests();
```

**→ See [QUICKSTART.md](QUICKSTART.md) for testing guide**

---

## 📚 Documentation Guide

### For Different Audiences

**🆕 New Users**
→ Start with **[SETUP.md](SETUP.md)**

**⚡ In a Hurry**
→ Follow **[QUICKSTART.md](QUICKSTART.md)**

**👨‍💻 Developers**
→ Study **[ARCHITECTURE.md](ARCHITECTURE.md)**

**📊 Project Managers**
→ Review **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)**

**🔍 Complete Reference**
→ Read **[README.md](README.md)**

**📋 Lost?**
→ Check **[INDEX.md](INDEX.md)**

---

## 🎯 Core Features

### ✅ Alert Engine
- Haversine distance calculation
- Bearing/heading comparison
- Smart route detection
- Real-time updates

### ✅ GPS Tracking
- Auto-updates every 3 seconds
- Background monitoring
- High accuracy mode
- Browser geolocation API

### ✅ Real-time Notifications
- WebSocket broadcasts
- Full-screen alerts
- Audio text-to-speech
- Vibration feedback

### ✅ Excel Database
- Three data sheets
- Auto-initialization
- Type-safe operations
- CRUD functions

### ✅ AI Voice Instructions
- OpenAI GPT integration
- Rule-based fallback
- Context-aware messages
- Multiple languages support

---

## 🌐 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

Your app will be live at a `.vercel.app` URL!

**→ See [README.md](README.md) for deployment details**

---

## 📊 System Architecture

```
┌─────────────────────────────────────────┐
│         AMBUCLEAR SYSTEM                │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
  Ambulance    Public     Control
   Driver      Driver      Room
      │           │           │
      └───────────┴───────────┘
                  │
            Next.js App
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
   Excel DB    Pusher      OpenAI
             WebSocket       API
```

**→ See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams**

---

## 🔐 Default Configuration

| Setting | Value |
|---------|-------|
| Alert Radius | 500 meters |
| Heading Threshold | 30 degrees |
| GPS Update | 3 seconds |
| Control Password | admin123 |
| Dev Server Port | 3000 |

**→ Configure in `.env.local`**

---

## 🆘 Troubleshooting

### Common Issues

**"node is not recognized"**
→ Install Node.js from nodejs.org

**"npm install fails"**
→ Check internet connection, try as Administrator

**"Port 3000 in use"**
→ `npx kill-port 3000`

**"GPS not working"**
→ Use HTTPS or localhost, grant permissions

**→ See [SETUP.md](SETUP.md) for full troubleshooting**

---

## 📈 What's Included

✅ Complete Next.js application
✅ Three user role interfaces
✅ Excel database with auto-init
✅ GPS utilities (Haversine, bearing)
✅ Alert detection engine
✅ Real-time WebSocket
✅ AI voice instructions
✅ Responsive UI (Tailwind)
✅ API documentation
✅ Test simulation tools
✅ Deployment configuration
✅ Comprehensive documentation

**→ See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for complete checklist**

---

## 📖 API Documentation

All API routes documented in **[README.md](README.md)**

Key endpoints:
- `POST /api/ambulance/register`
- `POST /api/ambulance/[id]/location`
- `POST /api/ambulance/[id]/status`
- `POST /api/alert/check`
- `POST /api/sos`

---

## 🎓 Learning Resources

- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

---

## ✨ Future Enhancements

- [ ] Google Maps visual tracking
- [ ] Push notifications
- [ ] PostgreSQL database
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Traffic signal integration
- [ ] Analytics dashboard

---

## 📞 Support

**Need help?**
1. Check **[INDEX.md](INDEX.md)** for documentation
2. Review **[SETUP.md](SETUP.md)** for installation
3. Read **[QUICKSTART.md](QUICKSTART.md)** for quick fixes

---

## ✅ Quick Checklist

Before you start:
- [ ] Node.js 18+ installed
- [ ] npm working
- [ ] Project cloned/downloaded
- [ ] PowerShell ready

To run the app:
- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (`.env.local`)
- [ ] Dev server running (`npm run dev`)
- [ ] Browser at localhost:3000

To test:
- [ ] All three roles accessible
- [ ] GPS permission granted
- [ ] Alert system working

---

## 🎉 Ready to Start?

### 1️⃣ Install Node.js
Download from: https://nodejs.org/

### 2️⃣ Follow Setup Guide
Read: **[SETUP.md](SETUP.md)**

### 3️⃣ Run the Application
```powershell
cd ev-assist
npm install
npm run dev
```

### 4️⃣ Test the System
Open: http://localhost:3000

---

## 📝 License

MIT License - Free for emergency response systems

---

## 🚑 Mission

**Save lives by giving way to ambulances!**

Every second counts in medical emergencies. AMBUCLEAR helps clear traffic faster, potentially saving countless lives.

---

**Built with ❤️ for emergency response • Powered by Next.js • Deployed on Vercel**

*Project created: November 15, 2025*
*Version: 1.0.0*

---

### 📋 Documentation Files

| File | Purpose |
|------|---------|
| [INDEX.md](INDEX.md) | Documentation index & guide |
| [SETUP.md](SETUP.md) | Installation instructions |
| [QUICKSTART.md](QUICKSTART.md) | 5-minute quick start |
| [README.md](README.md) | Complete documentation |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Deliverables checklist |

**Start with [INDEX.md](INDEX.md) for a complete documentation guide!**
