import escudoUrl from '../../assets/brand/escudo-astrea.webp';
import feriaUrl from '../../assets/brand/feria-emprendimiento.webp';
import { cn } from '../../lib/cn';
import { BrandStripe } from './BrandStripe';

export function Escudo({ className }: { className?: string }) {
  return <img src={escudoUrl} alt="Escudo del municipio de Astrea" className={cn('w-auto', className)} />;
}

export function FeriaLogo({ className }: { className?: string }) {
  return <img src={feriaUrl} alt="Feria de Emprendimiento" className={cn('w-auto', className)} />;
}

/**
 * Logo de la Alcaldía: el escudo con el nombre en Poppins, igual que el original.
 * Se arma con texto (y no con la imagen) porque el original trae un fondo oscuro fijo
 * y así se adapta a fondos claros u oscuros.
 */
export function AlcaldiaLogo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  const light = tone === 'light';
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Escudo className="h-14 shrink-0" />
      <div className="min-w-0">
        <p className={cn('font-display text-xs leading-tight', light ? 'text-carbon-300' : 'text-carbon-500')}>
          Alcaldía Municipal de
        </p>
        <p className={cn('font-display text-2xl leading-none font-extrabold', light ? 'text-white' : 'text-carbon-800')}>
          Astrea
        </p>
        <BrandStripe rounded className="mt-1.5 h-1.5 w-full" />
      </div>
    </div>
  );
}
