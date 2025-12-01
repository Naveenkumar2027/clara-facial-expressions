import React, { useEffect, useRef } from 'react';

interface ParticleSphereProps {
  amplitude: number;
  isConnected: boolean;
}

const ParticleSphere: React.FC<ParticleSphereProps> = ({ amplitude, isConnected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amplitudeRef = useRef(0);

  // Keep amplitude ref up to date for the animation loop
  useEffect(() => {
    amplitudeRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: { x: number; y: number; z: number }[] = [];
    const particleCount = 2000;
    const baseRadius = 180;

    // Initialize Fibonacci Sphere
    for (let i = 0; i < particleCount; i++) {
      const y = 1 - (i / (particleCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const phi = i * Math.PI * (3 - Math.sqrt(5));

      const x = Math.cos(phi) * radiusAtY;
      const z = Math.sin(phi) * radiusAtY;

      particles.push({ x, y, z });
    }

    let animationFrameId: number;
    let rotationY = 0;
    let rotationX = 0;

    const render = () => {
      // Handle Canvas Resize
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Fade background slightly for trails? No, strict black for Comet look
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!isConnected) {
        // Render nothing when not connected (screen is black, waiting for wake)
        // Or render a tiny faint dot center
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      rotationY += 0.003;
      rotationX += 0.001;

      // Audio Reactivity
      const currentAmp = amplitudeRef.current;
      const radius = baseRadius + (currentAmp * 150); // Expand sphere

      ctx.fillStyle = '#ffffff';

      particles.forEach((p) => {
        // Rotation
        let x = p.x;
        let y = p.y;
        let z = p.z;

        // Rotate Y
        let rx = x * Math.cos(rotationY) - z * Math.sin(rotationY);
        let rz = x * Math.sin(rotationY) + z * Math.cos(rotationY);
        x = rx; z = rz;

        // Rotate X (tumble)
        let ry = y * Math.cos(rotationX) - z * Math.sin(rotationX);
        rz = y * Math.sin(rotationX) + z * Math.cos(rotationX);
        y = ry; z = rz;

        // Projection
        const perspective = 400;
        const scale = perspective / (perspective + z + baseRadius); 
        const px = cx + x * radius * scale;
        const py = cy + y * radius * scale;

        // Opacity based on depth
        const alpha = Math.max(0.1, (z + 1) / 2);
        
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        // Dot size varies slightly with audio too
        const size = (1.5 * scale) + (currentAmp * scale * 2); 
        ctx.rect(px, py, size, size);
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isConnected]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-10" 
    />
  );
};

export default ParticleSphere;