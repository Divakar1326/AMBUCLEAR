# 🎤 Quick Start Guide - AI Voice Assistance

## ⚡ Get Started in 3 Steps

### 1️⃣ Get Your FREE Groq API Key (2 minutes)
1. Visit: **https://console.groq.com**
2. Sign up (free, no credit card)
3. Click "Create API Key"
4. Copy the key (starts with `gsk_`)

### 2️⃣ Add API Key
Open `.env.local` and replace:
```env
GROQ_API_KEY=your_groq_api_key_here
```
With your actual key:
```env
GROQ_API_KEY=gsk_your_actual_key_123456789...
```

### 3️⃣ Restart Server
```bash
# Press Ctrl+C to stop current server
npm run dev
```

**That's it! 🎉 Your AI voice system is live!**

---

## 🧪 Test It Now

### Test 1: Public Driver Voice (LEFT/RIGHT)
1. Open browser: `http://localhost:3000/public`
2. Click "Enable GPS"
3. Open another tab: `http://localhost:3000/ambulance/dashboard`
4. Login as ambulance, set status to RED
5. Move ambulance close to public driver location
6. **Hear**: "MOVE LEFT" or "MOVE RIGHT" automatically! 🔊

### Test 2: Control Room AI
1. Open: `http://localhost:3000/control`
2. Login (password: `admin123`)
3. Add some ambulances in RED mode
4. **Hear**: AI traffic clearance recommendations every 10 seconds! 🧠
5. Click "🔊 Speak" button to replay any recommendation

### Test 3: Ambulance Navigation
1. Open: `http://localhost:3000/ambulance/dashboard`
2. Set status to RED
3. Click on a hospital to select destination
4. **Hear**: Turn-by-turn voice directions! 🗺️

---

## 🎯 How It Works

### Public Drivers Get:
- **Auto-detection** of ambulances within 500m
- **Smart direction** (LEFT/RIGHT based on approach angle)
- **Urgency levels**: CRITICAL (<100m), HIGH (100-300m), MEDIUM (300-500m)
- **Auto-speak** every 2 seconds when ambulance nearby

### Control Room Gets:
- **AI analysis** of all active ambulances
- **Traffic recommendations** on which routes to clear
- **Priority ranking**: CRITICAL > HIGH > MEDIUM
- **Auto-speak** top recommendation every 10 seconds

### Ambulance Drivers Get:
- **Turn-by-turn** navigation from Google Maps
- **Voice announcements** for upcoming maneuvers
- **Real-time updates** as route changes

---

## 🔊 Voice Controls

All pages have **voice toggle buttons**:
- 🔊 **Voice ON** - Green button, voice active
- 🔇 **Voice OFF** - Gray button, voice muted

---

## ⚠️ Important Notes

1. **Browser Compatibility**: Works on Chrome, Edge, Safari, Firefox
2. **HTTPS Required**: Voice works on localhost or HTTPS sites
3. **User Interaction**: Click page once to enable audio (browser requirement)
4. **Groq Optional**: System works without Groq (uses rule-based fallback)

---

## 🐛 Troubleshooting

**No voice?**
- ✅ Check browser volume
- ✅ Click the page once
- ✅ Toggle voice ON (green button)
- ✅ Open browser console (F12) for errors

**Groq not working?**
- ✅ Verify API key in `.env.local`
- ✅ Restart dev server
- ✅ System auto-falls back to basic instructions

**Wrong directions?**
- ✅ Ensure GPS is enabled
- ✅ Check ambulances are in RED/YELLOW mode
- ✅ Verify distance < 500m

---

## 📱 Demo Scenario

**Perfect test setup**:

1. **Device 1** (Public Driver):
   - Open `/public`
   - Enable GPS
   - Keep on screen

2. **Device 2** (Ambulance):
   - Open `/ambulance/dashboard`
   - Set RED status
   - Move towards Device 1

3. **Device 3** (Control Room):
   - Open `/control`
   - Login
   - Watch AI recommendations

**Result**: Device 1 will speak "MOVE LEFT/RIGHT" automatically! 🎉

---

## 🎨 UI Features

### Public Page:
- Visual direction arrows (← → ↑)
- Urgency color coding (red/orange/yellow)
- Distance display
- Voice toggle

### Control Room:
- Gradient AI recommendation cards
- Priority badges (CRITICAL/HIGH/MEDIUM)
- Individual speak buttons
- Auto-update timer

### Ambulance Dashboard:
- Navigation voice toggle
- Route display with traffic
- Turn-by-turn instructions

---

## 🚀 You're All Set!

Your AMBUCLEAR system now has:
- ✅ Real-time voice guidance
- ✅ AI-powered recommendations
- ✅ Multi-user voice support
- ✅ Professional-grade features

**Start saving lives with AI voice assistance! 🚑💨**

---

**Need help?** Check `AI_VOICE_ASSISTANCE_COMPLETE.md` for full documentation.
