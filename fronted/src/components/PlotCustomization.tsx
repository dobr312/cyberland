import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Paintbrush, Save, Check } from 'lucide-react';
import { useUpdatePlotName, useUpdateDecoration } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { LandData } from '../backend';

interface PlotCustomizationProps {
  landData: LandData;
}

const DECORATION_OPTIONS = [
  {
    id: 'none',
    name: 'None',
    url: '',
    thumbnail: '',
  },
  {
    id: 'crystal',
    name: 'Crystal',
    url: '/assets/generated/crystal-decoration.dim_200x200.png',
    thumbnail: '/assets/generated/crystal-decoration.dim_200x200.png',
  },
  {
    id: 'tree',
    name: 'Holo-Tree',
    url: '/assets/generated/holo-tree-decoration.dim_200x200.png',
    thumbnail: '/assets/generated/holo-tree-decoration.dim_200x200.png',
  },
  {
    id: 'tower',
    name: 'Cyber-Tower',
    url: '/assets/generated/cyber-tower-decoration.dim_200x200.png',
    thumbnail: '/assets/generated/cyber-tower-decoration.dim_200x200.png',
  },
  {
    id: 'flame',
    name: 'Digital Flame',
    url: '/assets/generated/digital-flame-decoration.dim_200x200.png',
    thumbnail: '/assets/generated/digital-flame-decoration.dim_200x200.png',
  },
  {
    id: 'orb',
    name: 'Quantum Orb',
    url: '/assets/generated/quantum-orb-decoration.dim_200x200.png',
    thumbnail: '/assets/generated/quantum-orb-decoration.dim_200x200.png',
  },
];

export default function PlotCustomization({ landData }: PlotCustomizationProps) {
  const [plotName, setPlotName] = useState(landData.plotName);
  const [selectedDecoration, setSelectedDecoration] = useState(
    landData.decorationURL || ''
  );
  const [nameError, setNameError] = useState('');

  const updatePlotName = useUpdatePlotName();
  const updateDecoration = useUpdateDecoration();

  const handleNameChange = (value: string) => {
    setPlotName(value);
    if (value.length > 20) {
      setNameError('Maximum 20 characters');
    } else {
      setNameError('');
    }
  };

  const handleUpdateName = async () => {
    if (plotName.length === 0) {
      toast.error('Name cannot be empty');
      return;
    }

    if (plotName.length > 20) {
      toast.error('Name too long', {
        description: 'Maximum 20 characters',
      });
      return;
    }

    try {
      await updatePlotName.mutateAsync({ landId: landData.landId, name: plotName });
      toast.success('Name updated!', {
        description: `New name: ${plotName}`,
      });
    } catch (error) {
      toast.error('Failed to update name', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleUpdateDecoration = async () => {
    try {
      await updateDecoration.mutateAsync({ landId: landData.landId, url: selectedDecoration });
      toast.success('Decoration updated!', {
        description: selectedDecoration
          ? 'New decoration set'
          : 'Decoration removed',
      });
    } catch (error) {
      toast.error('Failed to update decoration', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Card className="glassmorphism border-accent/30 animate-in fade-in slide-in-from-bottom duration-700">
      <CardHeader>
        <CardTitle className="font-orbitron text-2xl text-glow-green flex items-center gap-2">
          <Paintbrush className="h-6 w-6" />
          CUSTOMIZE PLOT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plot Name Section */}
        <div className="glassmorphism p-4 rounded-lg border border-primary/20 space-y-3">
          <Label htmlFor="plotName" className="font-jetbrains text-sm text-muted-foreground uppercase">
            Plot Name
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="plotName"
                value={plotName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={20}
                placeholder="Enter name..."
                className="font-orbitron bg-background/50 border-primary/30"
              />
              <div className="flex justify-between mt-1">
                {nameError && (
                  <p className="text-xs text-destructive font-jetbrains">{nameError}</p>
                )}
                <p className="text-xs text-muted-foreground font-jetbrains ml-auto">
                  {plotName.length}/20
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpdateName}
              disabled={
                updatePlotName.isPending ||
                plotName.length === 0 ||
                plotName.length > 20 ||
                plotName === landData.plotName
              }
              className="font-orbitron bg-primary hover:bg-primary/90"
            >
              {updatePlotName.isPending ? (
                <span className="animate-pulse">...</span>
              ) : plotName === landData.plotName ? (
                <Check className="h-4 w-4" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Decoration Section */}
        <div className="glassmorphism p-4 rounded-lg border border-accent/20 space-y-3">
          <Label className="font-jetbrains text-sm text-muted-foreground uppercase">
            Plot Decoration
          </Label>
          <RadioGroup
            value={selectedDecoration}
            onValueChange={setSelectedDecoration}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {DECORATION_OPTIONS.map((option) => (
              <div key={option.id} className="relative">
                <RadioGroupItem
                  value={option.url}
                  id={option.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.id}
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-background/50 p-3 hover:bg-accent/10 hover:border-accent cursor-pointer transition-all peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/20 peer-data-[state=checked]:box-glow-green"
                >
                  {option.thumbnail ? (
                    <img
                      src={option.thumbnail}
                      alt={option.name}
                      className="w-16 h-16 object-contain mb-2"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center mb-2 text-muted-foreground">
                      <span className="text-3xl">∅</span>
                    </div>
                  )}
                  <span className="font-jetbrains text-xs text-center">
                    {option.name}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button
            onClick={handleUpdateDecoration}
            disabled={
              updateDecoration.isPending ||
              selectedDecoration === (landData.decorationURL || '')
            }
            className="w-full font-orbitron bg-accent hover:bg-accent/90 box-glow-green"
          >
            {updateDecoration.isPending ? (
              <span className="animate-pulse">UPDATING...</span>
            ) : selectedDecoration === (landData.decorationURL || '') ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                CURRENT DECORATION
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                UPDATE DECORATION
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
