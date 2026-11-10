import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

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

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear();
});
