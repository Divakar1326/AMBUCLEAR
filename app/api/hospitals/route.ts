import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  
  if (!lat || !lng) {
    return NextResponse.json({ error: 'Location required' }, { status: 400 });
  }

  try {
    // Use Google Places API (New) - Text Search
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    const requestBody = {
      textQuery: 'hospital',
      locationBias: {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
          },
          radius: 5000.0 // 5km radius
        }
      },
      maxResultCount: 10
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey || '',
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.currentOpeningHours,places.id'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Google Places API error:', data);
      return NextResponse.json({ error: data.error?.message || 'Failed to fetch hospitals' }, { status: 500 });
    }
    
    // Transform Google Places (New) data to our format
    const hospitals = (data.places || []).map((place: any) => ({
      id: place.id,
      name: place.displayName?.text || 'Hospital',
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
      address: place.formattedAddress,
      rating: place.rating,
      isOpen: place.currentOpeningHours?.openNow,
    }));
    
    return NextResponse.json({ hospitals });
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
