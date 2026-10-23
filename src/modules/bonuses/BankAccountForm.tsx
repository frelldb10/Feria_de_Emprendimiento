import { useState, type FormEvent } from 'react';
import { Landmark } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { SelectField, TextField } from '../../components/ui/Field';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { cn } from '../../lib/cn';
import { onlyDigits, onlyLetters } from '../../lib/text';
import type { AccountType, BankAccount, Entrepreneur } from '../../store/types';
import {
  ACCOUNT_TYPE_LABEL,
  BANKS,
  emptyAccountForm,
  isWallet,
  OTHER_BANK,
  validateAccount,
  type AccountErrors,
  type AccountForm,
} from './bankAccount';

interface BankAccountFormProps {
  entrepreneur: Entrepreneur;
  current?: BankAccount;
  submitLabel: string;
  onSubmit: (account: BankAccount) => void;
  onCancel?: () => void;
}


export function BankAccountForm({ entrepreneur, current, submitLabel, onSubmit, onCancel }: BankAccountFormProps) {
  const [form, setForm] = useState<AccountForm>(() => emptyAccountForm(entrepreneur, current));
  const [errors, setErrors] = useState<AccountErrors>({});
  const wallet = isWallet(form.bank);
  const otherHolder = form.holderDocument !== '' && form.holderDocument !== entrepreneur.document;

  function update<K extends keyof AccountForm>(key: K, value: AccountForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function changeBank(bank: string) {
    // Nequi y Daviplata solo pueden ser billetera; al salir de ellas se vuelve a pedir el tipo.
    setForm((prev) => ({
      ...prev,
      bank,
      type: isWallet(bank) ? 'billetera' : prev.type === 'billetera' ? '' : prev.type,
    }));
    setErrors((prev) => ({ ...prev, bank: undefined, type: undefined, number: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { errors: found, account } = validateAccount(form);
    setErrors(found);
    if (account) onSubmit(account);
  }

  const types: AccountType[] = wallet ? ['billetera'] : ['ahorros', 'corriente'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <SelectField label="Entidad" value={form.bank} onChange={(e) => changeBank(e.target.value)} size="lg" required error={errors.bank}>
        <option value="">Selecciona el banco o la billetera</option>
        {BANKS.map((bank) => (
          <option key={bank} value={bank}>
            {bank}
          </option>
        ))}
      </SelectField>

      {form.bank === OTHER_BANK && (
        <TextField
          label="¿Cuál entidad?"
          value={form.otherBank}
          onChange={(e) => update('otherBank', onlyLetters(e.target.value))}
          inputMode="text"
          autoCapitalize="words"
          autoComplete="off"
          size="lg"
          required
          hint="Solo letras, sin números."
          error={errors.otherBank}
        />
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-carbon-800">
          Tipo de cuenta<span className="text-rojo-600"> *</span>
        </legend>
        <div className={cn('grid gap-2', types.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
          {types.map((type) => (
            <label
              key={type}
              className={cn(
                'flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border font-semibold',
                'has-focus-visible:ring-2 has-focus-visible:ring-verde-700',
                form.type === type ? 'border-verde-700 bg-verde-50 text-verde-900' : 'border-carbon-300 bg-white text-carbon-700',
              )}
            >
              <input
                type="radio"
                name="account-type"
                className="sr-only"
                checked={form.type === type}
                onChange={() => update('type', type)}
              />
              {ACCOUNT_TYPE_LABEL[type]}
            </label>
          ))}
        </div>
        {errors.type && <p className="mt-1.5 text-sm font-medium text-rojo-700">{errors.type}</p>}
      </fieldset>

      <TextField
        label={wallet ? `Celular de ${form.bank}` : 'Número de cuenta'}
        value={form.number}
        onChange={(e) => update('number', onlyDigits(e.target.value))}
        inputMode="numeric"
        autoComplete="off"
        size="lg"
        required
        className="font-mono tracking-wider"
        error={errors.number}
      />
      <TextField
        label={wallet ? 'Confirma el celular' : 'Confirma el número de cuenta'}
        value={form.confirmNumber}
        onChange={(e) => update('confirmNumber', onlyDigits(e.target.value))}
        onPaste={(e) => e.preventDefault()}
        inputMode="numeric"
        autoComplete="off"
        size="lg"
        required
        className="font-mono tracking-wider"
        hint="Vuelve a escribirlo sin copiar. Así se detectan los errores de digitación."
        error={errors.confirmNumber}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Titular de la cuenta"
          value={form.holderName}
          onChange={(e) => update('holderName', onlyLetters(e.target.value))}
          inputMode="text"
          autoCapitalize="words"
          autoComplete="off"
          size="lg"
          required
          error={errors.holderName}
        />
        <TextField
          label="Documento del titular"
          value={form.holderDocument}
          onChange={(e) => update('holderDocument', onlyDigits(e.target.value))}
          inputMode="numeric"
          size="lg"
          required
          error={errors.holderDocument}
        />
      </div>
      {otherHolder && (
        <StatusAlert tone="warning" title="La cuenta no está a nombre del emprendedor">
          Confirma con {entrepreneur.ownerName} que la transferencia debe ir a esta persona.
        </StatusAlert>
      )}

      <div>
        <Checkbox
          checked={form.consent}
          onChange={(checked) => update('consent', checked)}
          label="Autorización de datos"
          description="El emprendedor autoriza el tratamiento de sus datos personales y bancarios para el pago del bono (Ley 1581 de 2012)."
        />
        {errors.consent && <p className="mt-1.5 text-sm font-medium text-rojo-700">{errors.consent}</p>}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="lg" icon={Landmark} fullWidth={!onCancel}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
