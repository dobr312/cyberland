import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Loader2 } from 'lucide-react';

function RotatingCube() {
  return (
    <mesh rotation={[0.5, 0.5, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial
        color="#00ff41"
        emissive="#00ff41"
        emissiveIntensity={0.5}
        wireframe
      />
    </mesh>
  );
}

export default function LandingPage() {
  const { login, loginStatus } = useInternetIdentity();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
    }
  };

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-4xl mx-auto text-center space-y-6">
          <div className="h-48 w-full mb-4">
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <RotatingCube />
              <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
            </Canvas>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight font-orbitron">
              <span className="text-[#00ff41] drop-shadow-[0_0_20px_rgba(0,255,65,0.5)] text-glow-green">
                КИБЕР
              </span>
              <span className="text-[#00d4ff] drop-shadow-[0_0_20px_rgba(0,212,255,0.5)] text-glow-teal">
                ГЕНЕЗИС
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl font-bold text-white/90 font-orbitron">
              ПОЛУЧИТЕ СВОЙ УЧАСТОК ГЕНЕЗИСА
            </p>
            
            <p className="text-base text-gray-400 max-w-2xl mx-auto font-jetbrains">
              Заявите права на свою виртуальную землю в Internet Computer. Создавайте, улучшайте и торгуйте уникальными NFT-участками в киберпанк-метавселенной.
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              size="lg"
              className="bg-[#00ff41] hover:bg-[#00ff41]/80 text-black font-bold text-lg px-10 py-5 rounded-full shadow-lg shadow-[#00ff41]/50 transition-all hover:shadow-[#00ff41]/70 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-orbitron box-glow-green"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Подключение...
                </>
              ) : (
                'Подключить Internet Identity'
              )}
            </Button>
          </div>

          <div className="pt-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="glassmorphism border border-[#00ff41]/30 rounded-lg p-5 box-glow-green">
                <h3 className="text-[#00ff41] font-bold text-base mb-2 font-orbitron text-glow-green">Создание земли</h3>
                <p className="text-gray-400 text-sm font-jetbrains">
                  Генерируйте уникальные участки с детерминированными координатами и редкими биомами
                </p>
              </div>
              
              <div className="glassmorphism border border-[#00d4ff]/30 rounded-lg p-5 box-glow-teal">
                <h3 className="text-[#00d4ff] font-bold text-base mb-2 font-orbitron text-glow-teal">Получение наград</h3>
                <p className="text-gray-400 text-sm font-jetbrains">
                  Получайте ежедневные токены CBR и улучшайте свою землю для более высокой доходности
                </p>
              </div>
              
              <div className="glassmorphism border border-purple-500/30 rounded-lg p-5 box-glow-purple">
                <h3 className="text-purple-400 font-bold text-base mb-2 font-orbitron text-glow-magenta">Торговля и управление</h3>
                <p className="text-gray-400 text-sm font-jetbrains">
                  P2P-маркетплейс и DAO-управление для сообщества
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
