import { NextRequest, NextResponse } from 'next/server';

// Fallback hospitals database for offline/API failure scenarios
const fallbackHospitalsDB = [
  { name: 'Apollo Hospitals Greams Road', lat: 13.0569, lng: 80.2460, address: 'Greams Road, Chennai' },
  { name: 'Fortis Malar Hospital', lat: 13.0605, lng: 80.2496, address: 'Adyar, Chennai' },
  { name: 'Rajiv Gandhi Government General Hospital', lat: 13.0837, lng: 80.2703, address: 'Park Town, Chennai' },
  { name: 'Christian Medical College', lat: 13.0561, lng: 80.2661, address: 'Vellore' },
  { name: 'Stanley Medical College Hospital', lat: 13.0958, lng: 80.2870, address: 'Old Jail Road, Chennai' },
  { name: 'Kauvery Hospital', lat: 13.0416, lng: 80.2337, address: 'Alwarpet, Chennai' },
  { name: 'MIOT International', lat: 13.0358, lng: 80.2425, address: 'Manapakkam, Chennai' },
  { name: 'Gleneagles Global Health City', lat: 13.0123, lng: 80.2165, address: 'Perumbakkam, Chennai' },
  { name: 'Government Royapettah Hospital', lat: 13.0528, lng: 80.2639, address: 'Royapettah, Chennai' },
  { name: 'Sri Ramachandra Medical Centre', lat: 13.0289, lng: 80.1877, address: 'Porur, Chennai' }
];

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

function getFallbackHospitals(query: string, location: any) {
  console.log('📦 Using fallback hospital database');
  
  const lowerQuery = query.toLowerCase();
  
  // Filter hospitals that match the search query
  const matchingHospitals = fallbackHospitalsDB
    .filter(h => h.name.toLowerCase().includes(lowerQuery))
    .map(h => ({
      id: `fallback-${h.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: h.name,
      lat: h.lat,
      lng: h.lng,
      address: h.address,
      distance: calculateDistance(location.lat, location.lng, h.lat, h.lng)
    }))
    .sort((a, b) => a.distance - b.distance);

  console.log(`✅ Found ${matchingHospitals.length} hospitals from fallback`);

  return NextResponse.json({
    success: true,
    hospitals: matchingHospitals,
    fallback: true
  });
}

export async function POST(request: NextRequest) {
  try {
    const { query, location } = await request.json();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Maps API key not configured'
      });
    }

    console.log('🔍 Searching hospitals for query:', query);

    // Use Google Places Text Search API with timeout
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' hospital Chennai')}&location=${location.lat},${location.lng}&radius=50000&type=hospital&key=${apiKey}`;
    
    console.log('Search URL:', searchUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let response;
    try {
      response = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Search request timed out');
        return NextResponse.json({
          success: false,
          error: 'Search request timed out'
        });
      }
      throw fetchError;
    }

    const data = await response.json();
    console.log('API Response status:', data.status);

    if (data.status === 'REQUEST_DENIED') {
      console.error('❌ Google Places API - REQUEST_DENIED:', data.error_message);
      // Return fallback search using existing hospital data
      return getFallbackHospitals(query, location);
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      // Try fallback search
      return getFallbackHospitals(query, location);
    }

    if (!data.results || data.results.length === 0) {
      console.log('No results found for:', query);
      // Try fallback search
      return getFallbackHospitals(query, location);
    }

    // Map results to hospital format
    const hospitals = data.results.slice(0, 10).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      address: place.formatted_address,
      rating: place.rating,
      isOpen: place.opening_hours?.open_now,
      distance: calculateDistance(
        location.lat,
        location.lng,
        place.geometry.location.lat,
        place.geometry.location.lng
      )
    }));

    // Sort by distance
    hospitals.sort((a: any, b: any) => a.distance - b.distance);

    console.log(`✅ Found ${hospitals.length} hospitals`);

    return NextResponse.json({
      success: true,
      hospitals
    });

  } catch (error) {
    console.error('Error in hospital search:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
