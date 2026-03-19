# Data Directory

This directory stores the JSON data file `ambuclear_data.json` used by the application.

The file contains these collections:
1. `ambulances` - Ambulance driver registrations, status, and live position data
2. `sos` - SOS emergency alerts

## Notes
- The JSON file is read and updated by the server helpers in `lib/excel.ts`
- Ensure write permissions for the application
- Backup regularly in production
