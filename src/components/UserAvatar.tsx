import React from 'react';
import { getAvatarForUser, AvatarItem } from '../utils/avatars';

interface UserAvatarProps {
  user?: { id?: number; email?: string; full_name?: string; avatar_index?: number } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}

export default function UserAvatar({
  user,
  size = 'md',
  showBadge = false,
  className = '',
}: UserAvatarProps) {
  const avatar = getAvatarForUser(user);

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-20 h-20 text-3xl',
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} ${avatar.bg} ${avatar.border} rounded-2xl flex items-center justify-center shadow-sm select-none transition-transform hover:scale-105 border`}
        title={`${avatar.name} (${avatar.role})`}
      >
        <span role="img" aria-label={avatar.name} className="leading-none drop-shadow-sm">
          {avatar.emoji}
        </span>
      </div>

      {showBadge && (
        <span
          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"
          title="Active NepalDrive Voyager"
        />
      )}
    </div>
  );
}
