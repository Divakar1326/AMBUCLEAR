# 📚 AMBUCLEAR Documentation Index

Welcome to the AMBUCLEAR Emergency Vehicle Smart Alert System documentation!

## 🚀 Getting Started

Start here if you're new to the project:

1. **[SETUP.md](SETUP.md)** - Installation and setup guide
   - Node.js installation
   - Project setup
   - Environment configuration
   - First run instructions

2. **[QUICKSTART.md](QUICKSTART.md)** - Quick start in 5 minutes
   - Fast track installation
   - Common issues
   - Quick testing guide

## 📖 Main Documentation

3. **[README.md](README.md)** - Complete project documentation
   - Features overview
   - Tech stack
   - API documentation
   - Excel schema
   - Deployment guide
   - Full usage instructions

4. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Project deliverables
   - Complete feature checklist
   - Technical specifications
   - What's included
   - Production readiness

5. **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture
   - High-level architecture
   - Component diagrams
   - Data flow
   - Technology stack layers
   - Security architecture

## 🔧 Configuration Files

- `package.json` - Project dependencies
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `next.config.js` - Next.js configuration
- `.env.local` - Environment variables
- `vercel.json` - Deployment configuration

## 📂 Directory Structure

```
ev-assist/
├── 📄 SETUP.md              ← Start here!
├── 📄 QUICKSTART.md         ← Fast installation
├── 📄 README.md             ← Main docs
├── 📄 PROJECT_SUMMARY.md    ← What's included
├── 📄 ARCHITECTURE.md       ← Technical details
├── 📄 INDEX.md              ← This file
│
├── app/                     ← Next.js pages
│   ├── page.tsx             ← Home
│   ├── ambulance/           ← Driver module
│   ├── public/              ← Public alerts
│   ├── control/             ← Control room
│   └── api/                 ← API routes
│
├── lib/                     ← Core utilities
│   ├── excel.ts             ← Database
│   ├── gps.ts               ← GPS logic
│   ├── websocket.ts         ← Real-time
│   └── ai.ts                ← Voice AI
│
├── components/              ← UI components
├── public/                  ← Static files
└── data/                    ← Excel DB
```

## 🎯 Documentation by Task

### I want to install the project
→ Read **[SETUP.md](SETUP.md)**

### I want to understand the features
→ Read **[README.md](README.md)** - Features section

### I want to deploy to production
→ Read **[README.md](README.md)** - Deployment section

### I want to understand the code
→ Read **[ARCHITECTURE.md](ARCHITECTURE.md)**

### I want to see what's delivered
→ Read **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)**

### I want to test the system
→ Read **[QUICKSTART.md](QUICKSTART.md)** - Testing section

### I want to customize the app
→ Read **[README.md](README.md)** - Configuration section

### I want API documentation
→ Read **[README.md](README.md)** - API Routes section

## 🛠️ Code Documentation

### Core Libraries

**[lib/excel.ts](lib/excel.ts)**
- Excel database operations
- CRUD functions
- Type-safe interfaces
- Auto-initialization

**[lib/gps.ts](lib/gps.ts)**
- Haversine distance calculation
- Bearing/heading calculation
- Direction comparison
- Browser GPS integration

**[lib/websocket.ts](lib/websocket.ts)**
- Pusher WebSocket integration
- Real-time broadcasts
- Alert notifications

**[lib/ai.ts](lib/ai.ts)**
- OpenAI GPT integration
- Rule-based fallback
- Text-to-speech
- Voice instructions

### API Routes

All API routes are documented in **[README.md](README.md)** under "API Routes" section.

Key endpoints:
- `/api/ambulance/*` - Ambulance management
- `/api/public/*` - Public user tracking
- `/api/alert/*` - Alert detection
- `/api/sos/*` - Emergency alerts
- `/api/hospitals` - Hospital data

### UI Components

**[components/StatusBadge.tsx](components/StatusBadge.tsx)**
- Visual status indicator
- Red/Yellow/Green states

**[components/LoadingSpinner.tsx](components/LoadingSpinner.tsx)**
- Loading animation
- Customizable sizes

**[components/AlertCard.tsx](components/AlertCard.tsx)**
- Alert messages
- Success/Error/Warning/Info types

**[components/Button.tsx](components/Button.tsx)**
- Reusable button
- Multiple variants and sizes

## 📝 Excel Database Schema

Detailed schema documentation in **[README.md](README.md)** under "Excel Data Schema" section.

Three sheets:
1. **ambulance_profiles** - Ambulance data
2. **public_users** - Public driver tracking
3. **sos** - Emergency alerts

## 🧪 Testing

**[public/simulator.js](public/simulator.js)**
- Browser console simulator
- Automated tests
- Movement simulation
- Alert testing

Usage documented in **[QUICKSTART.md](QUICKSTART.md)**.

## 🚀 Deployment

Deployment guides:
- Vercel deployment: **[README.md](README.md)** - "Deployment to Vercel"
- Environment setup: **[SETUP.md](SETUP.md)** - Step 3
- Production checklist: **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)**

## 🔐 Security

Security documentation:
- Overview: **[README.md](README.md)** - "Security Considerations"
- Architecture: **[ARCHITECTURE.md](ARCHITECTURE.md)** - "Security Architecture"

## 🎓 Learning Resources

### External Documentation
- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

### Project-Specific
- Alert algorithm: **[ARCHITECTURE.md](ARCHITECTURE.md)** - "Alert Detection Flow"
- Data flow: **[ARCHITECTURE.md](ARCHITECTURE.md)** - "Component Flow Diagram"
- GPS logic: **[lib/gps.ts](lib/gps.ts)** - Inline comments

## 📊 Quick Reference

### Installation Commands
```bash
npm install           # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
```

### Environment Variables
See **[SETUP.md](SETUP.md)** - Step 3

### Default Credentials
- Control Room: `admin123`
- No login required for ambulance/public drivers

### Default Configuration
- Alert radius: 500 meters
- Heading threshold: 30 degrees
- GPS update interval: 3 seconds

## 🆘 Troubleshooting

Common issues and solutions:
- **[SETUP.md](SETUP.md)** - "Troubleshooting" section
- **[QUICKSTART.md](QUICKSTART.md)** - "Common Issues" section

## 📞 Support

For help:
1. Check relevant documentation file
2. Review browser console (F12)
3. Verify environment setup
4. Check Node.js installation

## ✅ Documentation Checklist

- [x] Installation guide (SETUP.md)
- [x] Quick start guide (QUICKSTART.md)
- [x] Complete documentation (README.md)
- [x] Project summary (PROJECT_SUMMARY.md)
- [x] Architecture diagrams (ARCHITECTURE.md)
- [x] Code documentation (inline comments)
- [x] API documentation (README.md)
- [x] Testing guide (QUICKSTART.md)
- [x] Deployment guide (README.md)
- [x] Troubleshooting (SETUP.md)

## 🎯 Next Steps

1. **New to the project?**
   → Start with **[SETUP.md](SETUP.md)**

2. **Want to try it quickly?**
   → Follow **[QUICKSTART.md](QUICKSTART.md)**

3. **Need full details?**
   → Read **[README.md](README.md)**

4. **Want to understand the code?**
   → Study **[ARCHITECTURE.md](ARCHITECTURE.md)**

5. **Ready to deploy?**
   → Check **[README.md](README.md)** deployment section

---

**🚑 Welcome to AMBUCLEAR - Let's save lives together! 🚑**

*Last updated: November 15, 2025*
