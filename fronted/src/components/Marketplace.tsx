import { useState, useMemo } from 'react';
import { useGetAllActiveListings, useBuyItem, useGetLandData, useGetMyModifications, useListItem, useCancelListing } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Loader2, MapPin, Sparkles, Plus, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ItemType } from '../marketplace-backend.d';

export default function Marketplace() {
  const { data: listings, isLoading } = useGetAllActiveListings();
  const { data: myLandArray } = useGetLandData();
  const { data: myModifications } = useGetMyModifications();
  const { identity } = useInternetIdentity();
  const buyItemMutation = useBuyItem();
  const listItemMutation = useListItem();
  const cancelListingMutation = useCancelListing();
  
  const [buyingId, setBuyingId] = useState<bigint | null>(null);
  const [cancellingId, setCancellingId] = useState<bigint | null>(null);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [listingType, setListingType] = useState<'land' | 'modifier'>('land');
  const [selectedLandId, setSelectedLandId] = useState<bigint | null>(null);
  const [selectedModId, setSelectedModId] = useState<bigint | null>(null);

  // Filtering states
  const [filterType, setFilterType] = useState<'all' | 'land' | 'modifier'>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Filter listings
  const filteredListings = useMemo(() => {
    if (!listings) return [];
    
    return listings.filter(listing => {
      // Type filter
      if (filterType === 'land' && listing.itemType !== ItemType.Land) return false;
      if (filterType === 'modifier' && listing.itemType !== ItemType.Modifier) return false;
      
      // Price filter
      const price = Number(listing.price) / 100000000;
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;
      
      return true;
    });
  }, [listings, filterType, filterTier, minPrice, maxPrice]);

  const handleBuyItem = async (listingId: bigint, price: bigint) => {
    setBuyingId(listingId);
    try {
      const result = await buyItemMutation.mutateAsync(listingId);
      
      if (result.__kind__ === 'success') {
        toast.success('Предмет успешно куплен!', {
          description: `Вы купили предмет за ${Number(price) / 100000000} токенов CBR`,
        });
      } else if (result.__kind__ === 'insufficientFunds') {
        toast.error('Недостаточно средств', {
          description: `Требуется: ${Number(result.insufficientFunds.required) / 100000000} CBR`,
        });
      } else if (result.__kind__ === 'listingNotFound') {
        toast.error('Объявление не найдено');
      } else if (result.__kind__ === 'listingNotActive') {
        toast.error('Объявление больше не активно');
      } else if (result.__kind__ === 'cannotBuyOwnListing') {
        toast.error('Нельзя купить собственное объявление');
      } else if (result.__kind__ === 'transferFailed') {
        toast.error('Перевод не удался', {
          description: result.transferFailed,
        });
      }
    } catch (error) {
      toast.error('Не удалось купить предмет', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    } finally {
      setBuyingId(null);
    }
  };

  const handleCancelListing = async (listingId: bigint) => {
    setCancellingId(listingId);
    try {
      await cancelListingMutation.mutateAsync(listingId);
      toast.success('Объявление успешно отменено');
    } catch (error) {
      toast.error('Не удалось отменить объявление', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleListItem = async () => {
    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Неверная цена');
      return;
    }

    try {
      const priceInSmallestUnit = BigInt(Math.floor(price * 100000000));
      
      if (listingType === 'land') {
        if (!selectedLandId) {
          toast.error('Пожалуйста, выберите землю для размещения');
          return;
        }
        await listItemMutation.mutateAsync({
          itemId: selectedLandId,
          itemType: ItemType.Land,
          price: priceInSmallestUnit,
        });
      } else {
        if (!selectedModId) {
          toast.error('Пожалуйста, выберите модификатор для размещения');
          return;
        }
        await listItemMutation.mutateAsync({
          itemId: selectedModId,
          itemType: ItemType.Modifier,
          price: priceInSmallestUnit,
        });
      }
      
      setListDialogOpen(false);
      setListPrice('');
      setSelectedLandId(null);
      setSelectedModId(null);
      toast.success('Предмет успешно размещен!');
    } catch (error) {
      toast.error('Не удалось разместить предмет', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const isMyListing = (sellerPrincipal: string): boolean => {
    if (!identity) return false;
    return sellerPrincipal === identity.getPrincipal().toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="font-jetbrains text-muted-foreground">Загрузка маркетплейса...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="font-orbitron text-3xl font-bold text-glow-teal">МАРКЕТПЛЕЙС</h2>
          <p className="font-jetbrains text-muted-foreground">
            Покупайте и продавайте земельные участки и модификаторы за токены CBR
          </p>
        </div>

        <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-orbitron bg-primary hover:bg-primary/80 box-glow-teal">
              <Plus className="mr-2 h-4 w-4" />
              РАЗМЕСТИТЬ ПРЕДМЕТ
            </Button>
          </DialogTrigger>
          <DialogContent className="glassmorphism border-primary/20">
            <DialogHeader>
              <DialogTitle className="font-orbitron text-xl text-glow-teal">
                Разместить предмет на продажу
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Tabs value={listingType} onValueChange={(v) => setListingType(v as 'land' | 'modifier')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="land" className="font-orbitron">Земля</TabsTrigger>
                  <TabsTrigger value="modifier" className="font-orbitron">Модификатор</TabsTrigger>
                </TabsList>
                
                <TabsContent value="land" className="space-y-4">
                  <div>
                    <label className="font-jetbrains text-sm text-muted-foreground mb-2 block">
                      Выберите землю
                    </label>
                    <Select value={selectedLandId?.toString()} onValueChange={(v) => setSelectedLandId(BigInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите земельный участок" />
                      </SelectTrigger>
                      <SelectContent>
                        {myLandArray?.map((land) => (
                          <SelectItem key={land.landId.toString()} value={land.landId.toString()}>
                            {land.plotName} - {land.biome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="modifier" className="space-y-4">
                  <div>
                    <label className="font-jetbrains text-sm text-muted-foreground mb-2 block">
                      Выберите модификатор
                    </label>
                    <Select value={selectedModId?.toString()} onValueChange={(v) => setSelectedModId(BigInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите модификатор" />
                      </SelectTrigger>
                      <SelectContent>
                        {myModifications?.map((mod) => (
                          <SelectItem key={mod.mod_id.toString()} value={mod.mod_id.toString()}>
                            Модификатор #{mod.mod_id.toString()} - Уровень {mod.rarity_tier.toString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div>
                <label className="font-jetbrains text-sm text-muted-foreground mb-2 block">
                  Цена продажи (CBR)
                </label>
                <Input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="0.00"
                  className="font-jetbrains"
                  min="0"
                  step="0.01"
                />
              </div>

              <Button
                onClick={handleListItem}
                disabled={listItemMutation.isPending || !listPrice}
                className="w-full font-orbitron bg-primary hover:bg-primary/80 box-glow-teal"
              >
                {listItemMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Размещение...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    РАЗМЕСТИТЬ ПРЕДМЕТ
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="glassmorphism border-primary/20">
        <CardHeader>
          <CardTitle className="font-orbitron text-lg text-glow-teal flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="font-jetbrains text-sm text-muted-foreground mb-2 block">
                Тип предмета
              </label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'land' | 'modifier')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все предметы</SelectItem>
                  <SelectItem value="land">Только земля</SelectItem>
                  <SelectItem value="modifier">Только модификаторы</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="font-jetbrains text-sm text-muted-foreground mb-2 block">
                Уровень редкости
              </label>
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="1">Уровень 1 (Обычный)</SelectItem>
                  <SelectItem value="2">Уровень 2 (Редкий)</SelectItem>
                  <SelectItem value="3">Уровень 3 (Легендарный)</SelectItem>
                  <SelectItem value="4">Уровень 4 (Мифический)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="font-jetbrains text-sm text-muted-foreground mb-2 block">
                Мин. цена (CBR)
              </label>
              <Input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0.00"
                className="font-jetbrains"
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="font-jetbrains text-sm text-muted-foreground mb-2 block">
                Макс. цена (CBR)
              </label>
              <Input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="0.00"
                className="font-jetbrains"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!filteredListings || filteredListings.length === 0 ? (
        <Card className="glassmorphism border-primary/20">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-orbitron text-xl text-glow-teal mb-2">Нет доступных объявлений</h3>
                <p className="font-jetbrains text-muted-foreground">
                  {filterType !== 'all' || filterTier !== 'all' || minPrice || maxPrice
                    ? 'Нет предметов, соответствующих вашим фильтрам'
                    : 'Будьте первым, кто разместит предмет на продажу'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing, index) => {
            const isOwner = isMyListing(listing.seller.toString());
            const isLand = listing.itemType === ItemType.Land;
            
            return (
              <Card
                key={index}
                className={`glassmorphism border-primary/20 hover:border-primary/40 transition-all duration-300 ${
                  isOwner ? 'ring-2 ring-secondary/50 box-glow-magenta' : 'box-glow-teal'
                }`}
              >
                <CardHeader>
                  <CardTitle className="font-orbitron text-lg text-glow-teal flex items-center gap-2">
                    {isLand ? (
                      <>
                        <MapPin className="h-5 w-5" />
                        Земля #{Number(listing.itemId)}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Модификатор #{Number(listing.itemId)}
                      </>
                    )}
                    {isOwner && (
                      <span className="ml-auto text-xs text-secondary font-jetbrains">
                        ВАШЕ ОБЪЯВЛЕНИЕ
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 font-jetbrains text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Тип:</span>
                      <span className={isLand ? 'text-primary' : 'text-accent'}>
                        {isLand ? 'NFT Земля' : 'Модификатор'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Продавец:</span>
                      <span className="text-primary font-mono text-xs">
                        {listing.seller.toString().slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Цена:</span>
                      <span className="text-xl font-bold text-glow-yellow">
                        {Number(listing.price) / 100000000} CBR
                      </span>
                    </div>
                  </div>

                  {isOwner ? (
                    <Button
                      onClick={() => handleCancelListing(listing.listingId)}
                      disabled={cancellingId === listing.listingId}
                      variant="destructive"
                      className="w-full font-orbitron"
                    >
                      {cancellingId === listing.listingId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Отмена...
                        </>
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          ОТМЕНИТЬ ОБЪЯВЛЕНИЕ
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleBuyItem(listing.listingId, listing.price)}
                      disabled={buyingId === listing.listingId}
                      className="w-full font-orbitron bg-primary hover:bg-primary/80 box-glow-teal"
                    >
                      {buyingId === listing.listingId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Покупка...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          КУПИТЬ ПРЕДМЕТ
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
