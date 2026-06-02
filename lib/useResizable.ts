"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Drag-to-resize width, left-anchored (grows to the right).
 * Returns a ref to put on the resizable element, the current width,
 * and a mouse-down handler for the drag handle. Persists to localStorage.
 */
export function useResizableWidth(opts: {
  storageKey: string;
  initial: number;
  min: number;
  max: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [width, setWidth] = useState(opts.initial);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(opts.storageKey));
    if (saved >= opts.min && saved <= opts.max) setWidth(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem(opts.storageKey, String(width));
  }, [opts.storageKey, width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !ref.current) return;
      const left = ref.current.getBoundingClientRect().left;
      setWidth(Math.min(opts.max, Math.max(opts.min, e.clientX - left)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.min, opts.max]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  return { ref, width, setWidth, startDrag };
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}
