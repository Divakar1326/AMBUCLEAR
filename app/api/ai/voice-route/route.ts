// API endpoint for public driver voice instructions
// Calculates LEFT/RIGHT directions when ambulance approaches

import { NextRequest, NextResponse } from "next/server";
import {
  generatePublicDriverInstruction,
  type PublicDriverPosition,
  type AmbulanceData,
} from "@/lib/groqAI";
import { getAmbulances } from "@/lib/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, heading } = body;

    // Validate input
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json(
        { error: "Invalid coordinates. Lat must be -90 to 90, lng must be -180 to 180" },
        { status: 400 }
      );
    }

    const publicDriver: PublicDriverPosition = {
      lat,
      lng,
      heading: typeof heading === "number" ? heading : undefined,
    };

    // Get all ambulances
    const allAmbulances = await getAmbulances();

    // Convert to AmbulanceData format
    const ambulanceData: AmbulanceData[] = allAmbulances.map((amb) => ({
      id: amb.id,
      position: {
        lat: amb.lat || 0,
        lng: amb.lng || 0,
      },
      heading: amb.heading || 0,
      status: (amb.status?.toUpperCase() || "GREEN") as "RED" | "YELLOW" | "GREEN",
      destination: amb.destination
        ? {
            lat: amb.destination.lat,
            lng: amb.destination.lng,
          }
        : undefined,
      vehicle_no: amb.vehicle_no,
    }));

    // Filter for nearby ambulances (within 1km)
    const nearbyAmbulances = ambulanceData.filter((amb) => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (publicDriver.lat * Math.PI) / 180;
      const φ2 = (amb.position.lat * Math.PI) / 180;
      const Δφ = ((amb.position.lat - publicDriver.lat) * Math.PI) / 180;
      const Δλ = ((amb.position.lng - publicDriver.lng) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = R * c;
      return distance < 1000; // Within 1km
    });

    // Filter for active emergency ambulances (RED or YELLOW status)
    const emergencyAmbulances = nearbyAmbulances.filter(
      (amb) => amb.status === "RED" || amb.status === "YELLOW"
    );

    // Generate instruction
    const instruction = await generatePublicDriverInstruction(
      publicDriver,
      emergencyAmbulances
    );

    return NextResponse.json({
      success: true,
      instruction,
      nearby_ambulances: emergencyAmbulances.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Voice route API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate voice instruction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
