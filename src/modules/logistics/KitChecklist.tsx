import { useState, type FormEvent } from 'react';
import { PackageCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { PhotoCapture } from '../../components/ui/PhotoCapture';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { formatTime } from '../../lib/format';
import { buildPhotoRef } from '../../lib/photo';
import { registerKitDelivery } from '../../store/actions';
import { isKitComplete } from '../../store/selectors';
import type { Entrepreneur, KitDelivery, KitItemId } from '../../store/types';
import { useAuth } from '../auth/AuthContext';
import { EMPTY_KIT, KIT_ITEMS } from './kit';

interface KitChecklistProps {
  entrepreneur: Entrepreneur;
  delivery?: KitDelivery;
}

/** Montar con key={entrepreneur.id} para que el formulario se limpie al cambiar de emprendedor. */
export function KitChecklist({ entrepreneur, delivery }: KitChecklistProps) {
  const { operator } = useAuth();
  const [items, setItems] = useState<Record<KitItemId, boolean>>(delivery?.items ?? EMPTY_KIT);
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ items?: string; photo?: string }>({});
  const [saved, setSaved] = useState<KitDelivery | null>(null);

  const anyChecked = Object.values(items).some(Boolean);
  const complete = isKitComplete(delivery);

  function toggle(id: KitItemId, checked: boolean) {
    setItems((current) => ({ ...current, [id]: checked }));
    setErrors((current) => ({ ...current, items: undefined }));
    setSaved(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      items: anyChecked ? undefined : 'Marca al menos un elemento entregado.',
      photo: photo ? undefined : 'La foto de evidencia es obligatoria.',
    };
    setErrors(nextErrors);
    if (nextErrors.items || nextErrors.photo || !photo) return;

    const reference = entrepreneur.qrCode ?? entrepreneur.document;
    setSaved(registerKitDelivery(entrepreneur.id, items, buildPhotoRef('kit', reference, photo), operator));
    setPhoto(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          </StatusAlert>
        )
      )}

      <fieldset>
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

      <Button type="submit" size="lg" icon={PackageCheck} fullWidth>
        {delivery ? 'Actualizar entrega' : 'Registrar entrega'}
      </Button>
    </form>
  );
}
