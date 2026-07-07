
import React, { useState, useCallback, useRef } from 'react';
import { UploadCloud as CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const UploadZone = ({
  onFileSelect,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndProcessFile = file => {
    if (!file) return;

    // Check format strictly by extension
    const validExtensions = ['.wav', '.mp3', '.ogg', '.flac', '.mp4'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      toast.error('Unsupported file format. Please upload a file in one of these formats: .wav, .mp3, .ogg, .flac, or .mp4');
      return;
    }

    // Pass to parent
    onFileSelect(file);
  };

  const handleDragOver = useCallback(e => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(e => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(false);
  }, [disabled]);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  }, [disabled]);

  const handleFileInput = useCallback(e => {
    if (disabled) return;
    const files = e.target.files;
    if (files.length > 0) {
      validateAndProcessFile(files[0]);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [disabled]);

  return (
    <div className="w-full">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className={`relative w-full rounded-xl border-2 border-dashed p-16 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden
          ${disabled ? 'opacity-50 cursor-not-allowed border-border bg-background/50' : isDragging ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(0,217,255,0.2)] cursor-pointer' : 'border-primary/40 bg-[hsl(var(--background-lighter))] hover:border-primary/80 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(0,217,255,0.1)] cursor-pointer'}`} 
        onDragOver={handleDragOver} 
        onDragLeave={handleDragLeave} 
        onDrop={handleDrop} 
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          accept=".wav,.mp3,.flac,.ogg,.mp4,audio/*,video/mp4" 
          onChange={handleFileInput} 
          className="hidden" 
          disabled={disabled} 
        />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className={`p-5 rounded-2xl transition-all duration-300 ${isDragging && !disabled ? 'bg-primary/20 scale-110' : 'bg-background/80 shadow-md'}`}>
            <CloudUpload className={`w-16 h-16 ${isDragging && !disabled ? 'text-primary' : 'text-primary/70'}`} />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-foreground">
              {disabled ? 'Processing... Please wait' : 'Drag & Drop Audio or Browse Files'}
            </h3>
          </div>
        </div>

        {/* Animated Background Overlay for Dragging */}
        <AnimatePresence>
          {isDragging && !disabled && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" 
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default UploadZone;
