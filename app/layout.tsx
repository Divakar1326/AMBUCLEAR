import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMBUCLEAR - Emergency Vehicle Smart Alert System',
  description: 'Save lives through faster traffic clearance for emergency vehicles',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  return (
    <html lang="en">
      <head>
        {/* Preload Google Maps for faster loading */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />
        {/* Load Google Maps script early */}
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
          async
          defer
        ></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
