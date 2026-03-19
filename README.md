<div align="center">

# AMBUCLEAR
### AI-Powered Emergency Vehicle Smart Alert System

[Live Demo](#) | [GitHub Repository](#) | [Documentation](#)

Clearing the Path, Saving Lives - Every Second Counts.

</div>

## About
AMBUCLEAR is a real-time emergency traffic assistance platform that helps ambulances move faster through traffic.
The system tracks active ambulances, detects nearby public drivers, and delivers directional alerts such as LEFT or RIGHT with voice and visual guidance.
It also gives a control room a live monitoring view for operations and coordination.

## Core Features

### Ambulance Module
- Ambulance registration and profile management
- Live GPS tracking with frequent location updates
- Status modes: RED, YELLOW, GREEN
- SOS emergency broadcast for rapid support
- Nearest hospital assistance and route guidance

### Public Driver Module
- No-login alert experience
- Nearby ambulance detection by distance and direction
- Full-screen emergency alerts
- Voice and visual direction guidance
- Temporary alert mute controls

### Control Room Module
- Protected operator dashboard
- Live map monitoring for active ambulances
- Real-time SOS visibility and response support
- Traffic-aware operational recommendations
- Emergency overview and response monitoring

## Tech Stack
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Firebase Firestore
- Google Maps APIs
- Pusher WebSockets
- Vercel hosting target

## System Logic
- Distance threshold detection for nearby vehicles
- Heading comparison to reduce false alerts
- Direction decision using bearing/angle calculation
- Real-time state synchronization between clients and control room

## Project Structure

```text
AMBUCLEAR/
  app/
    ambulance/
    control/
    public/
    simulation/
    api/
  components/
  hooks/
  lib/
  data/
  public/
```

## Placeholder Links
Update these after deployment:
- Live Demo: [ADD_DEPLOYMENT_URL]
- GitHub: [ADD_GITHUB_REPO_URL]
- Documentation: [ADD_DOCS_URL]

## License
MIT
