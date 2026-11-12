"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
type Camera = { zoom: number; x: number; y: number };
type Drag = {
  pointerId: number;
  clientX: number;
  clientY: number;
  width: number;
  height: number;
  camera: Camera;
  moved: boolean;
};

export function useMapCamera(width: number, height: number, viewportRef: RefObject<HTMLDivElement | null>) {
  const [viewportSize, setViewportSize] = useState({ width, height });
  const aspectRatio = viewportSize.width / viewportSize.height;
  const [camera, setCamera] = useState<Camera>({ zoom: MIN_ZOOM, x: width / 2, y: height / 2 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const baseWidth = Math.max(width, height * aspectRatio);
  const baseHeight = Math.max(height, width / aspectRatio);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      drag.current = null;
      setDragging(false);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewportRef]);

  function constrain(next: Camera): Camera {
    return {
      ...next,
      x: baseWidth / next.zoom >= width ? width / 2 : Math.max(baseWidth / next.zoom / 2, Math.min(width - baseWidth / next.zoom / 2, next.x)),
      y: baseHeight / next.zoom >= height ? height / 2 : Math.max(baseHeight / next.zoom / 2, Math.min(height - baseHeight / next.zoom / 2, next.y)),
    };
  }

  const fitted = constrain(camera);
  const viewWidth = baseWidth / camera.zoom;
  const viewHeight = baseHeight / camera.zoom;
  const viewX = fitted.x - viewWidth / 2;
  const viewY = fitted.y - viewHeight / 2;

  function zoomBy(step: number) {
    setCamera((previous) => {
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, previous.zoom + step));
      return constrain({ ...constrain(previous), zoom });
    });
  }

  function reset() {
    drag.current = null;
    setDragging(false);
    setCamera({ zoom: MIN_ZOOM, x: width / 2, y: height / 2 });
  }

  function revealPoint(x: number, y: number) {
    setCamera((previous) => {
      const current = constrain(previous);
      const w = baseWidth / current.zoom;
      const h = baseHeight / current.zoom;
      if (Math.abs(x - current.x) <= w * 0.38 && Math.abs(y - current.y) <= h * 0.38) return previous;
      return constrain({ ...current, x, y });
    });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    if (camera.zoom === MIN_ZOOM || !event.isPrimary || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, width: rect.width, height: rect.height, camera: fitted, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.clientX;
    const dy = event.clientY - current.clientY;
    if (!current.moved && Math.hypot(dx, dy) < 5) return;
    if (!current.moved) {
      current.moved = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    setCamera(constrain({
      ...current.camera,
      x: current.camera.x - dx / current.width * baseWidth / current.camera.zoom,
      y: current.camera.y - dy / current.height * baseHeight / current.camera.zoom,
    }));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current || event.detail === 0) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function onPointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current?.moved) endDrag(event);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
    else if (event.key === "-" || event.key === "_") zoomBy(-ZOOM_STEP);
    else if (event.key === "Home" || event.key === "0") reset();
    else if (camera.zoom > MIN_ZOOM && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      const dx = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      const dy = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      setCamera((previous) => {
        const current = constrain(previous);
        return constrain({ ...current, x: current.x + dx * baseWidth / current.zoom * 0.12, y: current.y + dy * baseHeight / current.zoom * 0.12 });
      });
    } else return;
    event.preventDefault();
  }

  return {
    viewportSize,
    zoom: camera.zoom,
    viewBox: [viewX, viewY, viewWidth, viewHeight].join(" "),
    project: (x: number, y: number) => ({ x: (x - viewX) / viewWidth * 100, y: (y - viewY) / viewHeight * 100 }),
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(-ZOOM_STEP),
    canZoomIn: camera.zoom < MAX_ZOOM,
    canZoomOut: camera.zoom > MIN_ZOOM,
    reset,
    revealPoint,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerLeave, onPointerUp: endDrag, onPointerCancel: endDrag, onLostPointerCapture: endDrag, onClickCapture, onKeyDown },
  };
}
