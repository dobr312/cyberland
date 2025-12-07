import React from 'react';
import { Loader2, Network, RefreshCw } from 'lucide-react';

interface ReinitializationProgressProps {
  attempt: number;
  maxAttempts: number;
  currentGateway: string;
}

export default function ReinitializationProgress({
  attempt,
  maxAttempts,
  currentGateway,
}: ReinitializationProgressProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 p-6 bg-black/90 backdrop-blur-md rounded-lg border border-[#00d4ff]/50 shadow-[0_0_30px_rgba(0,212,255,0.4)]">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <RefreshCw className="w-8 h-8 text-[#00d4ff] animate-spin" />
          <h2 className="text-xl font-bold text-[#00d4ff] tracking-wider">
            ПЕРЕПОДКЛЮЧЕНИЕ
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#00ff41]" />
            <p className="text-[#00ff41] text-sm font-medium">
              Реинициализация соединения...
            </p>
          </div>

          <div className="bg-black/60 p-4 rounded border border-[#00d4ff]/30">
            <div className="flex items-center space-x-2 mb-3">
              <Network className="w-5 h-5 text-[#00d4ff]" />
              <h3 className="text-[#00d4ff] font-bold text-sm">СТАТУС ПОДКЛЮЧЕНИЯ</h3>
            </div>
            
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#00ff41]/80">Попытка:</span>
                <span className="text-[#00ff41] font-bold">
                  {attempt} / {maxAttempts}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[#00ff41]/80">Шлюз:</span>
                <span className="text-[#00d4ff] font-bold break-all text-right ml-2">
                  {currentGateway}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-[#00d4ff]/20">
                <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff41] transition-all duration-500 animate-pulse"
                    style={{ width: `${(attempt / maxAttempts) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#00d4ff]/10 p-3 rounded border border-[#00d4ff]/20">
            <p className="text-[#00d4ff]/90 text-xs text-center leading-relaxed">
              Автоматическая ротация шлюзов и повторная попытка подключения к сети Internet Computer...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
