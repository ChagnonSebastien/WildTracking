import { getTimezoneOffset, utcToZonedTime } from 'date-fns-tz';
import { cardioid, getDistanceFromLatLonInKm } from './Math';
import Day from './Day';
import Point from './Point';

const AMOUNT_DAYS = 110;
const DAY_MIN_DISTANCE = 0;
const DAY_MAX_DISTANCE = 25;
const SEGMENT_MIN_DISTANCE = 0;
const SEGMENT_MAX_DISTANCE = 0.25;


function generateSegments(startHeight: number, distance: number) {
  const segments = [];
  let progress = 0;
  let height = startHeight;
  while (progress < distance) {
    const segmentLen = (SEGMENT_MAX_DISTANCE - SEGMENT_MIN_DISTANCE) * cardioid(0.33, 15, Math.random());
    progress += segmentLen;
    height += (Math.random() - 0.5) * segmentLen * 200;
    height = Math.min(2019.3, Math.max(height, 0));
    segments.push({ distance: segmentLen, height });
  }
  return segments;
}

const startingPoint: google.maps.LatLngLiteral = { lat: 34.6478, lng: -84.1924 };
const goalArrow = Math.PI / 4;

function getPath() {
  const a: Day[] = [];
  let direction = 0;
  let pos = startingPoint;
  const date = new Date(1675256827000);
  const tzOff = getTimezoneOffset(Intl.DateTimeFormat().resolvedOptions().timeZone);

  for (let i = 0; i < AMOUNT_DAYS; i++) {
    date.setHours(8 + Math.pow(Math.tan(Math.random() * 2 - 1), 3));
    const start = i === 0 ? 0 : (a[a.length - 1].end + 1);
    let distance = DAY_MIN_DISTANCE + (DAY_MAX_DISTANCE - DAY_MIN_DISTANCE) * Math.sqrt(Math.random());
    if (Math.random() * 25 < 1) {
      distance += 50;
    }

    if (distance >= 7 || a.length === 0) {
      const segments = generateSegments(
        a.length === 0 ? 0 : a[a.length - 1].points[a[a.length - 1].points.length - 1].elevation,
        distance
      );
      const points: Point[] = [];
      // eslint-disable-next-line no-loop-func
      for (let j = 0; j < segments.length; j++) {
        direction += (Math.random() - 0.5) / 10;
        direction = Math.max(-Math.PI / 4, Math.min(direction, Math.PI / 4));
        pos = {
          lat: pos.lat + Math.cos(direction + goalArrow) * segments[j].distance * (1/110),
          lng: pos.lng + Math.sin(direction + goalArrow) * segments[j].distance * (1/110),
        };
        points.push({
          id: (Math.random() * 0xFFFFFFFFFFFFF).toString(16),
          pos,
          elevation: segments[j].height,
          distance: j === 0 ? 0 : getDistanceFromLatLonInKm(pos, points[points.length - 1].pos),
          time: utcToZonedTime(date.getTime() + tzOff + 18000000, 'America/Toronto'),
          isEndOfDay: false,
          battery: 'GOOD',
          timezone: 'Eastern Standard Time',
        });
        date.setMinutes(date.getMinutes() + 5);
      }
      points[points.length - 1].isEndOfDay = true;
      a.push({
        points,
        start,
        end: points.reduce((prev, value) => prev + value.distance, start),
        isRest: false,
        boundingBox: new google.maps.LatLngBounds(),
        images: []
      });
    }
    else {
      a.push({
        points: [{
          id: (Math.random() * 0xFFFFFFFFFFFFF).toString(16),
          distance: 0,
          elevation: a[a.length - 1].points[a[a.length - 1].points.length - 1].elevation,
          pos: a[a.length - 1].points[a[a.length - 1].points.length - 1].pos,
          time: utcToZonedTime(date.getTime() + tzOff + 18000000, 'America/Toronto'),
          isEndOfDay: true,
          battery: 'GOOD',
          timezone: 'Eastern Standard Time',
        }],
        start,
        end: start + 2,
        isRest: true,
        boundingBox: new google.maps.LatLngBounds(),
        images: []
      });
    }

    for (const p of a[a.length - 1].points) {
      a[a.length - 1].boundingBox.extend(p.pos);
    }

    if (a[a.length - 1].points.length === 1 || date.getHours() >= 6) {
      date.setDate(date.getDate() + 1);
    }
  }
  if (Math.random() < 0.5 && a[a.length - 1].points.length > 1) {
    a[a.length - 1].points[a[a.length - 1].points.length - 1].isEndOfDay = false;
  }
  return a;
}

export default getPath;
