export async function dataUrlNaarBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

export function bestandsnaam(naam: string, ext: 'png' | 'pdf' | 'collage', datum = new Date()): string {
  const slug = naam.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'collage';
  const d = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
  return `${slug}-${d}.${ext}`;
}

export async function bewaarBestand(blob: Blob, naam: string): Promise<'gedeeld' | 'gedownload' | 'geannuleerd'> {
  const file = new File([blob], naam, { type: blob.type });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'gedeeld';
    } catch (e) {
      const naam = (e as DOMException).name;
      if (naam === 'AbortError' || naam === 'InvalidStateError') return 'geannuleerd';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = naam;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'gedownload';
}
