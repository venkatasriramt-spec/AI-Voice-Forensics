
/* eslint-disable import/no-unresolved */
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FileAudio, Settings, AlertTriangle, Activity, Clock, Globe, 
  RefreshCw, Radio, StopCircle, Wifi, WifiOff, MonitorSpeaker, Lock, ShieldAlert
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import UploadZone from '@/components/UploadZone.jsx';
import ProcessingConsole from '@/components/ProcessingConsole.jsx';
import ResultCard from '@/components/ResultCard.jsx';
import AuthModal from '@/components/AuthModal.jsx';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth, db, storage } from '@/contexts/AuthContext.jsx';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js';
import { getAnalyzeFileUrl, getWebSocketUrl } from '@/lib/apiHelpers.js';
import { 
  normalizeLiveStreamFinalResponse, 
  normalizeLiveStreamChunkResponse 
} from '@/lib/responseNormalizer.js';

// Helper function to encode raw audio samples to WAV format
const encodeWAV = (samples, sampleRate = 16000) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return buffer;
};

const ThreatAnalysisEnginePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State Management
  const [analysisMode, setAnalysisMode] = useState('static'); // 'static' or 'live'
  const [isRecording, setIsRecording] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [chunkData, setChunkData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Live Stream Refs
  const wsReference = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const screenShareStreamRef = useRef(null);
  const chunkCountRef = useRef(0);
  const latencyRef = useRef(0);

  // Refs for visualization
  const waveformRef = useRef(null);
  const spectrogramRef = useRef(null);
  const chartCanvasRef = useRef(null);
  const wavesurferInstance = useRef(null);
  const chartInstance = useRef(null);

  // Helper to save analysis to history
  const saveAnalysisToHistory = async (normalizedPayload, currentMode, audioUrl = null, fileName = null) => {
    if (!currentUser) return;
    try {
      // Destructure and remove UI-only fields AND latency_ms from the payload before saving
      const { color_code, isComplete, timestamp, mode, latency_ms, ...cleanPayload } = normalizedPayload;

      const recordToSave = {
        type: currentMode,
        timestamp: timestamp || new Date().toISOString(),
        fileName: fileName || 'Live_Interception',
        ...cleanPayload
      };

      // Conditionally include audioUrl only for Static File Analysis mode
      if (currentMode === 'static') {
        recordToSave.audioUrl = audioUrl;
      }

      await addDoc(collection(db, 'users', currentUser.uid, 'history'), recordToSave);
    } catch (error) {
      console.error('Failed to save analysis to history:', error);
    }
  };

  // Handle pre-loaded file logic
  useEffect(() => {
    if (location.state?.file && librariesLoaded) {
      const file = location.state.file;
      navigate(location.pathname, { replace: true, state: {} });
      setAnalysisMode('static');
      if (currentUser) {
        handleFileSelect(file);
      } else {
        toast('Authentication required to analyze file.');
        setIsAuthModalOpen(true);
      }
    }
  }, [location.state, librariesLoaded, navigate, location.pathname, currentUser]);

  // Library Loading Verification with Retry Logic
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const verifyLibraries = async () => {
      let attempts = 0;
      const maxRetries = 3;

      while (attempts < maxRetries) {
        try {
          await Promise.all([
            loadScript('https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js'),
            loadScript('https://cdn.jsdelivr.net/npm/chart.js')
          ]);
          await loadScript('https://unpkg.com/wavesurfer.js@7/dist/plugins/spectrogram.min.js');
          
          if (window.WaveSurfer && window.Chart) {
            setLibrariesLoaded(true);
            return;
          }
        } catch (err) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      toast.error("Failed to load visualization libraries. Some features may be unavailable.");
    };

    verifyLibraries();

    return () => {
      if (wavesurferInstance.current) wavesurferInstance.current.destroy();
      if (chartInstance.current) chartInstance.current.destroy();
      cleanupLiveStream();
    };
  }, []);

  // DOM Polling for Visualizations
  useEffect(() => {
    if (analysisResults) {
      const checkDOM = setInterval(() => {
        if (chartCanvasRef.current && (analysisMode === 'live' || (waveformRef.current && spectrogramRef.current))) {
          clearInterval(checkDOM);
          setTimeout(() => {
            initVisualizations(selectedFile, analysisResults);
          }, 100);
        }
      }, 100);
      
      const timeout = setTimeout(() => clearInterval(checkDOM), 3000);
      return () => {
        clearInterval(checkDOM);
        clearTimeout(timeout);
      };
    }
  }, [analysisResults, selectedFile, analysisMode]);

  // Initialize Visualizations
  const initVisualizations = (file, result) => {
    if (!window.Chart) return;

    // Chart.js Init (Both Modes)
    try {
      if (chartCanvasRef.current) {
        const ctx = chartCanvasRef.current.getContext('2d');
        const authenticProb = result?.authentic_probability || 0;
        const syntheticProb = result?.synthetic_probability || 0;

        if (chartInstance.current) {
          chartInstance.current.data.datasets[0].data = [authenticProb, syntheticProb];
          chartInstance.current.update('none');
        } else {
          chartInstance.current = new window.Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Authentic Human', 'Synthetic AI'],
              datasets: [{
                label: 'Probability (%)',
                data: [authenticProb, syntheticProb],
                backgroundColor: ['MediumSeaGreen', 'Crimson'],
                borderWidth: 0,
                borderRadius: 4
              }]
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: analysisMode === 'live' ? 300 : 1000
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: { label: (context) => `${context.raw.toFixed(2)}%` }
                }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  max: 100,
                  grid: { color: 'rgba(255, 255, 255, 0.1)' },
                  ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                },
                y: {
                  grid: { display: false },
                  ticks: { color: 'rgba(255, 255, 255, 0.9)', font: { size: 14, family: 'Roboto Mono' } }
                }
              }
            }
          });
        }
      }
    } catch (e) {
      console.error("Chart.js initialization error:", e);
    }

    // WaveSurfer Init (Static Mode Only)
    if (analysisMode === 'static' && file && window.WaveSurfer && waveformRef.current && spectrogramRef.current) {
      try {
        if (wavesurferInstance.current) wavesurferInstance.current.destroy();
        
        let plugins = [];
        try {
          const SpectrogramPlugin = window.WaveSurfer.Spectrogram?.default || window.WaveSurfer.Spectrogram || window.WaveSurferSpectrogram;
          if (SpectrogramPlugin) {
            plugins.push(
              SpectrogramPlugin.create({
                container: spectrogramRef.current,
                labels: true,
                height: 128,
                splitChannels: false,
              })
            );
          }
        } catch (pluginErr) {
          console.error("Failed to initialize Spectrogram plugin:", pluginErr);
        }

        wavesurferInstance.current = window.WaveSurfer.create({
          container: waveformRef.current,
          waveColor: 'rgba(0, 217, 255, 0.5)',
          progressColor: 'rgba(0, 217, 255, 0.9)',
          cursorColor: '#fff',
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 128,
          plugins: plugins,
        });

        const objectUrl = URL.createObjectURL(file);
        wavesurferInstance.current.load(objectUrl);
      } catch (e) {
        console.error("WaveSurfer initialization error:", e);
      }
    }
  };

  // API Request Handler (Static Mode)
  const analyzeAudio = async (file) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(getAnalyzeFileUrl(), {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Analysis failed with status: ${response.status}`);
      }

      const data = await response.json();

      // DEFENSIVE PARSING
      if (!data.analysis) {
        console.error('Invalid response structure: missing analysis object', data);
        toast.error('Invalid response from server');
        setIsProcessing(false);
        setIsLoading(false);
        return;
      }
      
      if (!data.analysis.status || !data.analysis.color_code) {
        console.error('Invalid response: missing status or color_code', data);
        toast.error('Incomplete analysis response');
        setIsProcessing(false);
        setIsLoading(false);
        return;
      }

      // Construct normalized result
      const resultsToSet = {
        status: data.analysis.status,
        color_code: data.analysis.color_code,
        threat_level: data.analysis.threat_level,
        synthetic_probability: data.analysis.probabilities?.synthetic_ai || 0,
        authentic_probability: data.analysis.probabilities?.authentic_human || 0,
        language: data.languages_detected,
        action_report: data.action_report,
        latency_ms: data.latency_ms,
        isComplete: true,
        mode: 'static'
      };
      
      // Show results immediately
      setAnalysisResults(resultsToSet);
      setIsProcessing(false);
      setIsLoading(false);

      // Upload Audio to Firebase Storage in background
      (async () => {
        try {
          const fileRef = ref(storage, `users/${currentUser.uid}/audio/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const uploadedAudioUrl = await getDownloadURL(fileRef);
          saveAnalysisToHistory(resultsToSet, 'static', uploadedAudioUrl, file.name);
        } catch (uploadErr) {
          console.error('Background upload failed:', uploadErr);
          saveAnalysisToHistory(resultsToSet, 'static', null, file.name);
        }
      })();

    } catch (err) {
      clearTimeout(timeoutId);
      setHasError(true);
      setIsProcessing(false);
      setIsLoading(false);
      
      if (err.name === 'AbortError') {
        setErrorMessage("Request timed out after 90 seconds. The server may be cold-starting. Please try again.");
      } else {
        setErrorMessage(err.message || "Failed to analyze audio. Please try again.");
      }
    }
  };

  // File Upload Handler (Static Mode)
  const handleFileSelect = (file) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    
    if (!librariesLoaded) {
      toast.warning("Libraries are still loading. Please wait a moment.");
      return;
    }

    if (!file.name.match(/\.(wav|mp3|ogg|flac|mp4)$/i)) {
      setErrorMessage("Unsupported file format. Please upload a file in one of these formats: .wav, .mp3, .ogg, .flac, or .mp4");
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setIsProcessing(true);
    setHasError(false);
    setErrorMessage('');
    setSelectedFile(file);
    setAnalysisResults(null);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const audioBuffer = await audioContext.decodeAudioData(e.target.result);
        analyzeAudio(file);
      } catch (err) {
        setErrorMessage("Failed to decode audio file for validation.");
        setHasError(true);
        setIsLoading(false);
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Failed to read file.");
      setHasError(true);
      setIsLoading(false);
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Live Stream Handlers
  const startLiveStream = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setWsStatus('connecting');
      setHasError(false);
      setErrorMessage('');
      setAnalysisResults(null);
      
      setChunkData(null);
      chunkCountRef.current = 0;
      latencyRef.current = 0;
      
      let stream;
      
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1
        }
      });
      
      screenShareStreamRef.current = displayStream;
      displayStream.addEventListener('inactive', stopScreenShare);
      
      const audioTracks = displayStream.getAudioTracks();
      
      if (audioTracks.length === 0) {
        stopScreenShare();
        throw new Error("No audio track selected. Please ensure you check 'Share audio' when selecting a screen or tab.");
      }
      
      stream = new MediaStream([audioTracks[0]]);
      audioStreamRef.current = stream;

      const ws = new WebSocket(getWebSocketUrl());
      wsReference.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        setIsRecording(true);

        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        
        const actualSampleRate = audioContext.sampleRate;
        const isResamplingRequired = actualSampleRate !== 16000;
        
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(8192, 1, 1);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        source.connect(processor);
        processor.connect(gainNode);
        gainNode.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            let audioData = e.inputBuffer.getChannelData(0);
            
            if (isResamplingRequired) {
              const ratio = actualSampleRate / 16000;
              const newLength = Math.round(audioData.length / ratio);
              const result = new Float32Array(newLength);
              for (let i = 0; i < newLength; i++) {
                const index = i * ratio;
                const index1 = Math.floor(index);
                const index2 = Math.min(index1 + 1, audioData.length - 1);
                const fraction = index - index1;
                result[i] = audioData[index1] * (1 - fraction) + audioData[index2] * fraction;
              }
              audioData = result;
            } else {
              audioData = new Float32Array(audioData);
            }
            
            const wavBuffer = encodeWAV(audioData, 16000);
            ws.send(wavBuffer);
            chunkCountRef.current++;
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'chunk_update') {
            const normalizedChunk = normalizeLiveStreamChunkResponse(payload);
            latencyRef.current = normalizedChunk.latency_ms;
            setChunkData(normalizedChunk);
            
            setAnalysisResults(prev => ({
              ...prev,
              synthetic_probability: normalizedChunk.synthetic_ai,
              authentic_probability: normalizedChunk.authentic_human,
              status: normalizedChunk.status,
              color_code: normalizedChunk.color_code,
              latency_ms: normalizedChunk.latency_ms,
              isComplete: false
            }));
            
          } else if (payload.type === 'final_summary') {
            const normalizedFinal = normalizeLiveStreamFinalResponse(payload);
            
            const finalResult = {
              status: normalizedFinal.status,
              color_code: normalizedFinal.color_code,
              synthetic_probability: normalizedFinal.synthetic_ai,
              authentic_probability: normalizedFinal.authentic_human,
              action_report: normalizedFinal.action_report,
              latency_ms: latencyRef.current,
              isComplete: true
            };

            setAnalysisResults(finalResult);
            setIsRecording(false);
            
            const historyEntry = {
              id: Date.now(),
              fileName: 'Live Stream Recording',
              fileUrl: null,
              analysisMode: 'live',
              result: finalResult,
              timestamp: new Date().toISOString()
            };
            
            setAnalysisHistory(prev => [historyEntry, ...prev]);
            saveAnalysisToHistory(finalResult, 'live_interception', null);
            ws.close();
          } else if (payload.type === 'error') {
            toast.error(`Backend Error: ${payload.message}`);
            setHasError(true);
            setErrorMessage(payload.message);
            cleanupLiveStream();
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('WebSocket connection error.');
        setHasError(true);
        setErrorMessage('Lost connection to analysis server.');
        cleanupLiveStream();
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        setIsRecording(false);
      };

    } catch (err) {
      console.error('Media access denied or error:', err);
      toast.error(err.message || 'Media access denied or error occurred.');
      setHasError(true);
      setErrorMessage(err.message || 'Audio access is required for Live Interception.');
      setWsStatus('disconnected');
    }
  };

  const stopScreenShare = () => {
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.removeEventListener('inactive', stopScreenShare);
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
    }
    stopLiveStream();
  };

  const stopLiveStream = () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (wsReference.current && wsReference.current.readyState === WebSocket.OPEN) {
      wsReference.current.send('END_STREAM');
    }
  };

  const cleanupLiveStream = () => {
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.removeEventListener('inactive', stopScreenShare);
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (wsReference.current) {
      wsReference.current.close();
    }
    setIsRecording(false);
    setWsStatus('disconnected');
  };

  const resetState = () => {
    cleanupLiveStream();
    if (wavesurferInstance.current) {
      wavesurferInstance.current.destroy();
      wavesurferInstance.current = null;
    }
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    setIsLoading(false);
    setIsProcessing(false);
    setHasError(false);
    setErrorMessage('');
    setAnalysisResults(null);
    setChunkData(null);
    setSelectedFile(null);
  };

  const handleModeSwitch = (mode) => {
    if (mode === analysisMode) return;
    resetState();
    setAnalysisMode(mode);
  };

  const UnauthenticatedOverlay = () => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center auth-overlay rounded-xl border border-primary/20">
      <div className="bg-background/90 p-8 rounded-2xl border border-border/50 text-center shadow-2xl max-w-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">Authentication Required</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Access to the Threat Analysis Engine is restricted to verified operatives. Please sign in to proceed.
        </p>
        <Button 
          onClick={() => setIsAuthModalOpen(true)}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider shadow-[0_0_15px_rgba(0,217,255,0.2)]"
        >
          Sign In to Run Analysis
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Threat Analysis Engine | Audio Forensics</title>
        <meta name="description" content="Upload and analyze audio files for AI-generated voice detection using our V8.1 Dual-Branch Engine." />
      </Helmet>

      <div className="min-h-screen flex flex-col relative bg-background selection:bg-primary/30">
        <Header />

        <main className="flex-1 py-12 md:py-20 relative z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            
            {/* HERO SECTION */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-12 border-b border-border/50 pb-12"
            >
              <div className="flex flex-col lg:flex-row gap-10 items-start justify-between">
                <div className="lg:max-w-2xl w-full">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-medium mb-6 uppercase tracking-widest">
                    <Activity className="w-3.5 h-3.5" />
                    Threat Analysis Engine
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground tracking-tight flex flex-col leading-[1.1] sm:leading-[1.1] gap-1.5 md:gap-2 overflow-hidden">
                    <span className="font-normal animate-fade-in-up delay-100">Real-Time</span>
                    
                    <span className="animate-fade-in-up delay-200 relative inline-block w-fit">
                      <span className="text-gradient-cyan-blue font-bold relative z-10">Deepfake Voice</span>
                      <span className="absolute inset-0 bg-primary/10 blur-2xl z-0 rounded-full scale-110"></span>
                    </span>
                    
                    <span className="font-normal animate-fade-in-up delay-300">Detection</span>
                  </h1>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                    Analyze audio samples using our V8.1 Dual-Branch Engine. Detect synthetic acoustic artifacts via static upload (POST /analyze) or live interception (WebSocket /ws/stream).
                  </p>
                </div>
              </div>
            </motion.div>

            {/* DYNAMIC ENGINE SECTION */}
            <div className="min-h-[500px]">
              <div className="bg-background w-full">
                
                {/* MODE SWITCHER */}
                <div className="flex justify-center mb-8 w-full px-2 sm:px-0">
                  <div className="bg-background-lighter border border-border/50 p-1.5 rounded-xl flex relative w-full max-w-[28rem]">
                    <button 
                      onClick={() => handleModeSwitch('static')} 
                      className={`relative z-10 flex-1 py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-mono uppercase tracking-wider transition-all duration-300 flex flex-row items-center justify-center gap-2 ${analysisMode === 'static' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <FileAudio className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">Static File</span>
                    </button>
                    <button 
                      onClick={() => handleModeSwitch('live')} 
                      className={`relative z-10 flex-1 py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-mono uppercase tracking-wider transition-all duration-300 flex flex-row items-center justify-center gap-2 ${analysisMode === 'live' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Radio className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">Live Intercept</span>
                    </button>
                    
                    {/* Animated Background Pill */}
                    <motion.div 
                      className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-primary rounded-lg z-0 shadow-lg shadow-primary/20"
                      initial={false}
                      animate={{ 
                        left: analysisMode === 'static' ? '6px' : 'calc(50% + 3px)' 
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  </div>
                </div>

                {/* CONNECTION STATUS (LIVE MODE ONLY) */}
                <AnimatePresence>
                  {analysisMode === 'live' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex justify-center mb-6"
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border/50 text-xs font-mono uppercase tracking-wider">
                        {wsStatus === 'connected' ? (
                          <><Wifi className="w-3.5 h-3.5 text-success-emerald" /><span className="text-success-emerald">Secure Uplink Active</span></>
                        ) : wsStatus === 'connecting' ? (
                          <><RefreshCw className="w-3.5 h-3.5 text-warning animate-spin" /><span className="text-warning">Establishing Connection...</span></>
                        ) : (
                          <><WifiOff className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Uplink Disconnected</span></>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  
                  {/* ERROR STATE */}
                  {hasError && (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.98 }} 
                      className="flex flex-col items-center justify-center min-h-[400px] text-center bg-destructive/5 border border-destructive/20 rounded-2xl p-8"
                    >
                      <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">Analysis Failed</h3>
                      <p className="text-muted-foreground max-w-md mb-8">{errorMessage}</p>
                      <Button 
                        onClick={resetState}
                        size="lg"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </motion.div>
                  )}

                  {/* STATIC UPLOAD STATE */}
                  {analysisMode === 'static' && !hasError && !isLoading && !isProcessing && !analysisResults && (
                    <motion.div 
                      key="upload" 
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.98 }} 
                      transition={{ duration: 0.4 }} 
                      className="flex flex-col gap-8 p-1 sm:p-0 relative"
                    >
                      {!currentUser && <UnauthenticatedOverlay />}
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 relative z-0">
                        <div className="bg-[hsl(var(--background-lighter))] border border-border rounded-lg p-4 flex items-start gap-3">
                          <FileAudio className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-mono uppercase text-muted-foreground mb-1">Supported Formats</p>
                            <p className="text-sm">.wav, .mp3, .ogg, .flac, .mp4</p>
                          </div>
                        </div>
                        <div className="bg-[hsl(var(--background-lighter))] border border-border rounded-lg p-4 flex items-start gap-3">
                          <Settings className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-mono uppercase text-muted-foreground mb-1">Analysis Method</p>
                            <p className="text-sm">Sliding windows with RMS silence skipping</p>
                          </div>
                        </div>
                        <div className="md:col-span-2 bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-mono uppercase text-warning mb-1">Audio-Only Warning</p>
                            <p className="text-sm text-warning/90">Non-audio files or corrupt headers will trigger automatic validation failure.</p>
                          </div>
                        </div>
                      </div>
                      
                      {!librariesLoaded && currentUser && (
                        <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm font-medium flex items-center gap-3 relative z-0">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Initializing visualization engine...
                        </div>
                      )}

                      <div className="relative z-0">
                        <UploadZone 
                          onFileSelect={handleFileSelect} 
                          disabled={!librariesLoaded || isLoading || isProcessing || !currentUser} 
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* LIVE INTERCEPTION INITIALIZATION STATE */}
                  {analysisMode === 'live' && !hasError && !isRecording && !analysisResults && (
                    <motion.div 
                      key="live-init" 
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.98 }} 
                      className="flex flex-col items-center justify-center min-h-[400px] bg-card/30 border border-border/50 rounded-2xl p-8 text-center relative"
                    >
                      {!currentUser && <UnauthenticatedOverlay />}
                      
                      <div className="relative z-0 flex flex-col items-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
                          <MonitorSpeaker className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">Live Audio Interception</h3>
                        <p className="text-muted-foreground max-w-md mb-8">
                          Stream audio directly from your system audio to our analysis engine. We process audio chunks in real-time to detect synthetic artifacts instantly.
                        </p>

                        <Button 
                          onClick={startLiveStream} 
                          size="lg" 
                          disabled={wsStatus === 'connecting' || !currentUser}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(0,217,255,0.2)]"
                        >
                          {wsStatus === 'connecting' ? (
                            <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Connecting...</>
                          ) : (
                            <><Radio className="w-5 h-5 mr-2" /> Initialize Live Stream</>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* PROCESSING STATE (Both Modes) */}
                  {!hasError && ((analysisMode === 'static' && (isLoading || isProcessing)) || (analysisMode === 'live' && isRecording && (!analysisResults || !analysisResults.status || analysisResults.status === 'INITIALIZING STREAM...'))) && (
                    <motion.div 
                      key="processing" 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -20 }} 
                      className="flex flex-col items-center justify-center min-h-[400px]"
                    >
                      <ProcessingConsole 
                        isVisible={true} 
                        mode={analysisMode}
                        message={analysisMode === 'live' ? "Intercepting live audio stream..." : "Processing your audio file..."} 
                      />
                    </motion.div>
                  )}

                  {/* RESULTS STATE (Both Modes) */}
                  {!hasError && analysisResults && analysisResults.status !== 'INITIALIZING STREAM...' && (
                    <motion.div 
                      key="results" 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="space-y-6 sm:space-y-8 p-1 sm:p-0"
                    >
                      {/* Results Header */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-wider flex items-center gap-3">
                          <Activity className="text-primary" />
                          {analysisMode === 'live' ? 'Real-Time Telemetry' : 'Detection Results'}
                        </h2>
                        
                        {analysisMode === 'live' && isRecording ? (
                          <Button 
                            onClick={stopScreenShare} 
                            variant="destructive" 
                            className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider animate-pulse-red"
                          >
                            <StopCircle className="w-4 h-4 mr-2" /> Terminate Interception
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={resetState} className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider border-border/50">
                            Analyze New Sample
                          </Button>
                        )}
                      </div>

                      {/* Top Section: High-Level Result Card */}
                      <ResultCard 
                        statusText={analysisResults.status}
                        colorCode={analysisResults.color_code}
                        syntheticProb={analysisResults.synthetic_probability}
                        authenticProb={analysisResults.authentic_probability}
                        isComplete={analysisMode === 'static' ? true : analysisResults.isComplete}
                        mode={analysisMode}
                      />

                      {/* Visualizer Section (Static Only) */}
                      {analysisMode === 'static' && (
                        <div className="bg-card/50 border border-border/50 rounded-xl p-4 sm:p-6">
                          <h3 className="text-xs sm:text-sm font-mono uppercase text-muted-foreground mb-4 tracking-wider">Acoustic Fingerprint</h3>
                          <div id="waveform" ref={waveformRef} style={{ height: '100px', width: '100%', position: 'relative', overflow: 'hidden' }}></div>
                          <div id="spectrogram" ref={spectrogramRef} style={{ height: '100px', width: '100%', marginTop: '16px', position: 'relative', overflow: 'hidden' }}></div>
                        </div>
                      )}

                      {/* Grid Analytics Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        {/* Left Column - Probability Chart */}
                        <div className="bg-card/50 border border-border/50 rounded-xl p-4 sm:p-6 flex flex-col min-h-[300px] h-full">
                          <h3 className="text-xs sm:text-sm font-mono uppercase text-muted-foreground mb-6 tracking-wider">Probability Distribution</h3>
                          <div className="relative flex-1 w-full">
                            <canvas ref={chartCanvasRef}></canvas>
                          </div>
                        </div>

                        {/* Right Column - Stacked Cards */}
                        <div className="space-y-6 sm:space-y-8 flex flex-col justify-start">
                          
                          {/* Total Latency - Live in UI, but not stored in DB */}
                          <div className="bg-card/50 border border-border/50 rounded-xl p-4 sm:p-6 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span className="text-xs sm:text-sm font-mono uppercase tracking-wider">Total Latency</span>
                            </div>
                            <span className="font-mono font-bold text-base sm:text-lg">{analysisResults.latency_ms} ms</span>
                          </div>

                          {/* Language Detected (Static Mode Only) */}
                          {analysisMode === 'static' && analysisResults.language && (
                            <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-border/50 bg-card/50 w-full">
                              <Globe className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                Language Detected:
                              </span>
                              <span className="text-sm font-semibold text-foreground">
                                {Array.isArray(analysisResults.language) 
                                  ? analysisResults.language.join(', ') 
                                  : analysisResults.language}
                              </span>
                            </div>
                          )}

                          {/* Classified Action Report (Both Modes Conditionally Rendered) */}
                          {analysisResults.action_report && analysisResults.action_report.length > 0 && (
                            <div className="bg-card/50 border border-border/50 rounded-xl p-5 space-y-3">
                              <h4 className="text-sm font-mono uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: analysisResults.color_code || '#ff8c00' }}>
                                <ShieldAlert className="w-5 h-5" /> Classified Action Report
                              </h4>
                              <ul className="space-y-3 text-sm text-muted-foreground">
                                {analysisResults.action_report.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <span className="mt-0.5" style={{ color: analysisResults.color_code || '#ff8c00' }}>•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        </div>
                      </div>

                    </motion.div>
                  )}
                  
                </AnimatePresence>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
};

export default ThreatAnalysisEnginePage;
