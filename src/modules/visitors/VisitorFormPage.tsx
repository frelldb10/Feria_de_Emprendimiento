import { useEffect, useState, type FormEvent } from 'react';
import { CircleCheckBig, Clock, LoaderCircle, UserRoundCheck } from 'lucide-react';
import { BrandStripe } from '../../components/brand/BrandStripe';
import { Escudo, FeriaLogo } from '../../components/brand/Logos';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { TextField } from '../../components/ui/Field';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { cn } from '../../lib/cn';
import { describeError } from '../../lib/supabase';
import { isFullName, onlyDigits, onlyLetters } from '../../lib/text';
import { isVisitorRegistrationOpen, registerVisitor } from '../../store/actions';
import { VISITOR_ORIGINS } from '../../store/visitors';
import type { VisitorOrigin } from '../../store/types';

type Phase = 'loading' | 'closed' | 'unavailable' | 'form' | 'done' | 'repeated';

interface Form {
  fullName: string;
  document: string;
  origin: VisitorOrigin | '';
  originDetail: string;
  consent: boolean;
}

type Errors = Partial<Record<keyof Form, string>>;

const EMPTY: Form = { fullName: '', document: '', origin: '', originDetail: '', consent: false };

function validate(form: Form): Errors {
  const errors: Errors = {};
  if (!isFullName(form.fullName)) errors.fullName = 'Escribe tu nombre y apellido, solo con letras.';
  if (form.document.length < 5 || form.document.length > 12) errors.document = 'La cédula debe tener entre 5 y 12 dígitos.';
  const origin = VISITOR_ORIGINS.find((o) => o.id === form.origin);
  if (!origin) errors.origin = 'Elige de dónde nos visitas.';
  else if (origin.detailRequired && form.originDetail.trim().length < 2) errors.originDetail = `Escribe ${origin.detailLabel.toLowerCase()}.`;
  if (!form.consent) errors.consent = 'Para registrarte debes autorizar el tratamiento de tus datos.';
  return errors;
}

/** Si la base todavía no tiene el módulo, al visitante no se le muestra el mensaje técnico. */
const isSetupProblem = (message: string) => message.includes('no está actualizada');

/**
 * Página pública que abre el QR de visitantes. No pide cuenta: el visitante solo puede registrarse,
 * nunca ver los datos de otros.
 */
export function VisitorFormPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState('');

  useEffect(() => {
    isVisitorRegistrationOpen()
      .then((open) => setPhase(open ? 'form' : 'closed'))
      .catch(() => setPhase('unavailable'));
  }, []);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFailure(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0 || !form.origin || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const status = await registerVisitor({
        fullName: form.fullName.trim(),
        document: form.document,
        origin: form.origin,
        originDetail: form.originDetail.trim(),
        consent: form.consent,
      });
      setRegisteredName(form.fullName.trim().split(/\s+/)[0]);
      setPhase(status === 'ok' ? 'done' : 'repeated');
    } catch (error) {
      const message = describeError(error);
      if (message === 'El registro de visitantes está cerrado.') setPhase('closed');
      else setFailure(isSetupProblem(message) ? 'El registro no está disponible en este momento. Intenta de nuevo en unos minutos.' : message);
    } finally {
      setBusy(false);
    }
  }

  function another() {
    setForm(EMPTY);
    setErrors({});
    setRegisteredName('');
    setPhase('form');
    window.scrollTo({ top: 0 });
  }

  const origin = VISITOR_ORIGINS.find((o) => o.id === form.origin);

  return (
    <div className="min-h-dvh bg-carbon-50">
      <BrandStripe />
      <main className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
        <div className="flex items-center justify-center gap-4">
          <Escudo className="h-14" />
          <span aria-hidden className="h-10 w-px bg-carbon-200" />
          <FeriaLogo className="h-14" />
        </div>

        <div className="mt-6 rounded-lg border border-carbon-200 bg-white p-5 shadow-card sm:p-6">
          {phase === 'loading' && (
            <p className="flex items-center justify-center gap-2 py-10 text-carbon-500">
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
              Cargando…
            </p>
          )}

          {(phase === 'closed' || phase === 'unavailable') && (
            <div className="py-6 text-center">
              <Clock className="mx-auto size-10 text-carbon-400" aria-hidden />
              <h1 className="mt-3 text-xl font-semibold tracking-tight">
                {phase === 'closed' ? 'El registro de visitantes está cerrado' : 'El registro no está disponible'}
              </h1>
              <p className="mt-2 text-sm text-carbon-500">
                {phase === 'closed' ? 'Gracias por tu interés en la Feria de Emprendimiento.' : 'Intenta de nuevo en unos minutos.'}
              </p>
            </div>
          )}

          {(phase === 'done' || phase === 'repeated') && (
            <div className="py-4 text-center">
              <CircleCheckBig className="mx-auto size-14 text-verde-600" strokeWidth={1.75} aria-hidden />
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">¡Gracias, {registeredName}!</h1>
              <p className="mt-2 text-carbon-600">
                {phase === 'done' ? 'Tu visita quedó registrada. Disfruta la feria.' : 'Esta cédula ya registró su visita hoy. Disfruta la feria.'}
              </p>
              <Button variant="secondary" size="lg" icon={UserRoundCheck} onClick={another} className="mt-6">
                Registrar a otra persona
              </Button>
            </div>
          )}

          {phase === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Registra tu visita</h1>
                <p className="mt-1 text-sm text-carbon-500">Feria de Emprendimiento · Alcaldía Municipal de Astrea</p>
              </div>
              {failure && <StatusAlert tone="danger" title={failure} />}
              <TextField
                label="Nombre completo"
                value={form.fullName}
                onChange={(e) => update('fullName', onlyLetters(e.target.value))}
                autoComplete="name"
                autoCapitalize="words"
                size="lg"
                required
                error={errors.fullName}
              />
              <TextField
                label="Cédula"
                value={form.document}
                onChange={(e) => update('document', onlyDigits(e.target.value).slice(0, 12))}
                inputMode="numeric"
                autoComplete="off"
                size="lg"
                required
                error={errors.document}
              />

              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-carbon-800">
                  ¿De dónde nos visitas?<span className="text-rojo-600"> *</span>
                </legend>
                <div className="grid gap-2">
                  {VISITOR_ORIGINS.map((o) => (
                    <label
                      key={o.id}
                      className={cn(
                        'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors',
                        form.origin === o.id ? 'border-verde-600 bg-verde-50' : 'border-carbon-200 bg-white hover:border-carbon-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="origin"
                        value={o.id}
                        checked={form.origin === o.id}
                        onChange={() => update('origin', o.id)}
                        className="size-5 shrink-0 accent-verde-700"
                      />
                      <span className="font-medium text-carbon-900">{o.label}</span>
                    </label>
                  ))}
                </div>
                {errors.origin && <p className="mt-1.5 text-sm font-medium text-rojo-700">{errors.origin}</p>}
              </fieldset>

              {origin && (
                <TextField
                  label={origin.detailLabel}
                  value={form.originDetail}
                  onChange={(e) => update('originDetail', e.target.value.slice(0, 120))}
                  autoComplete="off"
                  required={origin.detailRequired}
                  hint={origin.detailRequired ? undefined : 'Opcional'}
                  error={errors.originDetail}
                />
              )}

              <div>
                <Checkbox
                  checked={form.consent}
                  onChange={(value) => update('consent', value)}
                  label="Autorizo el tratamiento de mis datos"
                  description="La Alcaldía Municipal de Astrea usará tu nombre, cédula y procedencia solo para el registro y las estadísticas de la feria (Ley 1581 de 2012)."
                />
                {errors.consent && <p className="mt-1.5 text-sm font-medium text-rojo-700">{errors.consent}</p>}
              </div>

              <Button type="submit" size="lg" fullWidth icon={UserRoundCheck} disabled={busy}>
                {busy ? 'Registrando…' : 'Registrar mi visita'}
              </Button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-carbon-500">Alcaldía Municipal de Astrea · Feria de Emprendimiento</p>
      </main>
    </div>
  );
}
