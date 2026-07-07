
import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Activity, Cpu, GitBranch, Server, ShieldAlert, CheckCircle2, Layers, Zap, Database, SplitSquareHorizontal, FileAudio, LineChart, Globe, Radio } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const TechnicalArchitecturePage = () => {
  const stats = [
    { label: 'Validated Accuracy', value: '99.84%', icon: CheckCircle2 },
    { label: 'Dual-Branch Vector', value: '848-dim', icon: Layers },
    { label: 'Training Clips', value: '97,830', icon: Database },
    { label: 'Real vs Synthetic', value: '45k / 52.8k', icon: SplitSquareHorizontal },
    { label: 'Boosting Rounds', value: '600', icon: Zap },
    { label: 'Window & Stride', value: '4s / 2s', icon: Activity },
  ];

  return (
    <>
      <Helmet>
        <title>Technical Architecture - Audio Forensics</title>
        <meta name="description" content="Comprehensive technical overview of the V8.1 Dual-Branch Security Engine: LFCC and WavLM feature extraction, LightGBM classification, and real-time serving." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Header Section */}
          <section className="py-20 border-b border-border/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6 }} 
                className="max-w-4xl"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 uppercase tracking-widest">
                  <Activity className="w-4 h-4" />
                  Technical Architecture
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground" style={{ letterSpacing: '-0.02em' }}>
                  Inside the V8.1 Dual-Branch Security Engine
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                  A comprehensive look at our real-time voice forensics pipeline, detailing our dual-branch acoustic feature extraction, gradient-boosted classification, and production serving infrastructure.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Stats Strip */}
          <section className="border-b border-border/40 bg-card/30 backdrop-blur-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-border/40">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="p-6 flex flex-col items-center justify-center text-center gap-2"
                    >
                      <Icon className="w-5 h-5 text-primary/70 mb-1" />
                      <span className="text-2xl font-bold font-mono text-foreground">{stat.value}</span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* System Architecture Pipeline Details Section */}
          <section className="py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
              <div className="space-y-16">
                
                {/* Phase 1 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.6 }} 
                  className="arch-phase border-l-4 border-l-blue-500"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <Database className="w-6 h-6 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold">Phase 1: Training Data Composition</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-8 max-w-4xl">
                    The foundation of our detection engine relies on a diverse corpus of organic human voices and state-of-the-art synthetic generations to create a robust training environment.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="arch-box border-blue-500/20 hover:border-blue-500/50 p-6 rounded-2xl bg-card transition-colors">
                      <h4 className="font-semibold text-sm text-blue-400 mb-2">Authentic Audio Base</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• 45,000 diverse authentic clips</li>
                        <li>• Sourced via Mozilla Common Voice</li>
                        <li>• Purified to remove background artifact bias</li>
                      </ul>
                    </div>
                    <div className="arch-box border-blue-500/20 hover:border-blue-500/50 p-6 rounded-2xl bg-card transition-colors">
                      <h4 className="font-semibold text-sm text-blue-400 mb-2">Synthetic Generations</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• 45,000 primary batch (Coqui / Meta / Azure)</li>
                        <li>• 7,700 ElevenLabs v3 batch</li>
                        <li>• 130 booster pack clips across 2 TTS engines</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg max-w-fit">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-blue-400 font-semibold">Final composition</span> — 97,830 total clips (45,000 authentic / 52,830 synthetic)
                    </p>
                  </div>
                </motion.div>

                {/* Phase 2: Updated Dual-Branch Feature Extraction */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.6 }} 
                  className="arch-phase border-l-4 border-l-cyan-500"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                      <GitBranch className="w-6 h-6 text-cyan-500" />
                    </div>
                    <h2 className="text-2xl font-bold">Phase 2: Dual-Branch Feature Extraction & LightGBM Training</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-8 max-w-4xl">
                    Instead of a single deep-learning classifier, the system fuses two complementary feature branches into one 'super-vector' per audio clip, then trains a gradient-boosted tree classifier on top — a hybrid approach optimized for both nuance and speed.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Branch 1 */}
                    <div className="arch-box border-cyan-500/20 hover:border-cyan-500/50 p-6 rounded-2xl bg-card transition-colors">
                      <div className="flex items-center gap-2 mb-3 text-cyan-400">
                        <Globe className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Branch 1 — Paralinguistic Embeddings</h4>
                      </div>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Frozen WavLM (microsoft/wavlm-base-plus) transformer</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Extracts 768-dimensional embeddings per audio chunk</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Mean-pooled across overlapping 4-second windows (2-second stride)</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Captures linguistic and emotional nuances</li>
                      </ul>
                    </div>
                    {/* Branch 2 */}
                    <div className="arch-box border-cyan-500/20 hover:border-cyan-500/50 p-6 rounded-2xl bg-card transition-colors">
                      <div className="flex items-center gap-2 mb-3 text-cyan-400">
                        <LineChart className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Branch 2 — Micro-Spectral Artifacts</h4>
                      </div>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> 40-coefficient LFCC (Linear Frequency Cepstral Coefficients) transform</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Mean + standard deviation pooled into 80-dimensional vector</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Captures fine-grained spectral irregularities</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Reveals artifacts invisible to human hearing</li>
                      </ul>
                    </div>
                    {/* Meta-Classifier */}
                    <div className="arch-box border-cyan-500/20 hover:border-cyan-500/50 p-6 rounded-2xl bg-card transition-colors relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
                      <div className="flex items-center gap-2 mb-3 text-cyan-400">
                        <Cpu className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Meta-Classifier: LightGBM Fusion</h4>
                      </div>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> 848-dimensional fused super-vector (768 + 80)</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> LightGBM classifier: 600 estimators, max depth 8, learning rate 0.03</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Randomized telephonic/VoIP-style degradation applied to 30% of training samples</li>
                        <li className="flex items-start gap-2"><span className="text-cyan-500">•</span> Prevents shortcut learning, improves robustness</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Phase 3: Containerized Cloud Run Deployment */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.6 }} 
                  className="arch-phase border-l-4 border-l-purple-500"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                      <Server className="w-6 h-6 text-purple-500" />
                    </div>
                    <h2 className="text-2xl font-bold">Phase 3: Containerized Cloud Run Deployment</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-8 max-w-4xl">
                    The trained model is served via a Python FastAPI application, containerized with Docker on a CUDA-enabled base image, and deployed on Google Cloud Run for scalable, on-demand inference.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Box 1 */}
                    <div className="arch-box border-purple-500/20 hover:border-purple-500/50 p-5 rounded-2xl bg-card transition-colors">
                      <div className="flex items-center gap-2 mb-3 text-purple-400">
                        <Globe className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">REST & WebSocket API</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> FastAPI server</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> /analyze REST endpoint for static file uploads</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> /ws/stream WebSocket endpoint for live audio interception</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Flexible input handling</li>
                      </ul>
                    </div>
                    {/* Box 2 */}
                    <div className="arch-box border-purple-500/20 hover:border-purple-500/50 p-5 rounded-2xl bg-card transition-colors">
                      <div className="flex items-center gap-2 mb-3 text-purple-400">
                        <Activity className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Sliding Window Engine</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> 4-second analysis windows</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> 2-second stride for continuous, overlapping scanning</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Real-time audio stream processing</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Minimal latency</li>
                      </ul>
                    </div>
                    {/* Box 3 */}
                    <div className="arch-box border-purple-500/20 hover:border-purple-500/50 p-5 rounded-2xl bg-card transition-colors">
                      <div className="flex items-center gap-2 mb-3 text-purple-400">
                        <Zap className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">GPU-Accelerated Container</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Docker image built on PyTorch + CUDA 12.1 base</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Models pre-baked into container at build time</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Fast cold starts</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Optimized for inference</li>
                      </ul>
                    </div>
                    {/* Box 4 */}
                    <div className="arch-box border-purple-500/20 hover:border-purple-500/50 p-5 rounded-2xl bg-card transition-colors">
                      <div className="flex items-center gap-2 mb-3 text-purple-400">
                        <ShieldAlert className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Output Classification</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Each result mapped to graded confidence classification</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Drives downstream security actions</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Not a simple binary flag</li>
                        <li className="flex items-start gap-1.5"><span className="text-purple-500">•</span> Nuanced threat assessment</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Model Performance & Evaluation */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.6 }} 
                  className="arch-phase border-l-4 border-l-emerald-500"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold">Model Performance & Evaluation</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-10 max-w-4xl">
                    Real, measured evaluation results from the production model on a held-out test set.
                  </p>

                  {/* Headline Stat */}
                  <div className="flex flex-col items-center justify-center bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 mb-10 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                    <span className="text-5xl md:text-6xl font-bold text-foreground mb-2">99.84% Overall Accuracy</span>
                    <span className="text-lg text-emerald-400/80 font-mono tracking-wide">on 14,671 held-out test audio clips</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                    {/* Per-class Breakdown */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold border-b border-border/50 pb-2 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-500" /> Per-Class Breakdown
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-card/50 border border-border/50 rounded-xl p-5">
                          <h4 className="text-sm font-semibold text-emerald-400 mb-4">Authentic Human (Class 0)</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex justify-between"><span className="text-muted-foreground">Test samples:</span> <span className="font-mono font-medium">6,750</span></li>
                            <li className="flex justify-between"><span className="text-muted-foreground">Precision:</span> <span className="font-mono font-medium">1.00</span></li>
                            <li className="flex justify-between"><span className="text-muted-foreground">Recall:</span> <span className="font-mono font-medium">1.00</span></li>
                            <li className="flex justify-between"><span className="text-muted-foreground">F1-Score:</span> <span className="font-mono font-medium text-emerald-400">1.00</span></li>
                          </ul>
                        </div>
                        <div className="bg-card/50 border border-border/50 rounded-xl p-5">
                          <h4 className="text-sm font-semibold text-red-400 mb-4">Synthetic AI (Class 1)</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex justify-between"><span className="text-muted-foreground">Test samples:</span> <span className="font-mono font-medium">7,921</span></li>
                            <li className="flex justify-between"><span className="text-muted-foreground">Precision:</span> <span className="font-mono font-medium">1.00</span></li>
                            <li className="flex justify-between"><span className="text-muted-foreground">Recall:</span> <span className="font-mono font-medium">1.00</span></li>
                            <li className="flex justify-between"><span className="text-muted-foreground">F1-Score:</span> <span className="font-mono font-medium text-red-400">1.00</span></li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Confusion Matrix Callout */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold border-b border-border/50 pb-2 flex items-center gap-2">
                        <SplitSquareHorizontal className="w-4 h-4 text-emerald-500" /> Confusion Matrix Results
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-card/50 border border-border/50 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                          <h4 className="text-sm font-semibold text-foreground mb-4">Authentic Human</h4>
                          <ul className="space-y-3 text-sm">
                            <li>
                              <span className="block text-muted-foreground text-xs uppercase mb-1">Correctly Identified</span>
                              <span className="font-medium text-base">6,741 of 6,750 <span className="text-emerald-500 ml-1">(99.87%)</span></span>
                            </li>
                            <li>
                              <span className="block text-muted-foreground text-xs uppercase mb-1">Misclassified</span>
                              <span className="font-medium text-muted-foreground">9</span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-card/50 border border-border/50 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/50" />
                          <h4 className="text-sm font-semibold text-foreground mb-4">Synthetic AI</h4>
                          <ul className="space-y-3 text-sm">
                            <li>
                              <span className="block text-muted-foreground text-xs uppercase mb-1">Correctly Identified</span>
                              <span className="font-medium text-base">7,907 of 7,921 <span className="text-red-400 ml-1">(99.82%)</span></span>
                            </li>
                            <li>
                              <span className="block text-muted-foreground text-xs uppercase mb-1">Misclassified</span>
                              <span className="font-medium text-muted-foreground">14</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Reference & Confidence Note */}
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-5">
                      <div className="lg:col-span-2 p-8 flex flex-col justify-center bg-emerald-500/5 border-r border-border/50">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 mb-6">
                          <Radio className="w-6 h-6" />
                        </div>
                        <h4 className="text-xl font-bold mb-4">Confidence Separation</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          A probability-distribution analysis shows the model's confidence scores cluster tightly near 0 (authentic) or 1 (synthetic), with almost no overlap around the decision boundary — indicating strong, reliable separation between real and fake audio rather than borderline guessing.
                        </p>
                      </div>
                      <div className="lg:col-span-3 p-6 bg-background/50 flex items-center justify-center">
                        <img 
                          src="https://github.com/venkatasriramt-spec/AI-Voice-Forensics/blob/main/Backend/V_8_1_Production/v8_1_evaluation_plots.png?raw=true" 
                          alt="Confusion Matrix and KDE Plot" 
                          className="w-full max-h-[400px] object-contain rounded-xl shadow-lg border border-border/30"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
    </>
  );
};

export default TechnicalArchitecturePage;
