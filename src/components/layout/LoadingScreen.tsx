import { LoaderCircle } from 'lucide-react';
import { Escudo, FeriaLogo } from '../brand/Logos';

/** Pantalla mientras se revisa la sesión o se traen los datos del servidor. */
export function LoadingScreen({ message = 'Cargando…', fullScreen = true }: { message?: string; fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? 'flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6' : 'flex flex-col items-center justify-center gap-4 px-6 py-24'}>
      {fullScreen && (
        <div className="flex items-center gap-4">
          <Escudo className="h-14" />
          <FeriaLogo className="h-14" />
        </div>
      )}
      <p className="flex items-center gap-2 text-carbon-600" role="status">
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
        {message}
      </p>
    </div>
  );
}
