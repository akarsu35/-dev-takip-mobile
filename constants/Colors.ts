import { useColorScheme } from 'react-native';
import { useStore } from '../store/useStore';

export const Colors = {
  light: {
    primary: '#7C3AED',
    primaryLight: '#F5F3FF',
    primaryDark: '#6D28D9',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textMuted: '#64748b',
    textLight: '#94a3b8',
    border: '#f1f5f9',
    borderStrong: '#e2e8f0',
    card: '#ffffff',
    success: '#10b981',
    successBg: '#d1fae5',
    error: '#ef4444',
    errorBg: '#fecaca',
    danger: '#ef4444',
    dangerBg: '#fef2f2',
    warning: '#f59e0b',
    warningBg: '#fef3c7',
    info: '#3b82f6',
    infoBg: '#dbeafe',
    overlay: 'rgba(15, 23, 42, 0.05)',
  },
  dark: {
    primary: '#A78BFA',
    primaryLight: '#2E1065',
    primaryDark: '#8B5CF6',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textLight: '#64748b',
    border: '#334155',
    borderStrong: '#475569',
    card: '#1e293b',
    success: '#34d399',
    successBg: '#064e3b',
    error: '#f87171',
    errorBg: '#7f1d1d',
    danger: '#f87171',
    dangerBg: '#450a0a',
    warning: '#fbbf24',
    warningBg: '#78350f',
    info: '#60a5fa',
    infoBg: '#1e3a8a',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
};

export type Theme = typeof Colors.light & { isDark: boolean };

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const themePreference = useStore((s) => s.themePreference);
  const isDark = themePreference === 'system' ? scheme === 'dark' : themePreference === 'dark';
  
  return {
    ...(isDark ? Colors.dark : Colors.light),
    isDark,
  };
}
