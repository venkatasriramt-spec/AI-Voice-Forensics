
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from 'lucide-react';

const ProcessingConsole = ({ 
  onComplete, 
  message = "Processing your audio file...", 
  progress: externalProgress, 
  isVisible = true,
  chunkData = null,
  mode = 'static'
}) => {
  const isLive = mode === 'live' || chunkData !== null;
  
  const steps = isLive ? [
    '> Initializing /ws/stream connection...',
    '> Extracting WavLM & LFCC features (4s window, 2s stride)...',
    '> Running LightGBM v8.1 inference...',
    '> Streaming real-time chunk updates...'
  ] : [
    '> Uploading to /analyze endpoint...',
    '> Applying RMS energy silence skipping...',
    '> Extracting WavLM & LFCC features...',
    '> Running LightGBM v8.1 inference...'
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [internalProgress, setInternalProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Step progression
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 1200);

    // Internal progress bar animation (used if externalProgress is not provided)
    let progressInterval;
    if (externalProgress === undefined) {
      progressInterval = setInterval(() => {
        setInternalProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            if (onComplete) setTimeout(onComplete, 500);
            return 100;
          }
          return prev + 1;
        });
      }, 50);
    }

    return () => {
      clearInterval(stepInterval);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isVisible, onComplete, externalProgress, steps.length]);

  if (!isVisible) return null;

  const currentProgress = externalProgress !== undefined ? externalProgress : internalProgress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-3xl mx-auto bg-[hsl(var(--background-lighter))] border border-primary/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,217,255,0.05)] relative"
    >
      {/* Header */}
      <div className="bg-background/80 px-4 py-3 border-b border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-danger"></div>
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <div className="w-3 h-3 rounded-full bg-success"></div>
          </div>
          <span className="font-mono text-xs text-primary/70 ml-2 tracking-widest uppercase">
            V8.1 Dual-Branch Engine
          </span>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-wider">{message}</span>
        </div>
      </div>

      {/* Console Output */}
      <div className="p-6 font-mono text-sm text-foreground/80 min-h-[220px] flex flex-col justify-end space-y-2 relative bg-[hsl(var(--background-lighter))]">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        
        <AnimatePresence>
          {steps.map((step, index) => (
            index <= activeStep && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`${index === activeStep ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {step}
              </motion.div>
            )
          ))}
        </AnimatePresence>

        {chunkData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 pt-4 border-t border-primary/20 text-xs text-primary/80"
          >
            <div>&gt; Status: {chunkData.status}</div>
            <div>&gt; Latency: {chunkData.latency_ms}ms</div>
            <div>&gt; Authentic Human: {chunkData.authentic_human?.toFixed(2)}% | Synthetic AI: {chunkData.synthetic_ai?.toFixed(2)}%</div>
          </motion.div>
        )}
        
        {/* Blinking Cursor */}
        <motion.div
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="w-2.5 h-4 bg-primary inline-block mt-1"
        />
      </div>

      {/* Progress Bar Container */}
      <div className="h-1.5 w-full bg-background relative overflow-hidden">
        <div 
          className="h-full bg-primary shadow-[0_0_10px_rgba(0,217,255,0.8)] transition-all duration-300 ease-out"
          style={{ width: `${currentProgress}%` }}
        />
      </div>
    </motion.div>
  );
};

export default ProcessingConsole;
