<script lang="ts">
  import { confetti } from '../feedback/animatie';
  let canvas = $state<HTMLCanvasElement>();
  let actief = $state(false);
  const KLEUREN = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF'];
  type Deel = { x: number; y: number; vx: number; vy: number; r: number; draai: number; vorm: 0 | 1 | 2; kleur: string };

  function tekenVorm(c: CanvasRenderingContext2D, d: Deel) {
    c.save(); c.translate(d.x, d.y); c.rotate(d.draai); c.fillStyle = d.kleur; c.beginPath();
    if (d.vorm === 0) { for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, s = i % 2 ? d.r / 2 : d.r; c.lineTo(Math.cos(a) * s, Math.sin(a) * s); } }
    else if (d.vorm === 1) { c.moveTo(0, d.r / 2); c.bezierCurveTo(-d.r, -d.r / 3, -d.r / 2, -d.r, 0, -d.r / 3); c.bezierCurveTo(d.r / 2, -d.r, d.r, -d.r / 3, 0, d.r / 2); }
    else c.arc(0, 0, d.r / 2, 0, Math.PI * 2);
    c.fill(); c.restore();
  }

  function start() {
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    canvas.width = innerWidth; canvas.height = innerHeight;
    const delen: Deel[] = Array.from({ length: 80 }, (_, i) => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.3,
      vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 4, r: 10 + Math.random() * 10,
      draai: Math.random() * 6, vorm: (i % 3) as 0 | 1 | 2, kleur: KLEUREN[i % KLEUREN.length],
    }));
    const begin = performance.now();
    actief = true;
    const stap = (t: number) => {
      c.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const d of delen) { d.x += d.vx; d.y += d.vy; d.draai += 0.1; tekenVorm(c, d); }
      if (t - begin < 1500) requestAnimationFrame(stap); else { c.clearRect(0, 0, canvas!.width, canvas!.height); actief = false; }
    };
    requestAnimationFrame(stap);
  }

  $effect(() => { if ($confetti > 0) start(); });
</script>

<canvas bind:this={canvas} class="confetti" class:actief aria-hidden="true"></canvas>

<style>
  .confetti { position: fixed; inset: 0; pointer-events: none; z-index: 95; display: none; }
  .confetti.actief { display: block; }
</style>
