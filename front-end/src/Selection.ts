type ViewBound = {
    day: number,
    distance: number
}

type DraggingState = {
    pos: number,
    scroll: number
    zoom: number,
    distance: number,
    fingers: number,
    centerOffset: google.maps.LatLngLiteral,
};

type Selection = {
    zoom: number,
    scroll: number,
    maxScroll: number,
    density: number,
    view: { from: ViewBound, to: ViewBound },
    draggingState: DraggingState,
}

export default Selection;
