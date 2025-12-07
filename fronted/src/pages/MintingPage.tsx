import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useGetLandData } from '../hooks/useQueries';
import { Loader2 } from 'lucide-react';

export default function MintingPage() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: landData, isLoading: landLoading } = useGetLandData();

  if (actorFetching || landLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin h-12 w-12 text-[#00ff41] mb-4" />
          <p className="text-white text-lg">Initializing land data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="inline-block rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00ff41] mb-4 animate-spin"></div>
        <p className="text-white text-lg">Land data initialized successfully!</p>
        <p className="text-gray-400 text-sm mt-2">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
