import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

export const colors = {
  background: '#F7F3ED',
  paper: '#FFFDF9',
  ink: '#2E2925',
  muted: '#8C8177',
  subtle: '#B9AEA3',
  line: '#E7DED4',
  coral: '#E76F5F',
  coralSoft: '#F7DDD7',
  teal: '#527E73',
  tealSoft: '#DCEAE5',
  gold: '#D9A64B',
  danger: '#B8473D',
  overlay: 'rgba(31, 27, 24, 0.48)',
};

export const shadow: ViewStyle = Platform.select({
  web: { boxShadow: '0 6px 14px rgba(109, 94, 82, 0.13)' },
  default: {
    shadowColor: '#6D5E52',
    shadowOpacity: 0.13,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
}) as ViewStyle;
