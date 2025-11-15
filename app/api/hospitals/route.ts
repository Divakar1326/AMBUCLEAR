import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  
  if (!lat || !lng) {
    return NextResponse.json({ error: 'Location required' }, { status: 400 });
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    // Fallback: Return Chennai hospitals if API not configured
    if (!apiKey) {
      console.log('Google Maps API not configured, returning Chennai hospitals');
      return NextResponse.json({
        hospitals: getChennaiHospitals(parseFloat(lat), parseFloat(lng))
      });
    }
    
    // Try Google Places API (New) - Text Search
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
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.currentOpeningHours,places.id'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Google Places API error:', data);
      // Fallback to Chennai hospitals
      return NextResponse.json({
        hospitals: getChennaiHospitals(parseFloat(lat), parseFloat(lng))
      });
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
    
    return NextResponse.json({ hospitals: hospitals.length > 0 ? hospitals : getChennaiHospitals(parseFloat(lat), parseFloat(lng)) });
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    // Fallback to Chennai hospitals
    return NextResponse.json({
      hospitals: getChennaiHospitals(parseFloat(lat), parseFloat(lng))
    });
  }
}

// Fallback: Major Chennai hospitals
function getChennaiHospitals(userLat: number, userLng: number) {
  const hospitals = [
    {
      id: 'apollo-greams',
      name: 'Apollo Hospitals Greams Road',
      lat: 13.0569,
      lng: 80.2460,
      address: '21, Greams Lane, Off Greams Road, Chennai',
      rating: 4.3,
      isOpen: true
    },
    {
      id: 'fortis-malar',
      name: 'Fortis Malar Hospital',
      lat: 13.0605,
      lng: 80.2496,
      address: '52, 1st Main Road, Gandhi Nagar, Adyar, Chennai',
      rating: 4.2,
      isOpen: true
    },
    {
      id: 'govt-general',
      name: 'Rajiv Gandhi Government General Hospital',
      lat: 13.0837,
      lng: 80.2703,
      address: 'EVR Periyar Salai, Park Town, Chennai',
      rating: 3.9,
      isOpen: true
    },
    {
      id: 'cmch-vellore',
      name: 'CMC Hospital Chennai',
      lat: 13.0561,
      lng: 80.2661,
      address: 'Thoraipakkam, Chennai',
      rating: 4.5,
      isOpen: true
    },
    {
      id: 'stanley-medical',
      name: 'Stanley Medical College Hospital',
      lat: 13.0958,
      lng: 80.2870,
      address: 'No.1, Old Jail Road, Royapuram, Chennai',
      rating: 3.8,
      isOpen: true
    },
    {
      id: 'kauvery-hospital',
      name: 'Kauvery Hospital',
      lat: 13.0416,
      lng: 80.2337,
      address: 'Alwarpet, Chennai',
      rating: 4.4,
      isOpen: true
    }
  ];
  
  // Calculate distance and sort by proximity
  return hospitals.map(h => ({
    ...h,
    distance: calculateDistance(userLat, userLng, h.lat, h.lng)
  })).sort((a, b) => a.distance - b.distance);
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
