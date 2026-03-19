export function createAmbulanceCode(vehicleNumber: string): string {
  const normalizedVehicle = vehicleNumber
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!normalizedVehicle) {
    throw new Error('Vehicle number is required to generate an ambulance code.');
  }

  return `AMB-${normalizedVehicle}`;
}

export function normalizeLicenseNumber(licenseNumber: string): string {
  return licenseNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeTextForMatch(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getNameTokens(name: string): string[] {
  return normalizeTextForMatch(name)
    .split(' ')
    .filter((token) => token.length >= 3);
}