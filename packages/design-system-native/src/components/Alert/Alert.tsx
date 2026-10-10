import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
}

const palette: Record<AlertTone, { bg: string; border: string; fg: string }> = {
  info: { bg: colors.primarySubtle, border: colors.primary, fg: colors.primaryDark },
  success: { bg: '#E8F5F3', border: colors.success, fg: '#1F7469' },
  warning: { bg: '#FDF6E3', border: colors.warning, fg: '#8A6508' },
  error: { bg: '#FDECEA', border: colors.error, fg: '#B4472D' },
};

export function Alert({ tone = 'info', title, children }: AlertProps) {
  const p = palette[tone];
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.alert, { backgroundColor: p.bg, borderLeftColor: p.border }]}
    >
      {title ? <Text style={[styles.title, { color: p.fg }]}>{title}</Text> : null}
      {typeof children === 'string' ? <Text style={[styles.body, { color: p.fg }]}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { padding: space[3], borderRadius: radius.md, borderLeftWidth: 4, gap: space[1] },
  title: { fontSize: fontSize.sm, fontWeight: '700' },
  body: { fontSize: fontSize.sm, lineHeight: 20 },
});
