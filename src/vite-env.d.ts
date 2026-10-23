/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Primer administrador del sistema (ver .env.example). */
  readonly VITE_ADMIN_NAME?: string;
  readonly VITE_ADMIN_USERNAME?: string;
  readonly VITE_ADMIN_PASSWORD?: string;
}
