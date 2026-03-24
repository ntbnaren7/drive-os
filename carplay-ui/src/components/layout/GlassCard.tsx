import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

const GlassCard = ({ children, className = "" }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      className={`glass-card ${className}`}
      style={{
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
