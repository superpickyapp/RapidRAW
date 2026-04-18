import {
  Brush,
  Circle,
  Droplet,
  Layers,
  RectangleHorizontal,
  Sparkles,
  TriangleRight,
  Sun,
} from 'lucide-react';

export enum Mask {
  AiDepth = 'ai-depth',
  AiForeground = 'ai-foreground',
  AiSky = 'ai-sky',
  AiSubject = 'ai-subject',
  All = 'all',
  Brush = 'brush',
  Flow = 'flow',
  Color = 'color',
  Linear = 'linear',
  Luminance = 'luminance',
  QuickEraser = 'quick-eraser',
  Radial = 'radial',
}

// Note: AI mask types (AiDepth, AiForeground, AiSky, AiSubject, QuickEraser) and Flow
// are retained in the enum for backward compatibility but are not exposed in the UI.

export enum SubMaskMode {
  Additive = 'additive',
  Subtractive = 'subtractive',
}

export enum ToolType {
  AiSeletor = 'ai-selector',
  Brush = 'brush',
  Eraser = 'eraser',
  GenerativeReplace = 'generative-replace',
  SelectSubject = 'select-subject',
}

export interface MaskType {
  disabled: boolean;
  icon: any;
  id?: string;
  name: string;
  nameKey: string;
  type: Mask | null;
}

export interface SubMask {
  id: string;
  invert: boolean;
  mode: SubMaskMode;
  name?: string;
  opacity: number;
  parameters?: any;
  type: Mask;
  visible: boolean;
}

export function formatMaskTypeName(type: string) {
  if (type === Mask.All) return 'Whole Image';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function getMaskTypeNameKey(type: string): string {
  if (type === Mask.All) return 'masks.type_whole_image';
  if (type === Mask.Brush) return 'masks.type_brush';
  if (type === Mask.Color) return 'masks.type_color';
  if (type === Mask.Linear) return 'masks.type_linear';
  if (type === Mask.Luminance) return 'masks.type_luminance';
  if (type === Mask.Radial) return 'masks.type_radial';
  return 'masks.type_brush';
}

export function getSubMaskName(subMask: Pick<SubMask, 'name' | 'type'>) {
  return subMask.name?.trim() || formatMaskTypeName(subMask.type);
}

export const MASK_ICON_MAP: Record<Mask, any> = {
  [Mask.AiDepth]: Sparkles,
  [Mask.AiForeground]: Sparkles,
  [Mask.AiSky]: Sparkles,
  [Mask.AiSubject]: Sparkles,
  [Mask.All]: RectangleHorizontal,
  [Mask.Brush]: Brush,
  [Mask.Flow]: Brush,
  [Mask.Color]: Droplet,
  [Mask.Linear]: TriangleRight,
  [Mask.Luminance]: Sparkles,
  [Mask.QuickEraser]: Brush,
  [Mask.Radial]: Circle,
};

export const MASK_PANEL_CREATION_TYPES: Array<MaskType> = [
  {
    disabled: false,
    icon: TriangleRight,
    name: 'Linear',
    nameKey: 'masks.type_linear',
    type: Mask.Linear,
  },
  {
    disabled: false,
    icon: Circle,
    name: 'Radial',
    nameKey: 'masks.type_radial',
    type: Mask.Radial,
  },
  {
    disabled: false,
    icon: Layers,
    id: 'others',
    name: 'Others',
    nameKey: 'masks.type_others',
    type: null,
  },
];

// AI_PANEL_CREATION_TYPES: AI masks removed for SuperPicky-RapidRAW bird photo tool
export const AI_PANEL_CREATION_TYPES: Array<MaskType> = [];

export const SUB_MASK_COMPONENT_TYPES: Array<MaskType> = [
  {
    disabled: false,
    icon: TriangleRight,
    name: 'Linear',
    nameKey: 'masks.type_linear',
    type: Mask.Linear,
  },
  {
    disabled: false,
    icon: Circle,
    name: 'Radial',
    nameKey: 'masks.type_radial',
    type: Mask.Radial,
  },
  {
    disabled: false,
    icon: Layers,
    id: 'others',
    name: 'Others',
    nameKey: 'masks.type_others',
    type: null,
  },
];

export const OTHERS_MASK_TYPES: Array<MaskType> = [
  {
    disabled: false,
    icon: Droplet,
    name: 'Color',
    nameKey: 'masks.type_color',
    type: Mask.Color,
  },
  {
    disabled: false,
    icon: Sun,
    name: 'Luminance',
    nameKey: 'masks.type_luminance',
    type: Mask.Luminance,
  },
  {
    disabled: false,
    icon: Brush,
    name: 'Brush',
    nameKey: 'masks.type_brush',
    type: Mask.Brush,
  },
  {
    disabled: false,
    icon: RectangleHorizontal,
    name: 'Whole Image',
    nameKey: 'masks.type_whole_image',
    type: Mask.All,
  },
];

// AI_SUB_MASK_COMPONENT_TYPES: emptied for SuperPicky-RapidRAW bird photo tool
export const AI_SUB_MASK_COMPONENT_TYPES: Array<MaskType> = [];
