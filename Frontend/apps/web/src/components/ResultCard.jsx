
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

const COLOR_MAP = {
  'mediumseagreen': '#3cb371',
  'goldenrod': '#daa520',
  'darkorange': '#ff8c00',
  'crimson': '#dc143c',
  'darkred': '#8b0000'
};

const ResultCard = ({ 
  statusText, 
  colorCode,
  syntheticProb = 0,
  authenticProb = 0
}) => {
  // Defensive check for incomplete data
  if (!statusText || !colorCode) {
    return (
      <div className="error p-6 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive font-mono text-sm">
        Error: Incomplete analysis data
      </div>
    );
  }

  const resolvedColor = COLOR_MAP[colorCode?.toLowerCase()] || colorCode || '#ff8c00';

  // Determine icon based on backend-provided color
  const lc = colorCode?.toLowerCase();
  let Icon = AlertTriangle;
  if (lc === 'mediumseagreen') {
    Icon = CheckCircle2;
  } else if (lc === 'crimson' || lc === 'darkred') {
    Icon = ShieldAlert;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border-2 p-6 shadow-lg bg-card"
      style={{ 
        backgroundColor: `color-mix(in srgb, ${resolvedColor} 5%, transparent)`,
        borderColor: `color-mix(in srgb, ${resolvedColor} 40%, transparent)`,
        boxShadow: `0 10px 15px -3px color-mix(in srgb, ${resolvedColor} 15%, transparent)`
      }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="p-3 rounded-xl border-2 bg-background shrink-0"
          style={{ 
            backgroundColor: `color-mix(in srgb, ${resolvedColor} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${resolvedColor} 50%, transparent)`
          }}
        >
          <Icon 
            className="h-8 w-8" 
            style={{ color: resolvedColor }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 
            className="text-lg font-bold uppercase tracking-wide break-words leading-tight" 
            style={{ color: resolvedColor }}
          >
            {statusText}
          </h3>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultCard;
