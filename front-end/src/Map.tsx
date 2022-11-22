import React, {
  FunctionComponent,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { GoogleMap, InfoWindowF, MarkerF } from '@react-google-maps/api';
import './ExpeditionTrail.css';
import { FaWindowClose } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import Day from './Day';
import { convertDMS, lerp } from './Math';
import Point from './Point';

import './Map.css';
import Selection from './Selection';
import { LanguageContext } from './useLanguage';
import { OptionsContext } from './useOptions';


const bucketRoot = process.env.REACT_APP_BUCKET_ROOT;

type Props = {
  selection: Selection,
  mapControlsDisabled: boolean,
  detailedPath: Day[],
  isDragging: boolean,
  pathDensities: Day[][],
  map: google.maps.Map | undefined,
  setMap: React.Dispatch<React.SetStateAction<google.maps.Map | undefined>>,

}

type RouteParams = {
  day: string,
  index: string,
}

const Map: FunctionComponent<Props> = (props) => {
  const {
    selection,
    mapControlsDisabled,
    detailedPath,
    isDragging,
    pathDensities,
    map,
    setMap
  } = props;

  const navigate = useNavigate();
  const routeParams = useParams<RouteParams>();

  const [clickedPoint, setClickedPoint] = useState<Point>();

  const options = useContext(OptionsContext);
  const { text } = useContext(LanguageContext);

  const buildTrail = useCallback((path: Day[], alwaysOn: boolean) => {
    return path
      .map((day, j) => {
        return day.points.map<JSX.Element>((point, i) => {
          if (point.isEndOfDay) {
            return (
              <MarkerF
                key={`Marker-${point.id}`}
                position={point.pos}
                zIndex={1}
                icon={'/sleep.ico'}
                visible={true}
                onClick={() => setClickedPoint(point)}
                title={point.time.toLocaleString()}
              />
            );
          }

          if (alwaysOn && j === path.length - 1 && i === day.points.length - 1) {
            return (
              <MarkerF
                key={`Marker-${point.id}`}
                position={point.pos}
                zIndex={2}
                visible={true}
                animation={google.maps.Animation.BOUNCE}
                onClick={() => setClickedPoint(point)}
                title={point.time.toLocaleString()}
              />
            );
          }

          return (
            <MarkerF
              key={`Marker-${point.id}`}
              position={point.pos}
              zIndex={0}
              icon={'/crumb.png'}
              visible={true}
              onClick={() => setClickedPoint(point)}
              title={point.time.toLocaleString()}
            />
          );
        });
      });
  }, []);

  const trails = useMemo(() => {
    return pathDensities.map((path, i) => buildTrail(path, i === pathDensities.length - 1));
  }, [buildTrail, pathDensities]);

  useEffect(() => {
    if (options.noSmoothMovement && isDragging) return;

    if (!mapControlsDisabled || detailedPath.length === 0) return;

    const from = detailedPath[selection.view.from.day];
    const fromEndPos = from.points[from.points.length - 1].pos;
    const startLength = selection.view.from.distance;
    const fromRatio = (startLength - from.start) / (from.end - from.start);
    let adjustedFrom;
    if (fromRatio < 1) {
      adjustedFrom = lerp(from.points[0].pos, fromEndPos, fromRatio);
    }
    else {
      const nightRatio = startLength - from.end;
      const nextDayPos = selection.view.from.day === detailedPath.length - 1
        ? fromEndPos
        : detailedPath[selection.view.from.day + 1].points[0].pos;
      adjustedFrom = lerp(fromEndPos, nextDayPos, nightRatio);
    }

    const to = detailedPath[selection.view.to.day];
    const toEndPos = to.points[to.points.length - 1].pos;
    const endLength = selection.view.to.distance;
    const toRatio = (endLength - to.start) / (to.end - to.start);
    let adjustedTo;
    if (toRatio < 1) {
      adjustedTo = lerp(to.points[0].pos, toEndPos, toRatio);
    }
    else {
      const nightRatio = endLength - to.end;
      const nextDayPos = selection.view.to.day === detailedPath.length - 1
        ? toEndPos :
        detailedPath[selection.view.to.day + 1].points[0].pos;
      adjustedTo = lerp(toEndPos, nextDayPos, nightRatio);
    }

    let boundingBox = new google.maps.LatLngBounds();
    boundingBox.extend(lerp(adjustedFrom, adjustedTo, -0.1));
    boundingBox.extend(lerp(adjustedFrom, adjustedTo, 1.1));
    for (let i = selection.view.from.day + 1; i < selection.view.to.day - 1; i++) {
      boundingBox = boundingBox.union(detailedPath[i].boundingBox);
    }

    if (isDragging) {
      map?.moveCamera({
        center : {
          lat: boundingBox.getCenter().lat() - selection.draggingState.centerOffset.lat * 0.85,
          lng: boundingBox.getCenter().lng() - selection.draggingState.centerOffset.lng * 0.85,
        }
      });
    }
    else if (options.noSmoothMovement) {
      map?.moveCamera({
        center : {
          lat: boundingBox.getCenter().lat() - selection.draggingState.centerOffset.lat * 0.85,
          lng: boundingBox.getCenter().lng() - selection.draggingState.centerOffset.lng * 0.85,
        }
      });
      map?.fitBounds(boundingBox);
    }
    else {
      map?.fitBounds(boundingBox);
    }
  }, [
    options.noSmoothMovement,
    isDragging,
    map,
    mapControlsDisabled,
    detailedPath,
    selection.view.from.day,
    selection.view.from.distance,
    selection.view.to.day,
    selection.view.to.distance,
    selection.zoom,
    selection.draggingState.centerOffset.lat,
    selection.draggingState.centerOffset.lng,
  ]);

  const selectedImage = useMemo(() => {
    if (typeof routeParams.day === 'undefined' || typeof routeParams.index === 'undefined') return null;
    const day = Number.parseInt(routeParams.day);
    const index = Number.parseInt(routeParams.index);
    if (Number.isNaN(day) || Number.isNaN(index)) return null;
    return { index, day };
  }, [routeParams.day, routeParams.index]);

  const imageMarkers = useMemo(() => {
    return detailedPath.map<ReactNode>((day, dayIndex) => day.images.map<ReactNode>((image, imageIndex) => (
      <MarkerF
        key={`Marker-${image.id}`}
        position={image.pos}
        zIndex={-1}
        icon={`${bucketRoot}/preview/${image.src}.png`}
        visible={true}
        onClick={() => navigate(`images/${dayIndex}/${imageIndex}`)}
      />
    )));
  }, [detailedPath, navigate]);

  const [mapTrail, setMapTrail] = useState<ReactElement>();
  useEffect(() => {
    if (isDragging) return;
    setMapTrail((
      <>
        {trails[trails.length - 1]}

        {!options.lowDensity && selection.density < pathDensities.length - 1
          ? trails[selection.density].filter((_, i) => {
            return i >= selection.view.from.day - 1 && i <= selection.view.to.day + 1;
          })
          : null}

        {options.noImages
          ? null
          : imageMarkers.filter((_, i) => {
            return i >= selection.view.from.day - 1 && i <= selection.view.to.day + 1;
          })
        }
      </>
    ));
  }, [
    options.noImages,
    options.lowDensity,
    isDragging,
    imageMarkers,
    pathDensities.length,
    selection.density,
    selection.view.from.day,
    selection.view.to.day, trails,
  ]);


  return (
    <>
      {selectedImage !== null
        ? (
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                zIndex: 100,
                backgroundColor: 'black',
                color: 'white',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <img
                  style={{ objectFit: 'contain', width: '100%', height: 'calc(100% - 5rem)' }}
                  src={`${bucketRoot}/pictures/${detailedPath[selectedImage.day].images[selectedImage.index].src}.jpg`}
                  alt={`${text.fullResImageOf} ${detailedPath[selectedImage.day].images[selectedImage.index].src}`}
                />

                <div
                  style={{
                    height: '5rem',
                    padding: '0.5rem 2rem',
                    zIndex: 200,
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    alignItems: 'center',
                    gap: '0 2rem',
                  }}
                >

                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    <div><strong>{text.position}:&nbsp;</strong></div>

                    <div>
                      {convertDMS(
                        detailedPath[selectedImage.day].images[selectedImage.index].pos.lat,
                        detailedPath[selectedImage.day].images[selectedImage.index].pos.lng
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    <div><strong>{text.date}:&nbsp;</strong></div>

                    <div>
                      {detailedPath[selectedImage.day]
                        .images[selectedImage.index]
                        .timestamp.toLocaleDateString()
                        .replace(/ /g, '\u00a0')}

                      {' '}

                      {detailedPath[selectedImage.day]
                        .images[selectedImage.index]
                        .timestamp.toLocaleTimeString()
                        .replace(/ /g, '\u00a0')}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'black',
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  height: '1rem',
                  cursor: 'pointer',
                }}
              >
                <FaWindowClose
                  style={{ transform: 'translate(0, -2px)' }}
                  size="20px"
                  onClick={() => navigate(-1)}
                />
              </div>
            </div>
          )
        : null}

      <GoogleMap
        mapContainerClassName="Map"
        zoom={11}
        onLoad={setMap}
        onUnmount={() => setMap(undefined)}
        options={{
          mapId: process.env.REACT_APP_MAPS_ID,
          clickableIcons: false,
          isFractionalZoomEnabled: true,
          backgroundColor: 'white',
          // always disabled controls
          rotateControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          // disable controls
          disableDoubleClickZoom: mapControlsDisabled,
          gestureHandling: mapControlsDisabled ? 'none' : 'greedy',
          scaleControl: !mapControlsDisabled,
          panControl: !mapControlsDisabled
        }}
      >
        {clickedPoint
          ? (
              <InfoWindowF position={clickedPoint.pos} onCloseClick={() => setClickedPoint(undefined)}>
                <div>
                  <p>
                    <strong>{text.position}:</strong>&nbsp;
                    {convertDMS(clickedPoint.pos.lat, clickedPoint.pos.lng)}&nbsp;
                    {`${clickedPoint.elevation.toFixed(0)} m`}
                  </p>

                  <p>
                    <strong>{text.date}:</strong>&nbsp;
                    {clickedPoint.time.toLocaleDateString()}
                    {' '}
                    {clickedPoint.time.toLocaleTimeString()}
                  </p>

                  <p>
                    <strong>{text.timezone}:</strong>&nbsp;
                    {clickedPoint.timezone}
                  </p>

                  <p>
                    <strong>{text.spotBattery}:</strong>&nbsp;
                    {clickedPoint.battery}
                  </p>
                </div>
              </InfoWindowF>
            )
          : null}

        {mapTrail}
      </GoogleMap>
    </>
  );
};

export default Map;
