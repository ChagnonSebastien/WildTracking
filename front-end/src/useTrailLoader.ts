import { GeoPoint, Timestamp, collection, getDocs, orderBy, query, where } from 'firebase/firestore/lite';
import { useContext, useEffect, useMemo, useState } from 'react';
import { utcToZonedTime } from 'date-fns-tz';

import Day from './Day';
import Image from './Image';
import Point from './Point';
import { getDistanceFromLatLonInKm } from './Math';
import useGoogleServices from './useGoogleService';
import { LanguageContext } from './useLanguage';
import useWindowWidth from './useWindowWidth';

import './ExpeditionTrail.css';
import getPath from './PathGenerator';


export const densityIndex = (viewDistance: number, windowWidth: number) => {
  const fullDensityThreshold = 300;
  const index = Math.ceil(Math.log2(fullDensityThreshold * viewDistance / windowWidth));
  return index < 0 ? 0 : index;
};

const useTrailLoader = (from: number, to: number) => {

  const windowWidth = useWindowWidth();

  const language = useContext(LanguageContext);

  const { isMapsApiLoaded, firestore } = useGoogleServices();

  const [images, setImages] = useState<Image[] | null>(null);
  useEffect(() => {
    if (!isMapsApiLoaded) return;

    const imagesRef = collection(firestore, 'images');
    const imagesQuery = query(
      imagesRef,
      orderBy('timestamp', 'asc'),
      where('timestamp', '>', Timestamp.fromDate(new Date(from))),
      where('timestamp', '<', Timestamp.fromDate(new Date(to)))
    );

    getDocs(imagesQuery).then(
      imagesSnapshot => {
        setImages(imagesSnapshot.docs.map<Image>(imageSnapshot => {
          const data = imageSnapshot.data();
          return ({
            id: imageSnapshot.id,
            src: data.src,
            pos: { lat: (data.pos as GeoPoint).latitude, lng: (data.pos as GeoPoint).longitude },
            timestamp: utcToZonedTime(
              (data.timestamp as Timestamp).toMillis(),
              data.timezoneId ?? 'America/Toronto'
            ),
          });
        }));
      },
      error => {
        console.error(error);
        setImages([]);
      }
    );
  }, [firestore, from, isMapsApiLoaded, to]);

  const [detailedPath, setDetailedPath] = useState<{days: Day[], totalLength: number} | undefined>();
  useEffect(() => {
    if (!isMapsApiLoaded || images === null) return;

    if (from === to) {
      const days = getPath();
      const totalLength = days.map(d => {
        return d.points.length === 1 ? 2 : d.points.reduce((prev, value) => prev + value.distance, 0);
      }).reduce((p, n) => p + n, 0) + days.length;
      setDetailedPath({ days, totalLength });
      return;
    }

    const locationHistoryRef = collection(firestore, 'locationHistory');
    const locationHistoryQuery = query(
      locationHistoryRef,
      orderBy('timestamp', 'asc'),
      where('timestamp', '>', Timestamp.fromDate(new Date(from))),
      where('timestamp', '<', Timestamp.fromDate(new Date(to)))
    );

    let totalLength = 0;
    const days: Day[] = [{
      points: [],
      start: 0,
      end: 0,
      isRest: false,
      boundingBox: new google.maps.LatLngBounds(),
      images: []
    }];
    getDocs(locationHistoryQuery).then(locationHistorySnapshot => {
      if (locationHistorySnapshot.docs.length === 0 || images === null) {
        setDetailedPath({ days: [], totalLength: 0 });
        return;
      }

      let lastLocation: google.maps.LatLngLiteral | null = null;
      let imageIndex = 0;
      for (let i = 0; i < locationHistorySnapshot.docs.length; i++) {
        const data = locationHistorySnapshot.docs[i].data();
        const adjustedTime = utcToZonedTime((data.timestamp as Timestamp).toDate(), data.timezone.id);
        const pos = {
          lat: (data.location as GeoPoint).latitude,
          lng: (data.location as GeoPoint).longitude,
        };
        const distance = lastLocation ? getDistanceFromLatLonInKm(pos, lastLocation) : 0;
        totalLength += distance;
        const isEndOfDay = data.messageType === 'OK';

        if (imageIndex < images.length) {
          if (images[imageIndex].timestamp.getTime() < adjustedTime.getTime()) {
            if (images[imageIndex].timestamp.toDateString() === adjustedTime.toDateString()) {
              days[days.length - 1].images.push(images[imageIndex]);
            }
            else {
              days[days.length - 2].images.push(images[imageIndex]);
            }
            imageIndex += 1;
          }
        }

        days[days.length - 1].points.push({
          id: locationHistorySnapshot.docs[i].id,
          time: adjustedTime,
          timezone: data.timezone.name,
          battery: data.batteryState,
          elevation: data.elevation,
          distance,
          isEndOfDay,
          pos,
        });

        if (isEndOfDay) {
          if (days[days.length - 1].points.length === 1) {
            totalLength += 2;
            days[days.length - 1].isRest = true;
          }
          lastLocation = null;
        }
        else {
          lastLocation = pos;
        }

        days[days.length - 1].end = totalLength;
        days[days.length - 1].boundingBox.extend(pos);

        if (isEndOfDay) {
          totalLength += 1;
        }

        if (isEndOfDay && i < locationHistorySnapshot.docs.length - 1) {
          days.push({
            isRest: false,
            points: [],
            start: totalLength,
            end: totalLength,
            boundingBox: new google.maps.LatLngBounds(),
            images: []
          });
        }
      }

      setDetailedPath({ days, totalLength });
    });

  }, [firestore, from, images, isMapsApiLoaded, to]);

  const maxDensityIndex = useMemo(() => {
    return densityIndex(detailedPath?.totalLength ?? 1, windowWidth);
  }, [detailedPath, windowWidth]);

  const [pathDensities, setPathDensities] = useState<Day[][] | undefined>();
  useEffect(() => {
    if (typeof detailedPath === 'undefined') {
      setPathDensities(undefined);
      return;
    }

    const distanceThresholds = [0];
    let distanceThreshold = 0.025; // 0.02
    while (distanceThresholds.length <= maxDensityIndex) {
      distanceThresholds.push(distanceThreshold);
      distanceThreshold *= 2;
    }

    const subs: Day[][] = new Array(maxDensityIndex + 1).fill(0).map(() => []);
    for (let d = 0; d < detailedPath.days.length; d++) {
      const currentDay = detailedPath.days[d];
      const cachedDayDistances = new Array(maxDensityIndex).fill(0);
      let dayDistances: number[] = new Array(maxDensityIndex + 1).fill(0);
      const reducedPoints: Point[][] = new Array(maxDensityIndex + 1).fill(0).map(() => []);

      let nightlyDistance = 0;
      if (d === 0 || currentDay.points.length === 1) {
        reducedPoints[maxDensityIndex].push(currentDay.points[0]);
      }
      else {
        const prevPos = detailedPath.days[d - 1].points[detailedPath.days[d - 1].points.length - 1].pos;
        nightlyDistance = getDistanceFromLatLonInKm(prevPos, currentDay.points[0].pos);
        if (nightlyDistance >= distanceThresholds[maxDensityIndex]) {
          reducedPoints[maxDensityIndex].push({ ...currentDay.points[0], distance: 0 });
        }
        else {
          for (let i = 0; i < maxDensityIndex; i++) {
            if (nightlyDistance >= distanceThresholds[i]) {
              reducedPoints[i].push({ ...currentDay.points[0], distance: 0 });
            }
          }
        }
      }

      for (let p = 1; p < currentDay.points.length; p++) {
        dayDistances = dayDistances.map(prev => prev + currentDay.points[p].distance);
        let distanceAdjustment = reducedPoints[maxDensityIndex].length === 0 ? nightlyDistance : 0;
        if (
          dayDistances[maxDensityIndex] + nightlyDistance >= distanceThreshold
          || p === currentDay.points.length - 1
        ) {
          reducedPoints[maxDensityIndex].push({ ...currentDay.points[p], distance: dayDistances[maxDensityIndex] });
          for (let i = 0; i < maxDensityIndex; i++) {
            cachedDayDistances[i] += dayDistances[i];
          }
          dayDistances = new Array(maxDensityIndex + 1).fill(0);
        }
        else {
          for (let i = 0; i < maxDensityIndex; i++) {
            distanceAdjustment = (reducedPoints[i].length === 0 && reducedPoints[maxDensityIndex].length === 0)
              ? nightlyDistance
              : 0;
            if (dayDistances[i] + distanceAdjustment >= distanceThresholds[i]) {
              reducedPoints[i].push({ ...currentDay.points[p], distance: cachedDayDistances[i] + dayDistances[i] });
              cachedDayDistances[i] = 0;
              dayDistances[i] = 0;
            }
          }
        }
      }

      for (let i = 0; i <= maxDensityIndex; i++) {
        subs[i].push({ ...detailedPath.days[d], points: reducedPoints[i] });
      }

    }

    setPathDensities(subs);
  }, [detailedPath, maxDensityIndex]);


  let status = language.text.loadingAlmostReady;
  if (!isMapsApiLoaded) {
    status = language.text.loadingMap;
  }
  else if (typeof detailedPath === 'undefined') {
    status = language.text.loadingRoute;
  }
  else if (typeof pathDensities === 'undefined') {
    status = language.text.loadingProcessing;
  }


  return {
    detailedPath: detailedPath?.days,
    totalLength: detailedPath?.totalLength,
    pathDensities,
    status,
  };
};

export default useTrailLoader;
