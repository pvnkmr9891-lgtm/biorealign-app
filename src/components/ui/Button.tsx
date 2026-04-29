import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_STYLES = {
  primary:   { bg: 'bg-teal',      text: 'text-background', border: '' },
  secondary: { bg: 'bg-surface-2', text: 'text-text-primary', border: 'border border-border' },
  ghost:     { bg: 'bg-transparent', text: 'text-teal', border: '' },
  danger:    { bg: 'bg-surface-2', text: 'text-error', border: 'border border-border' },
};

const SIZE_STYLES = {
  sm: { padding: 'py-2 px-4', text: 'text-sm', radius: 'rounded-lg' },
  md: { padding: 'py-3.5 px-6', text: 'text-sm', radius: 'rounded-lg' },
  lg: { padding: 'py-4 px-6',   text: 'text-base', radius: 'rounded-xl' },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  size = 'md',
  disabled,
  ...props
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || loading}
      activeOpacity={0.85}
      className={`${v.bg} ${v.border} ${s.padding} ${s.radius} items-center justify-center`}
      style={[{ opacity: disabled ? 0.5 : 1 }, props.style as any]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#0A0A0B' : '#00C4B4'} size="small" />
      ) : (
        <Text className={`${v.text} font-sans-semibold ${s.text}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
