/** Datos para entregarle a la persona. La contraseña solo se ve en este momento. */
export function CredentialsCard({ name, username, password }: { name: string; username: string; password: string }) {
  return (
    <div className="rounded-lg border border-verde-600 bg-verde-50 px-4 py-3">
      <p className="text-sm text-verde-900">Entrégale estos datos a {name}:</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-sm text-carbon-600">Usuario</dt>
        <dd className="font-mono font-semibold text-carbon-900">{username}</dd>
        <dt className="text-sm text-carbon-600">Contraseña</dt>
        <dd className="font-mono font-semibold text-carbon-900">{password}</dd>
      </dl>
      <p className="mt-2 text-xs text-verde-900">Después de cerrar esta ventana la contraseña no se vuelve a mostrar.</p>
    </div>
  );
}
