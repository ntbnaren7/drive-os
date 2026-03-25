import React from 'react';
import './BentoCard.css';

interface BentoCardProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  gridArea?: string; // e.g., '1 / 9 / 2 / 13' for top-right 4 columns
  flexCol?: boolean;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  icon,
  children,
  className = '',
  gridArea,
  flexCol = true,
}) => {
  return (
    <div
      className={`bento-card ${className}`}
      style={{
        gridArea,
        display: 'flex',
        flexDirection: flexCol ? 'column' : 'row',
      }}
    >
      {(title || icon) && (
        <div className="bento-card__header">
          {icon && <div className="bento-card__icon">{icon}</div>}
          {title && <h3 className="bento-card__title">{title}</h3>}
        </div>
      )}
      <div className="bento-card__content" style={{ flex: 1, display: 'flex', flexDirection: flexCol ? 'column' : 'row', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
};
