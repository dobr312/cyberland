import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface CanisterIDInfo {
  name: string;
  envVar: string;
  correctId: string;
  currentId: string;
  isCorrect: boolean;
}

export function CanisterIDVerification() {
  const canisters: CanisterIDInfo[] = [
    {
      name: 'Land Canister',
      envVar: 'VITE_LAND_CANISTER_ID',
      correctId: 'br5f7-7uaaa-aaaaa-qaaca-cai',
      currentId: import.meta.env.VITE_LAND_CANISTER_ID || import.meta.env.CANISTER_ID_BACKEND || 'не настроено',
      isCorrect: false,
    },
    {
      name: 'Cyber Token Canister',
      envVar: 'VITE_CYBER_TOKEN_CANISTER_ID',
      correctId: 'w4q3i-7yaaa-aaaam-ab3oq-cai',
      currentId: import.meta.env.VITE_CYBER_TOKEN_CANISTER_ID || import.meta.env.CANISTER_ID_CYBER_TOKEN || 'не настроено',
      isCorrect: false,
    },
    {
      name: 'Asset Canister',
      envVar: 'VITE_ASSET_CANISTER_ID',
      correctId: 'bd3sg-teaaa-aaaaa-qaaba-cai',
      currentId: import.meta.env.VITE_ASSET_CANISTER_ID || import.meta.env.CANISTER_ID_ASSET_CANISTER || 'не настроено',
      isCorrect: false,
    },
    {
      name: 'Marketplace Canister',
      envVar: 'VITE_MARKETPLACE_CANISTER_ID',
      correctId: 'be2us-64aaa-aaaaa-qaabq-cai',
      currentId: import.meta.env.VITE_MARKETPLACE_CANISTER_ID || import.meta.env.CANISTER_ID_MARKETPLACE || 'не настроено',
      isCorrect: false,
    },
    {
      name: 'Governance Canister',
      envVar: 'VITE_GOVERNANCE_CANISTER_ID',
      correctId: 'bkyz2-fmaaa-aaaaa-qaaaq-cai',
      currentId: import.meta.env.VITE_GOVERNANCE_CANISTER_ID || import.meta.env.CANISTER_ID_GOVERNANCE || 'не настроено',
      isCorrect: false,
    },
  ];

  // Check if IDs are correct
  canisters.forEach(canister => {
    canister.isCorrect = canister.currentId === canister.correctId;
  });

  const allCorrect = canisters.every(c => c.isCorrect);
  const hasErrors = canisters.some(c => !c.isCorrect);

  return (
    <Card className="w-full max-w-4xl mx-auto bg-black/40 backdrop-blur-md border-cyan-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          {allCorrect ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : (
            <AlertCircle className="w-6 h-6 text-yellow-400" />
          )}
          Проверка ID канистр
        </CardTitle>
        <CardDescription className="text-gray-300">
          {allCorrect
            ? 'Все идентификаторы канистр настроены правильно ✓'
            : 'Обнаружены несоответствия в идентификаторах канистр'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canisters.map((canister) => (
          <div
            key={canister.name}
            className={`p-4 rounded-lg border ${
              canister.isCorrect
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {canister.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <h3 className="font-semibold text-white">{canister.name}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-400 min-w-[140px]">Переменная:</span>
                    <code className="text-cyan-300 font-mono">{canister.envVar}</code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 min-w-[140px]">Правильный ID:</span>
                    <code className="text-green-300 font-mono">{canister.correctId}</code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 min-w-[140px]">Текущий ID:</span>
                    <code
                      className={`font-mono ${
                        canister.isCorrect ? 'text-green-300' : 'text-red-300'
                      }`}
                    >
                      {canister.currentId}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {hasErrors && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Инструкции по исправлению
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Откройте файл <code className="text-cyan-300 font-mono">frontend/.env</code></li>
              <li>Обновите неправильные идентификаторы канистр на правильные значения</li>
              <li>Сохраните файл и пересоберите проект: <code className="text-cyan-300 font-mono">npm run build</code></li>
              <li>Перезапустите приложение: <code className="text-cyan-300 font-mono">npm start</code></li>
            </ol>
          </div>
        )}

        {allCorrect && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Проверка пройдена успешно
            </h4>
            <p className="text-sm text-gray-300">
              Все идентификаторы канистр настроены правильно. Соединение с backend должно работать корректно.
            </p>
            <div className="mt-3 p-3 bg-black/30 rounded border border-cyan-500/20">
              <p className="text-xs text-gray-400 mb-2">Для финальной валидации выполните:</p>
              <code className="text-cyan-300 font-mono text-xs">
                dfx canister list --network ic
              </code>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="font-semibold text-blue-400 mb-2">Справочная информация</h4>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              <strong className="text-white">Land Canister:</strong> Основной backend канистр для управления землями
            </p>
            <p>
              <strong className="text-white">Cyber Token Canister:</strong> ICRC-1 токен канистр (CBR)
            </p>
            <p>
              <strong className="text-white">Asset Canister:</strong> Хранилище 3D моделей и ассетов
            </p>
            <p>
              <strong className="text-white">Marketplace Canister:</strong> P2P торговая площадка
            </p>
            <p>
              <strong className="text-white">Governance Canister:</strong> DAO управление и голосование
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

