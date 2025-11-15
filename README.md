# 🚑 AMBUCLEAR - Emergency Vehicle Smart Alert System

A Next.js-based emergency vehicle alert system that saves lives by automatically notifying nearby public drivers when ambulances approach within a 500-meter radius on the same route direction.

## 🎯 Features

### For Ambulance Drivers
- **Profile Registration**: Register with name, phone, vehicle number, and hospital
- **Three Status Modes**:
  - 🔴 **Red Alert**: Emergency patient mode - sends alerts, enables navigation
  - 🟡 **Yellow**: Non-emergency mode - navigation only, no alerts
  - 🟢 **Green**: Available mode - monitor other active ambulances
- **SOS Button**: Emergency alert to all available ambulances and control room
- **GPS Auto-tracking**: Real-time location updates every 2-5 seconds
- **Hospital Navigation**: List nearby hospitals with distance

### For Public Drivers
- **No Login Required**: Anonymous alert monitoring
- **GPS Permission-Based**: Automatic alert detection
- **Full-Screen Alerts**: Visual + audio + vibration notifications
- **Smart Detection**: Alerts only if ambulance is within 500m AND on same route
- **Text-to-Speech**: Voice instructions for safe navigation
- **Temporary Disable**: Option to disable alerts for 15-60 minutes

### For Control Room
- **Password Protected**: Admin access (default: `admin123`)
- **Real-time Monitoring**: Track all active ambulances
- **SOS Management**: View and resolve emergency SOS alerts
- **Dashboard Stats**: Overview of active emergencies
- **Ambulance Details**: Complete status and location information

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes (Serverless) |
| Database | Excel (.xlsx) file storage |
| Real-time | Pusher WebSockets |
| Maps | Google Maps API |
| AI Voice | OpenAI GPT-3.5 (with fallback) |
| Deployment | Vercel |

## 📂 Project Structure

```
ev-assist/
├── app/
│   ├── page.tsx                      # Home - Role selector
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Global styles
│   ├── ambulance/
│   │   ├── page.tsx                  # Login/Register
│   │   └── dashboard/page.tsx        # Driver dashboard
│   ├── public/page.tsx               # Public driver alerts
│   ├── control/page.tsx              # Control room
│   └── api/
│       ├── ambulance/
│       │   ├── all/route.ts          # GET all ambulances
│       │   ├── register/route.ts     # POST register
│       │   ├── nearby/route.ts       # GET nearby ambulances
│       │   └── [id]/
│       │       ├── route.ts          # GET ambulance by ID
│       │       ├── location/route.ts # POST update location
│       │       └── status/route.ts   # POST update status
│       ├── public/
│       │   └── location/route.ts     # POST update public user location
│       ├── alert/
│       │   └── check/route.ts        # POST check for alerts
│       ├── sos/
│       │   ├── route.ts              # GET/POST SOS records
│       │   └── [id]/route.ts         # PUT update SOS
│       └── hospitals/route.ts        # GET hospital list
├── lib/
│   ├── excel.ts                      # Excel CRUD operations
│   ├── gps.ts                        # GPS utilities (haversine, heading)
│   ├── websocket.ts                  # Pusher WebSocket
│   └── ai.ts                         # AI voice instruction generator
├── components/
│   ├── StatusBadge.tsx               # Status indicator component
│   ├── LoadingSpinner.tsx            # Loading component
│   ├── AlertCard.tsx                 # Alert message component
│   └── Button.tsx                    # Reusable button component
├── data/
│   └── ambuclear_data.xlsx           # Excel database (auto-created)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.local                        # Environment variables
└── README.md
```

## 📊 Excel Data Schema

### Sheet 1: `ambulance_profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique ambulance ID |
| name | string | Driver name |
| phone | string | Contact number |
| vehicle_no | string | Vehicle registration |
| hospital_name | string | Associated hospital |
| status | string | red/yellow/green |
| lat | number | Latitude |
| lng | number | Longitude |
| heading | number | Direction (0-360°) |
| timestamp | string | Last update time |

### Sheet 2: `public_users`
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique user ID |
| device_id | string | Device identifier |
| lat | number | Latitude |
| lng | number | Longitude |
| heading | number | Direction (0-360°) |
| alert_disabled_until | string/null | Disable timestamp |
| timestamp | string | Last update time |

### Sheet 3: `sos`
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique SOS ID |
| ambulance_id | string | Ambulance ID |
| lat | number | Latitude |
| lng | number | Longitude |
| active | boolean | SOS status |
| timestamp | string | Creation time |

## 🧮 Alert Engine Logic

```typescript
IF ambulance.status == "red" AND
   distance(user, ambulance) <= 500m AND
   headingDifference(user, ambulance) <= 30°:
    triggerAlert(user)
ELSE:
    alertOff(user)
```

- **Distance**: Calculated using Haversine formula
- **Direction**: Bearing comparison (0-360°)
- **Threshold**: 500m radius, 30° heading difference

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ installed
- Google Maps API key
- (Optional) Pusher account for real-time features
- (Optional) OpenAI API key for AI voice instructions

### Step 1: Install Dependencies

```bash
cd ev-assist
npm install
```

### Step 2: Configure Environment Variables

Create `.env.local` file:

```env
# Google Maps API Key (Required)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# OpenAI API Key (Optional - falls back to rule-based)
OPENAI_API_KEY=your_openai_api_key

# Pusher (Optional - for real-time WebSocket)
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

# Control Room Password
CONTROL_ROOM_PASSWORD=admin123

# Alert Settings
ALERT_RADIUS_METERS=500
HEADING_DIFFERENCE_THRESHOLD=30
GPS_UPDATE_INTERVAL=3000
```

### Step 3: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 4: Build for Production

```bash
npm run build
npm start
```

## 🌐 Deployment to Vercel

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy

### Environment Variables in Vercel

Add the following in Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `OPENAI_API_KEY` (optional)
- `NEXT_PUBLIC_PUSHER_KEY` (optional)
- `PUSHER_APP_ID` (optional)
- `PUSHER_SECRET` (optional)
- `NEXT_PUBLIC_PUSHER_CLUSTER` (optional)

## 🧪 Testing the System

### Test Alert System

1. **Setup Ambulance**:
   - Go to `/ambulance`
   - Register as ambulance driver
   - Login to dashboard
   - Enable GPS permission

2. **Setup Public User**:
   - Open `/public` in another browser/device
   - Enable GPS permission
   - Keep the page open

3. **Trigger Alert**:
   - In ambulance dashboard, set status to 🔴 RED
   - Move within 500m of public user (or simulate)
   - Public user should receive full-screen alert with audio

### Simulation Script (Development)

Create a test script to simulate ambulance movement:

```typescript
// Test in browser console on public page
async function simulateAlert() {
  const response = await fetch('/api/alert/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: 13.0827,
      lng: 80.2707,
      heading: 90
    })
  });
  const data = await response.json();
  console.log('Alert check:', data);
}

simulateAlert();
```

## 📱 Usage Guide

### For Ambulance Drivers

1. **Register**: Go to `/ambulance` → Register → Fill details
2. **Login**: Use your ambulance ID to login
3. **Set Status**:
   - 🔴 RED: When carrying emergency patient
   - 🟡 YELLOW: Non-emergency transport
   - 🟢 GREEN: Available/free
4. **SOS**: Press SOS button in critical situations
5. **Navigate**: View nearby hospitals in RED mode

### For Public Drivers

1. **Open App**: Go to `/public`
2. **Enable GPS**: Allow location permission
3. **Stay Active**: Keep app running in background
4. **Receive Alerts**: Automatic notifications when ambulance approaches
5. **Take Action**: Follow voice instructions to clear the way

### For Control Room

1. **Login**: Go to `/control` → Password: `admin123`
2. **Monitor**: View all active ambulances on dashboard
3. **Track SOS**: Resolve SOS alerts when addressed
4. **Statistics**: Monitor emergency counts

## 🔒 Security Considerations

- Control room uses simple password authentication (enhance for production)
- No sensitive user data stored (only device IDs)
- GPS data not permanently stored
- Excel file should be secured in production
- Consider adding rate limiting to API routes
- Use HTTPS in production (Vercel provides by default)

## 🐛 Troubleshooting

### GPS Not Working
- Ensure HTTPS (required for geolocation API)
- Check browser permissions
- Verify device has GPS capability

### Alerts Not Triggering
- Check ambulance status is RED
- Verify both users have GPS enabled
- Ensure distance < 500m
- Check heading difference < 30°

### Excel File Errors
- Ensure write permissions on `data/` directory
- Check Excel file not open in another program
- Verify xlsx package installed correctly

## 📈 Future Enhancements

- [ ] Google Maps integration for visual tracking
- [ ] Route optimization using Directions API
- [ ] Push notifications for background alerts
- [ ] Database migration (PostgreSQL/MongoDB)
- [ ] Mobile app (React Native)
- [ ] Traffic signal integration
- [ ] Analytics dashboard
- [ ] Multi-language support

## 📄 License

MIT License - Feel free to use for emergency response systems

## 🤝 Contributing

Contributions welcome! This is a prototype for saving lives.

## 📞 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ for emergency response • Save lives by giving way to ambulances 🚑**
