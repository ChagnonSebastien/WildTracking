import React, {
  useCallback,
  useState,
  MouseEvent,
  TouchEvent,
  FunctionComponent,
  useEffect,
  useMemo,
  ReactElement, useContext
} from 'react';
import { FiMove } from 'react-icons/fi';
import { FaLock, FaLockOpen } from 'react-icons/fa';

import Selection from './Selection';
import Day from './Day';
import Map from './Map';
import Timeline, { INITIAL_TIMELINE_VIEW_DISTANCE, MIN_TIMELINE_VIEW_DISTANCE, touchStats } from './Timeline';
import { LanguageContext } from './useLanguage';
import useWindowWidth from './useWindowWidth';
import useTrailLoader, { densityIndex } from './useTrailLoader';
import Loading from './Loading';

import './ExpeditionTrail.css';
import Expedition from './Expedition';


const ZOOM_SPEED = 1000; // 0 is the fastest

const dayContaining = (detailedPath: Day[], distance: number) => {
  const index = detailedPath.findIndex(day => distance >= day.start && distance < day.end + 1) ?? -1;
  return index === -1 ? detailedPath.length - 1 : index;
};

type Props = {
  expedition: Expedition,
  children?: ReactElement,
  className?: string,
}
const ExpeditionTrail: FunctionComponent<Props> = ({ expedition, children = null, className }) => {

  const windowWidth = useWindowWidth();

  const {
    detailedPath,
    totalLength,
    pathDensities,
    status,
  } = useTrailLoader(new Date(expedition.from).getTime(), new Date(expedition.to).getTime());
  
  const [map, setMap] = useState<google.maps.Map>();
  const [mapControlsDisabled, setMapControlsDisabled] = useState(true);
  const language = useContext(LanguageContext);

  const [selection, _setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    if (typeof totalLength === 'undefined' || typeof detailedPath === 'undefined') return;
    
    _setSelection(prevState => {
      if (prevState === null) {
        const zoom = Math.max(totalLength / INITIAL_TIMELINE_VIEW_DISTANCE, 1);
        return {
          zoom,
          scroll: windowWidth * zoom - windowWidth,
          maxScroll: windowWidth * zoom - windowWidth,
          density: densityIndex(
            totalLength / zoom,
            windowWidth
          ),
          view: {
            from: {
      
              day: dayContaining(detailedPath, totalLength - totalLength / zoom),
              distance: totalLength - totalLength / zoom
            },
            to: {
              day: detailedPath.length - 1,
              distance: totalLength
            }
          },
          draggingState: {
            pos: 0,
            scroll: 0,
            zoom: 1,
            distance: 0,
            fingers: 0,
            centerOffset: {
              lat: 0,
              lng: 0
            },
          },
        };
      }
      
      const newZoom = Math.max(Math.min(prevState.zoom, totalLength / MIN_TIMELINE_VIEW_DISTANCE), 1);
      const graphWidth = windowWidth * newZoom;
      const maxScroll = graphWidth - windowWidth;
      const prevStartAtPercentage = prevState.maxScroll === 0 ? 0 : prevState.scroll / prevState.maxScroll;
      const newScroll = Math.max(Math.min(maxScroll * prevStartAtPercentage, maxScroll), 0);
      
      return {
        ...prevState,
        zoom: newZoom,
        maxScroll,
        scroll: newScroll,
      };
    });
  }, [detailedPath, totalLength, windowWidth]);

  const setSelection = useCallback((updater: ((prevState: Selection) => Selection) | Selection) => {
    if (typeof totalLength === 'undefined' || typeof detailedPath === 'undefined') return;

    const newUpdater = (prev: Selection | null) => {
      if (prev === null) return null;
      const newScrollOrZoom = typeof updater === 'object' ? updater : updater(prev);
      const graphWidth = windowWidth * newScrollOrZoom.zoom;
      newScrollOrZoom.maxScroll = graphWidth - windowWidth;
      const viewLength = totalLength / newScrollOrZoom.zoom;
      newScrollOrZoom.density = densityIndex(viewLength, windowWidth);
      const startLength = totalLength * (newScrollOrZoom.scroll / graphWidth);
      newScrollOrZoom.view = {
        from: {
          day: dayContaining(detailedPath, startLength),
          distance: startLength,
        },
        to: {
          day: dayContaining(detailedPath, startLength + viewLength),
          distance: startLength + viewLength,
        },
      };
      return newScrollOrZoom;
    };
    _setSelection(newUpdater);
  }, [detailedPath, totalLength, windowWidth]);


  const onMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const posX = event.clientX;
    setSelection(prev => {
      if (prev.draggingState.fingers === 0) return prev;
      const diffWithStart = prev.draggingState.pos - posX;
      let newScroll = prev.draggingState.scroll + diffWithStart;
      if (newScroll < 0) newScroll = 0;
      if (newScroll > prev.maxScroll) newScroll = prev.maxScroll;
      return ({ ...prev, scroll: newScroll });
    });
  }, [setSelection]);

  const onTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (typeof totalLength === 'undefined') return;

    const amountFingers = event.touches.length;
    const { center, distance } = touchStats(event);

    setSelection(prev => {
      if (prev.draggingState.fingers === 0) return prev;
      if (prev.draggingState.fingers !== amountFingers) return prev;

      let zoomMultiplier = prev.draggingState.distance ? distance / prev.draggingState.distance : 1;
      let newZoom = prev.draggingState.distance ? prev.draggingState.zoom * zoomMultiplier : prev.zoom;
      newZoom = Math.max(Math.min(newZoom, totalLength / MIN_TIMELINE_VIEW_DISTANCE), 1);
      zoomMultiplier = newZoom / prev.draggingState.zoom;
      const newMaxScroll = windowWidth * newZoom - windowWidth;

      const diffWithStart = prev.draggingState.pos - center.x;
      let newScroll = prev.draggingState.scroll + diffWithStart;
      newScroll = (newScroll + center.x) * zoomMultiplier - center.x;
      if (newScroll < 0) newScroll = 0;
      if (newScroll > newMaxScroll) newScroll = newMaxScroll;

      return ({
        ...prev,
        scroll: newScroll,
        zoom: newZoom,
      });
    });
  }, [setSelection, totalLength, windowWidth]);

  const cancelDrag = useCallback(() => {

    setSelection(prev => {
      if (prev.draggingState.fingers === 0) return prev;
      return ({ ...prev, draggingState: { ...prev.draggingState, fingers: 0 } });
    });
  }, [setSelection]);

  const onTouchStop = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const amountFingers = event.touches.length;
    if (amountFingers === 0) {
      setSelection(prev => {
        if (prev.draggingState.fingers === 0) return prev;
        return ({ ...prev, draggingState: { ...prev.draggingState, fingers: 0 } });
      });
      return;
    }

    const { center, distance } = touchStats(event);

    setSelection(prev => {
      if (prev.draggingState.fingers === 0) return prev;
      return ({
        ...prev,
        draggingState: {
          scroll: prev.scroll,
          zoom: prev.zoom,
          pos: center.x,
          distance,
          fingers: amountFingers,
          centerOffset: prev.draggingState.centerOffset,
        }
      });
    });
  }, [setSelection]);

  const scroll = useCallback((zoomCenter: number, scrollAmount: number) => {
    if (typeof totalLength === 'undefined') return;

    setSelection((prevCtrl) => {
      const newZoom = Math.max(Math.min(
        prevCtrl.zoom * (Math.exp(-scrollAmount / ZOOM_SPEED)),
        totalLength / MIN_TIMELINE_VIEW_DISTANCE
      ), 1);
      const zoomDiff = newZoom / prevCtrl.zoom;
      const zoneToScale = zoomCenter + prevCtrl.scroll;
      const newScroll = Math.max(Math.min(zoneToScale * zoomDiff - zoomCenter, windowWidth * newZoom - windowWidth), 0);
      return { ...prevCtrl, zoom: newZoom, scroll: newScroll };
    });
  }, [setSelection, totalLength, windowWidth]);

  const mapLockButton = useMemo(() => (
    <div
      onMouseDown={event => event.stopPropagation()}
      onTouchStart={event => event.stopPropagation()}
      onClick={() => setMapControlsDisabled(prev => !prev)}
      className="MapLock"
    >
      <FiMove />
      {' '}
      {mapControlsDisabled ? <FaLock color='goldenrod' /> : <FaLockOpen color='goldenrod' />}
    </div>
  ), [mapControlsDisabled]);


  if (typeof detailedPath === 'undefined' ||
      typeof pathDensities === 'undefined' ||
      typeof totalLength === 'undefined' ||
      selection === null) {
    return <Loading text={status} />;
  }

  if (totalLength === 0) {
    return (
      <>
        {children}

        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ textAlign: 'center', margin: '1rem' }}>
            {language.text.notStarted} 👋
          </h1>
        </div>
      </>
    );
  }

  return (
    <div
      className={`Expedition ${className ?? ''}`}
      onMouseLeave={cancelDrag}
      onPointerLeave={cancelDrag}
      onDragLeave={cancelDrag}
      onMouseUp={cancelDrag}
      onTouchEnd={onTouchStop}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      {children}
  
      <Map
        selection={selection}
        mapControlsDisabled={mapControlsDisabled}
        detailedPath={detailedPath}
        isDragging={selection.draggingState.fingers > 0}
        pathDensities={pathDensities}
        map={map}
        setMap={setMap}
      />
      
      <Timeline
        selection={selection}
        detailedPath={detailedPath}
        windowWidth={windowWidth}
        totalLength={totalLength}
        pathDensities={pathDensities}
        setSelection={setSelection}
        scroll={scroll}
        map={map}
      >

        {mapLockButton}

      </Timeline>
    </div>
  );
};

export default ExpeditionTrail;
