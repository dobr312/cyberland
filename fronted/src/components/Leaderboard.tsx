import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Coins } from 'lucide-react';
import { useGetTopLands } from '../hooks/useQueries';
import { Skeleton } from '@/components/ui/skeleton';

export default function Leaderboard() {
  const { data: topLands, isLoading, error } = useGetTopLands(10);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 flex items-center justify-center font-orbitron text-sm text-muted-foreground">
            {rank}
          </div>
        );
    }
  };

  const getRankGlow = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'box-glow-yellow';
      case 2:
        return 'box-glow-teal';
      case 3:
        return 'box-glow-magenta';
      default:
        return '';
    }
  };

  const formatTokenBalance = (balance: bigint): string => {
    const balanceStr = balance.toString();
    const decimals = 8;
    
    if (balanceStr.length <= decimals) {
      return '0.' + '0'.repeat(decimals - balanceStr.length) + balanceStr;
    }
    
    const integerPart = balanceStr.slice(0, -decimals);
    const decimalPart = balanceStr.slice(-decimals);
    return `${integerPart}.${decimalPart}`;
  };

  if (isLoading) {
    return (
      <Card className="glassmorphism border-secondary/30 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader>
          <CardTitle className="font-orbitron text-2xl text-glow-magenta flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            РЕЙТИНГ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glassmorphism p-4 rounded-lg border border-muted/20">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glassmorphism border-destructive/30 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader>
          <CardTitle className="font-orbitron text-2xl text-destructive flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            ОШИБКА ЗАГРУЗКИ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-jetbrains text-muted-foreground text-center">
            {error instanceof Error ? error.message : 'Не удалось загрузить рейтинг'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!topLands || topLands.length === 0) {
    return (
      <Card className="glassmorphism border-secondary/30 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader>
          <CardTitle className="font-orbitron text-2xl text-glow-magenta flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            РЕЙТИНГ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-jetbrains text-muted-foreground text-center py-8">
            Пока нет участников в рейтинге
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism border-secondary/30 animate-in fade-in slide-in-from-bottom duration-700">
      <CardHeader>
        <CardTitle className="font-orbitron text-2xl text-glow-magenta flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          РЕЙТИНГ
        </CardTitle>
        <p className="font-jetbrains text-sm text-muted-foreground mt-2">
          Топ участков по уровню улучшения и балансу токенов
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {topLands.map((land, index) => {
          const rank = index + 1;
          return (
            <div
              key={land.principal.toString()}
              className={`glassmorphism p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                rank <= 3 ? 'border-accent/40' : 'border-muted/20'
              } ${getRankGlow(rank)}`}
            >
              <div className="flex items-center gap-4">
                {/* Rank Icon */}
                <div className="shrink-0">{getRankIcon(rank)}</div>

                {/* Land Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-orbitron text-lg font-bold text-primary truncate">
                      {land.plotName}
                    </p>
                    {rank <= 3 && (
                      <Badge
                        variant="outline"
                        className="font-jetbrains text-xs border-accent text-accent"
                      >
                        ТОП {rank}
                      </Badge>
                    )}
                  </div>
                  <p className="font-jetbrains text-xs text-muted-foreground truncate">
                    {land.principal.toString().slice(0, 12)}...
                  </p>
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <span className="font-orbitron text-sm font-bold text-accent">
                      Ур. {land.upgradeLevel.toString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-secondary" />
                    <span className="font-jetbrains text-xs text-secondary">
                      {formatTokenBalance(land.tokenBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
