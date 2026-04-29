import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'accent';
  padding?: 'sm' | 'md' | 'lg';
}

const VARIANT_STYLES = {
  default:  'bg-surface-2 border border-border',
  elevated: 'bg-surface border border-border',
  accent:   'bg-teal-muted border border-teal/20',
};

const PADDING_STYLES = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <View
      {...props}
      className={`${VARIANT_STYLES[variant]} ${PADDING_STYLES[padding]} rounded-xl ${className}`}
    >
      {children}
    </View>
  );
}
