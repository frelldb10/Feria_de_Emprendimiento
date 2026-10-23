/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Conexión a Supabase (ver .env.example). */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
