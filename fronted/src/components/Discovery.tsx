import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Package, Clock, Zap, Star, Battery, AlertCircle, RefreshCw } from 'lucide-react';
import { useGetMyLootCaches, useGetMyModifications, useDiscoverLootCache, useProcessCache, useGetTokenBalance, useGetLandData, useDebugTokenBalance } from '../hooks/useQueries';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { formatTokenBalance, hasSufficientBalance } from '../lib/tokenUtils';

export default function Discovery() {
  const { data: lootCaches = [], isLoading: cachesLoading } = useGetMyLootCaches();
  const { data: modifications = [], isLoading: modsLoading } = useGetMyModifications();
  const { data: tokenBalance = 0n, isLoading: balanceLoading, isError: balanceError, refetch: refetchBalance } = useGetTokenBalance();
  const { data: landDataArray } = useGetLandData();
  const discoverCache = useDiscoverLootCache();
  const processCache = useProcessCache();
  const debugBalance = useDebugTokenBalance();

  const [estimatedCharge, setEstimatedCharge] = useState<number>(0);

  // Use the first land for energy calculations
  const landData = landDataArray && landDataArray.length > 0 ? landDataArray[0] : null;

  // Tier-specific costs (in raw token units - e8s)
  const TIER_COSTS = {
    1: { cbr: 10000000000n, charge: 200 }, // 100 CBR = 100 * 10^8
    2: { cbr: 50000000000n, charge: 500 }, // 500 CBR = 500 * 10^8
    3: { cbr: 150000000000n, charge: 1000 }, // 1500 CBR = 1500 * 10^8
  };

  useEffect(() => {
    if (!landData) return;

    const updateEstimatedCharge = () => {
      try {
        const now = BigInt(Date.now()) * 1_000_000n;
        const lastUpdate = landData.lastChargeUpdate;
        const elapsedTime = now - lastUpdate;
        const minutesElapsed = Number(elapsedTime / 60_000_000_000n);
        
        const currentCharge = Number(landData.cycleCharge);
        const chargeCap = Number(landData.chargeCap);
        const newCharge = Math.min(currentCharge + minutesElapsed, chargeCap);
        
        setEstimatedCharge(newCharge);
      } catch (error) {
        console.error('Error updating estimated charge:', error);
        setEstimatedCharge(landData ? Number(landData.cycleCharge) : 0);
      }
    };

    updateEstimatedCharge();
    const interval = setInterval(updateEstimatedCharge, 1000);
    return () => clearInterval(interval);
  }, [landData]);

  const currentCharge = estimatedCharge;
  const chargeCap = landData ? Number(landData.chargeCap) : 1000;

  const handleDiscoverCache = async (tier: number) => {
    const costs = TIER_COSTS[tier as keyof typeof TIER_COSTS];
    
    console.log('[Discovery] 🎯 Attempting to discover cache - Tier:', tier, 'Balance:', tokenBalance.toString(), 'Cost:', costs.cbr.toString());
    
    // Check balance before attempting
    if (!hasSufficientBalance(tokenBalance, costs.cbr)) {
      toast.error('Недостаточно токенов CBR', {
        description: `Требуется: ${formatTokenBalance(costs.cbr, 8, 0)} CBR, Доступно: ${formatTokenBalance(tokenBalance, 8, 2)} CBR`,
      });
      return;
    }
    
    if (currentCharge < costs.charge) {
      toast.error('Недостаточно энергии цикла', {
        description: `Требуется: ${costs.charge} единиц, Текущее: ${currentCharge} единиц`,
      });
      return;
    }
    
    try {
      const result = await discoverCache.mutateAsync(BigInt(tier));
      
      if (result.__kind__ === 'success') {
        const tierName = getTierName(tier);
        console.log('[Discovery] ✓ Cache discovered successfully:', result.success.cache_id);
        
        // Force immediate balance refetch with delay to allow backend to update
        setTimeout(async () => {
          console.log('[Discovery] 🔄 Refetching balance after discovery...');
          const { data: newBalance } = await refetchBalance();
          console.log('[Discovery] ✅ New balance after refetch:', newBalance?.toString());
        }, 500);
        
        toast.success(`Обнаружен ${tierName} кэш!`, {
          description: `ID кэша: ${result.success.cache_id}. Подождите 4 часа, чтобы открыть.`,
        });
      } else if (result.__kind__ === 'insufficientCharge') {
        toast.error('Недостаточно энергии цикла', {
          description: `Требуется: ${result.insufficientCharge.required} единиц, Текущее: ${result.insufficientCharge.current} единиц`,
        });
      } else if (result.__kind__ === 'insufficientTokens') {
        toast.error('Недостаточно токенов', {
          description: `Требуется: ${formatTokenBalance(result.insufficientTokens.required, 8, 2)} CBR, Доступно: ${formatTokenBalance(result.insufficientTokens.current, 8, 2)} CBR`,
        });
      } else if (result.__kind__ === 'paymentFailed') {
        toast.error('Платеж не прошел', {
          description: result.paymentFailed,
        });
      }
    } catch (error) {
      console.error('[Discovery] ✗ Discover cache error:', error);
      toast.error('Не удалось обнаружить кэш', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const handleOpenCache = async (cacheId: bigint) => {
    try {
      console.log('[Discovery] 🎯 Opening cache ID:', cacheId);
      const modification = await processCache.mutateAsync(cacheId);
      const tierName = getTierName(Number(modification.rarity_tier));
      console.log('[Discovery] ✓ Cache opened successfully, received modification:', modification);
      
      toast.success(`Разблокирована ${tierName} модификация!`, {
        description: `Множитель: ${modification.multiplier_value.toFixed(2)}x`,
      });
    } catch (error) {
      console.error('[Discovery] ✗ Process cache error:', error);
      toast.error('Не удалось открыть кэш', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const handleDebugBalance = async () => {
    try {
      console.log('[Discovery] 🐛 Debug balance refresh triggered');
      await debugBalance.mutateAsync();
      toast.success('Баланс обновлен', {
        description: 'Проверьте консоль для подробной информации',
      });
    } catch (error) {
      console.error('[Discovery] ✗ Debug balance error:', error);
      toast.error('Не удалось обновить баланс', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const getTierName = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'ОБЫЧНЫЙ';
      case 2:
        return 'РЕДКИЙ';
      case 3:
        return 'ЛЕГЕНДАРНЫЙ';
      default:
        return 'НЕИЗВЕСТНЫЙ';
    }
  };

  const getTierColor = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'text-gray-400';
      case 2:
        return 'text-blue-400';
      case 3:
        return 'text-purple-400';
      default:
        return 'text-primary';
    }
  };

  const getTierBadgeVariant = (tier: number): 'default' | 'secondary' | 'outline' => {
    switch (tier) {
      case 1:
        return 'outline';
      case 2:
        return 'secondary';
      case 3:
        return 'default';
      default:
        return 'outline';
    }
  };

  const getModificationAsset = (tier: number): string => {
    switch (tier) {
      case 1:
        return '/assets/generated/tier1-crystal-mod.dim_200x200.png';
      case 2:
        return '/assets/generated/tier2-energy-orb-mod.dim_200x200.png';
      case 3:
        return '/assets/generated/tier3-quantum-portal-mod.dim_200x200.png';
      default:
        return '/assets/generated/tier1-crystal-mod.dim_200x200.png';
    }
  };

  const highestRarityMod = modifications.length > 0
    ? modifications.reduce((highest, mod) => 
        Number(mod.rarity_tier) > Number(highest.rarity_tier) ? mod : highest
      )
    : null;

  const canDiscoverTier = (tier: number): boolean => {
    const costs = TIER_COSTS[tier as keyof typeof TIER_COSTS];
    return hasSufficientBalance(tokenBalance, costs.cbr) && currentCharge >= costs.charge;
  };

  const chargePercentage = (currentCharge / chargeCap) * 100;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
      {/* Energy Status Card */}
      <Card className="glassmorphism border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="font-orbitron text-xl flex items-center gap-2">
            <Battery className="h-5 w-5 text-yellow-400" />
            СТАТУС ЭНЕРГИИ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">
                Текущая энергия
              </p>
              <p className="font-orbitron text-2xl font-bold text-yellow-400">
                {currentCharge} / {chargeCap}
              </p>
            </div>
            <div className="text-right">
              <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">
                Баланс CBR
              </p>
              {balanceLoading ? (
                <p className="font-orbitron text-lg font-bold text-secondary animate-pulse">
                  Загрузка...
                </p>
              ) : balanceError ? (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="font-jetbrains text-xs text-destructive">
                    Ошибка
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-orbitron text-lg font-bold text-secondary">
                    {formatTokenBalance(tokenBalance, 8, 2)}
                  </p>
                  <p className="font-jetbrains text-xs text-muted-foreground">
                    ({tokenBalance.toString()} e8s)
                  </p>
                </>
              )}
            </div>
          </div>
          <Progress value={chargePercentage} className="h-2 bg-yellow-900/20" />
          <div className="flex items-center justify-between">
            <p className="font-jetbrains text-xs text-muted-foreground">
              +1 единица в минуту • Макс. емкость: {chargeCap} единиц
            </p>
            <Button
              onClick={handleDebugBalance}
              disabled={debugBalance.isPending}
              size="sm"
              variant="outline"
              className="font-jetbrains text-xs border-secondary/30 hover:border-secondary/50"
            >
              {debugBalance.isPending ? (
                <span className="animate-pulse">Обновление...</span>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Debug
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Three-Tiered Discovery Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1: Common Cache */}
        <Card className="glassmorphism border-gray-400/30 hover:border-gray-400/50 transition-all">
          <CardHeader>
            <CardTitle className="font-orbitron text-xl text-gray-400 flex items-center gap-2">
              <Package className="h-5 w-5" />
              ОБЫЧНЫЙ КЭШ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <img
                src="/assets/generated/tier1-crystal-mod.dim_200x200.png"
                alt="Common Cache"
                className="w-24 h-24 mx-auto object-contain mb-3"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(156, 163, 175, 0.5))',
                }}
              />
              <Badge variant="outline" className="font-jetbrains mb-2">
                УРОВЕНЬ 1
              </Badge>
              <p className="font-jetbrains text-xs text-muted-foreground mt-2">
                70% обычных, 30% редких модификаций
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between glassmorphism p-2 rounded border border-gray-400/20">
                <span className="font-jetbrains text-xs text-muted-foreground">Стоимость CBR:</span>
                <span className="font-orbitron text-sm font-bold text-gray-400">
                  {formatTokenBalance(TIER_COSTS[1].cbr, 8, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between glassmorphism p-2 rounded border border-yellow-400/20">
                <span className="font-jetbrains text-xs text-muted-foreground">Стоимость энергии:</span>
                <span className="font-orbitron text-sm font-bold text-yellow-400">{TIER_COSTS[1].charge}</span>
              </div>
            </div>
            <Button
              onClick={() => handleDiscoverCache(1)}
              disabled={!canDiscoverTier(1) || discoverCache.isPending || balanceLoading}
              className="w-full font-orbitron bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
            >
              {discoverCache.isPending ? (
                <span className="animate-pulse">ОБНАРУЖЕНИЕ...</span>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  ОБНАРУЖИТЬ
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tier 2: Rare Cache */}
        <Card className="glassmorphism border-blue-400/30 hover:border-blue-400/50 transition-all">
          <CardHeader>
            <CardTitle className="font-orbitron text-xl text-blue-400 flex items-center gap-2">
              <Package className="h-5 w-5" />
              РЕДКИЙ КЭШ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <img
                src="/assets/generated/tier2-energy-orb-mod.dim_200x200.png"
                alt="Rare Cache"
                className="w-24 h-24 mx-auto object-contain mb-3"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(96, 165, 250, 0.6))',
                }}
              />
              <Badge variant="secondary" className="font-jetbrains mb-2">
                УРОВЕНЬ 2
              </Badge>
              <p className="font-jetbrains text-xs text-muted-foreground mt-2">
                Лучшие дропы + 3% бафф + 1% бустер
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between glassmorphism p-2 rounded border border-blue-400/20">
                <span className="font-jetbrains text-xs text-muted-foreground">Стоимость CBR:</span>
                <span className="font-orbitron text-sm font-bold text-blue-400">
                  {formatTokenBalance(TIER_COSTS[2].cbr, 8, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between glassmorphism p-2 rounded border border-yellow-400/20">
                <span className="font-jetbrains text-xs text-muted-foreground">Стоимость энергии:</span>
                <span className="font-orbitron text-sm font-bold text-yellow-400">{TIER_COSTS[2].charge}</span>
              </div>
            </div>
            <Button
              onClick={() => handleDiscoverCache(2)}
              disabled={!canDiscoverTier(2) || discoverCache.isPending || balanceLoading}
              className="w-full font-orbitron bg-blue-600 hover:bg-blue-700 text-white box-glow-blue disabled:opacity-50"
            >
              {discoverCache.isPending ? (
                <span className="animate-pulse">ОБНАРУЖЕНИЕ...</span>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  ОБНАРУЖИТЬ
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tier 3: Legendary Cache */}
        <Card className="glassmorphism border-purple-400/30 hover:border-purple-400/50 transition-all">
          <CardHeader>
            <CardTitle className="font-orbitron text-xl text-purple-400 flex items-center gap-2">
              <Package className="h-5 w-5" />
              ЛЕГЕНДАРНЫЙ КЭШ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <img
                src="/assets/generated/tier3-quantum-portal-mod.dim_200x200.png"
                alt="Legendary Cache"
                className="w-24 h-24 mx-auto object-contain mb-3"
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(192, 132, 252, 0.7))',
                }}
              />
              <Badge variant="default" className="font-jetbrains mb-2 bg-purple-600">
                УРОВЕНЬ 3
              </Badge>
              <p className="font-jetbrains text-xs text-muted-foreground mt-2">
                Премиум дропы + Высокие шансы баффа/бустера
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between glassmorphism p-2 rounded border border-purple-400/20">
                <span className="font-jetbrains text-xs text-muted-foreground">Стоимость CBR:</span>
                <span className="font-orbitron text-sm font-bold text-purple-400">
                  {formatTokenBalance(TIER_COSTS[3].cbr, 8, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between glassmorphism p-2 rounded border border-yellow-400/20">
                <span className="font-jetbrains text-xs text-muted-foreground">Стоимость энергии:</span>
                <span className="font-orbitron text-sm font-bold text-yellow-400">{TIER_COSTS[3].charge}</span>
              </div>
            </div>
            <Button
              onClick={() => handleDiscoverCache(3)}
              disabled={!canDiscoverTier(3) || discoverCache.isPending || balanceLoading}
              className="w-full font-orbitron bg-purple-600 hover:bg-purple-700 text-white box-glow-purple disabled:opacity-50"
            >
              {discoverCache.isPending ? (
                <span className="animate-pulse">ОБНАРУЖЕНИЕ...</span>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  ОБНАРУЖИТЬ
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {highestRarityMod && (
        <Card className="glassmorphism border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <img
                src={getModificationAsset(Number(highestRarityMod.rarity_tier))}
                alt="Highest Rarity Mod"
                className="w-16 h-16 object-contain"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(0, 243, 255, 0.5))',
                }}
              />
              <div>
                <p className="font-jetbrains text-xs text-muted-foreground uppercase">
                  Модификация высшей редкости
                </p>
                <p className={`font-orbitron text-xl font-bold ${getTierColor(Number(highestRarityMod.rarity_tier))}`}>
                  {getTierName(Number(highestRarityMod.rarity_tier))}
                </p>
                <p className="font-jetbrains text-sm text-accent">
                  Множитель {highestRarityMod.multiplier_value.toFixed(2)}x
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loot Caches Inventory */}
      <Card className="glassmorphism border-secondary/30">
        <CardHeader>
          <CardTitle className="font-orbitron text-2xl text-glow-magenta flex items-center gap-2">
            <Package className="h-6 w-6" />
            ИНВЕНТАРЬ КЭШЕЙ ({lootCaches.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cachesLoading ? (
            <div className="text-center py-8">
              <p className="font-jetbrains text-muted-foreground animate-pulse">
                Загрузка кэшей...
              </p>
            </div>
          ) : lootCaches.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="font-jetbrains text-muted-foreground">
                Кэши еще не обнаружены. Начните свое путешествие!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lootCaches.map((cache) => (
                <CacheCard
                  key={cache.cache_id.toString()}
                  cache={cache}
                  onOpen={handleOpenCache}
                  isProcessing={processCache.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modifications Collection */}
      <Card className="glassmorphism border-accent/30">
        <CardHeader>
          <CardTitle className="font-orbitron text-2xl text-glow-green flex items-center gap-2">
            <Star className="h-6 w-6" />
            МОДИФИКАЦИИ ({modifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {modsLoading ? (
            <div className="text-center py-8">
              <p className="font-jetbrains text-muted-foreground animate-pulse">
                Загрузка модификаций...
              </p>
            </div>
          ) : modifications.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="font-jetbrains text-muted-foreground">
                Модификации еще не разблокированы. Открывайте кэши для сбора!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modifications.map((mod) => (
                <div
                  key={mod.mod_id.toString()}
                  className="glassmorphism p-4 rounded-lg border border-accent/20 hover:border-accent/40 transition-all"
                >
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={getModificationAsset(Number(mod.rarity_tier))}
                      alt={`Tier ${mod.rarity_tier} Mod`}
                      className="w-20 h-20 object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.4))',
                      }}
                    />
                    <Badge variant={getTierBadgeVariant(Number(mod.rarity_tier))} className="font-jetbrains">
                      {getTierName(Number(mod.rarity_tier))}
                    </Badge>
                    <div className="text-center">
                      <p className="font-jetbrains text-xs text-muted-foreground">
                        Множитель
                      </p>
                      <p className={`font-orbitron text-xl font-bold ${getTierColor(Number(mod.rarity_tier))}`}>
                        {mod.multiplier_value.toFixed(2)}x
                      </p>
                    </div>
                    <p className="font-jetbrains text-xs text-muted-foreground">
                      ID: {mod.mod_id.toString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface CacheCardProps {
  cache: {
    cache_id: bigint;
    tier: bigint;
    owner: any;
    discovered_at: bigint;
    is_opened: boolean;
  };
  onOpen: (cacheId: bigint) => void;
  isProcessing: boolean;
}

function CacheCard({ cache, onOpen, isProcessing }: CacheCardProps) {
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [canOpen, setCanOpen] = useState(false);

  const UNLOCK_DELAY = 14_400_000_000_000n; // 4 hours in nanoseconds

  useEffect(() => {
    const updateTimer = () => {
      const now = BigInt(Date.now()) * 1_000_000n;
      const unlockTime = cache.discovered_at + UNLOCK_DELAY;
      const remaining = unlockTime - now;

      if (remaining <= 0n || cache.is_opened) {
        setCanOpen(true);
        setRemainingTime(0);
      } else {
        setCanOpen(false);
        setRemainingTime(Number(remaining / 1_000_000_000n));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [cache.discovered_at, cache.is_opened]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}ч ${minutes}м ${secs}с`;
  };

  const getTierName = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'ОБЫЧНЫЙ';
      case 2:
        return 'РЕДКИЙ';
      case 3:
        return 'ЛЕГЕНДАРНЫЙ';
      default:
        return 'НЕИЗВЕСТНЫЙ';
    }
  };

  const getTierColor = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'border-gray-400/20';
      case 2:
        return 'border-blue-400/20';
      case 3:
        return 'border-purple-400/20';
      default:
        return 'border-primary/20';
    }
  };

  const getTierBadgeColor = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'bg-gray-600 text-white';
      case 2:
        return 'bg-blue-600 text-white';
      case 3:
        return 'bg-purple-600 text-white';
      default:
        return 'bg-primary text-white';
    }
  };

  const progress = cache.is_opened ? 100 : Math.min(100, ((14400 - remainingTime) / 14400) * 100);
  const tier = Number(cache.tier);

  return (
    <div className={`glassmorphism p-4 rounded-lg border ${cache.is_opened ? 'border-muted/20 opacity-60' : getTierColor(tier)}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className={`h-5 w-5 ${cache.is_opened ? 'text-muted-foreground' : 'text-primary'}`} />
            <p className="font-jetbrains text-sm font-bold">
              Кэш #{cache.cache_id.toString()}
            </p>
          </div>
          <Badge className={`font-jetbrains text-xs ${getTierBadgeColor(tier)}`}>
            {getTierName(tier)}
          </Badge>
        </div>

        {cache.is_opened && (
          <Badge variant="outline" className="font-jetbrains text-xs w-fit">
            ОТКРЫТ
          </Badge>
        )}

        {!cache.is_opened && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-jetbrains text-xs text-muted-foreground">
                  {canOpen ? 'Готов к открытию!' : 'Разблокировка...'}
                </p>
                {!canOpen && (
                  <Clock className="h-4 w-4 text-primary animate-pulse" />
                )}
              </div>
              <Progress value={progress} className="h-2" />
              {!canOpen && (
                <p className="font-jetbrains text-xs text-center text-muted-foreground">
                  {formatTime(remainingTime)}
                </p>
              )}
            </div>

            <Button
              onClick={() => onOpen(cache.cache_id)}
              disabled={!canOpen || isProcessing}
              size="sm"
              className="w-full font-orbitron bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="animate-pulse">ОТКРЫТИЕ...</span>
              ) : (
                <>
                  <Zap className="mr-2 h-3 w-3" />
                  ОТКРЫТЬ КЭШ
                </>
              )}
            </Button>
          </>
        )}

        {cache.is_opened && (
          <div className="text-center py-2">
            <p className="font-jetbrains text-xs text-muted-foreground">
              Кэш был открыт
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

