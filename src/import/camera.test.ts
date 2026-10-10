import { describe, it, expect } from 'vitest';
import { CameraFout, startCamera, stopCamera } from './camera';

const fout = (name: string) => ({ getUserMedia: () => Promise.reject(new DOMException('x', name)) });

describe('camera', () => {
  it('geweigerd geeft CameraFout geweigerd', async () => {
    await expect(startCamera('user', fout('NotAllowedError'))).rejects.toMatchObject({ code: 'geweigerd' });
  });
  it('geen toestel geeft geen-camera', async () => {
    await expect(startCamera('user', fout('NotFoundError'))).rejects.toMatchObject({ code: 'geen-camera' });
    await expect(startCamera('user', {} as MediaDevices)).rejects.toBeInstanceOf(CameraFout);
  });
  it('vraagt de gekozen kant en stopCamera stopt alle tracks', async () => {
    let gevraagd: MediaStreamConstraints | undefined;
    let gestopt = 0;
    const stroom = { getTracks: () => [{ stop: () => gestopt++ }, { stop: () => gestopt++ }] } as unknown as MediaStream;
    const s = await startCamera('environment', { getUserMedia: async (c) => { gevraagd = c; return stroom; } });
    expect(gevraagd).toEqual({ video: { facingMode: 'environment' }, audio: false });
    stopCamera(s);
    expect(gestopt).toBe(2);
    stopCamera(null);
  });
});
