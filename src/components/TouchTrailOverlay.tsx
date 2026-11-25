import React, { useEffect, useRef } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  t: number;
  hue: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
  size: number;
}

export function TouchTrailOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points: TrailPoint[] = [];
    const sparks: Spark[] = [];
    let isDragging = false;
    let hueBase = 150;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const addPoint = (x: number, y: number) => {
      hueBase = (hueBase + 6) % 360;
      const now = performance.now();
      points.push({ x, y, t: now, hue: hueBase });
      if (points.length > 38) points.shift();
      if (Math.random() < 0.7) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 28 + Math.random() * 75;
        sparks.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.42,
          hue: (hueBase + 45) % 360,
          size: 2 + Math.random() * 2.8
        });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      addPoint(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging && e.pointerType !== 'mouse') return;
      if (isDragging || e.buttons > 0) {
        addPoint(e.clientX, e.clientY);
      }
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onTouchStart = (e: TouchEvent) => {
      isDragging = true;
      for (let i = 0; i < e.touches.length; i++) {
        addPoint(e.touches[i].clientX, e.touches[i].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      isDragging = true;
      for (let i = 0; i < e.touches.length; i++) {
        addPoint(e.touches[i].clientX, e.touches[i].clientY);
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });

    let rafId = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      while (points.length > 0 && now - points[0].t > 320) {
        points.shift();
      }

      if (points.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < points.length; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const age = (now - p1.t) / 320;
          const alpha = Math.max(0, 1 - age);
          const ratio = i / points.length;
          const width = 2.5 + ratio * 10 * alpha;

          // Outer plasma ribbon
          ctx.strokeStyle = `hsla(${p1.hue}, 96%, 62%, ${alpha * 0.88})`;
          ctx.shadowColor = `hsla(${p1.hue}, 100%, 60%, ${alpha})`;
          ctx.shadowBlur = 18;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();

          // Bright white energy core
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.65})`;
          ctx.shadowBlur = 0;
          ctx.lineWidth = Math.max(1, width * 0.35);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        const lastPt = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.shadowColor = `hsla(${lastPt.hue}, 100%, 70%, 1)`;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const a = Math.max(0, sp.life / 0.42);
        ctx.save();
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * a, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${sp.hue}, 100%, 74%, ${a})`;
        ctx.shadowColor = `hsla(${sp.hue}, 100%, 65%, ${a})`;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-40" aria-hidden="true" />;
}
