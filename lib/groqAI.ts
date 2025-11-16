// Groq AI Voice Assistance System
// Provides intelligent LEFT/RIGHT directions for public drivers and traffic clearance recommendations for control room

import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
  dangerouslyAllowBrowser: true, // For client-side usage if needed
});

// Types
export interface Position {
  lat: number;
  lng: number;
}

export interface AmbulanceData {
  id: string;
  position: Position;
  heading: number;
  status: "RED" | "YELLOW" | "GREEN";
  destination?: Position;
  vehicle_no?: string;
}

export interface PublicDriverPosition extends Position {
  heading?: number;
}

export type UrgencyLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface VoiceInstruction {
  direction: "LEFT" | "RIGHT" | "CLEAR_AHEAD" | "STAY_PUT";
  urgency: UrgencyLevel;
  message: string;
  distance: number;
}

export interface TrafficRecommendation {
  route: string;
  action: string;
  reason: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  ambulance_ids: string[];
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(pos1: Position, pos2: Position): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (pos1.lat * Math.PI) / 180;
  const φ2 = (pos2.lat * Math.PI) / 180;
  const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Calculate bearing from point1 to point2
function calculateBearing(from: Position, to: Position): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360; // Normalize to 0-360
}

// Determine urgency level based on distance
function getUrgencyLevel(distance: number): UrgencyLevel {
  if (distance < 100) return "CRITICAL";
  if (distance < 300) return "HIGH";
  if (distance < 500) return "MEDIUM";
  return "LOW";
}

// Calculate which direction (LEFT or RIGHT) the public driver should move
export function calculateMoveDirection(
  publicDriver: PublicDriverPosition,
  ambulance: AmbulanceData
): VoiceInstruction {
  const distance = calculateDistance(publicDriver, ambulance.position);
  const urgency = getUrgencyLevel(distance);

  // If ambulance is far, no action needed
  if (distance > 500) {
    return {
      direction: "STAY_PUT",
      urgency: "LOW",
      message: "No ambulance nearby",
      distance,
    };
  }

  // Calculate the bearing from ambulance to public driver
  const bearingToDriver = calculateBearing(ambulance.position, publicDriver);

  // Calculate relative angle (difference between ambulance heading and bearing to driver)
  let relativeAngle = bearingToDriver - ambulance.heading;

  // Normalize to -180 to 180 range
  while (relativeAngle > 180) relativeAngle -= 360;
  while (relativeAngle < -180) relativeAngle += 360;

  // Determine direction based on relative angle
  let direction: "LEFT" | "RIGHT" | "CLEAR_AHEAD";
  if (Math.abs(relativeAngle) < 30) {
    // Driver is directly ahead
    direction = "CLEAR_AHEAD";
  } else if (relativeAngle > 0) {
    // Driver is on the right side of ambulance
    direction = "RIGHT";
  } else {
    // Driver is on the left side of ambulance
    direction = "LEFT";
  }

  // Generate message based on urgency and direction
  let message = "";
  if (direction === "CLEAR_AHEAD") {
    if (urgency === "CRITICAL") {
      message = `EMERGENCY! Ambulance ${Math.round(distance)}m behind you! Move to the side immediately!`;
    } else if (urgency === "HIGH") {
      message = `Ambulance approaching ${Math.round(distance)}m away! Please clear the path!`;
    } else {
      message = `Ambulance ${Math.round(distance)}m behind you. Prepare to move aside.`;
    }
  } else {
    if (urgency === "CRITICAL") {
      message = `EMERGENCY! Move ${direction} NOW! Ambulance ${Math.round(distance)}m away!`;
    } else if (urgency === "HIGH") {
      message = `Move ${direction}! Ambulance approaching ${Math.round(distance)}m away!`;
    } else {
      message = `Please move ${direction}. Ambulance ${Math.round(distance)}m away.`;
    }
  }

  return {
    direction,
    urgency,
    message,
    distance,
  };
}

// Generate intelligent public driver instructions using Groq AI
export async function generatePublicDriverInstruction(
  publicDriver: PublicDriverPosition,
  nearbyAmbulances: AmbulanceData[]
): Promise<VoiceInstruction> {
  // First, do basic calculation
  if (nearbyAmbulances.length === 0) {
    return {
      direction: "STAY_PUT",
      urgency: "LOW",
      message: "No ambulances nearby. Drive normally.",
      distance: Infinity,
    };
  }

  // Find the closest ambulance
  const closestAmbulance = nearbyAmbulances.reduce((closest, amb) => {
    const dist = calculateDistance(publicDriver, amb.position);
    const closestDist = calculateDistance(publicDriver, closest.position);
    return dist < closestDist ? amb : closest;
  });

  // Get basic direction calculation
  const basicInstruction = calculateMoveDirection(publicDriver, closestAmbulance);

  // If Groq API is not configured, return basic instruction
  if (!process.env.GROQ_API_KEY) {
    return basicInstruction;
  }

  try {
    // Use Groq AI for enhanced context-aware instructions
    const prompt = `You are an emergency vehicle traffic assistant. An ambulance is approaching a public driver.

Ambulance Details:
- Position: ${closestAmbulance.position.lat}, ${closestAmbulance.position.lng}
- Heading: ${closestAmbulance.heading}° (compass direction)
- Status: ${closestAmbulance.status}
- Distance to driver: ${Math.round(basicInstruction.distance)}m

Driver Position: ${publicDriver.lat}, ${publicDriver.lng}

Basic calculation suggests moving: ${basicInstruction.direction}

Provide a clear, concise voice instruction (max 15 words) for the driver. Consider:
1. Urgency based on distance
2. Direction to move (LEFT, RIGHT, or CLEAR_AHEAD)
3. Clear, actionable language

Respond with ONLY the instruction text, nothing else.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "mixtral-8x7b-32768", // Fast, accurate model
      temperature: 0.3,
      max_tokens: 50,
    });

    const aiMessage = completion.choices[0]?.message?.content?.trim();

    if (aiMessage) {
      return {
        ...basicInstruction,
        message: aiMessage,
      };
    }

    return basicInstruction;
  } catch (error) {
    console.error("Groq AI error:", error);
    // Fallback to basic instruction
    return basicInstruction;
  }
}

// Get traffic clearance recommendations for control room using Groq AI
export async function getControlRoomRecommendations(
  ambulances: AmbulanceData[],
  sosAlerts: any[]
): Promise<TrafficRecommendation[]> {
  // Filter active emergency ambulances (RED status or with SOS)
  const emergencyAmbulances = ambulances.filter(
    (amb) => amb.status === "RED" || sosAlerts.some((sos) => sos.ambulance_id === amb.id)
  );

  if (emergencyAmbulances.length === 0) {
    return [];
  }

  // If Groq API not configured, return basic recommendations
  if (!process.env.GROQ_API_KEY) {
    return emergencyAmbulances.map((amb) => ({
      route: amb.destination
        ? `Route to ${amb.destination.lat.toFixed(4)}, ${amb.destination.lng.toFixed(4)}`
        : "Unknown route",
      action: "Clear traffic on main route",
      reason: `${amb.status} status ambulance needs clear path`,
      priority: amb.status === "RED" ? "CRITICAL" : "HIGH",
      ambulance_ids: [amb.id],
    }));
  }

  try {
    const prompt = `You are a traffic control AI assistant managing emergency vehicle routes.

Current Situation:
${emergencyAmbulances
  .map(
    (amb, i) => `
Ambulance ${i + 1} (${amb.vehicle_no || amb.id}):
- Status: ${amb.status}
- Position: ${amb.position.lat}, ${amb.position.lng}
- Heading: ${amb.heading}°
- Has Destination: ${amb.destination ? "Yes" : "No"}
${amb.destination ? `- Destination: ${amb.destination.lat}, ${amb.destination.lng}` : ""}
`
  )
  .join("\n")}

Active SOS Alerts: ${sosAlerts.length}

Provide 3-5 traffic clearance recommendations. For each recommendation:
1. Which route/intersection to clear
2. What action to take (e.g., "Deploy traffic police at Junction X")
3. Why this is important
4. Priority level (CRITICAL/HIGH/MEDIUM)

Format each recommendation as JSON:
{
  "route": "specific location/route",
  "action": "specific action to take",
  "reason": "why this matters",
  "priority": "CRITICAL/HIGH/MEDIUM"
}

Respond with ONLY a JSON array of recommendations, nothing else.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "mixtral-8x7b-32768",
      temperature: 0.4,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content?.trim();

    if (aiResponse) {
      try {
        // Try to parse JSON response
        const recommendations = JSON.parse(aiResponse);
        
        // Add ambulance IDs to each recommendation
        return recommendations.map((rec: any) => ({
          ...rec,
          ambulance_ids: emergencyAmbulances.map((amb) => amb.id),
        }));
      } catch (parseError) {
        console.error("Failed to parse Groq response:", parseError);
      }
    }
  } catch (error) {
    console.error("Groq AI error:", error);
  }

  // Fallback to basic recommendations
  return emergencyAmbulances.map((amb) => ({
    route: amb.destination
      ? `Route to ${amb.destination.lat.toFixed(4)}, ${amb.destination.lng.toFixed(4)}`
      : "Current ambulance route",
    action: "Clear traffic and ensure path is open",
    reason: `${amb.status} status ambulance requires immediate clearance`,
    priority: amb.status === "RED" ? ("CRITICAL" as const) : ("HIGH" as const),
    ambulance_ids: [amb.id],
  }));
}

// Browser-side speech synthesis function
export function speakInstruction(instruction: VoiceInstruction): void {
  if (!window.speechSynthesis) {
    console.warn("Speech synthesis not supported");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(instruction.message);

  // Adjust voice parameters based on urgency
  switch (instruction.urgency) {
    case "CRITICAL":
      utterance.rate = 1.3; // Faster
      utterance.pitch = 1.2; // Higher pitch
      utterance.volume = 1.0; // Maximum volume
      break;
    case "HIGH":
      utterance.rate = 1.1;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;
      break;
    case "MEDIUM":
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      break;
    default:
      utterance.rate = 0.9;
      utterance.pitch = 0.9;
      utterance.volume = 0.7;
  }

  window.speechSynthesis.speak(utterance);
}

// Speak control room recommendations
export function speakControlRoomRecommendation(recommendation: TrafficRecommendation): void {
  if (!window.speechSynthesis) {
    console.warn("Speech synthesis not supported");
    return;
  }

  window.speechSynthesis.cancel();

  const message = `${recommendation.priority} priority: ${recommendation.action}. ${recommendation.reason}`;
  const utterance = new SpeechSynthesisUtterance(message);

  utterance.rate = recommendation.priority === "CRITICAL" ? 1.2 : 1.0;
  utterance.pitch = recommendation.priority === "CRITICAL" ? 1.1 : 1.0;
  utterance.volume = 0.9;

  window.speechSynthesis.speak(utterance);
}
