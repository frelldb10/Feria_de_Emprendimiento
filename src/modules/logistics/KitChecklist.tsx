import { useState, type FormEvent } from 'react';
import { Image, PackageCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { PhotoCapture } from '../../components/ui/PhotoCapture';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { formatTime } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { getEvidenceUrl, registerKitDelivery } from '../../store/actions';
import { isKitComplete } from '../../store/selectors';
import type { Entrepreneur, KitDelivery, KitItemId } from '../../store/types';
import { useCanEdit } from '../auth/useCanEdit';
import { EMPTY_KIT, KIT_ITEMS } from './kit';

interface KitChecklistProps {
  entrepreneur: Entrepreneur;
  delivery?: KitDelivery;
}

/** Abre la foto de evidencia con un enlace temporal (el almacenamiento es privado). */
function EvidenceButton({ path }: { path: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function open() {
    // La ventana se abre antes de esperar al servidor para que el navegador no la bloquee.
    const tab = window.open('', '_blank');
    setState('loading');
    try {
      const url = await getEvidenceUrl(path);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setState('idle');
    } catch {
      tab?.close();
      setState('error');
    }
  }

  return (
    <button
      type="button"
      onClick={() => void open()}
      className="mt-1 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
    >
      <Image className="size-4" aria-hidden />
      {state === 'loading' ? 'Abriendo…' : state === 'error' ? 'No se pudo abrir; reintentar' : 'Ver foto'}
    </button>
  );
}

/** Montar con key={entrepreneur.id} para que el formulario se limpie al cambiar de emprendedor. */
export function KitChecklist({ entrepreneur, delivery }: KitChecklistProps) {
  const canEdit = useCanEdit();
  const [items, setItems] = useState<Record<KitItemId, boolean>>(delivery?.items ?? EMPTY_KIT);
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ items?: string; photo?: string }>({});
  const [saved, setSaved] = useState<KitDelivery | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const anyChecked = Object.values(items).some(Boolean);
  const complete = isKitComplete(delivery);

  function toggle(id: KitItemId, checked: boolean) {
    setItems((current) => ({ ...current, [id]: checked }));
    setErrors((current) => ({ ...current, items: undefined }));
    setSaved(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      items: anyChecked ? undefined : 'Marca al menos un elemento entregado.',
      photo: photo ? undefined : 'La foto de evidencia es obligatoria.',
    };
    setErrors(nextErrors);
    if (nextErrors.items || nextErrors.photo || !photo) return;

    setBusy(true);
    setFailure(null);
    try {
      setSaved(await registerKitDelivery(entrepreneur, items, photo));
      setPhoto(null);
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  // El observador solo ve qué se entregó y la foto.
  if (!canEdit) {
    if (!delivery) return <p className="text-sm text-carbon-600">Todavía no se ha registrado la entrega del kit.</p>;
    return (
      <StatusAlert tone={complete ? 'success' : 'warning'} title={complete ? 'Kit entregado completo' : 'Entrega parcial'}>
        {KIT_ITEMS.map((item) => `${item.label}: ${delivery.items[item.id] ? 'sí' : 'no'}`).join(' · ')}
        <br />
        Registrado a las {formatTime(delivery.at)} por {delivery.operator}.
        <br />
        <EvidenceButton path={delivery.photo.path} />
      </StatusAlert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {failure && (
        <StatusAlert tone="danger" title="No se registró la entrega">
          {failure}
        </StatusAlert>
      )}
      {saved ? (
        <StatusAlert tone="success" title={isKitComplete(saved) ? 'Kit entregado completo' : 'Entrega parcial registrada'}>
          Foto guardada como <span className="font-mono text-xs break-all">{saved.photo.fileName}</span>
        </StatusAlert>
      ) : (
        delivery && (
          <StatusAlert
            tone={complete ? 'success' : 'warning'}
            title={complete ? 'Este emprendedor ya recibió el kit completo' : 'Entrega parcial: faltan elementos'}
          >
            Registrado a las {formatTime(delivery.at)} por {delivery.operator}.
            {!complete && ' Marca lo que se entrega ahora y toma una nueva foto.'}
            <br />
            <EvidenceButton path={delivery.photo.path} />
          </StatusAlert>
        )
      )}

      <fieldset disabled={busy}>
        <legend className="mb-2 text-sm font-semibold text-carbon-800">Elementos del kit</legend>
        <div className="space-y-2">
          {KIT_ITEMS.map((item) => (
            <Checkbox key={item.id} label={item.label} checked={items[item.id]} onChange={(checked) => toggle(item.id, checked)} />
          ))}
        </div>
        {errors.items && <p className="mt-1.5 text-sm font-medium text-rojo-700">{errors.items}</p>}
      </fieldset>

      <PhotoCapture
        label="Foto de la entrega"
        file={photo}
        onChange={(file) => {
          setPhoto(file);
          setErrors((current) => ({ ...current, photo: undefined }));
          setSaved(null);
        }}
        error={errors.photo}
        required
      />

      <Button type="submit" size="lg" icon={PackageCheck} fullWidth disabled={busy}>
        {busy ? 'Subiendo la foto y guardando…' : delivery ? 'Actualizar entrega' : 'Registrar entrega'}
      </Button>
    </form>
  );
}
