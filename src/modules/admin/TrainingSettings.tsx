import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/Field';
import { describeError } from '../../lib/supabase';
import { updateTrainingInfo } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { useCanEdit } from '../auth/useCanEdit';

/** Nombre, fecha y lugar de la capacitación: salen en la pantalla del operador y en el reporte. */
export function TrainingSettings() {
  const canEdit = useCanEdit();
  const { training } = useFairState();
  const [form, setForm] = useState(training.info);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(training.info);

  // Si otro administrador la cambia, el formulario se pone al día (mientras no se esté editando).
  useEffect(() => {
    setForm(training.info);
  }, [training.info]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await updateTrainingInfo({ title: form.title.trim() || training.info.title, date: form.date, place: form.place.trim() });
      setMessage({ ok: true, text: 'Guardado' });
    } catch (error) {
      setMessage({ ok: false, text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  function change(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  return (
    <Card title="Capacitación" description={`${training.attendance.length} asistentes registrados.`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <fieldset disabled={!canEdit} className="space-y-3">
          <TextField label="Nombre" value={form.title} onChange={(e) => change('title', e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Fecha" type="date" value={form.date} onChange={(e) => change('date', e.target.value)} />
            <TextField label="Lugar" value={form.place} onChange={(e) => change('place', e.target.value)} placeholder="Ej. Casa de la Cultura" />
          </div>
        </fieldset>
        {canEdit && (
          <div className="flex items-center justify-end gap-3">
            {message && (
              <span className={message.ok ? 'text-sm font-medium text-verde-700' : 'text-sm font-medium text-rojo-700'}>{message.text}</span>
            )}
            <Button type="submit" variant="secondary" icon={Save} disabled={!dirty || busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
