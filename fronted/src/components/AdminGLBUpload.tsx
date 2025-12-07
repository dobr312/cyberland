import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileUp, CheckCircle, XCircle, AlertCircle, ExternalLink, Loader2, RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAssetActor } from '../hooks/useAssetActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

interface UploadedFile {
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

// AUTHORIZED ADMIN PRINCIPAL - Only this Internet Identity can upload GLB models
const AUTHORIZED_ADMIN_PRINCIPAL = 'whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae';

// Valid land type names for GLB uploads
const VALID_LAND_TYPES = [
  'FOREST_VALLEY',
  'ISLAND_ARCHIPELAGO',
  'SNOW_PEAK',
  'DESERT_DUNE',
  'VOLCANIC_CRAG',
  'MYTHIC_VOID',
  'MYTHIC_AETHER',
];

export default function AdminGLBUpload() {
  const { actor, isFetching, error: actorError, isReady, envValidation } = useAssetActor();
  const { identity } = useInternetIdentity();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isAssetCanisterHealthy, setIsAssetCanisterHealthy] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Asset Canister health using /health-fast endpoint
  const checkAssetCanisterHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const cacheBuster = Date.now();
      const healthUrl = `https://bd3sg-teaaa-aaaaa-qaaba-cai.raw.ic0.app/health-fast?_=${cacheBuster}`;
      
      console.log('[AdminGLBUpload] Checking Asset Canister health:', healthUrl);
      
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout (3s)')), 3000);
      });

      const fetchPromise = fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        cache: 'no-store',
      });

      const healthResponse = await Promise.race([fetchPromise, timeoutPromise]);

      if (healthResponse.ok && healthResponse.status === 200) {
        const healthText = await healthResponse.text();
        console.log('[AdminGLBUpload] Asset Canister health check passed:', healthText);
        setIsAssetCanisterHealthy(true);
        toast.success('Asset Canister доступен', {
          description: 'Загрузка разблокирована',
        });
      } else {
        console.log('[AdminGLBUpload] Asset Canister health check failed:', healthResponse.status);
        setIsAssetCanisterHealthy(false);
        toast.error('Asset Canister недоступен', {
          description: 'Загрузка заблокирована',
        });
      }
    } catch (error) {
      console.error('[AdminGLBUpload] Asset Canister health check error:', error);
      setIsAssetCanisterHealthy(false);
      toast.error('Ошибка проверки Asset Canister', {
        description: 'Не удалось проверить статус',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Check authorization status
  const checkAuthorization = async () => {
    if (!actor || !identity) {
      setIsAuthorized(false);
      return;
    }

    try {
      const currentPrincipal = identity.getPrincipal();
      console.log('[AdminGLBUpload] Verifying admin status for principal:', currentPrincipal.toString());
      
      // Call backend to verify if this principal is authorized admin
      const isAdmin = await actor.isAuthorizedAdmin(currentPrincipal);
      console.log('[AdminGLBUpload] Admin verification result:', isAdmin);
      
      setIsAuthorized(isAdmin);
      
      if (isAdmin) {
        console.log('[AdminGLBUpload] ✓ Admin authorization confirmed');
        // Auto-check health when authorized
        await checkAssetCanisterHealth();
      } else {
        console.log('[AdminGLBUpload] ✗ Not authorized as admin');
      }
    } catch (error) {
      console.error('[AdminGLBUpload] Failed to verify admin status:', error);
      setIsAuthorized(false);
    }
  };

  // Check authorization when actor or identity changes
  React.useEffect(() => {
    if (actor && identity && isReady) {
      checkAuthorization();
    }
  }, [actor, identity, isReady]);

  // Extract land type name from filename (e.g., "FOREST_VALLEY.glb" -> "FOREST_VALLEY")
  const extractLandTypeName = (filename: string): string | null => {
    const nameWithoutExt = filename.replace(/\.glb$/i, '');
    
    // Check if the filename matches one of the valid land types
    const matchedType = VALID_LAND_TYPES.find(
      type => type.toLowerCase() === nameWithoutExt.toLowerCase()
    );
    
    return matchedType || null;
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (!actor || !isReady) {
      toast.error('Actor не готов', {
        description: 'Пожалуйста, подождите завершения инициализации AssetCanister',
      });
      return;
    }

    if (isAuthorized === false) {
      toast.error('Неавторизован', {
        description: `Только Internet Identity principal ${AUTHORIZED_ADMIN_PRINCIPAL} может загружать GLB модели`,
      });
      return;
    }

    // Check Asset Canister health before upload
    if (!isAssetCanisterHealthy) {
      toast.error('Asset Canister недоступен', {
        description: 'Пожалуйста, проверьте статус Asset Canister перед загрузкой',
      });
      await checkAssetCanisterHealth();
      return;
    }

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.glb')) {
        toast.error('Неверный тип файла', {
          description: `${file.name} не является .glb файлом`,
        });
        continue;
      }

      // Validate filename matches a valid land type
      const landTypeName = extractLandTypeName(file.name);
      if (!landTypeName) {
        toast.error('Неверное имя файла', {
          description: `${file.name} должен быть назван как один из типов земли: ${VALID_LAND_TYPES.join(', ')}`,
        });
        continue;
      }

      // Validate file size (max 50MB to match backend validation)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error('Файл слишком большой', {
          description: `${file.name} превышает лимит в 50МБ`,
        });
        continue;
      }

      newFiles.push({
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
      });
    }

    if (newFiles.length === 0) {
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
    
    // Start uploading files
    newFiles.forEach((_, index) => {
      uploadFile(selectedFiles[index], files.length + index);
    });
  };

  const uploadFile = async (file: File, index: number) => {
    if (!actor) {
      const errorMsg = 'Asset Actor не инициализирован';
      console.error(`[Загрузка GLB] ${errorMsg}`);
      
      setFiles(prev => prev.map((f, i) => 
        i === index 
          ? { ...f, status: 'error' as const, progress: 0, error: errorMsg } 
          : f
      ));
      
      toast.error('Ошибка инициализации', {
        description: 'Asset Actor не готов. Пожалуйста, обновите страницу.',
      });
      return;
    }

    // Re-check Asset Canister health before upload
    await checkAssetCanisterHealth();
    
    if (!isAssetCanisterHealthy) {
      const errorMsg = 'Asset Canister недоступен';
      console.error(`[Загрузка GLB] ${errorMsg}`);
      
      setFiles(prev => prev.map((f, i) => 
        i === index 
          ? { ...f, status: 'error' as const, progress: 0, error: errorMsg } 
          : f
      ));
      
      toast.error('Ошибка загрузки', {
        description: 'Asset Canister недоступен. Проверьте статус.',
      });
      return;
    }

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Extract land type name from filename
      const landTypeName = extractLandTypeName(file.name);
      if (!landTypeName) {
        throw new Error(`Неверное имя файла: ${file.name}. Должно соответствовать типу земли.`);
      }

      // Update status to uploading
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading' as const, progress: 10 } : f
      ));

      console.log(`[Загрузка GLB] Начало загрузки для ${file.name} (${file.size} байт) как тип земли: ${landTypeName}`);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      console.log(`[Загрузка GLB] Файл прочитан, размер: ${uint8Array.length} байт`);

      // Simulate progress updates
      progressInterval = setInterval(() => {
        setFiles(prev => prev.map((f, i) => 
          i === index && f.progress < 90 
            ? { ...f, progress: Math.min(f.progress + 10, 90) } 
            : f
        ));
      }, 200);

      // Upload to AssetCanister using uploadLandModel (admin-only method)
      console.log(`[Загрузка GLB] Вызов uploadLandModel для ${landTypeName}...`);
      
      const stableUrl = await actor.uploadLandModel(landTypeName, uint8Array);

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      console.log(`[Загрузка GLB] ✓ uploadLandModel успешно завершен для ${landTypeName}`);
      console.log(`[Загрузка GLB] ✓ Стабильный URL: ${stableUrl}`);

      // Update status to success with the returned stable URL
      setFiles(prev => prev.map((f, i) => 
        i === index 
          ? { ...f, status: 'success' as const, progress: 100, url: stableUrl } 
          : f
      ));

      console.log(`[Загрузка GLB] ✓ Загрузка успешна: ${stableUrl}`);
      
      toast.success('✅ Загружено', {
        description: `${file.name} успешно загружен как ${landTypeName}`,
      });

    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      console.error(`[Загрузка GLB] ✗ Ошибка загрузки для ${file.name}:`, error);
      
      let errorMessage = 'Неизвестная ошибка';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Parse common error messages
        if (errorMessage.includes('Unauthorized') || errorMessage.includes('authorized admin')) {
          errorMessage = `Неавторизован: Только Internet Identity principal ${AUTHORIZED_ADMIN_PRINCIPAL} может загружать GLB модели`;
        } else if (errorMessage.includes('Invalid land type')) {
          errorMessage = `Неверный тип земли. Допустимые типы: ${VALID_LAND_TYPES.join(', ')}`;
        } else if (errorMessage.includes('Invalid file data')) {
          errorMessage = 'Файл не может быть пустым.';
        } else if (errorMessage.includes('File size exceeds 50 MB limit')) {
          errorMessage = 'Файл слишком большой: Максимальный размер 50МБ';
        }
      }
      
      setFiles(prev => prev.map((f, i) => 
        i === index 
          ? { ...f, status: 'error' as const, progress: 0, error: errorMessage } 
          : f
      ));

      toast.error('Ошибка загрузки', {
        description: `${file.name}: ${errorMessage}`,
        duration: 5000,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      case 'uploading':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="font-jetbrains text-yellow-400">Ожидание</Badge>;
      case 'uploading':
        return <Badge variant="default" className="font-jetbrains bg-primary">Загрузка</Badge>;
      case 'success':
        return <Badge variant="default" className="font-jetbrains bg-green-600">✅ Загружено</Badge>;
      case 'error':
        return <Badge variant="destructive" className="font-jetbrains">Ошибка</Badge>;
    }
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const clearAll = () => {
    setFiles([]);
  };

  // Loading state
  if (isFetching) {
    return (
      <Card className="glassmorphism border-yellow-500/30">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
              <p className="font-jetbrains text-muted-foreground">
                Инициализация AssetCanister...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state with detailed feedback
  if (actorError || !actor) {
    const showEnvErrors = envValidation && !envValidation.isValid;
    
    return (
      <Card className="glassmorphism border-destructive/30">
        <CardContent className="py-6">
          <div className="space-y-4">
            {showEnvErrors ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-orbitron">Ошибка конфигурации</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p className="font-jetbrains text-sm">
                    Отсутствующие или неверные переменные окружения:
                  </p>
                  <ul className="font-jetbrains text-xs space-y-1 list-disc list-inside">
                    {envValidation.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-orbitron">Ошибка подключения</AlertTitle>
                <AlertDescription className="font-jetbrains text-sm">
                  {actorError || 'Не удалось инициализировать Asset Canister actor'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Authorization check
  if (isAuthorized === false) {
    const currentPrincipal = identity?.getPrincipal().toString() || 'неизвестно';
    
    return (
      <Card className="glassmorphism border-destructive/30">
        <CardContent className="py-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle className="font-orbitron">Неавторизованный доступ</AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="font-jetbrains text-sm">
                Только principal <strong>{AUTHORIZED_ADMIN_PRINCIPAL}</strong> может загружать GLB модели.
              </p>
              <div className="glassmorphism p-3 rounded-lg border border-muted/20 mt-2">
                <p className="font-jetbrains text-xs text-muted-foreground">
                  <strong>Ваш Principal:</strong>
                </p>
                <code className="font-jetbrains text-xs bg-muted px-2 py-1 rounded block mt-1 break-all">
                  {currentPrincipal}
                </code>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Ready state
  return (
    <Card className="glassmorphism border-[#00ff41]/30">
      <CardContent className="py-6 space-y-6">
        {/* Authorization & Health Status */}
        <div className="grid grid-cols-2 gap-4">
          {/* Authorization Badge */}
          {isAuthorized && (
            <div className="glassmorphism p-3 rounded-lg border border-green-500/30 flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-orbitron text-sm font-bold text-green-500">АВТОРИЗОВАН</p>
                <p className="font-jetbrains text-xs text-muted-foreground">
                  Principal подтвержден
                </p>
              </div>
            </div>
          )}

          {/* Asset Canister Health Status */}
          <div className={`glassmorphism p-3 rounded-lg border flex items-center gap-3 ${
            isAssetCanisterHealthy ? 'border-green-500/30' : 'border-red-500/30'
          }`}>
            {isAssetCanisterHealthy ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div className="flex-1">
              <p className={`font-orbitron text-sm font-bold ${
                isAssetCanisterHealthy ? 'text-green-500' : 'text-red-400'
              }`}>
                Asset Canister: {isAssetCanisterHealthy ? 'HEALTHY' : 'ERROR'}
              </p>
              <p className="font-jetbrains text-xs text-muted-foreground">
                {isAssetCanisterHealthy ? 'Загрузка разблокирована' : 'Загрузка заблокирована'}
              </p>
            </div>
            <Button
              onClick={checkAssetCanisterHealth}
              disabled={isCheckingHealth}
              size="sm"
              variant="outline"
              className="font-jetbrains text-xs"
            >
              {isCheckingHealth ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Valid Land Types Info */}
        <div className="glassmorphism p-4 rounded-lg border border-primary/20">
          <p className="font-orbitron text-sm font-bold text-primary mb-2">
            Допустимые типы земли:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VALID_LAND_TYPES.map(type => (
              <code key={type} className="font-jetbrains text-xs bg-muted px-2 py-1 rounded">
                {type}.glb
              </code>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            glassmorphism p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer
            ${!isAssetCanisterHealthy ? 'opacity-50 cursor-not-allowed' : ''}
            ${isDragging 
              ? 'border-primary bg-primary/10 scale-[1.02]' 
              : 'border-primary/30 hover:border-primary/50 hover:bg-primary/5'
            }
          `}
          onClick={isAssetCanisterHealthy ? handleButtonClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={!isAssetCanisterHealthy}
          />
          
          <div className="flex flex-col items-center gap-4 text-center">
            <FileUp className={`h-16 w-16 ${isDragging ? 'text-primary animate-bounce' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-orbitron text-lg font-bold text-primary mb-2">
                {isDragging ? 'Перетащите файлы сюда' : 'Загрузить GLB модели'}
              </p>
              <p className="font-jetbrains text-sm text-muted-foreground">
                {isAssetCanisterHealthy 
                  ? 'Перетащите .glb файлы или нажмите для выбора' 
                  : 'Проверьте статус Asset Canister для разблокировки загрузки'
                }
              </p>
              <p className="font-jetbrains text-xs text-muted-foreground mt-2">
                Максимальный размер файла: 50МБ
              </p>
            </div>
            {isAssetCanisterHealthy && (
              <Button
                type="button"
                variant="outline"
                className="font-orbitron border-primary/30 hover:border-primary/50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleButtonClick();
                }}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Выбрать файлы
              </Button>
            )}
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-orbitron text-sm text-muted-foreground">
                Загруженные файлы ({files.length})
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={clearCompleted}
                  size="sm"
                  variant="outline"
                  className="font-jetbrains text-xs"
                  disabled={!files.some(f => f.status === 'success')}
                >
                  Очистить завершенные
                </Button>
                <Button
                  onClick={clearAll}
                  size="sm"
                  variant="outline"
                  className="font-jetbrains text-xs"
                >
                  Очистить все
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="glassmorphism p-4 rounded-lg border border-primary/20"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(file.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-orbitron text-sm font-bold text-primary truncate">
                          {file.name}
                        </p>
                        {getStatusBadge(file.status)}
                      </div>
                      
                      <p className="font-jetbrains text-xs text-muted-foreground mb-2">
                        Размер: {formatFileSize(file.size)}
                      </p>

                      {file.status === 'uploading' && (
                        <div className="space-y-1">
                          <Progress value={file.progress} className="h-2" />
                          <p className="font-jetbrains text-xs text-muted-foreground">
                            {file.progress}% загружено
                          </p>
                        </div>
                      )}

                      {file.status === 'success' && file.url && (
                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-jetbrains text-xs text-primary hover:text-primary/80 flex items-center gap-1 truncate"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{file.url}</span>
                          </a>
                        </div>
                      )}

                      {file.status === 'error' && file.error && (
                        <p className="font-jetbrains text-xs text-destructive mt-2">
                          Ошибка: {file.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
