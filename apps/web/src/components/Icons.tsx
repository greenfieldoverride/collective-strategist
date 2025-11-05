import React from 'react';

interface IconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

// Dashboard & Navigation Icons
export const OverviewIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
  </svg>
);

export const AIConsultantIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2h-5z"/>
    <path d="M12 6h.01"/>
    <path d="M12 10h.01"/>
    <path d="M12 14h.01"/>
  </svg>
);

export const ContentStudioIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export const SocialMediaIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

export const IntegrationsIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

export const TeamIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export const BillingIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/>
    <path d="M16 8h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M1 12h4"/>
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

// Business & Metrics Icons
export const RevenueIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

export const TrendingUpIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
    <polyline points="17,6 23,6 23,12"/>
  </svg>
);

export const ActivityIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
);

export const TargetIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

export const ZapIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

// Action Icons
export const PlayIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <polygon points="5,3 19,12 5,21"/>
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <polyline points="6,9 12,15 18,9"/>
  </svg>
);

export const XIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// Calendar Icon
export const CalendarIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// Content Creation Icons
export const FileIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
  </svg>
);

export const ImageIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21,15 16,10 5,21"/>
  </svg>
);

export const VideoIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <polygon points="23,12 8,21 8,3"/>
  </svg>
);

export const FolderIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M22,19A2,2 0 0,1 20,21H4A2,2 0 0,1 2,19V5A2,2 0 0,1 4,3H9L11,5H20A2,2 0 0,1 22,7V19Z"/>
  </svg>
);

export const TagIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M20.84,4.61A5.5,5.5 0 0,0 16.23,2H9.42L22,14.58C22.59,15.17 22.59,16.09 22,16.68L18.37,20.31C17.78,20.9 16.86,20.9 16.27,20.31L3.69,7.73C3.1,7.14 3.1,6.22 3.69,5.63L7.32,2C7.91,1.41 8.83,1.41 9.42,2L20.84,4.61M16.23,3.5A4,4 0 0,1 16.23,11.5A4,4 0 0,1 16.23,3.5Z"/>
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);

// Social Media Platform Icons
export const TwitterIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
  </svg>
);

export const LinkedInIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

export const InstagramIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

export const FacebookIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

export const TikTokIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
  </svg>
);

// Additional Professional Icons
export const WarningIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export const LightbulbIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M9 21h6"/>
    <path d="M12 2a7 7 0 0 1 7 7c0 1.5-0.5 3-1.4 4.2L16 15h-8l-1.6-1.8C5.5 12 5 10.5 5 9a7 7 0 0 1 7-7z"/>
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

// Brand logo icon
export const LogoIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg className={`icon ${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);