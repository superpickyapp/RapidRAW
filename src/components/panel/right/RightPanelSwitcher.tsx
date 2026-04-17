import { motion } from 'framer-motion';
import { SlidersHorizontal, Info, Scaling, BrushCleaning, Bookmark, Save, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Panel } from '../../ui/AppProperties';

interface PanelOptions {
  icon: any;
  id: Panel;
  titleKey: string;
}

interface RightPanelSwitcherProps {
  activePanel: Panel | null;
  onPanelSelect(id: Panel): void;
  isInstantTransition: boolean;
}

const panelGroups: Array<Array<PanelOptions>> = [
  [{ id: Panel.Metadata, icon: Info, titleKey: 'app.panel_info' }],
  [
    { id: Panel.Adjustments, icon: SlidersHorizontal, titleKey: 'app.panel_adjust' },
    { id: Panel.Crop, icon: Scaling, titleKey: 'app.panel_crop' },
    { id: Panel.Masks, icon: Layers, titleKey: 'app.panel_masks' },
    { id: Panel.Ai, icon: BrushCleaning, titleKey: 'app.panel_inpaint' },
  ],
  [
    { id: Panel.Presets, icon: Bookmark, titleKey: 'app.panel_presets' },
    { id: Panel.Export, icon: Save, titleKey: 'app.panel_export' },
  ],
];

export default function RightPanelSwitcher({
  activePanel,
  onPanelSelect,
  isInstantTransition,
}: RightPanelSwitcherProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col p-1 gap-1 h-full">
      {panelGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-1">
          {groupIndex > 0 && <div className="w-6 h-px bg-surface self-center" />}
          {group.map(({ id, icon: Icon, titleKey }) => (
            <button
              className={`relative p-2 rounded-md transition-colors duration-200 ${
                activePanel === id
                  ? 'text-text-primary'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              }`}
              key={id}
              onClick={() => onPanelSelect(id)}
              data-tooltip={t(titleKey)}
            >
              {activePanel === id && (
                <motion.div
                  layoutId="active-panel-indicator"
                  className="absolute inset-0 bg-surface rounded-md"
                  transition={isInstantTransition ? { duration: 0 } : { type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon size={20} className="relative z-10" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
