type Point = {
  id: string,
  pos: google.maps.LatLngLiteral,
  elevation: number,
  distance: number,
  time: Date,
  isEndOfDay: boolean,
  battery: string,
  timezone: string,
}

export default Point;
