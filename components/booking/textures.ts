import * as THREE from 'three';

// Lightweight procedural canvas textures so we don't need external asset files.
// Each function returns a cached THREE.CanvasTexture.

const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number] = [1, 1]) {
  if (cache.has(key)) return cache.get(key)!;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

// Oak wood plank texture
export const woodTexture = () =>
  make('wood', 512, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#6b4a2b');
    g.addColorStop(0.5, '#7a5738');
    g.addColorStop(1, '#5a3f24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // grain lines
    for (let i = 0; i < 80; i++) {
      ctx.strokeStyle = `rgba(40,22,10,${0.05 + Math.random() * 0.12})`;
      ctx.lineWidth = 0.5 + Math.random() * 1.2;
      ctx.beginPath();
      const y = Math.random() * s;
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 8) {
        ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 2 + (Math.random() - 0.5) * 1.5);
      }
      ctx.stroke();
    }
    // plank seams
    const plankH = s / 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * plankH);
      ctx.lineTo(s, i * plankH);
      ctx.stroke();
    }
    // knots
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = 3 + Math.random() * 6;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(30,15,5,0.9)');
      rg.addColorStop(1, 'rgba(30,15,5,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [4, 3]);

// Marble texture
export const marbleTexture = () =>
  make('marble', 512, (ctx, s) => {
    ctx.fillStyle = '#f5efe2';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(120,100,70,${0.05 + Math.random() * 0.2})`;
      ctx.lineWidth = 0.4 + Math.random() * 1.5;
      ctx.beginPath();
      let x = Math.random() * s, y = Math.random() * s;
      ctx.moveTo(x, y);
      for (let j = 0; j < 20; j++) {
        x += (Math.random() - 0.5) * 40;
        y += (Math.random() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // gold veins
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(200,160,60,${0.25 + Math.random() * 0.3})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      let x = Math.random() * s, y = Math.random() * s;
      ctx.moveTo(x, y);
      for (let j = 0; j < 15; j++) {
        x += (Math.random() - 0.5) * 50;
        y += (Math.random() - 0.5) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });

// Wallpaper — subtle damask / linen
export const wallpaperTexture = (base: string) =>
  make(`wall-${base}`, 256, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    // linen weave
    for (let i = 0; i < s; i += 2) {
      ctx.fillStyle = i % 4 === 0 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(i, 0, 1, s);
      ctx.fillRect(0, i, s, 1);
    }
    // damask motif
    ctx.strokeStyle = 'rgba(140,100,40,0.08)';
    ctx.lineWidth = 1;
    for (let y = 0; y < s; y += 64) {
      for (let x = 0; x < s; x += 64) {
        ctx.beginPath();
        ctx.arc(x + 32, y + 32, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 32, y + 32, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [3, 2]);

// Carpet / rug pattern — oriental motif
export const rugTexture = (accent: string) =>
  make(`rug-${accent}`, 512, (ctx, s) => {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, s, s);
    // dark field
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(30, 30, s - 60, s - 60);
    // ornate border
    ctx.strokeStyle = '#f3e0a8';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, s - 40, s - 40);
    ctx.strokeRect(40, 40, s - 80, s - 80);
    // central medallion
    const cx = s / 2, cy = s / 2;
    ctx.strokeStyle = '#f3e0a8';
    ctx.lineWidth = 2;
    for (let r = 40; r < 180; r += 20) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.9;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    // corner flourishes
    ctx.fillStyle = '#f3e0a8';
    [[60, 60], [s - 60, 60], [60, s - 60], [s - 60, s - 60]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    });
    // grain noise
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
  });

// Abstract painting for wall art
export const artTexture = (accent: string) =>
  make(`art-${accent}`, 512, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, accent);
    g.addColorStop(0.6, '#2a1810');
    g.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // brush strokes
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(243,224,168,${0.1 + Math.random() * 0.4})`;
      ctx.lineWidth = 1 + Math.random() * 6;
      ctx.beginPath();
      const x1 = Math.random() * s, y1 = Math.random() * s;
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(
        x1 + (Math.random() - 0.5) * 200,
        y1 + (Math.random() - 0.5) * 200,
        x1 + (Math.random() - 0.5) * 300,
        y1 + (Math.random() - 0.5) * 300
      );
      ctx.stroke();
    }
    // gold splashes
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(227,171,50,${0.3 + Math.random() * 0.5})`;
      const x = Math.random() * s, y = Math.random() * s;
      ctx.beginPath();
      ctx.arc(x, y, 2 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Tile mosaic (for jacuzzi surround)
export const tileTexture = () =>
  make('tile', 256, (ctx, s) => {
    ctx.fillStyle = '#1a3a44';
    ctx.fillRect(0, 0, s, s);
    const t = 32;
    for (let y = 0; y < s; y += t) {
      for (let x = 0; x < s; x += t) {
        const v = Math.random();
        ctx.fillStyle = v < 0.25 ? '#2a6b7d' : v < 0.5 ? '#3a8ba3' : v < 0.75 ? '#1a4d5c' : '#0f2e36';
        ctx.fillRect(x + 1, y + 1, t - 2, t - 2);
        // highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x + 1, y + 1, t - 2, 2);
      }
    }
  }, [2, 2]);

// Window view — soft blurred skyline/garden
export const windowViewTexture = () =>
  make('window-view', 512, (ctx, s) => {
    // sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, s);
    sky.addColorStop(0, '#c8d9e8');
    sky.addColorStop(0.4, '#f0c9a8');
    sky.addColorStop(0.7, '#e6a888');
    sky.addColorStop(1, '#5a6b7e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, s, s);
    // distant skyline silhouette
    ctx.fillStyle = 'rgba(30,40,60,0.75)';
    const base = s * 0.72;
    for (let x = 0; x < s; x += 18 + Math.random() * 20) {
      const h = 30 + Math.random() * 120;
      ctx.fillRect(x, base - h, 14 + Math.random() * 16, h);
    }
    // sun
    const sx = s * 0.7, sy = s * 0.5;
    const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 80);
    rg.addColorStop(0, 'rgba(255,230,170,0.95)');
    rg.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(sx, sy, 80, 0, Math.PI * 2);
    ctx.fill();
    // foliage in foreground
    ctx.fillStyle = 'rgba(20,60,40,0.6)';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * s, s * 0.85 + Math.random() * s * 0.15, 20 + Math.random() * 30, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Bedding pattern — subtle quilted
export const beddingTexture = (base: string) =>
  make(`bed-${base}`, 256, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.6;
    const g = 32;
    for (let y = 0; y < s; y += g) {
      for (let x = 0; x < s; x += g) {
        ctx.beginPath();
        ctx.moveTo(x, y + g);
        ctx.lineTo(x + g, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + g, y + g);
        ctx.stroke();
      }
    }
  }, [2, 2]);
