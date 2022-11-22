import React, {
  Fragment, FunctionComponent, MouseEvent, ReactElement, TouchEvent,
  WheelEvent, useCallback, useContext, useMemo, useState,
} from 'react';

import Day from './Day';
import Selection from './Selection';
import { TutorialContext } from './tutorialWrapper';

import './Timeline.css';
import './ExpeditionTrail.css';
import { LanguageContext } from './useLanguage';

export const MIN_TIMELINE_VIEW_DISTANCE = 10; // in km
export const INITIAL_TIMELINE_VIEW_DISTANCE = 50; // in km

const colorPalette = [
  '#cbe4f9',
  '#cdf5f6',
  '#eff9da',
  '#f9ebdf',
  '#f9d8d6',
  '#d6cdea',
];

export const touchStats = (event: TouchEvent<HTMLDivElement>) => {
  const center = { x: 0, y: 0 };
  for (let i = 0; i < event.touches.length; i++) {
    center.x += event.touches.item(i).clientX / event.touches.length;
    center.y += event.touches.item(i).clientY / event.touches.length;
  }

  let distance = 0;
  if (event.touches.length > 1) {
    for (let i = 0; i < event.touches.length; i++) {
      const a = event.touches.item(i).clientX - center.x;
      const b = event.touches.item(i).clientY - center.y;
      distance += Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2)) / event.touches.length;
    }
  }

  return { center, distance };
};



type Props = {
  selection: Selection,
  detailedPath: Day[],
  windowWidth: number,
  totalLength: number,
  pathDensities: Day[][],
  setSelection: React.Dispatch<React.SetStateAction<Selection>>,
  scroll: (zoomCenter: number, scrollAmount: number) => void,
  map: google.maps.Map | undefined,
  children?: ReactElement,
};

const Timeline: FunctionComponent<Props> = (props) => {

  const {
    selection,
    detailedPath,
    windowWidth,
    totalLength,
    pathDensities,
    setSelection,
    scroll,
    map,
    children,
  } = props;

  const { tutorialStep, tutorial } = useContext(TutorialContext);
  const language = useContext(LanguageContext);

  const [timelineExtended, setTimelineExtended] = useState(false);

  const additionalMetadata = useMemo(() => {
    if (totalLength === 0) {
      return { months: [], nightBlocks: [] };
    }

    const months = [{
      index: detailedPath[0].points[0].time.getMonth(),
      start: 0,
      end: 0,
    }];
    const nightBlocks: { start: number, end: number, newDay: number }[][] = [];
    let transitioningFrom = 0;
    detailedPath.forEach(day => {
      transitioningFrom = 0;
      let parsingDistance = months[months.length - 1].end;
      const currentBlock: { start: number, end: number, newDay: number }[] = [];
      nightBlocks.push(currentBlock);
      months[months.length - 1].end = day.start;
      day.points.forEach(point => {
        parsingDistance += point.distance;
        months[months.length - 1].end = parsingDistance;
        const newMonth = point.time.getMonth();
        if (newMonth !== months[months.length - 1].index) {
          months.push({
            index: newMonth,
            start: parsingDistance,
            end: parsingDistance
          });
        }

        if (point.time.getHours() < 6 || point.time.getHours() >= 21) {
          if (transitioningFrom) {
            if (transitioningFrom !== point.time.getDate()) {
              currentBlock[currentBlock.length - 1].newDay = point.time.getDate();
              transitioningFrom = point.time.getDate();
              currentBlock.push({ start: currentBlock[currentBlock.length - 1].end, end: parsingDistance, newDay: 0 });
            }
            currentBlock[currentBlock.length - 1].end = parsingDistance;
          }
          else {
            transitioningFrom = point.time.getDate();
            currentBlock.push({ start: parsingDistance, end: parsingDistance, newDay: 0 });
          }
        }
        else if (transitioningFrom) {
          transitioningFrom = 0;
        }
      });

      if (currentBlock.length > 1
        && transitioningFrom
        && new Date(currentBlock[currentBlock.length - 1].end).getHours() < 6
      ) {
        currentBlock[currentBlock.length - 2].newDay = 0;
      }

      if (day.points.length === 1) months[months.length - 1].end += 2; // Until end of rest period
      months[months.length - 1].end += 1; // Until next day
    });
    return { months, nightBlocks };
  }, [detailedPath, totalLength]);

  const maxHeight = useMemo(() => {
    return detailedPath
      .map(day => day.points.reduce((prev, newSeg) => newSeg.elevation > prev ? newSeg.elevation : prev, 0))
      .reduce((prev, newSeg) => newSeg > prev ? newSeg : prev, 0);
  }, [detailedPath]);

  const buildGraph = useCallback((days: Day[], minDensity: boolean) => days
    .map((day, i) => {
      let start = day.start;
      const distanceMarkers = [];
      for (let d = 1; d < day.end - day.start; d++) {
        distanceMarkers.push(
          <line
            key={`D${i}-K${d}`}
            x1={`${100*(day.start + d)/totalLength}%`}
            x2={`${100*(day.start + d)/totalLength}%`}
            y1="0"
            y2={d % 10 === 0 ? '20px' : '10px'}
            strokeWidth={d % 10 === 0 ? '2px' : '1px'}
            stroke={d % 10 === 0 ? 'lightgray' : 'lightgray'}
          />
        );
      }
      return (
        <Fragment key={`DayStartingAt${day.start}`}>
          {distanceMarkers}

          {minDensity && additionalMetadata.nightBlocks[i].map((nightBlock, i) => (
            <Fragment key={`Blocks${i}`}>
              <rect
                x={`${100*nightBlock.start/totalLength}%`}
                width={`${100*(nightBlock.end - nightBlock.start)/totalLength}%`}
                height="100%"
                style={{ fill: 'navy', opacity: 0.5 }}
              />

              {nightBlock.newDay
                ? (
                    <text
                      x={`${100*(nightBlock.end)/totalLength}%`}
                      y="90%"
                      dx="5px"
                      dy="-1%"
                      style={{ fontSize: '15px', fontWeight: 'bold' }}
                    >
                      {nightBlock.newDay}
                    </text>
                  )
                : null}
            </Fragment>
          ))}

          {minDensity && day.points[day.points.length - 1].isEndOfDay
            ? (
                <rect
                  x={`${100*day.end/totalLength}%`}
                  width={`${100/totalLength}%`}
                  height="100%"
                  style={{ fill: 'navy', opacity: 0.75 }}
                />
              )
            : null}

          {day.isRest
            ? (minDensity
                ? (
                    <>
                      <rect
                        x={`${100*start/totalLength}%`}
                        y="0"
                        width={`${200/totalLength}%`}
                        height="100%"
                        style={{ fill: '#f2ea00', opacity: 0.2 }}
                      />

                      <image
                        x={`${100*start/totalLength}%`}
                        y="0"
                        width={`${200/totalLength}%`}
                        height="100%"
                        href="/hammock.svg"
                      />
                    </>
                  )
                : null)
            : day.points.map(point => {
              start += point.distance;
              const x = 100*start/totalLength;
              const y = (point.elevation / maxHeight) * -70 + 80;
              return (
                <circle
                  key={`Timeline${point.id}`}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r={'3'}
                  style={{ fill: '#004d00' }}
                />
              );
            })}

          <text
            x={`${100*(day.start)/totalLength}%`}
            y="90%"
            dx="5px"
            dy="-1%"
            style={{ fontSize: '15px', fontWeight: 'bold' }}
          >
            {detailedPath[i].points[0].time.getDate()}
          </text>
        </Fragment>
      );
    }), [additionalMetadata.nightBlocks, totalLength, detailedPath, maxHeight]);

  const heightMapGraphics = useMemo(() => {
    return pathDensities.map((path, i) => buildGraph(path, i === pathDensities.length - 1));
  }, [buildGraph, pathDensities]);

  const heightIndicators = useMemo(() => {
    const heights = [(
      <line
        key="H0"
        x1="0"
        x2="100%"
        y1={`${(0 / maxHeight) * -70 + 80}%`}
        y2={`${(0 / maxHeight) * -70 + 80}%`}
        stroke="lightgray"
      />
    )];

    let height = 500;
    while (height < maxHeight + 500) {
      heights.push((
        <line
          key={`H${height}`}
          x1="0"
          x2="100%"
          y1={`${(height / maxHeight) * -70 + 80}%`}
          y2={`${(height / maxHeight) * -70 + 80}%`}
          stroke="lightgray"
        />
      ));
      if (height < maxHeight) {
        heights.push((
          <text
            key={`HeightText${height}`}
            x="5px"
            y={`${(height / maxHeight) * -70 + 80}%`}
            dy="15px"
            style={{ fontSize: '13px', fill: '#888888' }}
          >
            {`${height}m`}
          </text>
        ));
      }
      height += 500;
    }

    return (
      <svg
        className="TimelineOverlay"
        width="100%"
        height="100%"
      >
        <rect
          width="100%"
          height="100%"
          style={{ fill: 'white' }}
        />

        {heights}
      </svg>
    );
  }, [maxHeight]);

  const subHeightIndications = useMemo(() => {
    const heights = [];

    let height = 100;
    while (height < maxHeight + 500) {
      heights.push((
        <line
          key={`H${height}`}
          x1="0"
          x2="100%"
          y1={`${(height / maxHeight) * -70 + 80}%`}
          y2={`${(height / maxHeight) * -70 + 80}%`}
          strokeDasharray="5,5"
          stroke="lightgray"
        />
      ));

      height += 100;
      if (height % 500 === 0) height += 100;
    }

    return (
      <svg
        className='HeightSubMap TimelineOverlay'
        width="100%"
        height="100%"
      >
        {heights}
      </svg>
    );
  }, [maxHeight]);

  const monthsColorOverlay = useMemo(() => additionalMetadata.months.map((month, i) => (
    <rect
      key={`M${i}`}
      x={`${100*month.start/totalLength}%`}
      width={`${100*(month.end - month.start)/totalLength}%`}
      y="90%"
      height="11%"
      style={{ fill: colorPalette[i % colorPalette.length] }}
    />
  )), [additionalMetadata, totalLength]);

  const visibleTimeline = useMemo(() => (
    <>
      {heightMapGraphics[heightMapGraphics.length - 1]}

      {selection.density < heightMapGraphics.length - 1
        ? heightMapGraphics[selection.density].filter((_, i) => {
          return i >= selection.view.from.day - 1 && i <= selection.view.to.day + 1;
        })
        : null}
    </>
  ), [heightMapGraphics, selection.density, selection.view.from.day, selection.view.to.day]);


  const onTimelineMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (typeof map === 'undefined') return;
    setSelection(prev => {
      const bounds = map.getBounds();
      const mapCenter = map.getCenter();
      if (typeof bounds === 'undefined' || typeof mapCenter === 'undefined') return prev;
      return ({
        ...prev,
        draggingState: {
          pos: event.clientX,
          scroll: prev.scroll,
          zoom: prev.zoom,
          distance: 0,
          fingers: 1,
          centerOffset: {
            lat: bounds.getCenter().lat() - mapCenter.lat(),
            lng: bounds.getCenter().lng() - mapCenter.lng(),
          }
        }
      });
    });
  }, [map, setSelection]);

  const onTimelineTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (typeof map === 'undefined') return;
    const amountFingers = event.touches.length;
    const { center, distance } = touchStats(event);
    

    setSelection(prev => {
      const bounds = map.getBounds();
      const mapCenter = map.getCenter();
      if (typeof bounds === 'undefined' || typeof mapCenter === 'undefined') return prev;
      return ({
        ...prev,
        draggingState: {
          scroll: prev.scroll,
          zoom: prev.zoom,
          pos: center.x,
          distance,
          fingers: amountFingers,
          centerOffset: {
            lat: bounds.getCenter().lat() - mapCenter.lat(),
            lng: bounds.getCenter().lng() - mapCenter.lng(),
          }
        }
      });
    });
  }, [map, setSelection]);

  const onTimelineWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    scroll(event.clientX, event.deltaY);
  }, [scroll]);

  const monthsLabels = additionalMetadata.months.map((month, i) => {
    if (month.end < selection.view.from.distance) return null;
    if (month.start > selection.view.to.distance) return null;
    const viewWidth = selection.view.to.distance - selection.view.from.distance;
    const fromPercentage = Math.max((month.start - selection.view.from.distance) / viewWidth, 0);
    const toPercentage = Math.min((month.end - selection.view.from.distance) / viewWidth, 1);
    const widthPercentage = toPercentage - fromPercentage;
    return (
      <div
        key={`ML${i}`}
        style={{
          left: `${100 * fromPercentage}%`,
          width: `${100 * widthPercentage}%`,
        }}
      >
        {language.monthName(month.index)}
      </div>
    );
  });

  return (
    <>
      <div
        className={`TimelineContainer${timelineExtended ? ' Extended' : ''}`}
        onMouseDown={onTimelineMouseDown}
        onTouchStart={onTimelineTouchStart}
        onWheel={onTimelineWheel}
      >

        {tutorialStep >= 1
          ? (
              <div className={`${tutorialStep === 1 ? 'Blinking' : ''}`}>
                {children}
              </div>
            )
          : null}

        {tutorialStep >= 2
          ? (
              <div className={`${tutorialStep === 2 ? 'Blinking' : ''}`}>
                <div
                  className="TimelineHandle"
                  onClick={() => setTimelineExtended(prev => !prev)}
                  onMouseDown={event => event.stopPropagation()}
                  onTouchStart={event => event.stopPropagation()}
                >
                  <i className="arrow up" />
                </div>
              </div>
            )
          : null}

        {tutorial}

        <div className={`Timeline${tutorialStep === 0 ? ' Blinking' : ''}`}>
          {heightIndicators}
          {subHeightIndications}

          <svg
            style={{ translate: `-${selection.scroll}px 0` }}
            width={`${Math.floor(windowWidth * selection.zoom)}px`}
            height="100%"
          >
            {visibleTimeline}
            {monthsColorOverlay}
          </svg>

          <div className={`MonthLabels${timelineExtended ? ' Extended' : ''}`}>
            {monthsLabels}
          </div>
        </div>
      </div>
    </>
  );
};

export default Timeline;
