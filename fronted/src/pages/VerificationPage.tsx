import React from 'react';
import { CanisterIDVerification } from '../components/CanisterIDVerification';
import CosmicBackground from '../components/CosmicBackground';

export function VerificationPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <CosmicBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-4">
            Проверка конфигурации канистр
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Эта страница проверяет правильность настройки идентификаторов всех канистр проекта.
            Убедитесь, что все ID соответствуют развернутым канистрам в сети IC.
          </p>
        </div>

        <CanisterIDVerification />

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-cyan-500/50"
          >
            Вернуться на главную
          </a>
        </div>
      </div>
    </div>
  );
}

