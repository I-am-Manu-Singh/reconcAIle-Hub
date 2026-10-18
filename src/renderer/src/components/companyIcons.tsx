import React from "react";
import {
  Building2,
  Building,
  Landmark,
  Factory,
  Store,
  Warehouse,
  Briefcase,
  Gem,
  Cpu,
  Layers,
  ShoppingBag,
  Truck,
  HeartPulse,
  Utensils,
  GraduationCap,
  Plane,
  Fuel,
  Hotel,
  ShieldCheck,
  Zap,
  Globe,
  Wallet,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface CompanyIconOption {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly Icon: LucideIcon;
}

export const COMPANY_ICONS: readonly CompanyIconOption[] = [
  { id: "Building2", label: "Corporate Office", category: "Business", Icon: Building2 },
  { id: "Building", label: "Enterprise Tower", category: "Business", Icon: Building },
  { id: "Landmark", label: "Financial & Banking", category: "Finance", Icon: Landmark },
  { id: "Factory", label: "Manufacturing & Plant", category: "Industrial", Icon: Factory },
  { id: "Store", label: "Retail & Outlet", category: "Commerce", Icon: Store },
  { id: "Warehouse", label: "Logistics & Storage", category: "Logistics", Icon: Warehouse },
  { id: "Briefcase", label: "Consulting & Services", category: "Services", Icon: Briefcase },
  { id: "Gem", label: "Luxury & Holdings", category: "General", Icon: Gem },
  { id: "Cpu", label: "Tech & Software", category: "Tech", Icon: Cpu },
  { id: "Layers", label: "Conglomerate Group", category: "Business", Icon: Layers },
  { id: "ShoppingBag", label: "E-Commerce & FMCG", category: "Commerce", Icon: ShoppingBag },
  { id: "Truck", label: "Transport & Fleet", category: "Logistics", Icon: Truck },
  { id: "HeartPulse", label: "Pharma & Healthcare", category: "Health", Icon: HeartPulse },
  { id: "Utensils", label: "Hospitality & Food", category: "Hospitality", Icon: Utensils },
  { id: "GraduationCap", label: "Education & EdTech", category: "Education", Icon: GraduationCap },
  { id: "Plane", label: "Import / Export & Travel", category: "Travel", Icon: Plane },
  { id: "Fuel", label: "Energy & Infrastructure", category: "Industrial", Icon: Fuel },
  { id: "Hotel", label: "Real Estate & Properties", category: "Properties", Icon: Hotel },
  { id: "ShieldCheck", label: "Security & Compliance", category: "Security", Icon: ShieldCheck },
  { id: "Zap", label: "Renewable & Electronics", category: "Tech", Icon: Zap },
  { id: "Globe", label: "Global MNC", category: "General", Icon: Globe },
  { id: "Wallet", label: "Fintech & Investments", category: "Finance", Icon: Wallet },
  { id: "Sparkles", label: "Creative & Media", category: "Media", Icon: Sparkles },
  { id: "TrendingUp", label: "Capital & Advisory", category: "Finance", Icon: TrendingUp },
];

export function getCompanyIconComponent(iconName?: string | null): LucideIcon {
  if (!iconName) return Building2;
  const match = COMPANY_ICONS.find((item) => item.id.toLowerCase() === iconName.toLowerCase());
  return match ? match.Icon : Building2;
}

export function CompanyIconRenderer({
  iconName,
  size = 18,
  className,
  style,
}: {
  readonly iconName?: string | null;
  readonly size?: number;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}): React.JSX.Element {
  const IconComponent = getCompanyIconComponent(iconName);
  return <IconComponent size={size} className={className} style={style} aria-hidden="true" />;
}
