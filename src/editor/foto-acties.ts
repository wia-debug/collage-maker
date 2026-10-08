import type { AssetStore } from '../assets/store';
import { maakFoto } from '../document/create';
import { FORMATEN } from '../document/formats';
import type { FotoElement } from '../document/types';
import { pasIn, verkleinAfbeelding } from '../import/afbeelding';
import type { Editor } from './store';
import { dekUitsnede } from './uitsnede';

export async function voegFotoToe(editor: Editor, assets: AssetStore, blob: Blob, opties: { positie?: { x: number; y: number }; vakId?: string } = {}): Promise<void> {
  const klein = await verkleinAfbeelding(blob);
  const id = await assets.addBlob(klein);
  const img = assets.image(id)!;
  const { collage } = editor.get();
  const vak = opties.vakId ? (collage.elementen.find((e) => e.id === opties.vakId) as FotoElement | undefined) : undefined;
  if (vak) {
    editor.update(vak.id, { assetId: id, uitsnede: dekUitsnede(img.naturalWidth, img.naturalHeight, vak.breedte, vak.hoogte) });
    return;
  }
  const f = FORMATEN[collage.formaat];
  const maat = pasIn(img.naturalWidth, img.naturalHeight, Math.min(f.breedte, f.hoogte) * 0.6);
  editor.add(maakFoto({ x: opties.positie?.x ?? f.breedte / 2, y: opties.positie?.y ?? f.hoogte / 2, breedte: maat.breedte, hoogte: maat.hoogte, assetId: id }));
}
