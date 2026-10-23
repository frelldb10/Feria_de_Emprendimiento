import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/Field';
import { updateTrainingInfo } from '../../store/actions';
import { useFairState } from '../../store/fairStore';

/** Nombre, fecha y lugar de la capacitación: salen en la pantalla del operador y en el reporte. */
export function TrainingSettings() {
  const { training } = useFairState();
  const [form, setForm] = useState(training.info);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(training.info);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateTrainingInfo({ title: form.title.trim() || training.info.title, date: form.date, place: form.place.trim() });
    setSaved(true);
  }

  function change(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <Card title="Capacitación" description={`${training.attendance.length} asistentes registrados.`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <TextField label="Nombre" value={form.title} onChange={(e) => change('title', e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Fecha" type="date" value={form.date} onChange={(e) => change('date', e.target.value)} />
          <TextField label="Lugar" value={form.place} onChange={(e) => change('place', e.target.value)} placeholder="Ej. Casa de la Cultura" />
        </div>
        <div className="flex items-center justify-end gap-3">
          {saved && !dirty && <span className="text-sm font-medium text-verde-700">Guardado</span>}
          <Button type="submit" variant="secondary" icon={Save} disabled={!dirty}>
            Guardar
          </Button>
        </div>
      </form>
    </Card>
  );
}
