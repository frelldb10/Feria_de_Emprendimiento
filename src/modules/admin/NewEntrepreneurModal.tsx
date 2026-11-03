import { useState, type FormEvent } from 'react';
import { Store } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { SelectField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { normalizeText } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { isFullName, onlyDigits, onlyLetters } from '../../lib/text';
import { createEntrepreneur } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { SECTIONS } from '../../store/sections';
import type { Entrepreneur, SectionId } from '../../store/types';

interface Form {
  businessName: string;
  ownerName: string;
  phone: string;
  document: string;
  section: SectionId | '';
  needsStand: boolean;
  needsPower: boolean;
  chairs: string;
}

type Errors = Partial<Record<keyof Form, string>>;

const EMPTY: Form = { businessName: '', ownerName: '', phone: '', document: '', section: '', needsStand: true, needsPower: false, chairs: '2' };

function validate(form: Form, existing: Entrepreneur[]): Errors {
  const errors: Errors = {};
  if (form.businessName.trim().length < 2) errors.businessName = 'Escribe el nombre del emprendimiento.';
  if (!isFullName(form.ownerName)) errors.ownerName = 'Escribe nombre y apellido, solo con letras.';
  if (form.phone && (form.phone.length < 7 || form.phone.length > 10)) errors.phone = 'El teléfono debe tener de 7 a 10 dígitos.';
  if (form.document && (form.document.length < 5 || form.document.length > 12)) errors.document = 'El documento debe tener de 5 a 12 dígitos.';
  else if (form.document && existing.some((e) => e.document === form.document)) errors.document = 'Ya hay un emprendedor con ese documento.';
  const sameName = existing.some(
    (e) =>
      normalizeText(e.businessName) === normalizeText(form.businessName) && normalizeText(e.ownerName) === normalizeText(form.ownerName),
  );
  if (!errors.businessName && !errors.ownerName && sameName) errors.businessName = 'Ese emprendimiento ya está registrado con el mismo responsable.';
  const chairs = Number(form.chairs || '0');
  if (!Number.isInteger(chairs) || chairs < 0 || chairs > 20) errors.chairs = 'De 0 a 20 sillas.';
  return errors;
}

interface NewEntrepreneurModalProps {
  open: boolean;
  onClose: () => void;
  /** Se llama con el emprendedor ya creado y con su QR (en puerta se le registra el ingreso). */
  onCreated?: (entrepreneur: Entrepreneur) => void;
  submitLabel?: string;
}

/** Para quien no venía en el archivo de carga: se crea con su QR. Solo lo ve el administrador. */
export function NewEntrepreneurModal({ open, onClose, onCreated, submitLabel = 'Crear emprendedor' }: NewEntrepreneurModalProps) {
  const { entrepreneurs } = useFairState();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function reset() {
    setForm(EMPTY);
    setErrors({});
    setFailure(null);
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form, entrepreneurs);
    setErrors(found);
    if (Object.keys(found).length > 0 || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const created = await createEntrepreneur({
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone,
        document: form.document,
        category: '',
        section: form.section || null,
        stand: '',
        needsStand: form.needsStand,
        needsPower: form.needsPower,
        chairs: Number(form.chairs || '0'),
      });
      setBusy(false);
      reset();
      onClose();
      onCreated?.(created);
    } catch (error) {
      setFailure(describeError(error));
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nuevo emprendedor"
      description="Para quien no venía en el archivo de carga. Queda con su código QR."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="new-entrepreneur-form" icon={Store} disabled={busy}>
            {busy ? 'Guardando…' : submitLabel}
          </Button>
        </>
      }
    >
      <form id="new-entrepreneur-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {failure && <StatusAlert tone="danger" title="No se creó el emprendedor">{failure}</StatusAlert>}
        <TextField
          label="Nombre del emprendimiento"
          value={form.businessName}
          onChange={(e) => update('businessName', e.target.value)}
          maxLength={120}
          autoComplete="off"
          required
          error={errors.businessName}
        />
        <TextField
          label="Responsable"
          value={form.ownerName}
          onChange={(e) => update('ownerName', onlyLetters(e.target.value))}
          autoCapitalize="words"
          autoComplete="off"
          required
          error={errors.ownerName}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Teléfono"
            value={form.phone}
            onChange={(e) => update('phone', onlyDigits(e.target.value).slice(0, 10))}
            inputMode="numeric"
            autoComplete="off"
            error={errors.phone}
          />
          <TextField
            label="Documento"
            value={form.document}
            onChange={(e) => update('document', onlyDigits(e.target.value).slice(0, 12))}
            inputMode="numeric"
            autoComplete="off"
            hint="Opcional"
            error={errors.document}
          />
        </div>
        <SelectField label="Sección" value={form.section} onChange={(e) => update('section', e.target.value as Form['section'])}>
          <option value="">Sin asignar</option>
          {SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox checked={form.needsStand} onChange={(v) => update('needsStand', v)} label="Necesita stand" />
          <Checkbox checked={form.needsPower} onChange={(v) => update('needsPower', v)} label="Necesita energía" />
        </div>
        <TextField
          label="Sillas"
          value={form.chairs}
          onChange={(e) => update('chairs', onlyDigits(e.target.value).slice(0, 2))}
          inputMode="numeric"
          className="max-w-32"
          error={errors.chairs}
        />
      </form>
    </Modal>
  );
}
