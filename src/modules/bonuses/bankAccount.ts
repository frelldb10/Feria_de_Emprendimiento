import { isFullName, NAME_PATTERN } from '../../lib/text';
import type { AccountType, BankAccount, Entrepreneur } from '../../store/types';

export const OTHER_BANK = 'Otro';

/** Billeteras digitales: la "cuenta" es el número de celular. */
export const WALLETS = ['Nequi', 'Daviplata'];

export const BANKS = [
  'Bancolombia',
  'Banco Agrario',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA',
  'Banco Popular',
  'Banco de Occidente',
  'Banco Caja Social',
  'Banco AV Villas',
  'Bancamía',
  'Banco W',
  ...WALLETS,
  OTHER_BANK,
];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  ahorros: 'Ahorros',
  corriente: 'Corriente',
  billetera: 'Billetera digital',
};

export interface AccountForm {
  bank: string;
  otherBank: string;
  type: AccountType | '';
  number: string;
  confirmNumber: string;
  holderName: string;
  holderDocument: string;
  consent: boolean;
}

export type AccountErrors = Partial<Record<keyof AccountForm, string>>;

export function emptyAccountForm(entrepreneur: Entrepreneur, current?: BankAccount): AccountForm {
  if (current) {
    const known = BANKS.includes(current.bank);
    return {
      bank: known ? current.bank : OTHER_BANK,
      otherBank: known ? '' : current.bank,
      type: current.type,
      number: current.number,
      confirmNumber: current.number,
      holderName: current.holderName,
      holderDocument: current.holderDocument,
      consent: true,
    };
  }
  return {
    bank: '',
    otherBank: '',
    type: '',
    number: '',
    confirmNumber: '',
    holderName: entrepreneur.ownerName,
    holderDocument: entrepreneur.document,
    consent: false,
  };
}

export const isWallet = (bank: string) => WALLETS.includes(bank);

export function validateAccount(form: AccountForm): { errors: AccountErrors; account?: BankAccount } {
  const errors: AccountErrors = {};
  const wallet = isWallet(form.bank);

  if (!form.bank) errors.bank = 'Selecciona la entidad.';
  if (form.bank === OTHER_BANK) {
    const name = form.otherBank.trim();
    if (name.length < 3) errors.otherBank = 'Escribe el nombre de la entidad.';
    else if (!NAME_PATTERN.test(name)) errors.otherBank = 'El nombre de la entidad solo lleva letras.';
  }
  if (!form.type) errors.type = 'Selecciona el tipo de cuenta.';

  if (wallet) {
    if (!/^3\d{9}$/.test(form.number)) errors.number = `En ${form.bank} el número es el celular: 10 dígitos que empiezan por 3.`;
  } else if (form.number.length < 6 || form.number.length > 20) {
    errors.number = 'El número de cuenta debe tener entre 6 y 20 dígitos.';
  }
  if (!errors.number && form.confirmNumber !== form.number) errors.confirmNumber = 'Los dos números no coinciden. Revísalos con el emprendedor.';

  const holder = form.holderName.trim();
  if (!NAME_PATTERN.test(holder)) errors.holderName = 'El nombre del titular solo lleva letras.';
  else if (!isFullName(holder)) errors.holderName = 'Escribe nombre y apellido del titular, como aparecen en la cuenta.';
  if (!/^\d{5,12}$/.test(form.holderDocument)) errors.holderDocument = 'El documento debe tener entre 5 y 12 dígitos.';
  if (!form.consent) errors.consent = 'Sin la autorización no se puede registrar la cuenta.';

  if (Object.keys(errors).length > 0 || !form.type) return { errors };
  return {
    errors,
    account: {
      bank: form.bank === OTHER_BANK ? form.otherBank.trim() : form.bank,
      type: form.type,
      number: form.number,
      holderName: form.holderName.trim(),
      holderDocument: form.holderDocument,
    },
  };
}
