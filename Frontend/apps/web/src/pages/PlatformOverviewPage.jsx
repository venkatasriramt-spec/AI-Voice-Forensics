
import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Clock, Database, Globe, Network, Mic, CheckCircle2, AlertOctagon } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';

const PlatformOverviewPage = () => {
  const features = [
    {
      icon: Zap,
      title: 'Instant Threat Detection',
      description: 'dual-branch model combining frozen WavLM transformer embeddings (paralinguistic analysis) with LFCC micro-spectral features, fused and classified by a LightGBM gradient-boosted classifier'
    },
    {
      icon: Shield,
      title: 'Acoustic Risk Assessment',
      description: 'LFCC (Linear Frequency Cepstral Coefficient) analysis combined with deep paralinguistic embeddings reveals synthetic artifacts invisible to human hearing'
    },
    {
      icon: Clock,
      title: 'Real-Time Processing',
      description: 'Cloud-based infrastructure delivers results with 99.84% accuracy across all voice types'
    }
  ];

  const realCharacteristics = [
    { title: 'Natural Frequency Variations', desc: 'Organic micro-fluctuations in pitch that occur naturally during human speech.' },
    { title: 'Organic Breathing Patterns', desc: 'Inconsistent, context-appropriate inhalations and exhalations between phrases.' },
    { title: 'Authentic Emotional Inflection', desc: 'Complex harmonic resonance changes tied to genuine emotional states.' },
    { title: 'Natural Speech Rhythm', desc: 'Non-linear pacing with organic pauses, hesitations, and emphasis.' },
    { title: 'Environmental Artifacts', desc: 'Consistent background noise profiles and authentic microphone proximity effects.' }
  ];

  const fakeCharacteristics = [
    { title: 'Unnatural Frequency Transitions', desc: 'Perfectly smooth or mathematically rigid pitch shifts between phonemes.' },
    { title: 'Robotic Breathing Patterns', desc: 'Absence of breath sounds or perfectly identical, looped breathing artifacts.' },
    { title: 'Vocoder Artifacts', desc: 'Metallic resonance or phase smearing introduced by neural vocoders (e.g., HiFi-GAN).' },
    { title: 'Mechanical Speech Rhythm', desc: 'Overly consistent pacing lacking natural human hesitation or micro-pauses.' },
    { title: 'Spectral Anomalies', desc: 'Missing high-frequency harmonics or unnatural cutoffs in the spectrogram.' }
  ];

  return (
    <>
      <Helmet>
        <title>Platform Overview - Enterprise AI Voice Fraud Detection</title>
        <meta name="description" content="Enterprise-grade AI voice detection using dual-branch acoustic analysis. Identify synthetic voice fraud with 99.84% accuracy in real-time." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative min-h-[90vh] flex items-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1680124118602-b1a4f6a6eb63" 
                alt="Audio waveform visualization with forensic analysis overlay"
                className="w-full h-full object-cover opacity-20 mix-blend-screen"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/80" />
            </div>

            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="max-w-4xl"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                  <Shield className="w-4 h-4" />
                  Real-Time Voice Forensics Platform
                </div>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6" style={{ letterSpacing: '-0.02em' }}>
                  Detect AI Voice Fraud in{' '}
                  <span className="text-gradient-cyan">Under 10 Seconds</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                  Protect financial transactions and verify identity with our language-agnostic dual-branch acoustic analysis powered by LightGBM.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/predict">
                    <Button 
                      size="lg" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan-hover transition-all duration-300 active:scale-[0.98] text-lg px-8 h-14"
                    >
                      Launch Threat Analysis Engine
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  
                  <Link to="/how-it-works">
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary transition-all duration-300 active:scale-[0.98] text-lg px-8 h-14"
                    >
                      View Technical Architecture
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Technical Foundation Section */}
          <section className="py-24 border-t border-border/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            
            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Enterprise Threat Detection
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Built on robust dual-branch feature extraction and extensive datasets to deliver unparalleled accuracy in real-time environments.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Large Bento Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="lg:col-span-8 bg-card rounded-3xl p-8 lg:p-10 border border-border/50 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Network className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-bold">V8.1 Dual-Branch Engine</h3>
                  </div>
                  
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl relative z-10">
                    Our core model utilizes WavLM embeddings and LFCC features to extract intricate spatial and temporal patterns, concatenated into an 848-dimensional super-vector and classified by a highly optimized LightGBM v8.1 GBDT.
                  </p>
                </motion.div>

                {/* Stat Box 1 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="lg:col-span-4 bg-card rounded-3xl p-8 border border-border/50 flex flex-col justify-center"
                >
                  <div className="p-3 bg-primary/10 w-fit rounded-xl mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-4xl font-bold text-foreground mb-2">99.84%</div>
                  <h3 className="text-lg font-medium mb-1">Validated Accuracy</h3>
                  <p className="text-sm text-muted-foreground">Tested on 14,671 validation samples (6,750 authentic, 7,921 synthetic).</p>
                </motion.div>

                {/* Dataset Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="lg:col-span-6 bg-card rounded-3xl p-8 border border-border/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl shrink-0">
                      <Database className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">97,830 Training Clips</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Trained on hundreds of gigabytes of diverse, organic voice samples to establish a baseline of human acoustic harmonics, preventing adversarial model bypass.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Capability Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="lg:col-span-6 bg-card rounded-3xl p-8 border border-border/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl shrink-0">
                      <Globe className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Language-Agnostic Capability</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        By focusing strictly on physical acoustic properties rather than semantic metadata, our solution detects deepfakes regardless of the spoken language, supported by Whisper-tiny detection.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* REAL VS FAKE CHARACTERISTICS */}
          <section className="py-24 border-t border-border/40 relative overflow-hidden bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                
                {/* Real Audio */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} 
                  whileInView={{ opacity: 1, x: 0 }} 
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-success-emerald/10 rounded-lg border border-success-emerald/30">
                      <Mic className="w-6 h-6 text-success-emerald" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Authentic Audio Profile</h2>
                  </div>
                  <p className="text-slate-400 mb-8">Detection methods: Mel-spectrogram analysis, temporal continuity verification, phase coherence analysis, and frequency stability metrics.</p>
                  
                  <div className="space-y-6">
                    {realCharacteristics.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <CheckCircle2 className="w-6 h-6 text-success-emerald shrink-0 mt-1" />
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-1">{item.title}</h4>
                          <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Fake Audio */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  whileInView={{ opacity: 1, x: 0 }} 
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-danger-red/10 rounded-lg border border-danger-red/30">
                      <AlertOctagon className="w-6 h-6 text-danger-red" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Synthetic Indicators</h2>
                  </div>
                  <p className="text-slate-400 mb-8">Prevention strategies: Real-time detection, confidence scoring, risk assessment framework, and automated threat flagging.</p>
                  
                  <div className="space-y-6">
                    {fakeCharacteristics.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <Zap className="w-6 h-6 text-danger-red shrink-0 mt-1" />
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-1">{item.title}</h4>
                          <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-24 bg-card/50 border-t border-border/40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Built for security teams and fraud prevention
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Protect your organization from deepfake voice attacks with advanced detection technology
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-background rounded-2xl p-8 border border-border/40 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="mb-4 p-3 bg-primary/10 rounded-xl w-fit glow-cyan">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-24 border-t border-border/40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-3xl p-12 md:p-16 text-center border border-primary/20 glow-cyan"
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to secure your audio channels?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Upload your first audio file and see the results in real-time
                </p>
                <Link to="/predict">
                  <Button 
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan-hover transition-all duration-300 active:scale-[0.98] text-lg px-8"
                  >
                    Start Threat Analysis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default PlatformOverviewPage;
