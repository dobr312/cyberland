import React, { useEffect, useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { useActorWithInit } from './hooks/useActorWithInit';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './components/ProfileSetup';
import CosmicBackground from './components/CosmicBackground';
import ConfigValidator from './components/ConfigValidator';
import ReinitializationProgress from './components/ReinitializationProgress';
import AdminPanel from './components/AdminPanel';
import { useActorReinitializer } from './hooks/useActorReinitializer';
import { Loader2, AlertTriangle, RefreshCw, Network, CheckCircle } from 'lucide-react';

export default function App() {
  const { identity, isInitializing: identityInitializing } = useInternetIdentity();
  const { isInitialized: actorInitialized, isInitializing: actorInitializing, error: actorError } = useActorWithInit();
  const reinitializer = useActorReinitializer();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isAppMounted, setIsAppMounted] = useState(false);

  const isAuthenticated = !!identity;

  // Mark app as mounted after initial render
  useEffect(() => {
    if (!identityInitializing && !actorInitializing) {
      setIsAppMounted(true);
    }
  }, [identityInitializing, actorInitializing]);

  // Determine if we should show the profile setup modal
  useEffect(() => {
    if (isAuthenticated && !profileLoading && profileFetched && userProfile === null) {
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, profileLoading, profileFetched, userProfile]);

  // Show reinitialization progress overlay
  if (reinitializer.isReinitializing) {
    return (
      <>
        <CosmicBackground />
        <ReinitializationProgress
          attempt={reinitializer.attempt}
          maxAttempts={3}
          currentGateway={reinitializer.currentGateway}
        />
      </>
    );
  }

  // Loading state - show while identity or actor is initializing
  if (identityInitializing || (isAuthenticated && actorInitializing)) {
    return (
      <>
        <CosmicBackground />
        <ConfigValidator />
        <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
          <div className="text-center space-y-6 p-8 glassmorphism rounded-lg border border-[#00ff41]/30 box-glow-green max-w-3xl">
            <Loader2 className="w-16 h-16 animate-spin text-[#00ff41] mx-auto" />
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-[#00ff41] tracking-wider font-orbitron text-glow-green">
                ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ
              </h2>
              <p className="text-[#00d4ff] text-sm tracking-wide font-jetbrains">
                {identityInitializing ? 'Загрузка аутентификации...' : 'Подключение к блокчейну Internet Computer...'}
              </p>
              
              <div className="glassmorphism p-6 rounded border border-[#00ff41]/20 mt-4">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Network className="w-6 h-6 text-[#00d4ff]" />
                  <h3 className="text-[#00d4ff] font-bold text-base font-orbitron">МАКСИМАЛЬНАЯ СТАБИЛЬНОСТЬ</h3>
                </div>
                <div className="space-y-2 text-xs font-mono text-left font-jetbrains">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-[#00ff41] mt-0.5 flex-shrink-0" />
                    <p className="text-[#00ff41]/80">
                      <span className="text-[#00d4ff] font-bold">Таймаут:</span> 120 секунд (максимально рекомендуемый)
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-[#00ff41] mt-0.5 flex-shrink-0" />
                    <p className="text-[#00ff41]/80">
                      <span className="text-[#00d4ff] font-bold">Попытки повтора:</span> 25 попыток с экспоненциальной задержкой (1с → 45с)
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-[#00ff41] mt-0.5 flex-shrink-0" />
                    <p className="text-[#00ff41]/80">
                      <span className="text-[#00d4ff] font-bold">Основной шлюз:</span> https://ic0.app (официальный DFINITY)
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-[#00ff41] mt-0.5 flex-shrink-0" />
                    <p className="text-[#00ff41]/80">
                      <span className="text-[#00d4ff] font-bold">Резервные шлюзы:</span> boundary.ic0.app, icp-api.io (автоматическое переключение)
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-[#00ff41] mt-0.5 flex-shrink-0" />
                    <p className="text-[#00ff41]/80">
                      <span className="text-[#00d4ff] font-bold">Опрос данных:</span> 25 попыток с 4 проверками работоспособности
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-[#00ff41] mt-0.5 flex-shrink-0" />
                    <p className="text-[#00ff41]/80">
                      <span className="text-[#00d4ff] font-bold">Синхронизация:</span> Полная синхронизация конфигурации фронтенда/бэкенда
                    </p>
                  </div>
                </div>
              </div>

              <div className="glassmorphism p-4 rounded border border-[#00d4ff]/20 mt-4">
                <p className="text-[#00d4ff]/90 text-xs leading-relaxed font-jetbrains">
                  Установка стабильного соединения с автоматическим переключением шлюзов и комплексными проверками подключения ко всем пяти канистрам...
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state - show if actor initialization failed
  if (isAuthenticated && actorError) {
    return (
      <>
        <CosmicBackground />
        <ConfigValidator />
        <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
          <div className="max-w-3xl mx-auto p-8 glassmorphism rounded-lg border border-red-500/50 box-glow-gold">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="w-12 h-12 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-red-500 mb-4 tracking-wider font-orbitron">
                  ОШИБКА ПОДКЛЮЧЕНИЯ
                </h2>
                <p className="text-red-300 mb-4 leading-relaxed font-jetbrains">
                  Не удалось установить стабильное соединение с сетью Internet Computer после множественных попыток повтора с таймаутом 120 секунд, экспоненциальной задержкой (25 попыток) и автоматическим переключением шлюзов.
                </p>
                
                <div className="glassmorphism border border-red-500/30 rounded p-4 mb-4">
                  <p className="text-red-300 text-xs font-mono break-all font-jetbrains">
                    <strong>Детали ошибки:</strong> {String(actorError)}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <h3 className="text-red-100 font-bold text-sm font-orbitron">ШАГИ ПО УСТРАНЕНИЮ НЕПОЛАДОК:</h3>
                  <ul className="list-disc list-inside space-y-2 text-red-200 text-sm font-jetbrains">
                    <li>Проверьте стабильность вашего интернет-соединения</li>
                    <li>Убедитесь, что VITE_DFX_NETWORK установлен на "ic" в файле .env</li>
                    <li>Подтвердите правильность настройки всех ID канистр:
                      <ul className="list-circle list-inside ml-6 mt-1 space-y-1 text-xs">
                        <li>VITE_LAND_CANISTER_ID (br5f7-7uaaa-aaaaa-qaaca-cai)</li>
                        <li>VITE_ASSET_CANISTER_ID (bd3sg-teaaa-aaaaa-qaaba-cai)</li>
                        <li>VITE_CYBER_TOKEN_CANISTER_ID (w4q3i-7yaaa-aaaam-ab3oq-cai)</li>
                        <li>VITE_MARKETPLACE_CANISTER_ID (be2us-64aaa-aaaaa-qaabq-cai)</li>
                        <li>VITE_GOVERNANCE_CANISTER_ID (bkyz2-fmaaa-aaaaa-qaaaq-cai)</li>
                      </ul>
                    </li>
                    <li>Убедитесь, что канистры развернуты и работают в основной сети IC</li>
                    <li>Попробуйте очистить кэш браузера и перезагрузить страницу</li>
                    <li>Проверьте доступность шлюзов: ic0.app, boundary.ic0.app, icp-api.io</li>
                  </ul>
                </div>

                <div className="glassmorphism p-4 rounded border border-red-500/30 mb-4">
                  <h3 className="text-red-100 font-bold mb-2 text-sm font-orbitron">КОНФИГУРАЦИЯ СЕТИ:</h3>
                  <div className="space-y-1 text-xs font-mono font-jetbrains">
                    <p className="text-red-200">Сеть: <span className="text-[#00d4ff]">{import.meta.env.VITE_DFX_NETWORK || 'НЕ УСТАНОВЛЕНО'}</span></p>
                    <p className="text-red-200">Основной шлюз: <span className="text-[#00d4ff]">https://ic0.app (официальный DFINITY)</span></p>
                    <p className="text-red-200">Резервные шлюзы: <span className="text-[#00d4ff]">boundary.ic0.app, icp-api.io</span></p>
                    <p className="text-red-200">Таймаут: <span className="text-[#00d4ff]">120 секунд</span></p>
                    <p className="text-red-200">Логика повтора: <span className="text-[#00d4ff]">25 попыток с экспоненциальной задержкой</span></p>
                    <p className="text-red-200">Опрос данных: <span className="text-[#00d4ff]">25 попыток с 4 проверками работоспособности</span></p>
                  </div>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 font-orbitron"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Повторить подключение</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Not authenticated - show landing page
  if (!isAuthenticated) {
    return (
      <>
        <CosmicBackground />
        <ConfigValidator />
        <LandingPage />
      </>
    );
  }

  // Authenticated - show profile setup if needed, otherwise show dashboard
  return (
    <>
      <CosmicBackground />
      <ConfigValidator />
      {showProfileSetup && <ProfileSetup />}
      {!showProfileSetup && <Dashboard />}
      {/* AdminPanel renders after main app is mounted - safe, non-blocking */}
      {isAppMounted && <AdminPanel />}
    </>
  );
}
