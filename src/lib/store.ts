import { useSyncExternalStore } from 'react';

export interface Store<T> {
  getState: () => T;
  setState: (next: T) => void;
  useState: () => T;
}

/**
 * Estado en memoria con lectura síncrona: las acciones siempre ven el último valor aunque
 * React todavía no haya vuelto a pintar. Los datos de la feria viven en el servidor; esto
 * es solo la copia que se muestra en pantalla.
 */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    getState: () => state,
    setState(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    useState: () => useSyncExternalStore(subscribe, () => state),
  };
}
