"use client";

import { useEffect, useState, type RefObject } from "react";
import { placeGrid, wallboardMedia } from "@/theme/tokens";

/** 목록에 실제로 배정된 공간을 측정해 페이지 크기를 맞춘다. 작은 화면은 자연스럽게 흐른다. */
export function usePlaceGrid(expanded: boolean, viewportRef: RefObject<HTMLDivElement | null>) {
  const [grid, setGrid] = useState<{ columns: number; rows: number }>({ columns: 1, rows: placeGrid.fallbackRows });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!expanded || !viewport) return;
    const fitted = window.matchMedia(wallboardMedia.replace("@media ", ""));
    function measure() {
      if (!viewport || viewport.clientWidth <= 0) return;
      const columns = Math.max(1, Math.min(placeGrid.maxColumns,
        Math.floor((viewport.clientWidth + placeGrid.columnGap) / (placeGrid.minColumnWidth + placeGrid.columnGap))));
      const rows = fitted.matches
        ? Math.max(1, Math.floor((viewport.clientHeight + placeGrid.rowGap) / (placeGrid.minRowHeight + placeGrid.rowGap)))
        : placeGrid.fallbackRows;
      setGrid((previous) => previous.columns === columns && previous.rows === rows ? previous : { columns, rows });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    fitted.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      fitted.removeEventListener("change", measure);
    };
  }, [expanded, viewportRef]);

  return { ...grid, pageSize: grid.columns * grid.rows };
}
