import Image from './Image';
import Point from './Point';

type Day = {
  points: Point[],
  start: number,
  end: number,
  isRest: boolean,
  boundingBox: google.maps.LatLngBounds,
  images: Image[],
}

export default Day;
