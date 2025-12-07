import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star } from 'lucide-react';
import { PLANNED_MODIFIER_CATALOG, PlannedModifier } from '../data/modifierCatalog';

export default function Collection() {
  const getTierName = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'COMMON';
      case 2:
        return 'RARE';
      case 3:
        return 'LEGENDARY';
      case 4:
        return 'MYTHIC';
      default:
        return 'UNKNOWN';
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
      case 4:
        return 'text-yellow-400';
      default:
        return 'text-primary';
    }
  };

  const getTierBorderClass = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'border-gray-500/30 hover:border-gray-400/50';
      case 2:
        return 'border-blue-500/30 hover:border-blue-400/50 box-glow-blue';
      case 3:
        return 'border-purple-500/30 hover:border-purple-400/50 box-glow-purple';
      case 4:
        return 'border-yellow-500/30 hover:border-yellow-400/50 box-glow-gold';
      default:
        return 'border-primary/30';
    }
  };

  const getTierBadgeVariant = (tier: number): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (tier) {
      case 1:
        return 'outline';
      case 2:
        return 'secondary';
      case 3:
        return 'default';
      case 4:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const tierCounts = PLANNED_MODIFIER_CATALOG.reduce((acc, mod) => {
    acc[mod.rarity_tier] = (acc[mod.rarity_tier] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
      {/* Header Card */}
      <Card className="glassmorphism border-primary/30">
        <CardHeader>
          <CardTitle className="font-orbitron text-3xl text-glow-teal flex items-center gap-3">
            <Sparkles className="h-8 w-8" />
            MODIFIER COLLECTION
          </CardTitle>
          <p className="font-jetbrains text-sm text-muted-foreground mt-2">
            Explore the complete catalog of modifiers available in CyberGenesis. Collect them through loot cache discoveries.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glassmorphism p-4 rounded-lg border border-gray-500/20 text-center">
              <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">Common</p>
              <p className="font-orbitron text-2xl font-bold text-gray-400">{tierCounts[1] || 0}</p>
            </div>
            <div className="glassmorphism p-4 rounded-lg border border-blue-500/20 text-center">
              <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">Rare</p>
              <p className="font-orbitron text-2xl font-bold text-blue-400">{tierCounts[2] || 0}</p>
            </div>
            <div className="glassmorphism p-4 rounded-lg border border-purple-500/20 text-center">
              <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">Legendary</p>
              <p className="font-orbitron text-2xl font-bold text-purple-400">{tierCounts[3] || 0}</p>
            </div>
            <div className="glassmorphism p-4 rounded-lg border border-yellow-500/20 text-center">
              <p className="font-jetbrains text-xs text-muted-foreground uppercase mb-1">Mythic</p>
              <p className="font-orbitron text-2xl font-bold text-yellow-400">{tierCounts[4] || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modifier Grid */}
      <Card className="glassmorphism border-accent/30">
        <CardHeader>
          <CardTitle className="font-orbitron text-2xl text-glow-green flex items-center gap-2">
            <Star className="h-6 w-6" />
            ALL MODIFIERS ({PLANNED_MODIFIER_CATALOG.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {PLANNED_MODIFIER_CATALOG.map((modifier, index) => (
              <ModifierCard key={modifier.id} modifier={modifier} index={index} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ModifierCardProps {
  modifier: PlannedModifier;
  index: number;
}

function ModifierCard({ modifier, index }: ModifierCardProps) {
  const getTierName = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'COMMON';
      case 2:
        return 'RARE';
      case 3:
        return 'LEGENDARY';
      case 4:
        return 'MYTHIC';
      default:
        return 'UNKNOWN';
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
      case 4:
        return 'text-yellow-400';
      default:
        return 'text-primary';
    }
  };

  const getTierBorderClass = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'border-gray-500/30 hover:border-gray-400/50';
      case 2:
        return 'border-blue-500/30 hover:border-blue-400/50';
      case 3:
        return 'border-purple-500/30 hover:border-purple-400/50';
      case 4:
        return 'border-yellow-500/30 hover:border-yellow-400/50';
      default:
        return 'border-primary/30';
    }
  };

  const getTierBadgeVariant = (tier: number): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (tier) {
      case 1:
        return 'outline';
      case 2:
        return 'secondary';
      case 3:
        return 'default';
      case 4:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getGlowFilter = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'drop-shadow(0 0 4px rgba(156, 163, 175, 0.3))';
      case 2:
        return 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))';
      case 3:
        return 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.6))';
      case 4:
        return 'drop-shadow(0 0 16px rgba(250, 204, 21, 0.8))';
      default:
        return 'drop-shadow(0 0 4px rgba(0, 243, 255, 0.3))';
    }
  };

  return (
    <div
      className={`glassmorphism p-3 rounded-lg border ${getTierBorderClass(modifier.rarity_tier)} transition-all duration-300 cursor-pointer group hover:scale-105 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom`}
      style={{
        animationDelay: `${index * 20}ms`,
        animationDuration: '400ms',
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <img
          src={modifier.asset_url}
          alt={modifier.name}
          className="w-16 h-16 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{
            filter: getGlowFilter(modifier.rarity_tier),
          }}
        />
        <Badge 
          variant={getTierBadgeVariant(modifier.rarity_tier)} 
          className="font-jetbrains text-[10px] px-2 py-0"
        >
          {getTierName(modifier.rarity_tier)}
        </Badge>
        <div className="text-center w-full">
          <p className={`font-orbitron text-xs font-bold ${getTierColor(modifier.rarity_tier)} truncate`}>
            {modifier.name}
          </p>
          <p className="font-jetbrains text-[10px] text-muted-foreground">
            ID: {modifier.id}
          </p>
        </div>
      </div>
    </div>
  );
}
