import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { LandData } from '../backend';
import { useClaimRewards, useUpgradePlot, useGetTokenBalance, useDebugTokenBalance, useGetCanisterTokenBalance, useDebugCanisterBalance } from '../hooks/useQueries';
import { useActorWithInit } from '../hooks/useActorWithInit';
import { MapPin, Layers, TrendingUp, Coins, Clock, Zap, Star, Battery, ExternalLink, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import PlotCustomization from './PlotCustomization';
import { formatTokenBalance, formatTokenAmountForError, hasSufficientBalance } from '../lib/tokenUtils';

interface LandDashboardProps {
  landData: LandData;
}

export default function LandDashboard({ landData }: LandDashboardProps) {
  const claimRewards = useClaimRewards();
  const upgradePlot = useUpgradePlot();
  const { data: tokenBalance = 0n, isLoading: balanceLoading, isError: balanceError, refetch: refetchBalance } = useGetTokenBalance();
  const { data: canisterBalance, isLoading: canisterBalanceLoading, refetch: refetchCanisterBalance } = useGetCanisterTokenBalance();
  const debugBalance = useDebugTokenBalance();
  const debugCanisterBalance = useDebugCanisterBalance();
  const { actor } = useActorWithInit();
  const [isAdmin, setIsAdmin] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [canClaim, setCanClaim] = useState(false);
  const [estimatedCharge, setEstimatedCharge] = useState<number>(Number(landData.cycleCharge));

  const COOLDOWN_PERIOD = 86_400_000_000_000n; // 24 hours in nanoseconds
  const UPGRADE_COSTS = [100n, 250n, 500n, 1000n, 2000n];
  const CLAIM_CHARGE_COST = 10;

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (actor) {
        try {
          const adminStatus = await actor.isCallerAdmin();
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      }
    };
    checkAdmin();
  }, [actor]);

  useEffect(() => {
    const updateCooldown = () => {
      try {
        const now = BigInt(Date.now()) * 1_000_000n; // Convert to nanoseconds
        const lastClaim = landData.lastClaimTime;
        const nextClaimTime = lastClaim + COOLDOWN_PERIOD;
        const remaining = nextClaimTime - now;

        if (remaining <= 0n) {
          setCanClaim(true);
          setRemainingTime(0);
        } else {
          setCanClaim(false);
          setRemainingTime(Number(remaining / 1_000_000_000n)); // Convert to seconds
        }
      } catch (error) {
        console.error('Error updating cooldown:', error);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [landData.lastClaimTime]);

  useEffect(() => {
    const updateEstimatedCharge = () => {
      try {
        const now = BigInt(Date.now()) * 1_000_000n; // Convert to nanoseconds
        const lastUpdate = landData.lastChargeUpdate;
        const elapsedTime = now - lastUpdate;
        
        // Prevent overflow by capping elapsed time calculation
        const maxElapsedMinutes = 100000; // Cap at ~69 days
        const minutesElapsed = Math.min(
          Number(elapsedTime / 60_000_000_000n),
          maxElapsedMinutes
        );
        
        const currentCharge = Number(landData.cycleCharge);
        const chargeCap = Number(landData.chargeCap);
        const newCharge = Math.min(currentCharge + minutesElapsed, chargeCap);
        
        setEstimatedCharge(newCharge);
      } catch (error) {
        console.error('Error updating estimated charge:', error);
        // Fallback to current charge on error
        setEstimatedCharge(Number(landData.cycleCharge));
      }
    };

    updateEstimatedCharge();
    const interval = setInterval(updateEstimatedCharge, 1000);
    return () => clearInterval(interval);
  }, [landData.cycleCharge, landData.chargeCap, landData.lastChargeUpdate]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}ч ${minutes}м ${secs}с`;
  };

  const getBiomeColor = (biome: string): string => {
    const normalizedBiome = biome.toUpperCase().replace(/_/g, '_');
    
    switch (normalizedBiome) {
      case 'FOREST_VALLEY':
        return 'text-green-500';
      case 'ISLAND_ARCHIPELAGO':
        return 'text-cyan-400';
      case 'SNOW_PEAK':
        return 'text-primary';
      case 'DESERT_DUNE':
        return 'text-orange-400';
      case 'VOLCANIC_CRAG':
        return 'text-destructive';
      case 'MYTHIC_VOID':
        return 'text-purple-500';
      case 'MYTHIC_AETHER':
        return 'text-blue-400';
      default:
        return 'text-primary';
    }
  };

  const handleClaimRewards = async () => {
    try {
      console.log('[LandDashboard] 🎯 Claiming rewards for land ID:', landData.landId);
      console.log('[LandDashboard] 💰 Current balance before claim:', tokenBalance.toString());
      
      const result = await claimRewards.mutateAsync(landData.landId);
      
      if (result.__kind__ === 'success') {
        const claimedAmount = result.success.tokensClaimed;
        console.log('[LandDashboard] ✓ Claim successful! Tokens claimed:', claimedAmount.toString());
        console.log('[LandDashboard] 📊 Expected new balance:', result.success.newBalance.toString());
        
        // Force immediate balance refetch with delay to allow backend to update
        setTimeout(async () => {
          console.log('[LandDashboard] 🔄 Refetching balance after claim...');
          const { data: newBalance } = await refetchBalance();
          console.log('[LandDashboard] ✅ New balance after refetch:', newBalance?.toString());
        }, 500);
        
        toast.success(`Получено ${formatTokenBalance(claimedAmount, 8, 2)} токенов!`, {
          description: `Токены добавлены на ваш баланс`,
        });
      } else if (result.__kind__ === 'cooldown') {
        const remainingSecs = Number(result.cooldown.remainingTime / 1_000_000_000n);
        toast.error('Активен период ожидания', {
          description: `Подождите ${formatTime(remainingSecs)} до следующего получения`,
        });
      } else if (result.__kind__ === 'insufficientCharge') {
        toast.error('Недостаточно энергии цикла', {
          description: `Требуется: ${result.insufficientCharge.required} единиц, Текущее: ${result.insufficientCharge.current} единиц`,
        });
      } else if (result.__kind__ === 'mintFailed') {
        console.error('[LandDashboard] ✗ Mint failed:', result.mintFailed);
        toast.error('Не удалось начислить токены', {
          description: result.mintFailed,
        });
      }
    } catch (error) {
      console.error('[LandDashboard] ✗ Claim rewards error:', error);
      toast.error('Не удалось получить награды', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const handleUpgrade = async () => {
    const currentLevel = Number(landData.upgradeLevel);
    if (currentLevel >= 5) {
      toast.error('Достигнут максимальный уровень');
      return;
    }

    const cost = UPGRADE_COSTS[currentLevel];
    
    console.log('[LandDashboard] 🎯 Attempting upgrade - Current balance:', tokenBalance.toString(), 'Cost:', cost.toString());
    
    // Check if user has sufficient balance
    if (!hasSufficientBalance(tokenBalance, cost)) {
      toast.error('Недостаточно токенов', {
        description: `Требуется: ${formatTokenAmountForError(cost)} CBR, Доступно: ${formatTokenAmountForError(tokenBalance)} CBR`,
      });
      return;
    }
    
    try {
      const result = await upgradePlot.mutateAsync({ landId: landData.landId, cost });
      
      if (result.__kind__ === 'success') {
        console.log('[LandDashboard] ✓ Upgrade successful to level:', result.success.newLevel);
        
        // Force immediate balance refetch with delay to allow backend to update
        setTimeout(async () => {
          console.log('[LandDashboard] 🔄 Refetching balance after upgrade...');
          const { data: newBalance } = await refetchBalance();
          console.log('[LandDashboard] ✅ New balance after refetch:', newBalance?.toString());
        }, 500);
        
        toast.success(`Улучшено до уровня ${result.success.newLevel}!`, {
          description: `Ваш участок теперь более мощный`,
        });
      } else if (result.__kind__ === 'insufficientTokens') {
        toast.error('Недостаточно токенов', {
          description: `Требуется: ${formatTokenAmountForError(result.insufficientTokens.required)} CBR, Доступно: ${formatTokenAmountForError(result.insufficientTokens.current)} CBR`,
        });
      } else if (result.__kind__ === 'maxLevelReached') {
        toast.error('Достигнут максимальный уровень');
      }
    } catch (error) {
      console.error('[LandDashboard] ✗ Upgrade plot error:', error);
      toast.error('Не удалось улучшить участок', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const handleDebugBalance = async () => {
    try {
      console.log('[LandDashboard] 🐛 Debug balance refresh triggered');
      await debugBalance.mutateAsync();
      toast.success('Баланс обновлен', {
        description: 'Проверьте консоль для подробной информации',
      });
    } catch (error) {
      console.error('[LandDashboard] ✗ Debug balance error:', error);
      toast.error('Не удалось обновить баланс', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const handleDebugCanisterBalance = async () => {
    try {
      console.log('[LandDashboard] 🏦 Debug canister balance check triggered');
      await debugCanisterBalance.mutateAsync();
      await refetchCanisterBalance();
      toast.success('Баланс контракта проверен', {
        description: 'Проверьте консоль для подробной информации',
      });
    } catch (error) {
      console.error('[LandDashboard] ✗ Debug canister balance error:', error);
      toast.error('Не удалось проверить баланс контракта', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const handleLocate = () => {
    try {
      const lat = landData.coordinates.lat;
      const lon = landData.coordinates.lon;
      const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=12`;
      window.open(osmUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening map:', error);
      toast.error('Не удалось открыть карту');
    }
  };

  const currentLevel = Number(landData.upgradeLevel);
  const nextUpgradeCost = currentLevel < 5 ? UPGRADE_COSTS[currentLevel] : null;
  const baseReward = 100 * (currentLevel + 1);
  const rewardAmount = Math.floor(baseReward * landData.baseTokenMultiplier);
  const normalizedBiome = landData.biome.toUpperCase().replace(/_/g, '_');
  const isMythicBiome = normalizedBiome === 'MYTHIC_VOID' || normalizedBiome === 'MYTHIC_AETHER';
  const chargeCap = Number(landData.chargeCap);
  const chargePercentage = (estimatedCharge / chargeCap) * 100;
  const hasEnoughCharge = estimatedCharge >= CLAIM_CHARGE_COST;
  const canAffordUpgrade = nextUpgradeCost ? hasSufficientBalance(tokenBalance, nextUpgradeCost) : false;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-700">
        {/* Land Info Card */}
        <Card className="glassmorphism border-primary/30">
          <CardHeader>
            <CardTitle className="font-orbitron text-2xl text-glow-green flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              ИНФОРМАЦИЯ О ЗЕМЛЕ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="glassmorphism p-4 rounded-lg border border-primary/20">
              <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">Название участка</p>
              <p className="font-orbitron text-xl font-bold text-primary">
                {landData.plotName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glassmorphism p-4 rounded-lg border border-primary/20">
                <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">Широта</p>
                <p className="font-orbitron text-xl font-bold text-primary">
                  {landData.coordinates.lat.toFixed(4)}°
                </p>
              </div>
              <div className="glassmorphism p-4 rounded-lg border border-primary/20">
                <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">Долгота</p>
                <p className="font-orbitron text-xl font-bold text-primary">
                  {landData.coordinates.lon.toFixed(4)}°
                </p>
              </div>
            </div>

            {/* Locate Button */}
            <Button
              onClick={handleLocate}
              variant="outline"
              className="w-full font-orbitron border-primary/30 hover:border-primary/50 hover:bg-primary/10"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              НАЙТИ НА КАРТЕ
            </Button>

            <div className="glassmorphism p-4 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-5 w-5 text-primary" />
                <p className="font-jetbrains text-xs text-muted-foreground uppercase">Биом</p>
              </div>
              <div className="flex items-center gap-2">
                <p className={`font-orbitron text-2xl font-bold ${getBiomeColor(landData.biome)}`}>
                  {landData.biome.toUpperCase()}
                </p>
                {isMythicBiome && (
                  <Badge variant="default" className="font-jetbrains bg-purple-600 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    МИФИЧЕСКИЙ
                  </Badge>
                )}
              </div>
            </div>

            {isMythicBiome && (
              <div className="glassmorphism p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-purple-400" />
                  <p className="font-jetbrains text-xs text-muted-foreground uppercase">Базовый множитель токенов</p>
                </div>
                <p className="font-orbitron text-2xl font-bold text-purple-400">
                  +{((landData.baseTokenMultiplier - 1) * 100).toFixed(0)}%
                </p>
              </div>
            )}

            {/* Upgrade Level - Relocated inside Land Information Card */}
            <div className="glassmorphism p-3 rounded-lg border border-accent/20 bg-accent/5">
              <div className="flex items-center justify-between">
                <p className="font-jetbrains text-xs text-muted-foreground uppercase">Уровень улучшения</p>
                <div className="flex items-center gap-2">
                  <p className="font-orbitron text-sm font-bold text-accent">
                    {currentLevel} / 5
                  </p>
                  <Progress value={(currentLevel / 5) * 100} className="h-1.5 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="glassmorphism border-secondary/30">
          <CardHeader>
            <CardTitle className="font-orbitron text-2xl text-glow-magenta flex items-center gap-2">
              <Coins className="h-6 w-6" />
              БАЛАНС CBR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="glassmorphism p-6 rounded-lg border border-secondary/20 text-center">
              <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-2">
                Ваш баланс токенов
              </p>
              {balanceLoading ? (
                <p className="font-orbitron text-2xl font-bold text-secondary animate-pulse">
                  Загрузка...
                </p>
              ) : balanceError ? (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="font-jetbrains text-sm text-destructive">
                    Не удалось загрузить баланс
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-orbitron text-4xl font-bold text-secondary">
                    {formatTokenBalance(tokenBalance, 8, 2)}
                  </p>
                  <p className="font-jetbrains text-xs text-muted-foreground mt-1">
                    CBR (сырой: {tokenBalance.toString()} e8s)
                  </p>
                </>
              )}
              
              {/* Debug Balance Button */}
              <Button
                onClick={handleDebugBalance}
                disabled={debugBalance.isPending}
                size="sm"
                variant="outline"
                className="mt-3 font-jetbrains text-xs border-secondary/30 hover:border-secondary/50"
              >
                {debugBalance.isPending ? (
                  <span className="animate-pulse">Обновление...</span>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Обновить баланс (Debug)
                  </>
                )}
              </Button>
            </div>

            {/* Admin-only Canister Balance Debug */}
            {isAdmin && (
              <div className="glassmorphism p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-5 w-5 text-yellow-400" />
                  <p className="font-jetbrains text-xs text-muted-foreground uppercase">Баланс контракта (Admin)</p>
                </div>
                {canisterBalanceLoading ? (
                  <p className="font-orbitron text-lg font-bold text-yellow-400 animate-pulse">
                    Загрузка...
                  </p>
                ) : canisterBalance !== undefined ? (
                  <>
                    <p className="font-orbitron text-2xl font-bold text-yellow-400">
                      {formatTokenBalance(canisterBalance, 8, 2)}
                    </p>
                    <p className="font-jetbrains text-xs text-muted-foreground mt-1">
                      CBR (сырой: {canisterBalance.toString()} e8s)
                    </p>
                  </>
                ) : (
                  <p className="font-jetbrains text-sm text-muted-foreground">
                    Нет данных
                  </p>
                )}
                <Button
                  onClick={handleDebugCanisterBalance}
                  disabled={debugCanisterBalance.isPending}
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full font-jetbrains text-xs border-yellow-500/30 hover:border-yellow-500/50"
                >
                  {debugCanisterBalance.isPending ? (
                    <span className="animate-pulse">Проверка...</span>
                  ) : (
                    <>
                      <Database className="mr-2 h-3 w-3" />
                      Проверить баланс контракта
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Cycle Charge Display */}
            <div className="glassmorphism p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Battery className="h-5 w-5 text-yellow-400" />
                <p className="font-jetbrains text-xs text-muted-foreground uppercase">Энергия цикла</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-orbitron text-2xl font-bold text-yellow-400">
                    {estimatedCharge} / {chargeCap}
                  </p>
                  <Badge 
                    variant={hasEnoughCharge ? "default" : "outline"} 
                    className={`font-jetbrains ${hasEnoughCharge ? 'bg-green-600 text-white' : 'text-yellow-400'}`}
                  >
                    {hasEnoughCharge ? 'ГОТОВО' : 'ЗАРЯДКА'}
                  </Badge>
                </div>
                <Progress value={chargePercentage} className="h-2 bg-yellow-900/20" />
                <p className="font-jetbrains text-xs text-muted-foreground">
                  +1 единица в минуту • Стоимость получения: {CLAIM_CHARGE_COST} единиц
                </p>
              </div>
            </div>

            {/* Claim Rewards */}
            <div className="glassmorphism p-4 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="font-jetbrains text-sm text-muted-foreground">
                    {canClaim && hasEnoughCharge ? 'Готово к получению!' : canClaim ? 'Нужно больше энергии' : 'Следующее получение через:'}
                  </p>
                </div>
                {!canClaim && (
                  <Badge variant="outline" className="font-jetbrains">
                    {formatTime(remainingTime)}
                  </Badge>
                )}
              </div>
              <Button
                onClick={handleClaimRewards}
                disabled={!canClaim || !hasEnoughCharge || claimRewards.isPending}
                className="w-full font-orbitron bg-primary hover:bg-primary/90 text-primary-foreground box-glow-teal disabled:opacity-50"
              >
                {claimRewards.isPending ? (
                  <span className="animate-pulse">ПОЛУЧЕНИЕ...</span>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    ПОЛУЧИТЬ {rewardAmount} ТОКЕНОВ
                    {isMythicBiome && <Star className="ml-2 h-4 w-4" />}
                  </>
                )}
              </Button>
              {!hasEnoughCharge && canClaim && (
                <p className="font-jetbrains text-xs text-yellow-400 text-center mt-2">
                  Нужно еще {CLAIM_CHARGE_COST - estimatedCharge} единиц энергии
                </p>
              )}
            </div>

            {/* Upgrade Plot */}
            <div className="glassmorphism p-4 rounded-lg border border-accent/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  <p className="font-jetbrains text-sm text-muted-foreground">
                    {currentLevel >= 5 ? 'Достигнут макс. уровень' : 'Улучшите свой участок'}
                  </p>
                </div>
                {nextUpgradeCost && (
                  <Badge variant="outline" className="font-jetbrains">
                    Стоимость: {formatTokenBalance(nextUpgradeCost, 8, 0)}
                  </Badge>
                )}
              </div>
              <Button
                onClick={handleUpgrade}
                disabled={currentLevel >= 5 || upgradePlot.isPending || !canAffordUpgrade || balanceLoading}
                className="w-full font-orbitron bg-accent hover:bg-accent/90 text-accent-foreground box-glow-green disabled:opacity-50"
              >
                {upgradePlot.isPending ? (
                  <span className="animate-pulse">УЛУЧШЕНИЕ...</span>
                ) : currentLevel >= 5 ? (
                  'МАКС. УРОВЕНЬ'
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    УЛУЧШИТЬ ДО УРОВНЯ {currentLevel + 1}
                  </>
                )}
              </Button>
              {nextUpgradeCost && !canAffordUpgrade && !balanceLoading && currentLevel < 5 && (
                <p className="font-jetbrains text-xs text-destructive text-center mt-2">
                  Недостаточно баланса (нужно еще {formatTokenBalance(nextUpgradeCost - tokenBalance, 8, 2)} CBR)
                </p>
              )}
            </div>

            <div className="glassmorphism p-3 rounded-lg border border-muted/20">
              <p className="font-jetbrains text-xs text-center text-muted-foreground">
                Более высокие уровни увеличивают награды за получение токенов
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plot Customization Section */}
      <PlotCustomization landData={landData} />
    </div>
  );
}
