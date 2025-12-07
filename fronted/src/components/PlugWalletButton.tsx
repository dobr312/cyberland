import { Button } from '@/components/ui/button';
import { usePlugWallet } from '../contexts/PlugWalletContext';
import { Wallet, Loader2, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PlugWalletButton() {
  const { isConnected, principal, isConnecting, connect, disconnect } = usePlugWallet();

  if (isConnected && principal) {
    const principalStr = principal.toString();
    const shortPrincipal = `${principalStr.slice(0, 6)}...${principalStr.slice(-4)}`;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="font-orbitron border-primary/50 hover:bg-primary/10 hover:border-primary"
          >
            <Wallet className="mr-2 h-4 w-4" />
            {shortPrincipal}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glassmorphism border-primary/20">
          <DropdownMenuLabel className="font-jetbrains text-xs">
            Plug Wallet
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="font-jetbrains text-xs cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(principalStr);
            }}
          >
            Copy Principal ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="font-jetbrains text-xs cursor-pointer text-destructive focus:text-destructive"
            onClick={disconnect}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={isConnecting}
      variant="outline"
      size="sm"
      className="font-orbitron border-primary/50 hover:bg-primary/10 hover:border-primary"
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </>
      )}
    </Button>
  );
}
