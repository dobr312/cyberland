import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PLANNED_MODIFIER_CATALOG } from "@/data/modifierCatalog";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useBuyItem,
  useCancelListing,
  useGetAllActiveListings,
  useGetLandData,
  useGetMyModifications,
  useListItem,
} from "../hooks/useQueries";
import { ItemType } from "../marketplace-backend.d";

// ─── Mock Data ──────────────────────────────────────────────────────────────
const BIOME_NAMES: Record<string, string> = {
  FOREST_VALLEY: "Forest Valley",
  ISLAND_ARCHIPELAGO: "Island Archipelago",
  SNOW_PEAK: "Snow Peak",
  DESERT_DUNE: "Desert Dune",
  VOLCANIC_CRAG: "Volcanic Crag",
  MYTHIC_VOID: "Mythic Void",
};

// Mock seller principal IDs
const MOCK_SELLERS: Record<string, string> = {
  "aaaaa-bbbbb": "eqr7k-xyaaa-aaaaa-qaabq-cai",
  "ccccc-ddddd": "rdmx6-jaaaa-aaaaa-aaadq-cai",
  "eeeee-fffff": "aaaaa-bbbbb-ccccc-ddddd-cai",
  "ggggg-hhhhh": "n5n3n-ciaaa-aaaaa-qaaba-cai",
  "iiiii-jjjjj": "br5f7-7uaaa-aaaaa-qaaca-cai",
  "kkkkk-lllll": "xjmo4-nqaaa-aaaaa-qaana-cai",
};

function truncatePrincipal(id: string) {
  if (id.length <= 10) return id;
  return `${id.slice(0, 5)}...${id.slice(-5)}`;
}

const MOCK_LAND_LISTINGS = [
  {
    listingId: BigInt(1001),
    itemId: BigInt(1),
    biome: "FOREST_VALLEY",
    modSlots: {
      1: 1,
      3: 3,
      5: 5,
      7: 7,
      9: 9,
      11: 11,
      13: 13,
      15: 15,
      17: 17,
      19: 19,
      21: 21,
    },
    price: BigInt("50000000000"),
    glowColor: "#00ff41",
    seller: "aaaaa-bbbbb",
  },
  {
    listingId: BigInt(1002),
    itemId: BigInt(2),
    biome: "VOLCANIC_CRAG",
    modSlots: {
      2: 2,
      4: 4,
      6: 6,
      8: 8,
      10: 10,
      12: 12,
      14: 14,
      16: 16,
      18: 18,
      20: 20,
      22: 22,
      24: 24,
      26: 26,
      28: 28,
      30: 30,
      32: 32,
      34: 34,
      36: 36,
      38: 38,
      40: 40,
      42: 42,
      44: 44,
      46: 46,
      48: 48,
    },
    price: BigInt("120000000000"),
    glowColor: "#ff3344",
    seller: "ccccc-ddddd",
  },
  {
    listingId: BigInt(1003),
    itemId: BigInt(3),
    biome: "SNOW_PEAK",
    modSlots: { 5: 5, 10: 10, 15: 15, 20: 20, 25: 25 },
    price: BigInt("30000000000"),
    glowColor: "#3366ff",
    seller: "eeeee-fffff",
  },
  {
    listingId: BigInt(1004),
    itemId: BigInt(4),
    biome: "DESERT_DUNE",
    modSlots: Object.fromEntries(
      Array.from({ length: 35 }, (_, i) => [i + 1, i + 1]),
    ),
    price: BigInt("250000000000"),
    glowColor: "#ff9900",
    seller: "ggggg-hhhhh",
  },
  {
    listingId: BigInt(1005),
    itemId: BigInt(5),
    biome: "MYTHIC_VOID",
    modSlots: { 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48 },
    price: BigInt("990000000000"),
    glowColor: "#9933ff",
    seller: "iiiii-jjjjj",
  },
  {
    listingId: BigInt(1006),
    itemId: BigInt(6),
    biome: "ISLAND_ARCHIPELAGO",
    modSlots: { 16: 16, 17: 17, 18: 18, 31: 31, 32: 32 },
    price: BigInt("75000000000"),
    glowColor: "#00ffff",
    seller: "kkkkk-lllll",
  },
];

type MockLandListing = (typeof MOCK_LAND_LISTINGS)[0];

const MOCK_MOD_PRICES = [50, 80, 120, 200, 350, 600, 1000, 2000];

// ─── Rarity helpers ─────────────────────────────────────────────────────────
const RARITY_NAMES: Record<number, string> = {
  1: "COMMON",
  2: "RARE",
  3: "LEGENDARY",
  4: "MYTHIC",
};
const RARITY_TEXT: Record<number, string> = {
  1: "text-gray-400",
  2: "text-blue-400",
  3: "text-purple-400",
  4: "text-yellow-400",
};
const RARITY_BORDER: Record<number, string> = {
  1: "border-gray-500/30 hover:border-gray-400/50",
  2: "border-blue-500/30 hover:border-blue-400/50",
  3: "border-[#9933ff]/30 hover:border-[#9933ff]/50",
  4: "border-yellow-500/30 hover:border-yellow-400/50",
};
const RARITY_GLOW_COLOR: Record<number, string> = {
  1: "rgba(156,163,175,0.2)",
  2: "rgba(96,165,250,0.25)",
  3: "rgba(168,85,247,0.3)",
  4: "rgba(250,204,21,0.35)",
};
const RARITY_DROP_SHADOW: Record<number, string> = {
  1: "drop-shadow(0 0 6px rgba(156,163,175,0.3))",
  2: "drop-shadow(0 0 6px rgba(96,165,250,0.4))",
  3: "drop-shadow(0 0 8px rgba(168,85,247,0.5))",
  4: "drop-shadow(0 0 10px rgba(250,204,21,0.6))",
};

const PULSE_BORDER_STYLE = {
  animation: "pulse-border-violet 2s ease-in-out infinite",
  border: "1px solid rgba(153,51,255,0.6)",
};

const formatPrice = (price: bigint) =>
  (Number(price) / 100_000_000).toLocaleString();

// ─── Seller Icon Button ──────────────────────────────────────────────────────
function SellerIcon({ seller }: { seller: string }) {
  const fullId = MOCK_SELLERS[seller] ?? seller;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toast.info(`Principal ID: ${fullId}`, {
          description: "Нажмите чтобы скопировать",
          action: {
            label: "Copy",
            onClick: () => navigator.clipboard.writeText(fullId),
          },
        });
      }}
      className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/15 hover:border-[#9933ff]/50 hover:bg-[#9933ff]/10 transition-all"
      title={`Продавец: ${truncatePrincipal(fullId)}`}
    >
      <User className="w-3 h-3 text-white/40 hover:text-[#9933ff]" />
    </button>
  );
}

// ─── Land Inspector Modal ────────────────────────────────────────────────────
function LandInspectorModal({
  land,
  onClose,
}: {
  land: MockLandListing;
  onClose: () => void;
}) {
  const allSlots = Array.from({ length: 49 }, (_, i) => i + 1);
  const biomeName = BIOME_NAMES[land.biome] ?? land.biome;
  const fullSellerId = MOCK_SELLERS[land.seller] ?? land.seller;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="land_inspector.modal"
    >
      <div
        className="glassmorphism border border-[#9933ff]/40 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-auto"
        style={{ boxShadow: "0 0 40px rgba(153,51,255,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#9933ff]/20">
          <div>
            <h3
              className="font-orbitron font-bold text-xl text-white"
              style={{ textShadow: "0 0 10px rgba(153,51,255,0.7)" }}
            >
              {biomeName.toUpperCase()}
            </h3>
            <p className="font-jetbrains text-xs text-white/40 mt-0.5">
              LAND #{land.itemId.toString()} · INSPECTOR
            </p>
            <p className="font-jetbrains text-[10px] text-white/30 mt-0.5">
              Продавец: {truncatePrincipal(fullSellerId)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-[#9933ff]/50 transition-all"
            data-ocid="land_inspector.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 7×7 Grid */}
        <div className="p-5">
          <p className="font-jetbrains text-[10px] text-white/40 uppercase tracking-widest mb-3">
            Слоты модификаторов (49)
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {allSlots.map((slot) => {
              const modId = land.modSlots[slot as keyof typeof land.modSlots];
              const mod = modId
                ? PLANNED_MODIFIER_CATALOG.find((m) => m.id === modId)
                : null;
              if (mod) {
                return (
                  <div
                    key={slot}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 glassmorphism border border-[#9933ff]/30 p-1 relative overflow-hidden"
                    style={{ filter: RARITY_DROP_SHADOW[mod.rarity_tier] }}
                    title={`Слот #${slot}: ${mod.name}`}
                  >
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: `radial-gradient(circle, ${RARITY_GLOW_COLOR[mod.rarity_tier]}, transparent 70%)`,
                      }}
                    />
                    <img
                      src={mod.asset_url}
                      alt={mod.name}
                      className="w-7 h-7 object-contain relative z-10"
                    />
                    <span
                      className={`text-[7px] font-jetbrains ${RARITY_TEXT[mod.rarity_tier]} text-center leading-tight relative z-10 truncate w-full px-0.5`}
                    >
                      {mod.name.split(" ")[0]}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={slot}
                  className="aspect-square rounded-lg flex items-center justify-center glassmorphism border border-white/8 bg-white/2"
                >
                  <span className="font-jetbrains text-[9px] text-white/20">
                    #{slot}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── ModCard ─────────────────────────────────────────────────────────────────
function ModCard({
  mod,
  price,
  listingId,
  sellerKey,
  onBuy,
  buying,
}: {
  mod: (typeof PLANNED_MODIFIER_CATALOG)[0];
  price: bigint;
  listingId: bigint;
  sellerKey: string;
  onBuy: (id: bigint, price: bigint) => void;
  buying: boolean;
}) {
  const tier = mod.rarity_tier;
  return (
    <div
      className={`glassmorphism rounded-xl border ${RARITY_BORDER[tier]} transition-all duration-300 relative overflow-hidden p-3 flex flex-col gap-2`}
      style={{
        boxShadow: `0 0 15px ${RARITY_GLOW_COLOR[tier]}`,
      }}
      data-ocid="mod_card.card"
    >
      {/* Seller icon top-right */}
      <div className="absolute top-2 right-2">
        <SellerIcon seller={sellerKey} />
      </div>

      {/* Glow bg */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, ${RARITY_GLOW_COLOR[tier]}, transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-2">
        {/* Image */}
        <div className="w-16 h-16 flex items-center justify-center">
          <img
            src={mod.asset_url}
            alt={mod.name}
            className="w-full h-full object-contain"
            style={{ filter: RARITY_DROP_SHADOW[tier] }}
          />
        </div>

        {/* Info */}
        <div className="text-center w-full">
          <p className="font-orbitron font-bold text-white text-xs leading-tight truncate">
            {mod.name}
          </p>
          <p
            className={`font-jetbrains text-[10px] mt-0.5 ${RARITY_TEXT[tier]}`}
          >
            {RARITY_NAMES[tier]}
          </p>
          <p className="font-jetbrains text-[9px] text-white/30 mt-0.5">
            ID: {mod.id}
          </p>
        </div>

        {/* Price + Buy */}
        <div className="w-full flex items-center justify-between gap-2 mt-1">
          <span className="font-orbitron text-yellow-400 text-xs font-bold">
            {formatPrice(price)}
            <span className="text-white/30 text-[9px] ml-1">CBR</span>
          </span>
          <button
            type="button"
            onClick={() => onBuy(listingId, price)}
            disabled={buying}
            className="px-2 py-1 rounded-lg font-orbitron text-[9px] font-bold bg-[#9933ff]/20 border border-[#9933ff]/50 text-[#9933ff] hover:bg-[#9933ff]/30 transition-all disabled:opacity-50"
            data-ocid="mod_card.primary_button"
          >
            {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : "КУПИТЬ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LandCard ─────────────────────────────────────────────────────────────────
function LandCard({
  land,
  onBuy,
  buying,
  onInspect,
}: {
  land: MockLandListing;
  onBuy: (id: bigint, price: bigint) => void;
  buying: boolean;
  onInspect: (land: MockLandListing) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const biomeName = BIOME_NAMES[land.biome] ?? land.biome;
  const modIds = Object.values(land.modSlots) as number[];
  const maxVisible = 8;
  const visibleMods = expanded ? modIds : modIds.slice(0, maxVisible);
  const extraCount = modIds.length - maxVisible;

  return (
    <div
      className="glassmorphism rounded-2xl border border-[#9933ff]/30 relative overflow-hidden transition-all duration-300 hover:border-[#9933ff]/50"
      style={{ boxShadow: `0 0 20px ${land.glowColor}22` }}
      data-ocid="land_card.card"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${land.glowColor}26, transparent 65%)`,
        }}
      />

      <div className="relative z-10 p-4 space-y-3">
        {/* Top row: biome + Land ID + seller icon */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="font-orbitron font-bold text-white uppercase tracking-wide text-sm cursor-pointer text-left"
            style={{ textShadow: `0 0 8px ${land.glowColor}` }}
            onClick={() => onInspect(land)}
          >
            {biomeName}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="font-jetbrains text-[10px] text-white/40">
              #{land.itemId.toString()}
            </span>
            <SellerIcon seller={land.seller} />
          </div>
        </div>

        {/* Photo */}
        <button
          type="button"
          className="relative rounded-xl overflow-hidden cursor-pointer w-full"
          style={{ height: "160px" }}
          onClick={() => onInspect(land)}
        >
          <div
            className="absolute inset-0 z-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${land.glowColor}40, transparent 70%)`,
              filter: "blur(20px)",
            }}
          />
          <img
            src="/assets/uploads/IMG_0577-1-1.webp"
            alt={biomeName}
            className="w-full h-full object-cover rounded-xl relative z-10 opacity-90"
          />
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <span className="font-orbitron text-[10px] text-white/60 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10 uppercase tracking-widest">
              {biomeName}
            </span>
          </div>
        </button>

        {/* Mod count hero */}
        <button
          type="button"
          className="flex items-center justify-center cursor-pointer w-full"
          onClick={() => onInspect(land)}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{
              borderColor: `${land.glowColor}60`,
              background: `${land.glowColor}15`,
              boxShadow: `0 0 12px ${land.glowColor}30`,
            }}
          >
            <span
              className="font-orbitron font-black text-2xl"
              style={{
                color: land.glowColor,
                textShadow: `0 0 10px ${land.glowColor}`,
              }}
            >
              {modIds.length}
            </span>
            <span className="font-jetbrains text-white/40 text-xs">/</span>
            <span className="font-orbitron font-bold text-white/60 text-lg">
              49
            </span>
            <span className="font-orbitron text-[10px] text-white/40 ml-1">
              MODS
            </span>
          </div>
        </button>

        {/* Price + Buy */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-jetbrains text-[10px] text-white/40 uppercase">
              Цена
            </p>
            <p className="font-orbitron font-bold text-yellow-400 text-lg">
              {formatPrice(land.price)}{" "}
              <span className="text-white/40 text-xs">CBR</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onBuy(land.listingId, land.price)}
            disabled={buying}
            className="px-4 py-2 rounded-xl font-orbitron text-xs font-bold bg-[#00ff41]/20 border border-[#00ff41]/50 text-[#00ff41] hover:bg-[#00ff41]/30 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
            data-ocid="land_card.primary_button"
          >
            {buying ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ShoppingCart className="w-3 h-3" />
            )}
            КУПИТЬ
          </button>
        </div>

        {/* Mod slider */}
        <div className="border-t border-white/10 pt-3">
          <p className="font-jetbrains text-[9px] text-white/30 uppercase tracking-widest mb-2">
            Установленные моды
          </p>
          <div
            className={`flex gap-1.5 ${expanded ? "flex-wrap" : "overflow-x-auto"}`}
            style={{ scrollbarWidth: "none" }}
          >
            {visibleMods.map((modId) => {
              const mod = PLANNED_MODIFIER_CATALOG.find((m) => m.id === modId);
              if (!mod) return null;
              return (
                <div
                  key={modId}
                  className="flex-shrink-0 w-8 h-8 rounded-lg glassmorphism border border-white/10 flex items-center justify-center overflow-hidden"
                  style={{ filter: RARITY_DROP_SHADOW[mod.rarity_tier] }}
                  title={mod.name}
                >
                  <img
                    src={mod.asset_url}
                    alt={mod.name}
                    className="w-7 h-7 object-contain"
                  />
                </div>
              );
            })}
            {!expanded && extraCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex-shrink-0 w-8 h-8 rounded-lg glassmorphism border border-[#9933ff]/40 flex items-center justify-center font-orbitron text-[9px] text-[#9933ff] hover:border-[#9933ff]/70 transition-all"
                data-ocid="land_card.toggle"
              >
                +{extraCount}
              </button>
            )}
            {expanded && extraCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex-shrink-0 w-8 h-8 rounded-lg glassmorphism border border-white/20 flex items-center justify-center font-orbitron text-[9px] text-white/50 hover:border-white/40 transition-all"
                data-ocid="land_card.toggle"
              >
                ↑
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Neon Checkbox ─────────────────────────────────────────────────────────
function NeonCheckbox({
  checked,
  onChange,
  label,
  color = "#9933ff",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 group"
    >
      <div
        className="w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 flex-shrink-0"
        style={{
          borderColor: checked ? color : "rgba(255,255,255,0.2)",
          background: checked ? `${color}30` : "rgba(255,255,255,0.03)",
          boxShadow: checked ? `0 0 6px ${color}80` : "none",
        }}
      >
        {checked && (
          <div
            className="w-2 h-2 rounded-sm"
            style={{ background: color, boxShadow: `0 0 4px ${color}` }}
          />
        )}
      </div>
      <span className="font-jetbrains text-xs text-white/60 group-hover:text-white/80 transition-colors">
        {label}
      </span>
    </button>
  );
}

// ─── Neon Range Slider ─────────────────────────────────────────────────────
function NeonSlider({
  value,
  onChange,
  min,
  max,
  label,
  color = "#9933ff",
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-jetbrains text-[10px] text-white/40 uppercase tracking-widest">
          {label}
        </span>
        <span className="font-jetbrains text-[10px]" style={{ color }}>
          {value.toLocaleString()}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

// ─── Create Listing Dialog ────────────────────────────────────────────────────
function CreateListingDialog({
  open,
  onOpenChange,
  onList,
  isPending,
  myLandArray,
  myModifications,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onList: (type: "land" | "modifier", id: bigint, price: string) => void;
  isPending: boolean;
  myLandArray:
    | { landId: bigint; plotName: string; biome: string }[]
    | undefined;
  myModifications:
    | { modifierInstanceId: bigint; rarity_tier: bigint }[]
    | undefined;
}) {
  const [tab, setTab] = useState<"land" | "modifier">("land");
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [price, setPrice] = useState("");

  const handleSelect = (id: bigint) => {
    setSelectedId(id === selectedId ? null : id);
    setPrice("");
  };

  const handleList = () => {
    if (!selectedId || !price) return;
    onList(tab, selectedId, price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glassmorphism border border-[#9933ff]/40 rounded-2xl max-w-lg w-full"
        style={{
          background: "rgba(8,0,18,0.96)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 50px rgba(153,51,255,0.2)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="font-orbitron text-xl text-white"
            style={{ textShadow: "0 0 10px rgba(153,51,255,0.7)" }}
          >
            РАЗМЕСТИТЬ ПРЕДМЕТ
          </DialogTitle>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex gap-2 mt-1">
          {(["land", "modifier"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setSelectedId(null);
                setPrice("");
              }}
              className="flex-1 py-2 rounded-xl font-orbitron text-xs font-bold transition-all duration-200"
              style={
                tab === t
                  ? {
                      ...PULSE_BORDER_STYLE,
                      color: "#9933ff",
                      background: "rgba(153,51,255,0.12)",
                    }
                  : {
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.4)",
                      background: "transparent",
                    }
              }
            >
              {t === "land" ? "ЗЕМЛИ" : "МОДИФИКАТОРЫ"}
            </button>
          ))}
        </div>

        {/* Inventory grid */}
        <div className="max-h-60 overflow-y-auto pr-1 mt-2">
          {tab === "land" ? (
            <div className="space-y-2">
              {(!myLandArray || myLandArray.length === 0) && (
                <p className="font-jetbrains text-xs text-white/30 text-center py-4">
                  Нет земель в инвентаре
                </p>
              )}
              {(myLandArray ?? []).map((land) => (
                <button
                  key={land.landId.toString()}
                  type="button"
                  onClick={() => handleSelect(land.landId)}
                  className="w-full text-left"
                >
                  <div
                    className="glassmorphism rounded-xl p-3 border transition-all duration-200"
                    style={{
                      borderColor:
                        selectedId === land.landId
                          ? "rgba(153,51,255,0.7)"
                          : "rgba(153,51,255,0.25)",
                      boxShadow:
                        selectedId === land.landId
                          ? "0 0 12px rgba(153,51,255,0.3)"
                          : "none",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src="/assets/uploads/IMG_0577-1-1.webp"
                        alt={land.plotName}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 opacity-80"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-orbitron text-xs text-white font-bold truncate">
                          {land.plotName}
                        </p>
                        <p className="font-jetbrains text-[10px] text-white/40">
                          {BIOME_NAMES[land.biome] ?? land.biome}
                        </p>
                      </div>
                      {selectedId === land.landId && (
                        <div
                          className="w-3 h-3 rounded-full bg-[#9933ff] flex-shrink-0"
                          style={{ boxShadow: "0 0 6px #9933ff" }}
                        />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(!myModifications || myModifications.length === 0) && (
                <p className="col-span-3 font-jetbrains text-xs text-white/30 text-center py-4">
                  Нет модификаторов в инвентаре
                </p>
              )}
              {(myModifications ?? []).map((mod) => {
                const tier = Number(mod.rarity_tier);
                const cat = PLANNED_MODIFIER_CATALOG.find(
                  (c) => c.id === (Number(mod.modifierInstanceId) % 48) + 1,
                );
                const isSelected = selectedId === mod.modifierInstanceId;
                return (
                  <button
                    key={mod.modifierInstanceId.toString()}
                    type="button"
                    onClick={() => handleSelect(mod.modifierInstanceId)}
                    className="text-left"
                  >
                    <div
                      className="glassmorphism rounded-xl p-2 border flex flex-col items-center gap-1 transition-all duration-200"
                      style={{
                        borderColor: isSelected
                          ? "rgba(153,51,255,0.7)"
                          : `${RARITY_GLOW_COLOR[tier] ?? RARITY_GLOW_COLOR[1]}`,
                        boxShadow: isSelected
                          ? "0 0 10px rgba(153,51,255,0.3)"
                          : "none",
                      }}
                    >
                      {cat && (
                        <img
                          src={cat.asset_url}
                          alt={cat.name}
                          className="w-10 h-10 object-contain"
                          style={{
                            filter:
                              RARITY_DROP_SHADOW[tier] ?? RARITY_DROP_SHADOW[1],
                          }}
                        />
                      )}
                      <span
                        className={`font-jetbrains text-[9px] ${RARITY_TEXT[tier] ?? RARITY_TEXT[1]}`}
                      >
                        {RARITY_NAMES[tier] ?? "??"}
                      </span>
                      <span className="font-jetbrains text-[8px] text-white/30">
                        #{mod.modifierInstanceId.toString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Price input - shows only when item selected */}
        {selectedId && (
          <div className="mt-2 space-y-3">
            <div
              className="glassmorphism rounded-xl border border-[#9933ff]/30 p-3"
              style={{ background: "rgba(153,51,255,0.05)" }}
            >
              <p className="font-jetbrains text-[10px] text-white/50 uppercase tracking-widest mb-2">
                Цена продажи (CBR)
              </p>
              <div className="relative">
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="font-orbitron text-sm bg-transparent border-[#9933ff]/30 text-white placeholder:text-white/20 focus:border-[#9933ff]/70 pr-12"
                  data-ocid="list_dialog.input"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-jetbrains text-[10px] text-[#9933ff]/60">
                  CBR
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleList}
              disabled={isPending || !price}
              className="w-full py-3 rounded-xl font-orbitron text-xs font-bold text-white disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                ...PULSE_BORDER_STYLE,
                background: "rgba(153,51,255,0.2)",
                boxShadow: "0 0 20px rgba(153,51,255,0.3)",
                textShadow: "0 0 8px rgba(153,51,255,0.8)",
              }}
              data-ocid="list_dialog.submit_button"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Размещение...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> ВЫСТАВИТЬ НА ПРОДАЖУ
                </>
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Marketplace() {
  const { data: listings } = useGetAllActiveListings();
  const { data: myLandArray } = useGetLandData();
  const { data: myModifications } = useGetMyModifications();
  const { identity } = useInternetIdentity();
  const buyItemMutation = useBuyItem();
  const listItemMutation = useListItem();
  const _cancelListingMutation = useCancelListing();

  const [buyingId, setBuyingId] = useState<bigint | null>(null);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"lands" | "modifications">(
    "lands",
  );
  const [inspectedLand, setInspectedLand] = useState<MockLandListing | null>(
    null,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterBiomes, setFilterBiomes] = useState<Record<string, boolean>>({});
  const [filterTiers, setFilterTiers] = useState<Record<number, boolean>>({});
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);

  // Pagination
  const [landPage, setLandPage] = useState(0);
  const [modPage, setModPage] = useState(0);
  const LAND_PER_PAGE = 10;
  const MOD_PER_PAGE = 12;

  const handleBuyItem = async (listingId: bigint, _price: bigint) => {
    if (!identity) {
      toast.error("Подключите Internet Identity");
      return;
    }
    setBuyingId(listingId);
    try {
      await buyItemMutation.mutateAsync(listingId);
      toast.success("Предмет куплен!");
    } catch {
      toast.error("Ошибка при покупке");
    } finally {
      setBuyingId(null);
    }
  };

  const handleListItem = async (
    type: "land" | "modifier",
    id: bigint,
    price: string,
  ) => {
    if (!identity) {
      toast.error("Подключите Internet Identity");
      return;
    }
    try {
      const priceVal = BigInt(
        Math.round(Number.parseFloat(price) * 100_000_000),
      );
      await listItemMutation.mutateAsync({
        itemId: id,
        price: priceVal,
        itemType: type === "land" ? ItemType.Land : ItemType.Modifier,
      });
      toast.success("Предмет выставлен на продажу!");
      setListDialogOpen(false);
    } catch {
      toast.error("Ошибка при размещении");
    }
  };

  // Filter land listings
  const filteredLands = useMemo(() => {
    const activeBiomes = Object.entries(filterBiomes)
      .filter(([, v]) => v)
      .map(([k]) => k);
    return MOCK_LAND_LISTINGS.filter((l) => {
      if (activeBiomes.length > 0 && !activeBiomes.includes(l.biome))
        return false;
      const priceNum = Number(l.price) / 100_000_000;
      if (priceNum < minPrice || priceNum > maxPrice) return false;
      if (searchQuery) {
        const bio = (BIOME_NAMES[l.biome] ?? l.biome).toLowerCase();
        if (!bio.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [filterBiomes, minPrice, maxPrice, searchQuery]);

  // Filter mod listings
  const modListings = useMemo(() => {
    const activeTiers = Object.entries(filterTiers)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    return PLANNED_MODIFIER_CATALOG.filter((m) => {
      if (activeTiers.length > 0 && !activeTiers.includes(m.rarity_tier))
        return false;
      if (
        searchQuery &&
        !m.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [filterTiers, searchQuery]);

  const paginatedLands = filteredLands.slice(
    landPage * LAND_PER_PAGE,
    (landPage + 1) * LAND_PER_PAGE,
  );
  const paginatedMods = modListings.slice(
    modPage * MOD_PER_PAGE,
    (modPage + 1) * MOD_PER_PAGE,
  );
  const totalLandPages = Math.ceil(filteredLands.length / LAND_PER_PAGE);
  const totalModPages = Math.ceil(modListings.length / MOD_PER_PAGE);

  const toggleBiome = (biome: string) =>
    setFilterBiomes((prev) => ({ ...prev, [biome]: !prev[biome] }));
  const toggleTier = (tier: number) =>
    setFilterTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));

  return (
    <div
      className="h-full flex flex-col space-y-4 overflow-y-auto"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "#9933ff44 transparent",
      }}
      data-ocid="marketplace.page"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter icon-only button */}
        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="glassmorphism flex items-center justify-center w-9 h-9 rounded-xl border border-[#9933ff]/30 hover:border-[#9933ff]/60 text-[#9933ff] transition-all duration-200 flex-shrink-0"
              title="Фильтры"
              data-ocid="marketplace.open_modal_button"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </SheetTrigger>

          {/* ── Filter Drawer ── */}
          <SheetContent
            side="left"
            className="border-r border-[#9933ff]/20 w-72 p-0"
            style={{
              background: "rgba(8,0,18,0.96)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="p-5 border-b border-[#9933ff]/20">
              <SheetTitle
                className="font-orbitron text-base text-[#9933ff]"
                style={{ textShadow: "0 0 8px rgba(153,51,255,0.7)" }}
              >
                ФИЛЬТРЫ
              </SheetTitle>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto h-full">
              {/* Биомы */}
              <div>
                <p className="font-jetbrains text-[10px] text-white/40 uppercase tracking-widest mb-3">
                  Биом
                </p>
                <div className="space-y-2">
                  {Object.entries(BIOME_NAMES).map(([key, name]) => (
                    <NeonCheckbox
                      key={key}
                      checked={!!filterBiomes[key]}
                      onChange={() => toggleBiome(key)}
                      label={name}
                    />
                  ))}
                </div>
              </div>

              {/* Редкость модов */}
              <div>
                <p className="font-jetbrains text-[10px] text-white/40 uppercase tracking-widest mb-3">
                  Редкость
                </p>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((tier) => (
                    <NeonCheckbox
                      key={tier}
                      checked={!!filterTiers[tier]}
                      onChange={() => toggleTier(tier)}
                      label={RARITY_NAMES[tier]}
                      color={
                        tier === 4
                          ? "#facc15"
                          : tier === 3
                            ? "#9933ff"
                            : tier === 2
                              ? "#60a5fa"
                              : "#9ca3af"
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Цена */}
              <div className="space-y-4">
                <NeonSlider
                  label="Мин. цена"
                  value={minPrice}
                  onChange={setMinPrice}
                  min={0}
                  max={10000}
                />
                <NeonSlider
                  label="Макс. цена"
                  value={maxPrice}
                  onChange={setMaxPrice}
                  min={0}
                  max={10000}
                  color="#00ffff"
                />
              </div>

              {/* Reset */}
              <button
                type="button"
                onClick={() => {
                  setFilterBiomes({});
                  setFilterTiers({});
                  setMinPrice(0);
                  setMaxPrice(10000);
                }}
                className="w-full py-2 rounded-xl font-orbitron text-[10px] text-white/40 border border-white/10 hover:border-[#9933ff]/40 hover:text-[#9933ff] transition-all"
              >
                СБРОСИТЬ
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-1">
          {(["lands", "modifications"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-xl font-orbitron text-xs font-bold transition-all duration-200"
              style={
                activeTab === tab
                  ? {
                      ...PULSE_BORDER_STYLE,
                      color: "#9933ff",
                      background: "rgba(153,51,255,0.12)",
                    }
                  : {
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.4)",
                      background: "transparent",
                    }
              }
              data-ocid={`marketplace.${tab}_tab`}
            >
              {tab === "lands" ? "ЗЕМЛИ" : "МОДЫ"}
            </button>
          ))}
        </div>

        {/* Search expandable */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center glassmorphism border rounded-xl overflow-hidden transition-all duration-300"
            style={{
              borderColor: searchOpen
                ? "rgba(153,51,255,0.6)"
                : "rgba(255,255,255,0.1)",
              width: searchOpen ? "180px" : "36px",
              height: "36px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (!searchOpen)
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                else setSearchQuery("");
              }}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-[#9933ff]/70 hover:text-[#9933ff] transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            {searchOpen && (
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="flex-1 bg-transparent outline-none font-jetbrains text-xs text-white placeholder:text-white/30 pr-2"
              />
            )}
          </div>

          {/* List item button */}
          <button
            type="button"
            onClick={() => setListDialogOpen(true)}
            className="glassmorphism flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#9933ff]/30 hover:border-[#9933ff]/60 font-orbitron text-[10px] text-[#9933ff] transition-all duration-200"
            data-ocid="marketplace.list_button"
          >
            <Plus className="w-3 h-3" />
            ПРОДАТЬ
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {activeTab === "lands" ? (
        <div className="space-y-4">
          {paginatedLands.map((land) => (
            <LandCard
              key={land.listingId.toString()}
              land={land}
              onBuy={handleBuyItem}
              buying={buyingId === land.listingId}
              onInspect={setInspectedLand}
            />
          ))}
          {/* Real backend listings */}
          {listings
            ?.filter((l) => l.itemType === ItemType.Land)
            .slice(0, 3)
            .map((l) => (
              <div
                key={l.listingId.toString()}
                className="glassmorphism rounded-2xl border border-[#00ff41]/20 p-4"
              >
                <p className="font-orbitron text-xs text-[#00ff41]">
                  LIVE · Land #{l.itemId.toString()}
                </p>
                <p className="font-jetbrains text-white/60 text-sm mt-1">
                  {formatPrice(l.price)} CBR
                </p>
                <button
                  type="button"
                  onClick={() => handleBuyItem(l.listingId, l.price)}
                  className="mt-2 px-3 py-1.5 rounded-lg font-orbitron text-xs bg-[#00ff41]/20 border border-[#00ff41]/50 text-[#00ff41] hover:bg-[#00ff41]/30 transition-all"
                  data-ocid="land_card.primary_button"
                >
                  КУПИТЬ
                </button>
              </div>
            ))}
          {totalLandPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setLandPage((p) => Math.max(0, p - 1))}
                disabled={landPage === 0}
                className="glassmorphism p-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-[#9933ff]/50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-jetbrains text-xs text-white/40">
                {landPage + 1} / {totalLandPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setLandPage((p) => Math.min(totalLandPages - 1, p + 1))
                }
                disabled={landPage >= totalLandPages - 1}
                className="glassmorphism p-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-[#9933ff]/50 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {paginatedMods.map((mod, i) => {
              const price = BigInt(
                (MOCK_MOD_PRICES[i % MOCK_MOD_PRICES.length] ?? 100) *
                  100_000_000,
              );
              const sellerKeys = Object.keys(MOCK_SELLERS);
              const sellerKey = sellerKeys[i % sellerKeys.length];
              return (
                <ModCard
                  key={mod.id}
                  mod={mod}
                  price={price}
                  listingId={BigInt(2000 + i)}
                  sellerKey={sellerKey}
                  onBuy={handleBuyItem}
                  buying={buyingId === BigInt(2000 + i)}
                />
              );
            })}
            {/* Real backend mod listings */}
            {listings
              ?.filter((l) => l.itemType === ItemType.Modifier)
              .slice(0, 4)
              .map((l, i) => {
                const cat =
                  PLANNED_MODIFIER_CATALOG[i % PLANNED_MODIFIER_CATALOG.length];
                const sellerKeys = Object.keys(MOCK_SELLERS);
                return (
                  <ModCard
                    key={l.listingId.toString()}
                    mod={cat}
                    price={l.price}
                    listingId={l.listingId}
                    sellerKey={sellerKeys[i % sellerKeys.length]}
                    onBuy={handleBuyItem}
                    buying={buyingId === l.listingId}
                  />
                );
              })}
          </div>
          {totalModPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setModPage((p) => Math.max(0, p - 1))}
                disabled={modPage === 0}
                className="glassmorphism p-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-[#9933ff]/50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-jetbrains text-xs text-white/40">
                {modPage + 1} / {totalModPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setModPage((p) => Math.min(totalModPages - 1, p + 1))
                }
                disabled={modPage >= totalModPages - 1}
                className="glassmorphism p-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-[#9933ff]/50 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Land Inspector */}
      {inspectedLand && (
        <LandInspectorModal
          land={inspectedLand}
          onClose={() => setInspectedLand(null)}
        />
      )}

      {/* Create Listing Dialog */}
      <CreateListingDialog
        open={listDialogOpen}
        onOpenChange={setListDialogOpen}
        onList={handleListItem}
        isPending={listItemMutation.isPending}
        myLandArray={myLandArray?.map((l) => ({
          landId: l.landId,
          plotName: l.plotName,
          biome: l.biome,
        }))}
        myModifications={myModifications}
      />
    </div>
  );
}
