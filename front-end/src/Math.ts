export function getDistanceFromLatLonInKm(pos1: google.maps.LatLngLiteral, pos2: google.maps.LatLngLiteral) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(pos2.lat-pos1.lat); // deg2rad below
  const dLon = deg2rad(pos2.lng-pos1.lng);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(pos1.lat)) * Math.cos(deg2rad(pos2.lat)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export function cardioid(off: number, shrink: number, x: number) {
  const exp = Math.exp(shrink * (x - off));
  return exp / (exp + 1);
}

export function lerp(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral, ratio: number) {
  return {
    lat: a.lat * (1 - ratio) + b.lat * ratio,
    lng: a.lng * (1 - ratio) + b.lng * ratio,
  };
}

export function toDegreesMinutesAndSeconds(coordinate: number) {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  return degrees + '°' + minutes + '\'' + seconds + '"';
}

export function convertDMS(lat: number, lng: number) {
  const latitude = toDegreesMinutesAndSeconds(lat);
  const latitudeCardinal = lat >= 0 ? 'N' : 'S';
  const longitude = toDegreesMinutesAndSeconds(lng);
  const longitudeCardinal = lng >= 0 ? 'E' : 'W';

  return latitude + latitudeCardinal + '\n' + longitude + longitudeCardinal;
}

