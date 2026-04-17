import {
  Brush,
  BringToFront,
  Circle,
  Cloud,
  Droplet,
  Droplets,
  Eraser,
  Layers,
  RectangleHorizontal,
  Sparkles,
  TriangleRight,
  User,
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
  type: Mask;
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
  if (type === Mask.AiDepth) return 'Depth';
  if (type === Mask.AiSubject) return 'Subject';
  if (type === Mask.AiForeground) return 'Foreground';
  if (type === Mask.AiSky) return 'Sky';
  if (type === Mask.All) return 'Whole Image';
  if (type === Mask.QuickEraser) return 'Quick Eraser';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function getMaskTypeNameKey(type: string): string {
  if (type === Mask.AiDepth) return 'masks.type_depth';
  if (type === Mask.AiSubject) return 'masks.type_subject';
  if (type === Mask.AiForeground) return 'masks.type_foreground';
  if (type === Mask.AiSky) return 'masks.type_sky';
  if (type === Mask.All) return 'masks.type_whole_image';
  if (type === Mask.QuickEraser) return 'masks.type_quick_erase';
  if (type === Mask.Brush) return 'masks.type_brush';
  if (type === Mask.Flow) return 'masks.type_flow';
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
  [Mask.AiDepth]: BringToFront,
  [Mask.AiForeground]: User,
  [Mask.AiSky]: Cloud,
  [Mask.AiSubject]: Sparkles,
  [Mask.All]: RectangleHorizontal,
  [Mask.Brush]: Brush,
  [Mask.Flow]: Droplets,
  [Mask.Color]: Droplet,
  [Mask.Linear]: TriangleRight,
  [Mask.Luminance]: Sparkles,
  [Mask.QuickEraser]: Eraser,
  [Mask.Radial]: Circle,
};

export const MASK_PANEL_CREATION_TYPES: Array<MaskType> = [
  {
    disabled: false,
    icon: Sparkles,
    name: 'Subject',
    nameKey: 'masks.type_subject',
    type: Mask.AiSubject,
  },
  {
    disabled: false,
    icon: Cloud,
    name: 'Sky',
    nameKey: 'masks.type_sky',
    type: Mask.AiSky,
  },
  {
    disabled: false,
    icon: User,
    name: 'Foreground',
    nameKey: 'masks.type_foreground',
    type: Mask.AiForeground,
  },
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

export const AI_PANEL_CREATION_TYPES: Array<MaskType> = [
  {
    disabled: false,
    icon: Eraser,
    name: 'Quick Erase',
    nameKey: 'masks.type_quick_erase',
    type: Mask.QuickEraser,
  },
  {
    disabled: false,
    icon: Sparkles,
    name: 'Subject',
    nameKey: 'masks.type_subject',
    type: Mask.AiSubject,
  },
  {
    disabled: false,
    icon: User,
    name: 'Foreground',
    nameKey: 'masks.type_foreground',
    type: Mask.AiForeground,
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
];

export const SUB_MASK_COMPONENT_TYPES: Array<MaskType> = [
  {
    disabled: false,
    icon: Sparkles,
    name: 'Subject',
    nameKey: 'masks.type_subject',
    type: Mask.AiSubject,
  },
  {
    disabled: false,
    icon: Cloud,
    name: 'Sky',
    nameKey: 'masks.type_sky',
    type: Mask.AiSky,
  },
  {
    disabled: false,
    icon: User,
    name: 'Foreground',
    nameKey: 'masks.type_foreground',
    type: Mask.AiForeground,
  },
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
    icon: BringToFront,
    name: 'Depth',
    nameKey: 'masks.type_depth',
    type: Mask.AiDepth,
  },
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
    icon: Droplets,
    name: 'Flow',
    nameKey: 'masks.type_flow',
    type: Mask.Flow,
  },
  {
    disabled: false,
    icon: RectangleHorizontal,
    name: 'Whole Image',
    nameKey: 'masks.type_whole_image',
    type: Mask.All,
  },
];

export const AI_SUB_MASK_COMPONENT_TYPES: Array<MaskType> = [
  {
    disabled: false,
    icon: Sparkles,
    name: 'Subject',
    nameKey: 'masks.type_subject',
    type: Mask.AiSubject,
  },
  {
    disabled: false,
    icon: User,
    name: 'Foreground',
    nameKey: 'masks.type_foreground',
    type: Mask.AiForeground,
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
];
