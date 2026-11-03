import { useEffect, useRef, useState, type ReactNode } from 'react';
import type QrScanner from 'qr-scanner';
import { Camera, CameraOff, Flashlight, FlashlightOff, LoaderCircle, Power, SwitchCamera } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

type CameraState = { phase: 'off' | 'starting' | 'on' } | { phase: 'error'; message: string };
type Facing = 'environment' | 'user';

// Un mismo código se ignora mientras siga frente a la cámara y hasta 2,5 s después de retirarlo,
// para que el QR que se quedó apuntando no se registre dos veces.
const SAME_CODE_COOLDOWN_MS = 2500;
// El celular recuerda que la cámara estaba encendida y la vuelve a abrir al entrar.
const AUTO_START_KEY = 'feria-astrea:camara';

function remember(on: boolean) {
  try {
    if (on) localStorage.setItem(AUTO_START_KEY, '1');
    else localStorage.removeItem(AUTO_START_KEY);
  } catch {
    // Sin almacenamiento solo se pierde la preferencia.
  }
}

function remembered(): boolean {
  try {
    return localStorage.getItem(AUTO_START_KEY) === '1';
  } catch {
    return false;
  }
}

/** La librería responde "Camera not found." para cualquier falla; aquí se averigua cuál fue. */
async function cameraProblem(error: unknown): Promise<string> {
  if (!window.isSecureContext || !navigator.mediaDevices) {
    return 'La cámara solo funciona si la app se abre desde una dirección segura (https://), como la de Vercel.';
  }
  const denied =
    'El navegador no tiene permiso para usar la cámara. Toca el candado junto a la dirección, permite la cámara y vuelve a intentar.';
  if (error instanceof DOMException && error.name === 'NotAllowedError') return denied;
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (status.state === 'denied') return denied;
  } catch {
    // Algunos navegadores no dejan preguntar por el permiso de la cámara.
  }
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  if (!devices.some((d) => d.kind === 'videoinput')) {
    return 'Este equipo no tiene cámara. Usa el campo "Código del QR" o la búsqueda manual.';
  }
  return 'No se pudo abrir la cámara. Revisa que ninguna otra aplicación la esté usando y que el navegador tenga permiso.';
}

interface CameraScannerProps {
  onCode: (code: string) => void;
  /** Mientras se registra o se muestra el resultado, la cámara sigue viendo pero no envía lecturas. */
  paused: boolean;
}

export function CameraScanner({ onCode, paused }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  // Cada encendido o apagado invalida al anterior (React monta dos veces en desarrollo).
  const attempt = useRef(0);
  const facing = useRef<Facing>('environment');
  const last = useRef<{ code: string; at: number } | null>(null);
  const onCodeRef = useRef(onCode);
  const pausedRef = useRef(paused);
  onCodeRef.current = onCode;
  pausedRef.current = paused;

  const [state, setState] = useState<CameraState>({ phase: 'off' });
  const [canSwitch, setCanSwitch] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  function handleDecode(raw: string) {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    const now = Date.now();
    const previous = last.current;
    if (previous && previous.code === code && now - previous.at < SAME_CODE_COOLDOWN_MS) {
      previous.at = now;
      return;
    }
    if (pausedRef.current) return;
    last.current = { code, at: now };
    onCodeRef.current(code);
  }

  function release() {
    attempt.current += 1;
    // pause(true) suelta la cámara en el acto; destroy() sola espera 300 ms.
    void scannerRef.current?.pause(true);
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setFlashOn(false);
    setHasFlash(false);
  }

  async function start() {
    const video = videoRef.current;
    if (!video) return;
    release();
    const current = attempt.current;
    setState({ phase: 'starting' });
    let scanner: QrScanner | null = null;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices) throw new Error('Sin https');
      // La librería se descarga solo en las pantallas que leen QR.
      const { default: QrScannerLib } = await import('qr-scanner');
      if (current !== attempt.current) return;
      scanner = new QrScannerLib(video, (result) => handleDecode(result.data), {
        preferredCamera: facing.current,
        maxScansPerSecond: 10,
        returnDetailedScanResult: true,
      });
      scannerRef.current = scanner;
      await scanner.start();
      if (current !== attempt.current) {
        scanner.destroy();
        return;
      }
      setState({ phase: 'on' });
      remember(true);
      const [flash, cameras] = await Promise.all([scanner.hasFlash(), QrScannerLib.listCameras()]);
      if (current !== attempt.current) return;
      setHasFlash(flash);
      setCanSwitch(cameras.length > 1);
    } catch (error) {
      scanner?.destroy();
      if (current !== attempt.current) return;
      scannerRef.current = null;
      setState({ phase: 'error', message: await cameraProblem(error) });
    }
  }

  function turnOff() {
    release();
    remember(false);
    setState({ phase: 'off' });
  }

  async function switchCamera() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    facing.current = facing.current === 'environment' ? 'user' : 'environment';
    setFlashOn(false);
    await scanner.setCamera(facing.current);
    setHasFlash(await scanner.hasFlash());
  }

  async function toggleFlash() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    await scanner.toggleFlash().catch(() => undefined);
    setFlashOn(scanner.isFlashOn());
  }

  // Solo al montar y desmontar: start y release trabajan con refs.
  useEffect(() => {
    if (remembered()) void start();
    return release;
  }, []);

  const on = state.phase === 'on';

  return (
    <div className="relative mx-auto aspect-square w-full max-w-80 overflow-hidden rounded-2xl bg-carbon-950">
      <video ref={videoRef} muted playsInline className={cn('absolute inset-0 size-full object-cover', !on && 'invisible')} />

      {on && (
        <>
          {/* La librería busca el código en el cuadro central (dos tercios de la imagen). */}
          <div aria-hidden className="absolute inset-[16%]">
            <span className="absolute top-0 left-0 size-10 rounded-tl-lg border-t-4 border-l-4 border-white" />
            <span className="absolute top-0 right-0 size-10 rounded-tr-lg border-t-4 border-r-4 border-white" />
            <span className="absolute bottom-0 left-0 size-10 rounded-bl-lg border-b-4 border-l-4 border-white" />
            <span className="absolute right-0 bottom-0 size-10 rounded-br-lg border-r-4 border-b-4 border-white" />
            {!paused && (
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-scanline bg-verde-500 shadow-[0_0_12px_2px] shadow-verde-500/60 motion-reduce:animate-none" />
            )}
          </div>
          <div className="absolute top-2 right-2 flex gap-1.5">
            {hasFlash && (
              <CameraButton label={flashOn ? 'Apagar linterna' : 'Encender linterna'} onClick={() => void toggleFlash()}>
                {flashOn ? <FlashlightOff className="size-5" aria-hidden /> : <Flashlight className="size-5" aria-hidden />}
              </CameraButton>
            )}
            {canSwitch && (
              <CameraButton label="Cambiar de cámara" onClick={() => void switchCamera()}>
                <SwitchCamera className="size-5" aria-hidden />
              </CameraButton>
            )}
            <CameraButton label="Apagar la cámara" onClick={turnOff}>
              <Power className="size-5" aria-hidden />
            </CameraButton>
          </div>
          <p className="absolute inset-x-0 bottom-0 bg-carbon-950/60 py-2 text-center text-sm font-medium text-white">
            {paused ? 'Registrando…' : 'Apunta al código QR'}
          </p>
        </>
      )}

      {state.phase === 'off' && (
        <Message icon={<Camera className="size-10" aria-hidden />} text="La cámara está apagada.">
          <Button size="lg" icon={Camera} onClick={() => void start()}>
            Encender cámara
          </Button>
        </Message>
      )}
      {state.phase === 'starting' && (
        <Message icon={<LoaderCircle className="size-10 animate-spin motion-reduce:animate-none" aria-hidden />} text="Abriendo la cámara…" />
      )}
      {state.phase === 'error' && (
        <Message icon={<CameraOff className="size-10" aria-hidden />} text={state.message}>
          <Button size="lg" variant="secondary" onClick={() => void start()}>
            Intentar de nuevo
          </Button>
        </Message>
      )}
    </div>
  );
}

function CameraButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg bg-carbon-950/60 p-2.5 text-white hover:bg-carbon-950/80"
    >
      {children}
    </button>
  );
}

function Message({ icon, text, children }: { icon: ReactNode; text: string; children?: ReactNode }) {
  return (
    <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-carbon-200">
      {icon}
      <p className="text-sm leading-relaxed">{text}</p>
      {children}
    </div>
  );
}
