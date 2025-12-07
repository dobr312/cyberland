import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { toast } from 'sonner';
import { User } from 'lucide-react';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Пожалуйста, введите ваше имя');
      return;
    }

    try {
      await saveProfile.mutateAsync({ name: name.trim() });
      toast.success('Профиль успешно создан!');
    } catch (error) {
      console.error('Profile save error:', error);
      toast.error('Не удалось создать профиль', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md glassmorphism border-primary/30 animate-in fade-in zoom-in duration-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-orbitron text-3xl text-glow-teal">
            НАСТРОЙКА ПРОФИЛЯ
          </CardTitle>
          <CardDescription className="font-jetbrains">
            Добро пожаловать в CyberGenesis! Пожалуйста, введите ваше имя для начала.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-jetbrains text-sm">
                Ваше имя
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Введите ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-jetbrains glassmorphism border-primary/30"
                disabled={saveProfile.isPending}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full font-orbitron bg-primary hover:bg-primary/90 text-primary-foreground box-glow-teal"
              disabled={saveProfile.isPending}
            >
              {saveProfile.isPending ? (
                <span className="animate-pulse">СОЗДАНИЕ ПРОФИЛЯ...</span>
              ) : (
                'СОЗДАТЬ ПРОФИЛЬ'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
