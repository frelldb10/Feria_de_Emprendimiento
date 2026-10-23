import { useSyncExternalStore } from 'react';

export interface PersistentStore<T> {
  getState: () => T;
  commit: (next: T) => void;
  useState: () => T;
}

/**
 * Estado guardado en localStorage con lectura síncrona: las acciones siempre ven el último
 * valor aunque React todavía no haya vuelto a pintar. Otras pestañas del mismo navegador se
 * enteran de los cambios con el evento "storage".
 */
export function createPersistentStore<T>(key: string, restore: (saved: unknown) => T | null, initial: () => T): PersistentStore<T> {
  function persist(value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin espacio o sin permiso: el estado sigue en memoria mientras la pestaña esté abierta.
    }
  }

  function load(): T {
    try {
      const raw = localStorage.getItem(key);
      const restored = raw ? restore(JSON.parse(raw)) : null;
      if (restored) return restored;
    } catch {
      // Almacenamiento bloqueado o con datos dañados: se usa el valor inicial.
    }
    // El valor inicial se guarda de una vez: si tiene ids aleatorios (como el primer
    // administrador), al recargar deben seguir siendo los mismos.
    const value = initial();
    persist(value);
    return value;
  }

  let state = load();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  window.addEventListener('storage', (event) => {
    if (event.key !== key || !event.newValue) return;
    try {
      const restored = restore(JSON.parse(event.newValue));
      if (restored) {
        state = restored;
        emit();
      }
    } catch {
      // Ignora escrituras a medias de otra pestaña.
    }
  });

  return {
    getState: () => state,
    commit(next) {
      state = next;
      persist(next);
      emit();
    },
    useState: () => useSyncExternalStore(subscribe, () => state),
  };
}
