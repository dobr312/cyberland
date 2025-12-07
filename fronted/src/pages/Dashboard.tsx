import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useGetLandData } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LandDashboard from '../components/LandDashboard';
import CubeVisualization from '../components/CubeVisualization';
import MapView from '../components/MapView';
import PlotCustomization from '../components/PlotCustomization';
import Leaderboard from '../components/Leaderboard';
import Marketplace from '../components/Marketplace';
import Governance from '../components/Governance';
import Discovery from '../components/Discovery';
import Collection from '../pages/Collection';
import AdminPanel from '../components/AdminPanel';
import LandSelector from '../components/LandSelector';
import { Loader2 } from 'lucide-react';
import type { LandData, Modification } from '../backend';

export default function Dashboard() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const { data: lands = [], isLoading: landsLoading } = useGetLandData();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [selectedLandId, setSelectedLandId] = useState<bigint | null>(null);
  const [modifications, setModifications] = useState<Modification[]>([]);

  // Set initial selected land when lands are loaded
  useEffect(() => {
    if (lands.length > 0 && selectedLandId === null) {
      setSelectedLandId(lands[0].landId);
    }
  }, [lands, selectedLandId]);

  // Fetch modifications for selected land
  useEffect(() => {
    const fetchModifications = async () => {
      if (!actor) return;
      
      try {
        const mods = await actor.getMyModifications();
        setModifications(mods);
      } catch (error) {
        console.error('Failed to fetch modifications:', error);
        setModifications([]);
      }
    };

    fetchModifications();
  }, [actor, selectedLandId]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!actor || !identity) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      try {
        const adminStatus = await actor.isCallerAdmin();
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [actor, identity]);

  if (isFetching || checkingAdmin || landsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white text-lg">Загрузка панели управления...</p>
        </div>
      </div>
    );
  }

  // If no lands available, show message
  if (lands.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">У вас пока нет земли</p>
          <p className="text-gray-400">Земля будет создана автоматически при первом входе</p>
        </div>
      </div>
    );
  }

  // Find the currently selected land
  const currentLand = lands.find(land => land.landId === selectedLandId) || lands[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Admin Panel - Floating Bottom Right (renders only for authorized admin) */}
      <AdminPanel />
      
      {/* Main Content - No extra padding needed since panel is floating */}
      <div className="container mx-auto px-4 py-8">
        <LandSelector 
          lands={lands}
          selectedLandId={currentLand.landId} 
          onSelectLand={setSelectedLandId} 
        />

        <Tabs defaultValue="land" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-9 bg-black/60 backdrop-blur-sm border border-cyan-500/30 p-1">
            <TabsTrigger value="land" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              Земля
            </TabsTrigger>
            <TabsTrigger value="cube" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              3D Куб
            </TabsTrigger>
            <TabsTrigger value="map" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              Карта
            </TabsTrigger>
            <TabsTrigger value="customize" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              Настройка
            </TabsTrigger>
            <TabsTrigger value="discovery" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              Открытие
            </TabsTrigger>
            <TabsTrigger value="collection" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              Коллекция
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              Лидеры
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              Рынок
            </TabsTrigger>
            <TabsTrigger value="governance" className="text-white data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/20">
              DAO
            </TabsTrigger>
          </TabsList>

          <TabsContent value="land" className="mt-6">
            <LandDashboard landData={currentLand} />
          </TabsContent>

          <TabsContent value="cube" className="mt-6">
            <CubeVisualization landData={currentLand} modifications={modifications} />
          </TabsContent>

          <TabsContent value="map" className="mt-6">
            <MapView landData={currentLand} />
          </TabsContent>

          <TabsContent value="customize" className="mt-6">
            <PlotCustomization landData={currentLand} />
          </TabsContent>

          <TabsContent value="discovery" className="mt-6">
            <Discovery />
          </TabsContent>

          <TabsContent value="collection" className="mt-6">
            <Collection />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <Leaderboard />
          </TabsContent>

          <TabsContent value="marketplace" className="mt-6">
            <Marketplace />
          </TabsContent>

          <TabsContent value="governance" className="mt-6">
            <Governance />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
