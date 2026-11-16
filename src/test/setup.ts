import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { limpiarActor } from "../lib/sessionActor";

// Node expone un `localStorage` experimental sin archivo configurado que
// tapa el almacenamiento de jsdom. La aplicación usa el global, así que en
// pruebas se reemplaza por el sessionStorage de jsdom (misma interfaz Storage).
if (typeof window !== "undefined" && !window.localStorage) {
  const almacenamiento = window.sessionStorage;
  Object.defineProperty(window, "localStorage", {
    value: almacenamiento,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: almacenamiento,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  // Solo Date se congela; los timers siguen siendo reales para userEvent.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 16, 12));
  localStorage.clear();
  limpiarActor();
});

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear();
  limpiarActor();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
