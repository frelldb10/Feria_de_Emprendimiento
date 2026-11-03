import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { MoneyField, SelectField, TextField } from '../../components/ui/Field';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { formatMoney } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { recordPettyCashExpense } from '../../store/actions';
import { PETTY_CASH_CATEGORIES, type PettyCashDay } from '../../store/pettyCash';
import type { PettyCashCategory } from '../../store/types';

interface ExpenseInput {
  digits: string;
  category: PettyCashCategory | '';
  description: string;
}

type ExpenseErrors = Partial<Record<keyof ExpenseInput, string>>;

const EMPTY: ExpenseInput = { digits: '', category: '', description: '' };

function validate(input: ExpenseInput, balance: number): ExpenseErrors {
  const errors: ExpenseErrors = {};
  const amount = Number(input.digits);
  if (!amount) errors.digits = 'Escribe el valor del gasto.';
  else if (amount > balance) errors.digits = `No alcanza el saldo: quedan ${formatMoney(balance)}.`;
  if (!input.category) errors.category = 'Elige la categoría.';
  if (input.description.trim().length < 3) errors.description = 'Escribe en qué se gastó.';
  return errors;
}

/** Montar con key={day} para que el formulario se vacíe al cambiar de día. */
export function ExpenseForm({ summary, isAdmin }: { summary: PettyCashDay; isAdmin: boolean }) {
  const { day, fund, balance } = summary;
  const [form, setForm] = useState<ExpenseInput>(EMPTY);
  const [errors, setErrors] = useState<ExpenseErrors>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function update<K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setResult(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form, balance);
    setErrors(found);
    if (Object.keys(found).length > 0 || !form.category || busy) return;
    const amount = Number(form.digits);
    setBusy(true);
    setResult(null);
    try {
      await recordPettyCashExpense({ day, amount, category: form.category, description: form.description.trim() });
      setForm(EMPTY);
      setResult({ ok: true, text: `Gasto de ${formatMoney(amount)} registrado.` });
    } catch (error) {
      setResult({ ok: false, text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Registrar gasto" description={fund ? `Saldo disponible: ${formatMoney(balance)}` : undefined}>
      {!fund ? (
        <StatusAlert tone="warning" title={`Todavía no hay dinero asignado para el Día ${day}`}>
          {isAdmin ? 'Asígnalo arriba para poder registrar gastos.' : 'Pídele al administrador que lo asigne para poder registrar gastos.'}
        </StatusAlert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {result && <StatusAlert tone={result.ok ? 'success' : 'danger'} title={result.text} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField label="Valor" size="lg" value={form.digits} onChange={(value) => update('digits', value)} required error={errors.digits} />
            <SelectField
              label="Categoría"
              size="lg"
              value={form.category}
              onChange={(e) => update('category', e.target.value as ExpenseInput['category'])}
              required
              error={errors.category}
            >
              <option value="">Elige la categoría</option>
              {PETTY_CASH_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </SelectField>
          </div>
          <TextField
            label="Descripción"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            maxLength={200}
            autoComplete="off"
            placeholder="Ej. Taxi para traer las carpas"
            required
            error={errors.description}
          />
          <Button type="submit" size="lg" icon={Plus} disabled={busy} className="w-full sm:w-auto">
            {busy ? 'Guardando…' : 'Registrar gasto'}
          </Button>
        </form>
      )}
    </Card>
  );
}
