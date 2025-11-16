import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, location } = body;

    if (!query || !location) {
      return NextResponse.json(
        { success: false, error: 'Query and location are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    console.log(`🔍 Searching for any place: "${query}" near ${location.lat}, ${location.lng}`);

    // Use Google Places API Text Search for ANY type of place
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location.lat},${location.lng}&radius=50000&key=${apiKey}`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Calculate distance for each place
      const places = data.results.slice(0, 10).map((place: any) => {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        return {
          id: place.place_id,
          name: place.name,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          address: place.formatted_address || place.vicinity || '',
          distance,
          rating: place.rating,
          isOpen: place.opening_hours?.open_now,
          types: place.types || []
        };
      });

      // Sort by distance
      places.sort((a: any, b: any) => a.distance - b.distance);

      console.log(`✅ Found ${places.length} places`);

      return NextResponse.json({
        success: true,
        places,
        source: 'google_places'
      });
    }

    console.log('No places found');
    return NextResponse.json({
      success: true,
      places: [],
      source: 'google_places'
    });

  } catch (error: any) {
    console.error('Error in place search:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
