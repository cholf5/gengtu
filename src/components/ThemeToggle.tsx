import { Button, Tooltip } from 'antd';
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { ThemeMode } from '../utils/theme';

interface ThemeToggleProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const ORDER: ThemeMode[] = ['auto', 'light', 'dark'];

const META: Record<ThemeMode, { label: string; tooltip: string; icon: React.ReactNode }> = {
  auto: { label: '跟随系统', tooltip: '当前：跟随系统 · 点击切到浅色', icon: <DesktopOutlined /> },
  light: { label: '浅色', tooltip: '当前：浅色 · 点击切到深色', icon: <SunOutlined /> },
  dark: { label: '深色', tooltip: '当前：深色 · 点击跟随系统', icon: <MoonOutlined /> },
};

export function ThemeToggle({ mode, onChange }: ThemeToggleProps) {
  const meta = META[mode];
  const next = () => {
    const i = ORDER.indexOf(mode);
    onChange(ORDER[(i + 1) % ORDER.length]);
  };

  return (
    <Tooltip title={meta.tooltip}>
      <Button
        type="text"
        shape="circle"
        icon={meta.icon}
        onClick={next}
        aria-label={`切换主题（当前：${meta.label}）`}
      />
    </Tooltip>
  );
}
