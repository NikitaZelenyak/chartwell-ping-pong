"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { animationsEnabled, MOTION_STORAGE_KEY } from "@/lib/arcade";
const MotionContext = createContext({ enabled: true, reduced: false, setEnabled: (value: boolean) => { void value; } });
export const useMotion = () => useContext(MotionContext);
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem(MOTION_STORAGE_KEY); } catch { /* Storage can be unavailable. */ }
      setEnabledState(stored !== "off");
      setReduced(media.matches);
      document.documentElement.dataset.motion = animationsEnabled(stored, media.matches) ? "on" : "off";
    };
    const visibility = () => { document.documentElement.dataset.tabHidden = String(document.hidden); };
    sync(); visibility();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", visibility);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("storage", sync); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    try { localStorage.setItem(MOTION_STORAGE_KEY, value ? "on" : "off"); } catch { /* Keep the in-session preference. */ }
    document.documentElement.dataset.motion = value && !reduced ? "on" : "off";
  };
  return <MotionContext.Provider value={{ enabled, reduced, setEnabled }}>{children}</MotionContext.Provider>;
}
