import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import {
  ArrowLeft,
  Cloud,
  Cpu,
  ExternalLink as ExternalLinkIcon,
  Server,
  Info,
  Trash2,
  Wifi,
  WifiOff,
  Plus,
  X,
  SlidersHorizontal,
  Keyboard,
  Bookmark,
  Scaling,
  Image as ImageIcon,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useUser } from '@clerk/react';
import Button from '../ui/Button';
import ConfirmModal from '../modals/ConfirmModal';
import Dropdown, { OptionItem } from '../ui/Dropdown';
import Switch from '../ui/Switch';
import Input from '../ui/Input';
import Slider from '../ui/Slider';
import { ThemeProps, THEMES, DEFAULT_THEME_ID } from '../../utils/themes';
import { Invokes } from '../ui/AppProperties';
import Text from '../ui/Text';
import { TextColors, TextVariants, TextWeights } from '../../types/typography';
import { useOsPlatform } from '../../hooks/useOsPlatform';

interface ConfirmModalState {
  confirmText: string;
  confirmVariant: string;
  isOpen: boolean;
  message: string;
  onConfirm(): void;
  title: string;
}

interface DataActionItemProps {
  buttonAction(): void;
  buttonText: string;
  description: any;
  disabled?: boolean;
  icon: any;
  isProcessing: boolean;
  message: string;
  title: string;
}

interface KeybindItemProps {
  description: string;
  keys: Array<string>;
}

interface SettingItemProps {
  children: any;
  description?: string;
  label: string;
}

interface SettingsPanelProps {
  appSettings: any;
  onBack(): void;
  onLibraryRefresh(): void;
  onSettingsChange(settings: any): Promise<void>;
  rootPath: string | null;
}

interface TestStatus {
  message: string;
  success: boolean | null;
  testing: boolean;
}

interface MyLens {
  maker: string;
  model: string;
}

const EXECUTE_TIMEOUT = 3000;

const adjustmentVisibilityDefaults = {
  sharpening: true,
  presence: true,
  noiseReduction: true,
  chromaticAberration: false,
  vignette: true,
  colorCalibration: false,
  grain: true,
};

const resolutions: OptionItem<number>[] = [
  { value: 720, label: '720px' },
  { value: 1280, label: '1280px' },
  { value: 1920, label: '1920px' },
  { value: 2560, label: '2560px' },
  { value: 3840, label: '3840px' },
];

const thumbnailResolutions: OptionItem<number>[] = [
  { value: 640, label: '640px' },
  { value: 720, label: '720px' },
  { value: 960, label: '960px' },
  { value: 1080, label: '1080px' },
];

const zoomMultiplierOptionsBase = [
  { value: 1.0, labelKey: 'settings.zoom_native' },
  { value: 0.75, label: '0.75x' },
  { value: 0.5, labelKey: 'settings.zoom_half' },
  { value: 0.25, label: '0.25x' },
];

const livePreviewQualityOptionsBase = [
  { value: 'full', labelKey: 'settings.livepreview_full' },
  { value: 'high', labelKey: 'settings.livepreview_high' },
  { value: 'performance', labelKey: 'settings.livepreview_performance' },
];

const backendOptionsBase = [
  { value: 'auto', labelKey: 'settings.backend_auto' },
  { value: 'vulkan', labelKey: 'settings.backend_vulkan' },
  { value: 'dx12', labelKey: 'settings.backend_dx12' },
  { value: 'metal', labelKey: 'settings.backend_metal' },
  { value: 'gl', labelKey: 'settings.backend_gl' },
];

const linearRawOptionsBase = [
  { value: 'auto', labelKey: 'settings.linear_raw_auto' },
  { value: 'gamma', labelKey: 'settings.linear_raw_gamma' },
  { value: 'skip_calib', labelKey: 'settings.linear_raw_skip_calib' },
  { value: 'gamma_skip_calib', labelKey: 'settings.linear_raw_gamma_skip_calib' },
];

const settingCategoryDefs = [
  { id: 'general', labelKey: 'settings.general', icon: SlidersHorizontal },
  { id: 'processing', labelKey: 'settings.processing', icon: Cpu },
  { id: 'shortcuts', labelKey: 'settings.shortcuts', icon: Keyboard },
];

const KeybindItem = ({ keys, description }: KeybindItemProps) => (
  <div className="flex justify-between items-center py-2">
    <Text variant={TextVariants.label}>{description}</Text>
    <div className="flex items-center gap-1">
      {keys.map((key: string, index: number) => (
        <Text
          as="kbd"
          variant={TextVariants.small}
          color={TextColors.primary}
          weight={TextWeights.semibold}
          key={index}
          className="px-2 py-1 font-sans bg-bg-primary border border-border-color rounded-md"
        >
          {key}
        </Text>
      ))}
    </div>
  </div>
);

const SettingItem = ({ children, description, label }: SettingItemProps) => (
  <div>
    <Text variant={TextVariants.heading} className="block mb-2">
      {label}
    </Text>
    {children}
    {description && (
      <Text variant={TextVariants.small} className="mt-2">
        {description}
      </Text>
    )}
  </div>
);

const DataActionItem = ({
  buttonAction,
  buttonText,
  description,
  disabled = false,
  icon,
  isProcessing,
  message,
  title,
}: DataActionItemProps) => {
  const { t } = useTranslation();
  return (
  <div className="pb-8 border-b border-border-color last:border-b-0 last:pb-0">
    <Text variant={TextVariants.heading} className="mb-2">
      {title}
    </Text>
    <Text variant={TextVariants.small} className="mb-3">
      {description}
    </Text>
    <Button variant="destructive" onClick={buttonAction} disabled={isProcessing || disabled}>
      {icon}
      {isProcessing ? t('settings.processing_processing') : buttonText}
    </Button>
    {message && (
      <Text color={TextColors.accent} className="mt-3">
        {message}
      </Text>
    )}
  </div>
  );
};

const aiProviderDefs = [
  { id: 'cpu', labelKey: 'settings.builtin_ai', icon: Cpu },
  { id: 'ai-connector', labelKey: 'settings.self_hosted', icon: Server },
  { id: 'cloud', labelKey: 'settings.cloud_service', icon: Cloud },
];

interface AiProviderSwitchProps {
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  providers: { id: string; label: string; icon: any }[];
}

const AiProviderSwitch = ({ selectedProvider, onProviderChange, providers }: AiProviderSwitchProps) => {
  return (
    <div className="relative flex w-full p-1 bg-bg-primary rounded-md border border-border-color">
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => onProviderChange(provider.id)}
          className={clsx(
            'relative flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            {
              'text-text-primary hover:bg-surface': selectedProvider !== provider.id,
              'text-button-text': selectedProvider === provider.id,
            },
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {selectedProvider === provider.id && (
            <motion.span
              layoutId="ai-provider-switch-bubble"
              className="absolute inset-0 z-0 bg-accent"
              style={{ borderRadius: 6 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center">
            <provider.icon size={16} className="mr-2" />
            {provider.label}
          </span>
        </button>
      ))}
    </div>
  );
};

const previewModeDefs = [
  { id: 'static', labelKey: 'settings.fixed_resolution', icon: ImageIcon },
  { id: 'dynamic', labelKey: 'settings.dynamic', icon: Scaling },
];

interface PreviewModeSwitchProps {
  mode: 'static' | 'dynamic';
  onModeChange: (mode: 'static' | 'dynamic') => void;
  modes: { id: string; label: string; icon: any }[];
}

const PreviewModeSwitch = ({ mode, onModeChange, modes }: PreviewModeSwitchProps) => {
  return (
    <div className="relative flex w-full p-1 bg-bg-primary rounded-md border border-border-color">
      {modes.map((item) => (
        <button
          key={item.id}
          onClick={() => onModeChange(item.id as 'static' | 'dynamic')}
          className={clsx(
            'relative flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            {
              'text-text-primary hover:bg-surface': mode !== item.id,
              'text-button-text': mode === item.id,
            },
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {mode === item.id && (
            <motion.span
              layoutId="preview-mode-switch-bubble"
              className="absolute inset-0 z-0 bg-accent"
              style={{ borderRadius: 6 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center">
            <item.icon size={16} className="mr-2" />
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default function SettingsPanel({
  appSettings,
  onBack,
  onLibraryRefresh,
  onSettingsChange,
  rootPath,
}: SettingsPanelProps) {
  const { t } = useTranslation();
  const settingCategories = settingCategoryDefs.map((c) => ({ ...c, label: t(c.labelKey) }));
  const aiProviders = aiProviderDefs.map((p) => ({ ...p, label: t(p.labelKey) }));
  const previewModes = previewModeDefs.map((m) => ({ ...m, label: t(m.labelKey) }));
  const fontOptions = [
    { value: 'poppins', label: t('settings.font_poppins') },
    { value: 'system', label: t('settings.font_system') },
  ];
  const zoomMultiplierOptions: OptionItem<number>[] = zoomMultiplierOptionsBase.map((o) => ({
    value: o.value,
    label: 'labelKey' in o ? t(o.labelKey as string) : (o as any).label,
  }));
  const livePreviewQualityOptions: OptionItem<string>[] = livePreviewQualityOptionsBase.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));
  const backendOptions: OptionItem<string>[] = backendOptionsBase.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));
  const linearRawOptions: OptionItem<string>[] = linearRawOptionsBase.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));
  const { user: _user } = useUser();
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearMessage, setCacheClearMessage] = useState('');
  const [isClearingAiTags, setIsClearingAiTags] = useState(false);
  const [aiTagsClearMessage, setAiTagsClearMessage] = useState('');
  const [isClearingTags, setIsClearingTags] = useState(false);
  const [tagsClearMessage, setTagsClearMessage] = useState('');
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>({
    confirmText: t('settings.confirm'),
    confirmVariant: 'primary',
    isOpen: false,
    message: '',
    onConfirm: () => {},
    title: '',
  });
  const [testStatus, setTestStatus] = useState<TestStatus>({ message: '', success: null, testing: false });
  const [hasInteractedWithLivePreview, setHasInteractedWithLivePreview] = useState(false);

  const [aiProvider, setAiProvider] = useState(appSettings?.aiProvider || 'cpu');
  const [aiConnectorAddress, setAiConnectorAddress] = useState<string>(appSettings?.aiConnectorAddress || '');
  const [newShortcut, setNewShortcut] = useState('');
  const [newAiTag, setNewAiTag] = useState('');

  const [lensMakers, setLensMakers] = useState<string[]>([]);
  const [lensModels, setLensModels] = useState<string[]>([]);
  const [tempLensMaker, setTempLensMaker] = useState<string>('');
  const [tempLensModel, setTempLensModel] = useState<string>('');

  const [processingSettings, setProcessingSettings] = useState({
    editorPreviewResolution: appSettings?.editorPreviewResolution || 1920,
    thumbnailResolution: appSettings?.thumbnailResolution || 720,
    rawHighlightCompression: appSettings?.rawHighlightCompression ?? 2.5,
    processingBackend: appSettings?.processingBackend || 'auto',
    linuxGpuOptimization: appSettings?.linuxGpuOptimization ?? false,
    highResZoomMultiplier: appSettings?.highResZoomMultiplier || 1.0,
    useFullDpiRendering: appSettings?.useFullDpiRendering ?? false,
  });
  const [restartRequired, setRestartRequired] = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');
  const [logPath, setLogPath] = useState('');
  const [dpr, setDpr] = useState(() => (typeof window !== 'undefined' ? window.devicePixelRatio : 1));
  const osPlatform = useOsPlatform();

  const filteredBackendOptions = backendOptions.filter((opt) => {
    if (opt.value === 'metal' && osPlatform !== 'macos') return false;
    if (opt.value === 'dx12' && osPlatform === 'macos') return false;
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDpr = () => setDpr(window.devicePixelRatio);

    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mediaQuery.addEventListener('change', updateDpr);

    window.addEventListener('resize', updateDpr);

    return () => {
      mediaQuery.removeEventListener('change', updateDpr);
      window.removeEventListener('resize', updateDpr);
    };
  }, []);

  const customAiTags = Array.from(new Set<string>(appSettings?.customAiTags || []));
  const taggingShortcuts = Array.from(new Set<string>(appSettings?.taggingShortcuts || []));

  useEffect(() => {
    if (appSettings?.aiConnectorAddress !== aiConnectorAddress) {
      setAiConnectorAddress(appSettings?.aiConnectorAddress || '');
    }
    if (appSettings?.aiProvider !== aiProvider) {
      setAiProvider(appSettings?.aiProvider || 'cpu');
    }
    setProcessingSettings({
      editorPreviewResolution: appSettings?.editorPreviewResolution || 1920,
      thumbnailResolution: appSettings?.thumbnailResolution || 720,
      rawHighlightCompression: appSettings?.rawHighlightCompression ?? 2.5,
      processingBackend: appSettings?.processingBackend || 'auto',
      linuxGpuOptimization: appSettings?.linuxGpuOptimization ?? false,
      highResZoomMultiplier: appSettings?.highResZoomMultiplier || 1.0,
      useFullDpiRendering: appSettings?.useFullDpiRendering ?? false,
    });
    setRestartRequired(false);
  }, [appSettings]);

  useEffect(() => {
    const fetchLogPath = async () => {
      try {
        const path: string = await invoke(Invokes.GetLogFilePath);
        setLogPath(path);
      } catch (error) {
        console.error('Failed to get log file path:', error);
        setLogPath(t('settings.log_path_error'));
      }
    };
    fetchLogPath();

    invoke('get_lensfun_makers')
      .then((m: any) => setLensMakers(m))
      .catch(console.error);
  }, []);

  const handleProcessingSettingChange = (key: string, value: any) => {
    setProcessingSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'processingBackend' || key === 'linuxGpuOptimization') {
      setRestartRequired(true);
    } else {
      onSettingsChange({ ...appSettings, [key]: value });
    }
  };

  const handleSaveAndRelaunch = async () => {
    await onSettingsChange({
      ...appSettings,
      ...processingSettings,
    });
    await relaunch();
  };

  const handleProviderChange = (provider: string) => {
    setAiProvider(provider);
    onSettingsChange({ ...appSettings, aiProvider: provider });
  };

  const handlePreviewModeChange = (mode: 'static' | 'dynamic') => {
    const enableZoomHifi = mode === 'dynamic';
    onSettingsChange({ ...appSettings, enableZoomHifi });
  };

  const handleTempMakerChange = (maker: string) => {
    setTempLensMaker(maker);
    setTempLensModel('');
    setLensModels([]);
    if (maker) {
      invoke('get_lensfun_lenses_for_maker', { maker })
        .then((l: any) => setLensModels(l))
        .catch(console.error);
    }
  };

  const handleAddLens = () => {
    if (tempLensMaker && tempLensModel) {
      const currentLenses: MyLens[] = appSettings?.myLenses || [];
      if (!currentLenses.some((l) => l.maker === tempLensMaker && l.model === tempLensModel)) {
        const newLenses = [...currentLenses, { maker: tempLensMaker, model: tempLensModel }];

        newLenses.sort((a, b) => {
          const makerComp = a.maker.localeCompare(b.maker);
          if (makerComp !== 0) return makerComp;
          return a.model.localeCompare(b.model);
        });

        onSettingsChange({
          ...appSettings,
          myLenses: newLenses,
        });
        setTempLensMaker('');
        setTempLensModel('');
        setLensModels([]);
      }
    }
  };

  const handleRemoveLens = (index: number) => {
    const currentLenses: MyLens[] = appSettings?.myLenses || [];
    const newLenses = [...currentLenses];
    newLenses.splice(index, 1);
    onSettingsChange({ ...appSettings, myLenses: newLenses });
  };

  const effectiveRootPath = rootPath || appSettings?.lastRootPath;

  const executeClearSidecars = async () => {
    setIsClearing(true);
    setClearMessage(t('settings.deleting_sidecars'));
    try {
      const count: number = await invoke(Invokes.ClearAllSidecars, { rootPath: effectiveRootPath });
      setClearMessage(t('settings.sidecars_deleted', { count }));
      onLibraryRefresh();
    } catch (err: any) {
      console.error('Failed to clear sidecars:', err);
      setClearMessage(`Error: ${err}`);
    } finally {
      setTimeout(() => {
        setIsClearing(false);
        setClearMessage('');
      }, EXECUTE_TIMEOUT);
    }
  };

  const handleClearSidecars = () => {
    setConfirmModalState({
      confirmText: t('settings.delete_all_edits'),
      confirmVariant: 'destructive',
      isOpen: true,
      message: t('settings.confirm_sidecar_msg'),
      onConfirm: executeClearSidecars,
      title: t('settings.confirm_deletion'),
    });
  };

  const executeClearAiTags = async () => {
    setIsClearingAiTags(true);
    setAiTagsClearMessage(t('settings.clearing_ai_tags_msg'));
    try {
      const count: number = await invoke(Invokes.ClearAiTags, { rootPath: effectiveRootPath });
      setAiTagsClearMessage(t('settings.ai_tags_cleared', { count }));
      onLibraryRefresh();
    } catch (err: any) {
      console.error('Failed to clear AI tags:', err);
      setAiTagsClearMessage(`Error: ${err}`);
    } finally {
      setTimeout(() => {
        setIsClearingAiTags(false);
        setAiTagsClearMessage('');
      }, EXECUTE_TIMEOUT);
    }
  };

  const handleClearAiTags = () => {
    setConfirmModalState({
      confirmText: t('settings.clear_ai_tags_confirm'),
      confirmVariant: 'destructive',
      isOpen: true,
      message: t('settings.confirm_ai_tag_msg'),
      onConfirm: executeClearAiTags,
      title: t('settings.confirm_ai_tag_deletion'),
    });
  };

  const executeClearTags = async () => {
    setIsClearingTags(true);
    setTagsClearMessage(t('settings.clearing_all_tags_msg'));
    try {
      const count: number = await invoke(Invokes.ClearAllTags, { rootPath: effectiveRootPath });
      setTagsClearMessage(t('settings.all_tags_cleared', { count }));
      onLibraryRefresh();
    } catch (err: any) {
      console.error('Failed to clear tags:', err);
      setTagsClearMessage(`Error: ${err}`);
    } finally {
      setTimeout(() => {
        setIsClearingTags(false);
        setTagsClearMessage('');
      }, EXECUTE_TIMEOUT);
    }
  };

  const handleClearTags = () => {
    setConfirmModalState({
      confirmText: t('settings.clear_all_tags'),
      confirmVariant: 'destructive',
      isOpen: true,
      message: t('settings.confirm_all_tag_msg'),
      onConfirm: executeClearTags,
      title: t('settings.confirm_all_tag_deletion'),
    });
  };

  const shortcutTagVariants = {
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
  };

  const executeSetTransparent = async (transparent: boolean) => {
    onSettingsChange({ ...appSettings, transparent });
    await relaunch();
  };

  const handleSetTransparent = (transparent: boolean) => {
    setConfirmModalState({
      confirmText: t('settings.toggle_transparency'),
      confirmVariant: 'primary',
      isOpen: true,
      message: transparent ? t('settings.transparency_enable_msg') : t('settings.transparency_disable_msg'),
      onConfirm: () => executeSetTransparent(transparent),
      title: t('settings.confirm_transparency'),
    });
  };

  const executeClearCache = async () => {
    setIsClearingCache(true);
    setCacheClearMessage(t('settings.clearing_cache_msg'));
    try {
      await invoke(Invokes.ClearThumbnailCache);
      setCacheClearMessage(t('settings.cache_cleared'));
      onLibraryRefresh();
    } catch (err: any) {
      console.error('Failed to clear thumbnail cache:', err);
      setCacheClearMessage(`Error: ${err}`);
    } finally {
      setTimeout(() => {
        setIsClearingCache(false);
        setCacheClearMessage('');
      }, EXECUTE_TIMEOUT);
    }
  };

  const handleClearCache = () => {
    setConfirmModalState({
      confirmText: t('settings.clear_button'),
      confirmVariant: 'destructive',
      isOpen: true,
      message: t('settings.confirm_cache_msg'),
      onConfirm: executeClearCache,
      title: t('settings.confirm_cache_deletion'),
    });
  };

  const handleTestConnection = async () => {
    if (!aiConnectorAddress) {
      return;
    }
    setTestStatus({ testing: true, message: t('settings.testing'), success: null });
    try {
      await invoke(Invokes.TestAIConnectorConnection, { address: aiConnectorAddress });
      setTestStatus({ testing: false, message: t('settings.connection_success'), success: true });
    } catch (err) {
      setTestStatus({ testing: false, message: t('settings.connection_failed'), success: false });
      console.error('AI Connector connection test failed:', err);
    } finally {
      setTimeout(() => setTestStatus({ testing: false, message: '', success: null }), EXECUTE_TIMEOUT);
    }
  };

  const closeConfirmModal = () => {
    setConfirmModalState({ ...confirmModalState, isOpen: false });
  };

  const handleAddShortcut = () => {
    const parsedTags = newShortcut
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    if (parsedTags.length > 0) {
      const uniqueShortcuts = Array.from(new Set([...taggingShortcuts, ...parsedTags])).sort();
      onSettingsChange({ ...appSettings, taggingShortcuts: uniqueShortcuts });
    }
    setNewShortcut('');
  };

  const handleRemoveShortcut = (shortcutToRemove: string) => {
    const uniqueShortcuts = taggingShortcuts.filter((s) => s !== shortcutToRemove);
    onSettingsChange({ ...appSettings, taggingShortcuts: uniqueShortcuts });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddShortcut();
    }
  };

  const handleAddAiTag = () => {
    const parsedTags = newAiTag
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    if (parsedTags.length > 0) {
      const uniqueTags = Array.from(new Set([...customAiTags, ...parsedTags])).sort();
      onSettingsChange({ ...appSettings, customAiTags: uniqueTags });
    }
    setNewAiTag('');
  };

  const handleRemoveAiTag = (tagToRemove: string) => {
    const uniqueTags = customAiTags.filter((t) => t !== tagToRemove);
    onSettingsChange({ ...appSettings, customAiTags: uniqueTags });
  };

  const handleAiTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAiTag();
    }
  };

  return (
    <>
      <ConfirmModal {...confirmModalState} onClose={closeConfirmModal} />
      <div className="flex flex-col h-full w-full text-text-primary">
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-y-4 mb-8 pt-4">
          <div className="flex items-center shrink-0">
            <Button
              className="mr-4 hover:bg-surface text-text-primary rounded-full"
              onClick={onBack}
              size="icon"
              variant="ghost"
              data-tooltip={t('tooltips.go_home')}
            >
              <ArrowLeft />
            </Button>
            <Text variant={TextVariants.display} color={TextColors.accent} className="whitespace-nowrap">
              {t('settings.title')}
            </Text>
          </div>

          <div className="relative flex w-full min-[1200px]:w-112.5 p-2 bg-surface rounded-md">
            {settingCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={clsx(
                  'relative flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  {
                    'text-text-primary hover:bg-surface': activeCategory !== category.id,
                    'text-button-text': activeCategory === category.id,
                  },
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {activeCategory === category.id && (
                  <motion.span
                    layoutId="settings-category-switch-bubble"
                    className="absolute inset-0 z-0 bg-accent"
                    style={{ borderRadius: 6 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center">
                  <category.icon size={16} className="mr-2 shrink-0" />
                  <span className="truncate">{category.label}</span>
                </span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeCategory === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-8">
                    {t('settings.general_settings')}
                  </Text>
                  <div className="space-y-8">
                    <SettingItem label={t('settings.theme')} description={t('settings.theme_desc')}>
                      <Dropdown
                        onChange={(value: any) => onSettingsChange({ ...appSettings, theme: value })}
                        options={THEMES.map((theme: ThemeProps) => ({ value: theme.id, label: theme.name }))}
                        value={appSettings?.theme || DEFAULT_THEME_ID}
                      />
                    </SettingItem>

                    <SettingItem
                      description={t('settings.adaptive_theme_desc')}
                      label={t('settings.adaptive_theme')}
                    >
                      <Switch
                        checked={appSettings?.adaptiveEditorTheme ?? false}
                        id="adaptive-theme-toggle"
                        label={t('settings.adaptive_theme')}
                        onChange={(checked) => onSettingsChange({ ...appSettings, adaptiveEditorTheme: checked })}
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.exif_library_sorting')}
                      description={t('settings.exif_reading_desc')}
                    >
                      <Switch
                        checked={appSettings?.enableExifReading ?? false}
                        id="exif-reading-toggle"
                        label={t('settings.exif_reading')}
                        onChange={(checked) => onSettingsChange({ ...appSettings, enableExifReading: checked })}
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.xmp_sync')}
                      description={t('settings.xmp_sync_desc')}
                    >
                      <Switch
                        checked={appSettings?.enableXmpSync ?? true}
                        id="enable-xmp-sync-toggle"
                        label={t('settings.enable_xmp')}
                        onChange={(checked) => {
                          const newSettings = { ...appSettings, enableXmpSync: checked };
                          if (!checked) {
                            newSettings.createXmpIfMissing = false;
                          }
                          onSettingsChange(newSettings);
                        }}
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.create_xmp')}
                      description={t('settings.create_xmp_desc')}
                    >
                      <Switch
                        disabled={!appSettings?.enableXmpSync}
                        checked={appSettings?.createXmpIfMissing ?? false}
                        id="create-xmp-missing-toggle"
                        label={t('settings.create_xmp_toggle')}
                        onChange={(checked) => onSettingsChange({ ...appSettings, createXmpIfMissing: checked })}
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.folder_counts')}
                      description={t('settings.folder_counts_desc')}
                    >
                      <Switch
                        checked={appSettings?.enableFolderImageCounts ?? false}
                        id="folder-image-counts-toggle"
                        label={t('settings.show_counts')}
                        onChange={(checked) => onSettingsChange({ ...appSettings, enableFolderImageCounts: checked })}
                      />
                    </SettingItem>

                    <SettingItem
                      description={t('settings.transparency_desc')}
                      label={t('settings.window_effects')}
                    >
                      <Switch
                        checked={appSettings?.transparent ?? true}
                        id="window-effects-toggle"
                        label={t('settings.transparency')}
                        onChange={handleSetTransparent}
                      />
                    </SettingItem>

                    <SettingItem label={t('settings.font')} description={t('settings.font_desc')}>
                      <Dropdown
                        onChange={(value: any) => onSettingsChange({ ...appSettings, fontFamily: value })}
                        options={fontOptions}
                        value={appSettings?.fontFamily || 'poppins'}
                      />
                    </SettingItem>

                    <SettingItem label={t('settings.language')} description={t('settings.language_desc')}>
                      <Dropdown
                        onChange={(value: any) => {
                          i18n.changeLanguage(value);
                          onSettingsChange({ ...appSettings, language: value });
                        }}
                        options={[
                          { value: 'en', label: 'English' },
                          { value: 'zh-CN', label: '简体中文' },
                        ]}
                        value={appSettings?.language || 'en'}
                      />
                    </SettingItem>
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-8">
                    {t('settings.adj_visibility')}
                  </Text>
                  <Text className="mb-4">
                    {t('settings.adj_visibility_desc')}
                  </Text>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Switch
                      label={t('settings.chromatic_aberration')}
                      checked={appSettings?.adjustmentVisibility?.chromaticAberration ?? false}
                      onChange={(checked) =>
                        onSettingsChange({
                          ...appSettings,
                          adjustmentVisibility: {
                            ...(appSettings?.adjustmentVisibility || adjustmentVisibilityDefaults),
                            chromaticAberration: checked,
                          },
                        })
                      }
                    />
                    <Switch
                      label={t('settings.grain')}
                      checked={appSettings?.adjustmentVisibility?.grain ?? true}
                      onChange={(checked) =>
                        onSettingsChange({
                          ...appSettings,
                          adjustmentVisibility: {
                            ...(appSettings?.adjustmentVisibility || adjustmentVisibilityDefaults),
                            grain: checked,
                          },
                        })
                      }
                    />
                    <Switch
                      label={t('settings.color_calibration')}
                      checked={appSettings?.adjustmentVisibility?.colorCalibration ?? true}
                      onChange={(checked) =>
                        onSettingsChange({
                          ...appSettings,
                          adjustmentVisibility: {
                            ...(appSettings?.adjustmentVisibility || adjustmentVisibilityDefaults),
                            colorCalibration: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-8">
                    {t('settings.my_lenses')}
                  </Text>
                  <Text className="mb-6">
                    {t('settings.my_lenses_desc')}
                  </Text>

                  <div className="space-y-8">
                    <div className="bg-bg-primary rounded-lg p-4 border border-border-color">
                      <Text variant={TextVariants.heading} className="mb-3">
                        {t('settings.add_lens')}
                      </Text>
                      <div className="space-y-4">
                        <Dropdown
                          options={lensMakers.map((m) => ({ label: m, value: m }))}
                          value={tempLensMaker}
                          onChange={handleTempMakerChange}
                          placeholder={t('settings.select_manufacturer')}
                        />
                        <Dropdown
                          options={lensModels.map((m) => ({ label: m, value: m }))}
                          value={tempLensModel}
                          onChange={setTempLensModel}
                          placeholder={t('settings.select_lens_model')}
                          disabled={!tempLensMaker}
                        />
                        <Button onClick={handleAddLens} disabled={!tempLensMaker || !tempLensModel} className="w-full">
                          <Plus size={16} className="mr-1" />
                          {t('settings.add_to_lenses')}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Text variant={TextVariants.heading} className="mb-2">
                        {t('settings.saved_lenses')}
                      </Text>
                      {(!appSettings?.myLenses || appSettings.myLenses.length === 0) && (
                        <Text className="italic">{t('settings.no_lenses')}</Text>
                      )}
                      <div className="divide-y divide-border-color">
                        {(appSettings?.myLenses || []).map((lens: MyLens, index: number) => (
                          <div
                            key={`${lens.maker}-${lens.model}-${index}`}
                            className="flex justify-between items-center py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-surface rounded-md text-accent">
                                <Bookmark size={16} />
                              </div>
                              <div>
                                <Text color={TextColors.primary} weight={TextWeights.medium}>
                                  {lens.model}
                                </Text>
                                <Text variant={TextVariants.small}>{lens.maker}</Text>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveLens(index)}
                              className="p-2 text-text-secondary hover:text-red-400 hover:bg-bg-primary rounded-md transition-colors"
                              data-tooltip={t('tooltips.remove_lens')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-8">
                    {t('settings.tagging')}
                  </Text>
                  <div className="space-y-8">
                    <SettingItem
                      label={t('settings.tagging_shortcuts')}
                      description={t('settings.tagging_shortcuts_desc')}
                    >
                      <div>
                        <div className="flex flex-wrap gap-2 p-2 bg-bg-primary rounded-md min-h-10 border border-border-color mb-2 items-center">
                          <AnimatePresence>
                            {taggingShortcuts.length > 0 ? (
                              taggingShortcuts.map((shortcut: string) => (
                                <motion.div
                                  key={shortcut}
                                  layout
                                  variants={shortcutTagVariants}
                                  initial={false}
                                  animate="visible"
                                  exit="exit"
                                  onClick={() => handleRemoveShortcut(shortcut)}
                                  data-tooltip={t('settings.remove_shortcut', { name: shortcut })}
                                  className="flex items-center gap-1 bg-surface px-2 py-1 rounded-sm group cursor-pointer"
                                >
                                  <Text variant={TextVariants.label} color={TextColors.primary}>
                                    {shortcut}
                                  </Text>
                                  <span className="rounded-full group-hover:bg-black/20 p-0.5 transition-colors">
                                    <X size={14} />
                                  </span>
                                </motion.div>
                              ))
                            ) : (
                              <motion.span
                                key="no-shortcuts-placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-sm text-text-secondary italic px-1 select-none"
                              >
                                {t('settings.no_shortcuts')}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type="text"
                              value={newShortcut}
                              onChange={(e) => setNewShortcut(e.target.value)}
                              onKeyDown={handleInputKeyDown}
                              placeholder={t('settings.add_shortcuts')}
                              className="pr-10"
                            />
                            <button
                              onClick={handleAddShortcut}
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface"
                              data-tooltip={t('tooltips.add_shortcut')}
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                          <button
                            onClick={() => onSettingsChange({ ...appSettings, taggingShortcuts: [] })}
                            disabled={taggingShortcuts.length === 0}
                            className="p-2 text-text-secondary hover:text-red-400 hover:bg-surface rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-secondary disabled:hover:bg-transparent"
                            data-tooltip={t('tooltips.clear_shortcuts')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </SettingItem>

                    <div className="pt-8 border-t border-border-color">
                      <div className="space-y-8">
                        <DataActionItem
                          buttonAction={handleClearAiTags}
                          buttonText={t('settings.clear_button')}
                          description={t('settings.clear_ai_tags_action_desc')}
                          disabled={!effectiveRootPath}
                          icon={<Trash2 size={16} className="mr-2" />}
                          isProcessing={isClearingAiTags}
                          message={aiTagsClearMessage}
                          title={t('settings.clear_ai_tags_confirm')}
                        />
                        <DataActionItem
                          buttonAction={handleClearTags}
                          buttonText={t('settings.clear_button')}
                          description={t('settings.clear_all_tags_action_desc')}
                          disabled={!effectiveRootPath}
                          icon={<Trash2 size={16} className="mr-2" />}
                          isProcessing={isClearingTags}
                          message={tagsClearMessage}
                          title={t('settings.clear_all_tags')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-6">
                    {t('settings.special_thanks')}
                  </Text>
                  <Text className="mb-4">
                    {t('settings.special_thanks_intro')}
                  </Text>
                  <Text as="ul" className="space-y-3 list-disc ml-5 pl-1">
                    <li>
                      <a
                        href="https://github.com/dnglab/dnglab/tree/main/rawler"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        rawler
                      </a>
                      : {t('settings.special_thanks_rawler')}
                    </li>
                    <li>
                      <a
                        href="https://lensfun.github.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        lensfun
                      </a>
                      : {t('settings.special_thanks_lensfun')}
                    </li>
                    <li>
                      <a
                        href="https://github.com/marcinz606/NegPy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        NegPy
                      </a>
                      : {t('settings.special_thanks_negpy')}
                    </li>
                    <li>
                      <a
                        href="https://github.com/advimman/lama"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        LaMa
                      </a>
                      : {t('settings.special_thanks_lama')}
                    </li>
                    <li>
                      <a
                        href="https://github.com/facebookresearch/sam2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        SAM 2
                      </a>
                      : {t('settings.special_thanks_sam2')}
                    </li>
                    <li>
                      <a
                        href="https://github.com/xuebinqin/U-2-Net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        U-2-Net
                      </a>
                      : {t('settings.special_thanks_u2net')}
                    </li>
                    <li>
                      <a
                        href="https://github.com/DepthAnything/Depth-Anything-V2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        Depth Anything V2
                      </a>
                      : {t('settings.special_thanks_depth')}
                    </li>
                    <li>
                      <a
                        href="https://github.com/trougnouf/nind-denoise"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        nind-denoise
                      </a>
                      : {t('settings.special_thanks_nind')}
                    </li>
                    <li>
                      <a
                        href="https://github.com/darktable-org/darktable"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent hover:underline"
                      >
                        darktable & co.
                      </a>
                      : {t('settings.special_thanks_darktable')}
                    </li>
                    <li>
                      <span className="font-semibold text-accent">{t('settings.special_thanks_you')}</span>: {t('settings.special_thanks_you_desc')}
                    </li>
                  </Text>
                </div>
              </motion.div>
            )}

            {activeCategory === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-8">
                    {t('settings.processing_engine')}
                  </Text>
                  <div className="space-y-8">
                    <div>
                      <Text variant={TextVariants.heading} className="mb-2">
                        {t('settings.preview_strategy')}
                      </Text>
                      <PreviewModeSwitch
                        mode={appSettings?.enableZoomHifi ? 'dynamic' : 'static'}
                        onModeChange={handlePreviewModeChange}
                        modes={previewModes}
                      />

                      <div className="mt-3">
                        <AnimatePresence mode="wait">
                          {!(appSettings?.enableZoomHifi ?? true) ? (
                            <motion.div
                              key="static-preview"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Text variant={TextVariants.small} className="mb-4">
                                {t('settings.static_preview_desc')}
                              </Text>
                              <div className="pl-4 border-l-2 border-border-color ml-1">
                                <SettingItem
                                  description={t('settings.preview_resolution_desc')}
                                  label={t('settings.preview_resolution')}
                                >
                                  <Dropdown
                                    onChange={(value: any) =>
                                      handleProcessingSettingChange('editorPreviewResolution', value)
                                    }
                                    options={resolutions}
                                    value={processingSettings.editorPreviewResolution}
                                  />
                                </SettingItem>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="dynamic-preview"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Text variant={TextVariants.small} className="mb-4">
                                {t('settings.dynamic_preview_desc')}
                              </Text>
                              <div className="pl-4 border-l-2 border-border-color ml-1 space-y-3">
                                <SettingItem
                                  description={t('settings.static_preview_resolution_desc')}
                                  label={t('settings.static_preview_resolution')}
                                >
                                  <Dropdown
                                    onChange={(value: any) =>
                                      handleProcessingSettingChange('editorPreviewResolution', value)
                                    }
                                    options={resolutions}
                                    value={processingSettings.editorPreviewResolution}
                                  />
                                </SettingItem>

                                <SettingItem
                                  label={t('settings.render_scale')}
                                  description={t('settings.render_scale_desc')}
                                >
                                  <Dropdown
                                    onChange={(value: any) =>
                                      handleProcessingSettingChange('highResZoomMultiplier', value)
                                    }
                                    options={zoomMultiplierOptions}
                                    value={processingSettings.highResZoomMultiplier}
                                  />
                                </SettingItem>

                                <SettingItem
                                  label={t('settings.high_dpi')}
                                  description={
                                    dpr > 1
                                      ? t('settings.high_dpi_desc', { dpr })
                                      : t('settings.high_dpi_standard_desc')
                                  }
                                >
                                  <Switch
                                    checked={processingSettings.useFullDpiRendering}
                                    disabled={dpr <= 1}
                                    id="full-dpi-rendering-toggle"
                                    label={t('settings.render_native_dpi')}
                                    onChange={(checked) =>
                                      handleProcessingSettingChange('useFullDpiRendering', checked)
                                    }
                                  />
                                </SettingItem>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <SettingItem
                        label={t('settings.live_previews')}
                        description={t('settings.live_previews_desc')}
                      >
                        <Switch
                          checked={appSettings?.enableLivePreviews ?? true}
                          id="live-previews-toggle"
                          label={t('settings.enable_live_previews')}
                          onChange={(checked) => {
                            setHasInteractedWithLivePreview(true);
                            onSettingsChange({ ...appSettings, enableLivePreviews: checked });
                          }}
                        />
                      </SettingItem>

                      <AnimatePresence>
                        {(appSettings?.enableLivePreviews ?? true) && (
                          <motion.div
                            initial={hasInteractedWithLivePreview ? { height: 0, opacity: 0 } : false}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                          >
                            <div className="pl-4 border-l-2 border-border-color ml-1">
                              <SettingItem
                                label={t('settings.live_preview_quality')}
                                description={t('settings.live_preview_quality_desc')}
                              >
                                <Dropdown
                                  onChange={(value: any) =>
                                    onSettingsChange({ ...appSettings, livePreviewQuality: value })
                                  }
                                  options={livePreviewQualityOptions}
                                  value={appSettings?.livePreviewQuality || 'high'}
                                />
                              </SettingItem>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <SettingItem
                      description={t('settings.thumbnail_resolution_desc')}
                      label={t('settings.thumbnail_resolution')}
                    >
                      <Dropdown
                        onChange={(value: any) => handleProcessingSettingChange('thumbnailResolution', value)}
                        options={thumbnailResolutions}
                        value={processingSettings.thumbnailResolution}
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.highlight_recovery')}
                      description={t('settings.highlight_recovery_desc')}
                    >
                      <Slider
                        label={t('settings.amount')}
                        min={1}
                        max={10}
                        step={0.1}
                        value={processingSettings.rawHighlightCompression}
                        defaultValue={2.5}
                        onChange={(e: any) =>
                          handleProcessingSettingChange('rawHighlightCompression', parseFloat(e.target.value))
                        }
                        fillOrigin="min"
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.linear_raw')}
                      description={t('settings.linear_raw_desc')}
                    >
                      <Dropdown
                        onChange={(value: any) => onSettingsChange({ ...appSettings, linearRawMode: value })}
                        options={linearRawOptions}
                        value={appSettings?.linearRawMode || 'auto'}
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.processing_backend')}
                      description={t('settings.processing_backend_desc')}
                    >
                      <Dropdown
                        onChange={(value: any) => handleProcessingSettingChange('processingBackend', value)}
                        options={filteredBackendOptions}
                        value={
                          filteredBackendOptions.some((option) => option.value === processingSettings.processingBackend)
                            ? processingSettings.processingBackend
                            : 'auto'
                        }
                      />
                    </SettingItem>

                    {osPlatform !== 'macos' && osPlatform !== 'windows' && (
                      <SettingItem
                        label={t('settings.linux_compat')}
                        description={t('settings.linux_compat_desc')}
                      >
                        <Switch
                          checked={processingSettings.linuxGpuOptimization}
                          id="gpu-compat-toggle"
                          label={t('settings.enable_compat')}
                          onChange={(checked) => handleProcessingSettingChange('linuxGpuOptimization', checked)}
                        />
                      </SettingItem>
                    )}

                    {restartRequired && (
                      <>
                        <Text
                          as="div"
                          color={TextColors.info}
                          className="p-3 bg-blue-900/10 border border-blue-500/50 rounded-lg flex items-center gap-3"
                        >
                          <Info size={18} />
                          <p>{t('settings.restart_notice')}</p>
                        </Text>
                        <div className="flex justify-end">
                          <Button onClick={handleSaveAndRelaunch}>{t('settings.save_relaunch')}</Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-8">
                    {t('settings.generative_ai')}
                  </Text>
                  <Text className="mb-4">
                    {t('settings.ai_flexibility_desc')}
                  </Text>

                  <AiProviderSwitch selectedProvider={aiProvider} onProviderChange={handleProviderChange} providers={aiProviders} />

                  <div className="mt-8">
                    <AnimatePresence mode="wait">
                      {aiProvider === 'cpu' && (
                        <motion.div
                          key="cpu"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Text variant={TextVariants.heading}>{t('settings.builtin_ai')}</Text>
                          <Text className="mt-1">
                            {t('settings.builtin_ai_desc')}
                          </Text>
                          <Text as="ul" className="mt-3 space-y-1 list-disc list-inside">
                            <li>{t('settings.builtin_ai_feature_1')}</li>
                            <li>{t('settings.builtin_ai_feature_2')}</li>
                            <li>{t('settings.builtin_ai_feature_3')}</li>
                          </Text>
                        </motion.div>
                      )}

                      {aiProvider === 'ai-connector' && (
                        <motion.div
                          key="ai-connector"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-8">
                            <div>
                              <Text variant={TextVariants.heading}>{t('settings.self_hosted')}</Text>
                              <Text className="mt-1">
                                {t('settings.self_hosted_desc')}
                              </Text>
                              <Text as="ul" className="mt-3 space-y-1 list-disc list-inside">
                                <li>{t('settings.self_hosted_feature_1')}</li>
                                <li>{t('settings.self_hosted_feature_2')}</li>
                                <li>{t('settings.self_hosted_feature_3')}</li>
                              </Text>
                            </div>
                            <SettingItem
                              label={t('settings.ai_connector_address')}
                              description={t('settings.ai_connector_address_desc')}
                            >
                              <div className="flex items-center gap-2">
                                <Input
                                  className="grow"
                                  id="ai-connector-address"
                                  onBlur={() =>
                                    onSettingsChange({ ...appSettings, aiConnectorAddress: aiConnectorAddress })
                                  }
                                  onChange={(e: any) => setAiConnectorAddress(e.target.value)}
                                  onKeyDown={(e: any) => e.stopPropagation()}
                                  placeholder="127.0.0.1:8188"
                                  type="text"
                                  value={aiConnectorAddress}
                                />
                                <Button
                                  className="w-32"
                                  disabled={testStatus.testing || !aiConnectorAddress}
                                  onClick={handleTestConnection}
                                >
                                  {testStatus.testing ? t('settings.testing') : t('settings.test')}
                                </Button>
                              </div>
                              {testStatus.message && (
                                <Text
                                  color={testStatus.success ? TextColors.success : TextColors.error}
                                  className="mt-2 flex items-center gap-2"
                                >
                                  {testStatus.success === true && <Wifi size={16} />}
                                  {testStatus.success === false && <WifiOff size={16} />}
                                  {testStatus.message}
                                </Text>
                              )}
                            </SettingItem>
                          </div>
                        </motion.div>
                      )}

                      {aiProvider === 'cloud' && (
                        <motion.div
                          key="cloud"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Text variant={TextVariants.heading}>{t('settings.cloud_service')}</Text>
                          <Text className="mt-1">
                            {t('settings.cloud_service_desc')}
                          </Text>
                          <Text as="ul" className="mt-3 space-y-1 list-disc list-inside">
                            <li>{t('settings.cloud_service_feature_1')}</li>
                            <li>{t('settings.cloud_service_feature_2')}</li>
                            <li>{t('settings.cloud_service_feature_3')}</li>
                          </Text>

                          <div className="mt-8 p-4 bg-bg-primary rounded-lg border border-border-color text-center space-y-3">
                            <Text
                              variant={TextVariants.small}
                              color={TextColors.button}
                              weight={TextWeights.semibold}
                              className="inline-block bg-accent px-2 py-1 rounded-full"
                            >
                              {t('settings.coming_soon')}
                            </Text>
                            <Text>
                              {t('settings.cloud_service_github')}
                            </Text>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-8">
                    {t('settings.data_management')}
                  </Text>
                  <div className="space-y-8">
                    <DataActionItem
                      buttonAction={handleClearSidecars}
                      buttonText={t('settings.clear_button')}
                      description={
                        <Text as="span" variant={TextVariants.small}>
                          {t('settings.clear_sidecar_action_desc')}
                          <span className="block font-mono bg-bg-primary p-2 rounded-sm mt-2 break-all border border-border-color">
                            {effectiveRootPath || t('settings.no_folder')}
                          </span>
                        </Text>
                      }
                      disabled={!effectiveRootPath}
                      icon={<Trash2 size={16} className="mr-2" />}
                      isProcessing={isClearing}
                      message={clearMessage}
                      title={t('settings.clear_sidecar')}
                    />

                    <DataActionItem
                      buttonAction={handleClearCache}
                      buttonText={t('settings.clear_button')}
                      description={t('settings.clear_cache_action_desc')}
                      icon={<Trash2 size={16} className="mr-2" />}
                      isProcessing={isClearingCache}
                      message={cacheClearMessage}
                      title={t('settings.clear_cache')}
                    />

                    <DataActionItem
                      buttonAction={async () => {
                        if (logPath && !logPath.startsWith('Could not')) {
                          await invoke(Invokes.ShowInFinder, { path: logPath });
                        }
                      }}
                      buttonText={t('settings.open')}
                      description={
                        <Text as="span" variant={TextVariants.small}>
                          {t('settings.view_logs_desc')}
                          <span className="block font-mono bg-bg-primary p-2 rounded-sm mt-2 break-all border border-border-color">
                            {logPath || t('settings.loading')}
                          </span>
                        </Text>
                      }
                      disabled={!logPath || logPath.startsWith('Could not')}
                      icon={<ExternalLinkIcon size={16} className="mr-2" />}
                      isProcessing={false}
                      message=""
                      title={t('settings.view_logs')}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeCategory === 'shortcuts' && (
              <motion.div
                key="shortcuts"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <Text variant={TextVariants.title} color={TextColors.accent} className="mb-8">
                    {t('settings.keyboard_shortcuts')}
                  </Text>
                  <div className="space-y-8">
                    <div>
                      <Text variant={TextVariants.heading}>{t('settings.keybind_general')}</Text>
                      <div className="divide-y divide-border-color">
                        <KeybindItem keys={['Space', 'Enter']} description={t('settings.keybind_open_image')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'C']} description={t('settings.keybind_copy_adj')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'V']} description={t('settings.keybind_paste_adj')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'Shift', '+', 'C']} description={t('settings.keybind_copy_files')} />
                        <KeybindItem
                          description={t('settings.keybind_paste_files')}
                          keys={['Ctrl/Cmd', '+', 'Shift', '+', 'V']}
                        />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'A']} description={t('settings.keybind_select_all')} />
                        <KeybindItem
                          keys={osPlatform === 'macos' ? ['Cmd', '+', 'Delete'] : ['Delete']}
                          description={t('settings.keybind_delete_files')}
                        />
                        <KeybindItem keys={['0-5']} description={t('settings.keybind_star_rating')} />
                        <KeybindItem keys={['Shift', '+', '0-5']} description={t('settings.keybind_color_label')} />
                        <KeybindItem keys={['↑', '↓', '←', '→']} description={t('settings.keybind_navigate')} />
                      </div>
                    </div>
                    <div>
                      <Text variant={TextVariants.heading}>{t('settings.keybind_editor')}</Text>
                      <div className="divide-y divide-border-color">
                        <KeybindItem keys={['Esc']} description={t('settings.keybind_deselect')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'Z']} description={t('settings.keybind_undo')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'Y']} description={t('settings.keybind_redo')} />
                        <KeybindItem
                          keys={osPlatform === 'macos' ? ['Cmd', '+', 'Delete'] : ['Delete']}
                          description={t('settings.keybind_delete_mask')}
                        />
                        <KeybindItem keys={['Space']} description={t('settings.keybind_cycle_zoom')} />
                        <KeybindItem keys={['←', '→']} description={t('settings.keybind_prev_next')} />
                        <KeybindItem keys={['↑', '↓']} description={t('settings.keybind_zoom_step')} />
                        <KeybindItem
                          keys={['Shift/Alt', '+', 'Drag Slider']}
                          description={t('settings.keybind_fine_adj')}
                        />
                        <KeybindItem
                          keys={['Shift', '+', 'Mouse Wheel']}
                          description={t('settings.keybind_slider_step')}
                        />
                        <KeybindItem keys={['Ctrl/Cmd', '+', '+']} description={t('settings.keybind_zoom_in')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', '-']} description={t('settings.keybind_zoom_out')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', '0']} description={t('settings.keybind_zoom_fit')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', '1']} description={t('settings.keybind_zoom_100')} />
                        <KeybindItem keys={['[']} description={t('settings.keybind_rotate_ccw')} />
                        <KeybindItem keys={[']']} description={t('settings.keybind_rotate_cw')} />
                        <KeybindItem keys={['F']} description={t('settings.keybind_fullscreen')} />
                        <KeybindItem keys={['B']} description={t('settings.keybind_before_after')} />
                        <KeybindItem keys={['S']} description={t('settings.keybind_straighten')} />
                        <KeybindItem keys={['D']} description={t('settings.keybind_toggle_adj')} />
                        <KeybindItem keys={['R']} description={t('settings.keybind_toggle_crop')} />
                        <KeybindItem keys={['M']} description={t('settings.keybind_toggle_masks')} />
                        <KeybindItem keys={['K']} description={t('settings.keybind_toggle_ai')} />
                        <KeybindItem keys={['P']} description={t('settings.keybind_toggle_presets')} />
                        <KeybindItem keys={['I']} description={t('settings.keybind_toggle_meta')} />
                        <KeybindItem keys={['A']} description={t('settings.keybind_toggle_analytics')} />
                        <KeybindItem keys={['E']} description={t('settings.keybind_toggle_export')} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
