import {
  Truck,
  Cog,
  Pickaxe,
  CircleDot,
  HardHat,
  Construction,
  Forklift,
  Move,
  type LucideIcon,
} from "lucide-react";

export interface MachineCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  models: string[];
}

/**
 * Full XCMG line sold in Brazil, grouped by equipment type.
 * Equipment type is the "category", model code is the "subcategory".
 */
export const MACHINE_CATEGORIES: MachineCategory[] = [
  {
    key: "pa_carregadeira",
    label: "Pá Carregadeira",
    icon: Truck,
    models: ["LW300FN", "LW400FN", "LW500FN", "LW500KN", "LW600KN", "XC870BR", "XC918", "XC938", "XC948"],
  },
  {
    key: "motoniveladora",
    label: "Motoniveladora",
    icon: Cog,
    models: ["GR1653BR", "GR1803BR", "GR2153BR", "GR215A", "GR230"],
  },
  {
    key: "escavadeira",
    label: "Escavadeira Hidráulica",
    icon: Pickaxe,
    models: ["XE60D", "XE80D", "XE150BR", "XE215BR", "XE235C", "XE270D", "XE335D", "XE370DK", "XE470D"],
  },
  {
    key: "rolo_compactador",
    label: "Rolo Compactador",
    icon: CircleDot,
    models: ["XS123H", "XS143H", "XS163J", "XS183J", "XS203J", "XS223J", "XS263J"],
  },
  {
    key: "guindaste",
    label: "Guindaste Hidráulico",
    icon: HardHat,
    models: ["QY25KR", "QY30K5", "QY50KA", "QY55KA", "QY70K", "QY100K", "XCT25L4", "XCT55L4", "XCT75", "XCT100"],
  },
  {
    key: "caminhao_offroad",
    label: "Caminhão Off-Road",
    icon: Truck,
    models: ["XDA40", "DA90", "XDR80T"],
  },
  {
    key: "retroescavadeira",
    label: "Retroescavadeira",
    icon: Construction,
    models: ["WZ30-25", "XT870", "XT876"],
  },
  {
    key: "manipulador_telescopico",
    label: "Manipulador Telescópico",
    icon: Move,
    models: ["MT86H", "XC6-4517"],
  },
  {
    key: "mini_carregadeira",
    label: "Mini Carregadeira",
    icon: Forklift,
    models: ["XC740K", "XC760K"],
  },
];

export const FEATURED_MACHINE_MODELS = MACHINE_CATEGORIES.flatMap((c) => c.models);
