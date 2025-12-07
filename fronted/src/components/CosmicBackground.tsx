import { useEffect, useRef } from 'react';

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Star field configuration
    const stars: Array<{
      x: number;
      y: number;
      z: number;
      size: number;
      speed: number;
      color: string;
      twinkle: number;
      twinkleSpeed: number;
    }> = [];

    const numStars = 250;
    const colors = [
      'rgba(0, 243, 255, 0.9)', // Neon cyan
      'rgba(0, 255, 150, 0.8)', // Neon green
      'rgba(138, 43, 226, 0.7)', // Cyber purple
      'rgba(0, 191, 255, 0.8)', // Cyber blue
      'rgba(255, 255, 255, 0.6)', // White
    ];

    // Initialize stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
        size: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 0.2 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Nebula particles with enhanced colors
    const nebulae: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      alpha: number;
      drift: number;
      pulse: number;
      pulseSpeed: number;
    }> = [];

    const numNebulae = 12;
    const nebulaColors = [
      'rgba(0, 243, 255, 0.15)', // Neon cyan
      'rgba(0, 255, 150, 0.12)', // Neon green
      'rgba(138, 43, 226, 0.1)', // Cyber purple
      'rgba(0, 191, 255, 0.13)', // Cyber blue
    ];

    for (let i = 0; i < numNebulae; i++) {
      nebulae.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 200 + 150,
        color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
        alpha: Math.random() * 0.08 + 0.04,
        drift: Math.random() * 0.15 - 0.075,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.01 + 0.005,
      });
    }

    let animationFrameId: number;

    const animate = () => {
      // Dark cosmic background with slight fade
      ctx.fillStyle = 'rgba(10, 10, 20, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw nebulae with pulsing effect
      nebulae.forEach((nebula) => {
        const pulseAlpha = nebula.alpha + Math.sin(nebula.pulse) * 0.02;
        const gradient = ctx.createRadialGradient(
          nebula.x,
          nebula.y,
          0,
          nebula.x,
          nebula.y,
          nebula.radius
        );
        
        const colorWithAlpha = nebula.color.replace(/[\d.]+\)$/g, `${pulseAlpha})`);
        gradient.addColorStop(0, colorWithAlpha);
        gradient.addColorStop(0.5, nebula.color.replace(/[\d.]+\)$/g, `${pulseAlpha * 0.5})`));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update nebula position and pulse
        nebula.x += nebula.drift;
        nebula.pulse += nebula.pulseSpeed;
        
        if (nebula.x > canvas.width + nebula.radius) nebula.x = -nebula.radius;
        if (nebula.x < -nebula.radius) nebula.x = canvas.width + nebula.radius;
      });

      // Draw stars with twinkling effect
      stars.forEach((star) => {
        const x = (star.x - canvas.width / 2) * (canvas.width / star.z) + canvas.width / 2;
        const y = (star.y - canvas.height / 2) * (canvas.width / star.z) + canvas.height / 2;
        const size = star.size * (canvas.width / star.z);
        const twinkleAlpha = 0.5 + Math.sin(star.twinkle) * 0.5;

        if (x >= -50 && x <= canvas.width + 50 && y >= -50 && y <= canvas.height + 50) {
          const colorWithTwinkle = star.color.replace(/[\d.]+\)$/g, `${twinkleAlpha})`);
          ctx.fillStyle = colorWithTwinkle;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();

          // Enhanced glow effect for larger stars
          if (size > 1.2) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = star.color;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Move stars and update twinkle
        star.z -= star.speed;
        star.twinkle += star.twinkleSpeed;
        
        if (star.z <= 0) {
          star.z = canvas.width;
          star.x = Math.random() * canvas.width;
          star.y = Math.random() * canvas.height;
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, background: 'linear-gradient(180deg, #0a0a14 0%, #050510 100%)' }}
    />
  );
}
