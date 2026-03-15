import { useEffect, useRef } from 'react';

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nebulaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      preRenderNebula(); // Перерисовываем кэш при ресайзе
    };

    // --- КЭШИРОВАНИЕ ТУМАННОСТЕЙ ---
    const preRenderNebula = () => {
      const nCanvas = document.createElement('canvas');
      nCanvas.width = canvas.width;
      nCanvas.height = canvas.height;
      const nCtx = nCanvas.getContext('2d');
      if (!nCtx) return;

      const nebulaColors = ['rgba(0, 119, 255, 0.15)', 'rgba(157, 0, 255, 0.12)', 'rgba(0, 255, 136, 0.1)'];
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * nCanvas.width;
        const y = Math.random() * nCanvas.height;
        const r = Math.random() * 400 + 200;
        const g = nCtx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, nebulaColors[i % nebulaColors.length]);
        g.addColorStop(1, 'transparent');
        nCtx.fillStyle = g;
        nCtx.fillRect(0, 0, nCanvas.width, nCanvas.height);
      }
      nebulaCanvasRef.current = nCanvas;
    };

    resize();
    window.addEventListener('resize', resize);

    // Конфиг звезд
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * canvas.width,
      size: Math.random() * 1.5 + 0.5,
      color: ['#00f3ff', '#9d00ff', '#00ffaa', '#ff00ff', '#ffffff'][Math.floor(Math.random() * 5)],
      twinkle: Math.random() * Math.PI * 2,
    }));

    const animate = () => {
      ctx.fillStyle = '#010103';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Рисуем туманности из кэша (Пульсация через прозрачность всего слоя)
      if (nebulaCanvasRef.current) {
        ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 2000) * 0.2;
        ctx.drawImage(nebulaCanvasRef.current, 0, 0);
        ctx.globalAlpha = 1;
      }

      stars.forEach(s => {
        s.z -= 0.8;
        if (s.z <= 0) s.z = canvas.width;

        const x = (s.x - canvas.width / 2) * (canvas.width / s.z) + canvas.width / 2;
        const y = (s.y - canvas.height / 2) * (canvas.width / s.z) + canvas.height / 2;
        const size = s.size * (canvas.width / s.z) * 0.4;

        if (x > 0 && x < canvas.width && y > 0 && y < canvas.height) {
          const alpha = 0.5 + Math.sin(s.twinkle += 0.02) * 0.5;
          ctx.fillStyle = s.color;
          ctx.globalAlpha = alpha;
          ctx.fillRect(x, y, size, size); // Квадраты быстрее кругов!
          ctx.globalAlpha = 1;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
}
