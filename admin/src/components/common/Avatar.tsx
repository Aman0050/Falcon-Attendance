import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  shape?: 'circle' | 'rounded';
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  onClick?: () => void;
  showBorder?: boolean;
  borderColor?: string;
}

// Deterministic aesthetic color palette for avatars
const PALETTES = [
  { bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)', text: '#FFFFFF' }, // Royal Blue
  { bg: 'linear-gradient(135deg, #059669, #047857)', text: '#FFFFFF' }, // Emerald Green
  { bg: 'linear-gradient(135deg, #7C3AED, #6D28D9)', text: '#FFFFFF' }, // Purple
  { bg: 'linear-gradient(135deg, #0284C7, #0369A1)', text: '#FFFFFF' }, // Sky Blue
  { bg: 'linear-gradient(135deg, #D97706, #B45309)', text: '#FFFFFF' }, // Amber
  { bg: 'linear-gradient(135deg, #E11D48, #BE123C)', text: '#FFFFFF' }, // Rose
  { bg: 'linear-gradient(135deg, #0891B2, #0e7490)', text: '#FFFFFF' }, // Cyan
  { bg: 'linear-gradient(135deg, #4F46E5, #4338CA)', text: '#FFFFFF' }, // Indigo
];

const getPalette = (name?: string) => {
  if (!name) return PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index];
};

export const getInitials = (name?: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function Avatar({
  src,
  name,
  size = 38,
  shape = 'circle',
  fontSize,
  className = '',
  style = {},
  alt,
  onClick,
  showBorder = false,
  borderColor = 'rgba(255, 255, 255, 0.9)',
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Normalize image URL
  const getFullUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullUrl = getFullUrl(src);
  const palette = getPalette(name);
  const initials = getInitials(name);
  const calculatedFontSize = fontSize || Math.max(Math.round(size * 0.38), 11);
  const borderRadius = shape === 'circle' ? '50%' : `${Math.round(size * 0.28)}px`;

  const containerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
    boxShadow: showBorder ? `0 0 0 2px ${borderColor}` : undefined,
    cursor: onClick ? 'pointer' : undefined,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    ...style,
  };

  if (fullUrl && !hasError) {
    return (
      <div
        className={`falcon-avatar-container ${className}`}
        style={containerStyle}
        onClick={onClick}
        title={name || alt || 'Avatar'}
      >
        <img
          src={fullUrl}
          alt={alt || name || 'Profile Photo'}
          loading="lazy"
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`falcon-avatar-container ${className}`}
      style={{
        ...containerStyle,
        background: palette.bg,
        color: palette.text,
        fontWeight: 600,
        fontSize: `${calculatedFontSize}px`,
        letterSpacing: '0.02em',
      }}
      onClick={onClick}
      title={name || alt || 'Avatar'}
    >
      {initials}
    </div>
  );
}
