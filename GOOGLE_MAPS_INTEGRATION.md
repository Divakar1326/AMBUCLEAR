# 🗺️ Google Maps Integration Guide for AMBUCLEAR

This document describes the Google Maps Platform integration added to enhance AMBUCLEAR's ambulance tracking capabilities.

---

## 🎯 New Features Added

### 1. **Real-Time Traffic Monitoring**
- Live traffic data for route calculations
- Traffic level detection (low, medium, high, severe)
- Traffic delay estimations with vs without traffic

### 2. **GPS Road Snapping**
- Corrects GPS inaccuracies by snapping to actual roads
- Improves location accuracy for ambulances and civilian vehicles
- Interpolates missing GPS points for smooth routes

### 3. **Multi-Destination ETA Calculations**
- Calculate ETA to multiple hospitals simultaneously
- Find nearest hospital with real-time traffic consideration
- Distance Matrix API for efficient calculations

### 4. **AI-Powered Traffic Instructions**
- Intelligent route guidance based on emergency level
- Voice-friendly instructions for drivers
- Supports multiple AI providers (Groq, Gemini, Ollama)

---

## 📡 New API Endpoints

### Base Path: `/api/google-maps`

All endpoints return JSON with structure:
```typescript
{
  success: boolean,
  data: any,
  error?: string
}
```

### 1. **Calculate Route with Traffic**
```
POST /api/google-maps/route
```

**Request Body:**
```json
{
  "origin": { "lat": 13.0827, "lng": 80.2707 },
  "destination": { "lat": 13.0837, "lng": 80.2703 },
  "mode": "driving"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "polyline": "encoded_polyline_string",
    "distance": "1.2 km",
    "duration": "4 mins",
    "durationInTraffic": "7 mins",
    "trafficDelay": "3 mins",
    "steps": [...],
    "rawData": {
      "distanceMeters": 1200,
      "durationSeconds": 240,
      "durationInTrafficSeconds": 420
    }
  }
}
```

**Use Cases:**
- Navigate ambulance to hospital
- Show ETA with current traffic
- Display route on map
- Alert drivers of delays

---

### 2. **Get Traffic Level**
```
POST /api/google-maps/traffic
```

**Request Body:**
```json
{
  "location": { "lat": 13.0827, "lng": 80.2707 }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "location": { "lat": 13.0827, "lng": 80.2707 },
    "trafficLevel": "high",
    "description": "Heavy traffic congestion"
  }
}
```

**Traffic Levels:**
- `low` - Smooth traffic flow
- `medium` - Moderate delays
- `high` - Heavy congestion
- `severe` - Severe traffic jams
- `unknown` - Data unavailable

---

### 3. **Snap GPS to Roads**
```
POST /api/google-maps/snap-to-roads
```

**Request Body:**
```json
{
  "points": [
    { "lat": 13.0827, "lng": 80.2707 },
    { "lat": 13.0828, "lng": 80.2708 }
  ],
  "interpolate": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "snappedPoints": [
      {
        "lat": 13.08271,
        "lng": 80.27071,
        "placeId": "ChIJ...",
        "originalIndex": 0
      }
    ],
    "originalCount": 2,
    "snappedCount": 5,
    "interpolated": true
  }
}
```

**Use Cases:**
- Correct GPS drift
- Smooth ambulance path display
- Accurate route following
- Fill GPS signal gaps

---

### 4. **Multi-Destination ETA**
```
POST /api/google-maps/eta
```

**Request Body:**
```json
{
  "origins": [{ "lat": 13.0827, "lng": 80.2707 }],
  "destinations": [
    { "lat": 13.0837, "lng": 80.2703 },
    { "lat": 13.0561, "lng": 80.2661 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "originIndex": 0,
        "destinationIndex": 0,
        "distance": "1.2 km",
        "distanceValue": 1200,
        "duration": "4 mins",
        "durationValue": 240,
        "durationInTraffic": "7 mins",
        "durationInTrafficValue": 420,
        "trafficDelay": 180,
        "status": "OK"
      }
    ],
    "originCount": 1,
    "destinationCount": 2,
    "totalCombinations": 2
  }
}
```

---

### 5. **Find Nearest Hospital**
```
POST /api/google-maps/nearest-hospital
```

**Request Body:**
```json
{
  "ambulanceLocation": { "lat": 13.0827, "lng": 80.2707 },
  "hospitals": [
    {
      "id": "hosp-1",
      "name": "Apollo Hospital",
      "lat": 13.0837,
      "lng": 80.2703
    },
    {
      "id": "hosp-2",
      "name": "CMC Hospital",
      "lat": 13.0561,
      "lng": 80.2661
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hospital": {
      "id": "hosp-1",
      "name": "Apollo Hospital",
      "lat": 13.0837,
      "lng": 80.2703,
      "distance": "1.2 km",
      "duration": "4 mins",
      "durationInTraffic": "7 mins"
    },
    "ambulanceLocation": { "lat": 13.0827, "lng": 80.2707 }
  }
}
```

---

### 6. **AI Traffic Instructions**
```
POST /api/google-maps/ai-instructions
```

**Request Body:**
```json
{
  "ambulanceLocation": { "lat": 13.0827, "lng": 80.2707 },
  "ambulanceDirection": 90,
  "emergencyLevel": "red",
  "trafficLevel": "high",
  "nearbyVehicles": [],
  "roadType": "highway",
  "lanes": 4
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "move-left",
    "instruction": "EMERGENCY: Critical ambulance approaching. Move to the LEFT lane immediately and reduce speed.",
    "urgency": "high",
    "estimatedClearTime": 10,
    "voiceInstruction": "Emergency. Critical ambulance approaching. Move to the left lane immediately and reduce speed.",
    "aiProvider": "groq"
  }
}
```

**Emergency Levels:**
- `red` - Critical/Trauma (highest priority, 2km radius)
- `yellow` - Moderate emergency (1km radius)
- `green` - Non-emergency/Available (500m radius)

**Actions:**
- `move-left` - Move to left lane
- `move-right` - Move to right lane
- `stop-and-wait` - Pull over and stop
- `maintain-speed` - Continue normal driving

---

## 🔧 Setup Instructions

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services** > **Library**
4. Enable these APIs:
   - ✅ **Maps JavaScript API**
   - ✅ **Directions API**
   - ✅ **Distance Matrix API**
   - ✅ **Roads API**
   - ✅ **Geolocation API** (optional)

5. Go to **APIs & Services** > **Credentials**
6. Click **Create Credentials** > **API Key**
7. Copy your API key
8. **IMPORTANT**: Restrict your API key:
   - Application restrictions: HTTP referrers (add your domain)
   - API restrictions: Select only enabled APIs

### Step 2: Configure Environment Variables

Create `.env.local` file (copy from `.env.local.example`):

```env
# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCVzLnp5IR0H6w_--9-U5kzWM9gnl1X9ak

# AI Service (choose one)
# Option 1: Groq (Recommended - Fast & Free)
GROQ_API_KEY=your_groq_key_here

# Option 2: Google Gemini
GEMINI_API_KEY=your_gemini_key_here

# Option 3: Ollama (Local - No API needed)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

### Step 3: Install Dependencies

The required packages are already in `package.json`:
```bash
npm install
```

Packages used:
- `@googlemaps/js-api-loader` - Google Maps JavaScript API
- Already included in AMBUCLEAR

### Step 4: Test the Integration

Start the development server:
```bash
npm run dev
```

Test API endpoints:
```bash
# Test route calculation
curl -X POST http://localhost:3000/api/google-maps/route \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":13.0827,"lng":80.2707},"destination":{"lat":13.0837,"lng":80.2703}}'

# Test traffic level
curl -X POST http://localhost:3000/api/google-maps/traffic \
  -H "Content-Type: application/json" \
  -d '{"location":{"lat":13.0827,"lng":80.2707}}'
```

---

## 🔌 Frontend Integration Examples

### Example 1: Calculate Route
```typescript
async function calculateRoute(origin: {lat: number, lng: number}, destination: {lat: number, lng: number}) {
  const response = await fetch('/api/google-maps/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination })
  });
  
  const { success, data } = await response.json();
  if (success) {
    console.log('Route:', data);
    console.log('ETA with traffic:', data.durationInTraffic);
    console.log('Traffic delay:', data.trafficDelay);
  }
}
```

### Example 2: Find Nearest Hospital
```typescript
async function findNearestHospital(ambulanceLat: number, ambulanceLng: number) {
  const hospitals = await fetchHospitalsFromAPI(); // Your existing hospital API
  
  const response = await fetch('/api/google-maps/nearest-hospital', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ambulanceLocation: { lat: ambulanceLat, lng: ambulanceLng },
      hospitals
    })
  });
  
  const { success, data } = await response.json();
  if (success) {
    console.log('Nearest hospital:', data.hospital.name);
    console.log('ETA:', data.hospital.durationInTraffic);
  }
}
```

### Example 3: Get AI Instructions
```typescript
async function getDriverInstructions(ambulanceData: any) {
  const response = await fetch('/api/google-maps/ai-instructions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ambulanceLocation: { lat: ambulanceData.lat, lng: ambulanceData.lng },
      emergencyLevel: ambulanceData.status, // 'red', 'yellow', 'green'
      trafficLevel: 'high',
      roadType: 'highway',
      lanes: 4
    })
  });
  
  const { success, data } = await response.json();
  if (success) {
    // Show instruction to driver
    alert(data.instruction);
    
    // Play voice instruction
    const speech = new SpeechSynthesisUtterance(data.voiceInstruction);
    speechSynthesis.speak(speech);
  }
}
```

---

## 💰 Cost Considerations

### Google Maps API Pricing
- **Free Tier**: $200 credit per month
- **Maps JavaScript API**: $7 per 1,000 loads
- **Directions API**: $5 per 1,000 requests
- **Distance Matrix API**: $5-10 per 1,000 elements
- **Roads API**: $10 per 1,000 requests

**Estimated Free Usage:**
- ~28,500 map loads/month
- ~40,000 direction requests/month
- ~20,000 distance matrix requests/month

### AI Service Pricing
- **Groq**: FREE (60 requests/min)
- **Google Gemini**: FREE tier (60 requests/min)
- **Ollama**: FREE (unlimited, local)

---

## 🚀 Integration with Existing AMBUCLEAR Features

### 1. Ambulance Dashboard
- Use `/api/google-maps/route` to show route to hospital
- Use `/api/google-maps/nearest-hospital` for RED status
- Display traffic delay in dashboard

### 2. Public Driver Alerts
- Use `/api/google-maps/ai-instructions` for alert messages
- Show voice instructions when ambulance approaches
- Display traffic-aware clear-path instructions

### 3. Control Room
- Use `/api/google-maps/eta` to monitor all ambulances
- Display traffic levels on dashboard
- Track ambulance progress with road-snapped coordinates

---

## 📚 Service Classes

### TrafficService (`lib/services/trafficService.ts`)
```typescript
import { TrafficService } from '@/lib/services/trafficService';

const service = new TrafficService(apiKey);

// Get directions with traffic
const route = await service.getDirectionsWithTraffic(origin, destination);

// Get traffic level
const level = await service.getTrafficLevel(location);

// Snap GPS to roads
const snapped = await service.snapToRoads(gpsPoints, true);

// Get ETA to multiple destinations
const etas = await service.getETAWithTraffic([origin], [dest1, dest2]);

// Find nearest hospital
const nearest = await service.findNearestHospital(ambulance, hospitals);
```

### AIService (`lib/services/aiService.ts`)
```typescript
import { AIService } from '@/lib/services/aiService';

const ai = new AIService({
  provider: 'groq',
  apiKey: process.env.GROQ_API_KEY
});

const instructions = await ai.analyzeTrafficAndProvideInstructions({
  emergencyLevel: 'red',
  trafficLevel: 'high',
  roadType: 'highway',
  lanes: 4
});

const voice = ai.generateVoiceInstruction(instructions.instruction);
```

---

## 🧪 Testing Checklist

- [ ] API key configured in `.env.local`
- [ ] All Google Cloud APIs enabled
- [ ] Route calculation works with traffic data
- [ ] Traffic level detection accurate
- [ ] GPS snapping corrects inaccurate locations
- [ ] Multi-destination ETA calculations
- [ ] Nearest hospital finding with traffic
- [ ] AI instructions generated correctly
- [ ] Voice instructions sound natural
- [ ] Error handling works for API failures
- [ ] Fallback to rule-based system when AI unavailable

---

## 🆘 Troubleshooting

### API Key Issues
```
Error: Google Maps API key not configured
```
**Solution**: Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local`

### API Not Enabled
```
Error: Directions API error: REQUEST_DENIED
```
**Solution**: Enable the API in Google Cloud Console

### AI Provider Errors
```
Error: Groq API key not configured
```
**Solution**: System will fallback to rule-based instructions automatically

### Rate Limiting
```
Error: OVER_QUERY_LIMIT
```
**Solution**: Monitor API usage in Google Cloud Console, consider caching responses

---

## 📞 Support

For integration help or issues:
1. Check API endpoint responses in browser DevTools
2. Verify environment variables are loaded
3. Test APIs individually with curl
4. Check Google Cloud Console for API errors
5. Review service class implementations

---

**Integration Complete!** 🎉 Your AMBUCLEAR system now has Google Maps superpowers!
