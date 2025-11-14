export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function getWalkingTime(distanceKm: number): number {
  return Math.round(distanceKm * 12);
}

export function calculateCalories(distanceKm: number, weightKg: number = 75): number {
  return Math.round(weightKg * distanceKm * 1.05);
}

export function calculatePints(calories: number): number {
  return Number((calories / 200).toFixed(1));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}
