export class CameraFout extends Error {
  constructor(public code: 'geweigerd' | 'geen-camera') { super(code); }
}

type Media = Pick<MediaDevices, 'getUserMedia'>;
const standaard = (): Media | undefined => navigator.mediaDevices;

export async function startCamera(kant: 'user' | 'environment', md: Media | undefined = standaard()): Promise<MediaStream> {
  if (!md?.getUserMedia) throw new CameraFout('geen-camera');
  try {
    return await md.getUserMedia({ video: { facingMode: kant }, audio: false });
  } catch (e) {
    const naam = (e as DOMException)?.name;
    throw new CameraFout(naam === 'NotAllowedError' || naam === 'SecurityError' ? 'geweigerd' : 'geen-camera');
  }
}

export function stopCamera(s: MediaStream | null): void {
  for (const t of s?.getTracks() ?? []) t.stop();
}

export async function aantalCameras(md: Pick<MediaDevices, 'enumerateDevices'> | undefined = navigator.mediaDevices): Promise<number> {
  try { return (await md!.enumerateDevices()).filter((d) => d.kind === 'videoinput').length; } catch { return 0; }
}

export function neemFoto(video: HTMLVideoElement): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext('2d')!.drawImage(video, 0, 0);
  return new Promise((klaar, mis) => c.toBlob((b) => (b ? klaar(b) : mis(new CameraFout('geen-camera'))), 'image/jpeg', 0.9));
}
