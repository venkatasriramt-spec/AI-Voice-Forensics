import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Database, Globe, Activity, Layers, Users, Cloud, Sparkles, Mic, Zap, Volume2 } from 'lucide-react';
import Header from '@/components/Header.jsx';

const MultilingualDatasetIntelligencePage = () => {
  const languages = [
    { 
      slug: 'english', 
      name: 'English', 
      iso: 'eng', 
      tts: 'x-TTS', 
      description: "The most widely spoken language in our dataset, English serves as the baseline for synthetic voice detection. With diverse accents and regional variations, English models establish the foundational acoustic patterns for threat identification."
    },
    { 
      slug: 'french', 
      name: 'French', 
      iso: 'fra', 
      tts: 'x-TTS', 
      description: "French language coverage includes metropolitan and African variants, providing comprehensive phonetic diversity. The x-TTS model captures the nuanced prosody essential for distinguishing authentic French speech from synthetic generation."
    },
    { 
      slug: 'german', 
      name: 'German', 
      iso: 'deu', 
      tts: 'x-TTS', 
      description: "German's complex phonetic structure and compound word formations require specialized acoustic analysis. Our models leverage x-TTS synthesis to identify the subtle frequency characteristics unique to authentic German speech patterns."
    },
    { 
      slug: 'spanish', 
      name: 'Spanish', 
      iso: 'spa', 
      tts: 'x-TTS', 
      description: "Spanish encompasses Iberian and Latin American dialects, each with distinct acoustic signatures. The x-TTS model enables precise detection across regional variations, critical for comprehensive threat mitigation."
    },
    { 
      slug: 'catalan', 
      name: 'Catalan', 
      iso: 'cat', 
      tts: 'MMS', 
      description: "Catalan represents linguistic diversity in underrepresented languages. The MMS model provides robust synthetic generation for this language, enabling accurate detection across Catalonia and surrounding regions."
    },
    { 
      slug: 'bengali', 
      name: 'Bengali', 
      iso: 'ben', 
      tts: 'MMS', 
      description: "Bengali's tonal characteristics and unique phonetic inventory require specialized detection algorithms. MMS synthesis captures the acoustic complexity necessary for reliable authentication in South Asian voice communications."
    },
    { 
      slug: 'kinyarwanda', 
      name: 'Kinyarwanda', 
      iso: 'kin', 
      tts: 'MMS', 
      description: "Kinyarwanda inclusion demonstrates our commitment to African language representation. MMS-generated synthetic samples enable threat detection in underserved linguistic communities, advancing equitable AI security."
    },
    { 
      slug: 'pashto', 
      name: 'Pashto', 
      iso: 'pus/pbt/pbu', 
      tts: 'Microsoft Edge-TTS Engine (Azure Neural Fallback)', 
      description: "Pashto's complex consonant clusters and tonal variations present unique detection challenges. Microsoft Edge-TTS Engine provides the acoustic fidelity needed to distinguish authentic Pashto speech from synthetic imitation."
    },
    { 
      slug: 'chinese', 
      name: 'Chinese', 
      iso: 'zho/cmn', 
      tts: 'Microsoft Edge-TTS Engine (Azure Neural Fallback)', 
      description: "Mandarin Chinese's tonal system and phonetic complexity require advanced synthetic generation. Microsoft Edge-TTS Engine captures the prosodic nuances essential for detecting voice spoofing in the world's most spoken language."
    }
  ];

  const getTtsColorClass = (model) => {
    if (model.includes('x-TTS')) return 'text-primary-cyan';
    if (model.includes('MMS')) return 'text-success-emerald';
    if (model.includes('Microsoft Edge-TTS')) return 'text-danger-red';
    return 'text-slate-300';
  };

  const elevenLabsSteps = [
    { title: "Voice Pool Sourcing", desc: "Premade, natural-sounding voices were dynamically fetched from the ElevenLabs voice library to maximize speaker diversity across generated clips." },
    { title: "Source Transcription", desc: "For English, German, French, Spanish, Chinese, and Catalan, source audio was transcribed using AssemblyAI's Universal-3-Pro / Universal-2 speech models. Bengali was transcribed separately using OpenAI's Whisper (\"small\") model." },
    { title: "Synthetic Voice Generation", desc: "Each transcribed sentence was synthesized using ElevenLabs' eleven_v3 model, paired with a randomly selected premade voice to produce a natural-sounding synthetic counterpart to each real clip." },
    { title: "Smart Top-Up & Resume Logic", desc: "The pipeline tracks existing output per language, automatically generating only the missing clips needed to reach the 1,100-per-language target, and skips already-completed files to avoid duplicate work." },
    { title: "Rate-Limit Resilience", desc: "Built-in exponential backoff and retry logic (up to 3 attempts with increasing wait times) handles API rate limits gracefully, with a polite delay between requests." }
  ];

  const boosterSteps = [
    { title: "Vendor Routing", desc: "For each language, the first 10 sentences were synthesized using Google Cloud Text-to-Speech (Neural2 / WaveNet voices, selected per language), and the next 10 sentences were synthesized using OpenAI's TTS-1-HD model with the \"Nova\" voice. Bengali was excluded from the OpenAI branch due to lack of language support, routing fully through Google Cloud instead." },
    { title: "Environmental Noise Augmentation", desc: "To prevent the detection model from learning \"clean audio = synthetic\" as a shortcut, every generated clip had a randomized, low-level white noise threshold injected before being saved — simulating real-world recording conditions." },
    { title: "Output Totals", desc: "70 Google Cloud TTS clips + 60 OpenAI TTS clips = 130 total booster-pack clips across 2 TTS engines, used to validate detection robustness against previously unseen synthesis engines." }
  ];

  return (
    <>
      <Helmet>
        <title>Multilingual Dataset Intelligence | Audio Forensics</title>
        <meta name="description" content="Explore our 9-language dataset intelligence, real vs. synthetic audio characteristics, and our classification framework." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-[hsl(var(--background))] text-slate-200 selection:bg-primary-cyan/30">
        <Header />

        <main className="flex-1">
          {/* ========================================== */}
          {/* SECTION 1: MOZILLA DATA COLLECTIVE OVERVIEW */}
          {/* ========================================== */}
          <section className="py-24 relative overflow-hidden border-b border-cyan-light/30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-cyan/10 via-transparent to-transparent pointer-events-none" />
            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Intro Content */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6 }} 
                className="max-w-4xl mb-16"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-cyan/10 border border-cyan-light text-primary-cyan text-sm font-mono font-medium mb-6 uppercase tracking-widest">
                  <Database className="w-4 h-4" />
                  Dataset Architecture
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white" style={{ letterSpacing: '-0.02em' }}>
                  Multilingual Dataset Intelligence
                </h1>
                <h2 className="text-2xl md:text-3xl text-primary-cyan font-medium mb-6">
                  Built on Mozilla's Open Voice Data Initiative
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mb-8">
                  We proudly honor the Mozilla Data Collective, a pioneering open-source initiative dedicated to democratizing voice AI training data. By championing linguistic diversity and elevating historically underrepresented languages such as Kinyarwanda, Pashto, and Bengali, Mozilla's collaborative crowdsourcing approach enables developers globally to build fairer, more inclusive models. Our threat detection baseline was trained utilizing their publicly available dataset, underscoring how transparent, community-driven data is paramount in advancing responsible AI and combating bias.
                </p>
                <div className="flex flex-wrap gap-6 font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-success-emerald" />
                    <span>10.4M+ Voice Samples</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-cyan" />
                    <span>90+ Global Languages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-danger-red" />
                    <span>500,000+ Contributors</span>
                  </div>
                </div>
              </motion.div>

              {/* Mozilla Data Collective Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-5xl mx-auto mb-24"
                aria-label="Mozilla Data Collective Attribution"
              >
                <div className="bg-primary-cyan/10 border border-primary-cyan rounded-3xl p-8 md:p-12 relative overflow-hidden group transition-all duration-300 hover:bg-primary-cyan/15">
                  <div className="absolute -top-12 -right-12 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none">
                    <Database className="w-64 h-64 text-primary-cyan" />
                  </div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary-cyan/20 rounded-lg">
                          <Database className="w-6 h-6 text-primary-cyan" />
                        </div>
                        <h4 className="text-3xl font-bold text-white">Mozilla Data Collective</h4>
                      </div>
                      <div className="flex items-baseline gap-4 mb-4">
                        <span className="text-5xl md:text-6xl font-bold text-primary-cyan tracking-tight">99.86%</span>
                        <span className="text-base font-mono text-primary-cyan/80 uppercase tracking-wider">90,000 audio clips</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed max-w-2xl text-lg mb-10">
                        Primary foundation of our dataset. Open-source voice data initiative supporting linguistic diversity and underrepresented languages.
                      </p>
                    </div>

                    {/* Audio Clips Breakdown */}
                    <div className="pt-8 border-t border-primary-cyan/30">
                      <h5 className="text-sm font-mono text-primary-cyan/80 uppercase tracking-widest mb-6">Audio Clips Breakdown</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Real Audio Clips */}
                        <div 
                          className="bg-primary-cyan/20 rounded-2xl p-6 border border-primary-cyan/40"
                          aria-label="Real Audio Clips: 45,000 clips representing 50 percent"
                        >
                          <div className="flex items-center gap-2 mb-4">
                            <Mic className="w-6 h-6 text-primary-cyan" />
                            <span className="text-sm font-bold text-primary-cyan uppercase tracking-wider">Real Audio Clips</span>
                          </div>
                          <div className="mb-4">
                            <div className="text-4xl font-bold text-white">45,000</div>
                            <div className="text-sm text-primary-cyan/80 font-mono mt-1">50%</div>
                          </div>
                          <p className="text-sm text-primary-cyan/70 leading-relaxed">
                            Extracted from Mozilla Data Collective
                          </p>
                        </div>

                        {/* Synthetic Audio Clips */}
                        <div 
                          className="bg-primary-cyan/15 rounded-2xl p-6 border border-primary-cyan/30"
                          aria-label="Synthetic Audio Clips: 45,000 clips representing 50 percent"
                        >
                          <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-6 h-6 text-primary-cyan" />
                            <span className="text-sm font-bold text-primary-cyan uppercase tracking-wider">Synthetic Audio Clips</span>
                          </div>
                          <div className="mb-4">
                            <div className="text-4xl font-bold text-white">45,000</div>
                            <div className="text-sm text-primary-cyan/80 font-mono mt-1">50%</div>
                          </div>
                          <p className="text-sm text-primary-cyan/70 leading-relaxed mb-3">
                            Generated from real clips using:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-sm text-primary-cyan/60 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-primary-cyan/60 rounded-full" /> MMS
                            </div>
                            <div className="text-sm text-primary-cyan/60 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-primary-cyan/60 rounded-full" /> x-TTS
                            </div>
                            <div className="text-sm text-primary-cyan/60 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-primary-cyan/60 rounded-full" /> Edge TTS
                            </div>
                            <div className="text-sm text-primary-cyan/60 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-primary-cyan/60 rounded-full" /> ElevenLabs v3
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Multilingual Threat Detection Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                className="mb-16"
              >
                <h2 className="text-3xl font-bold text-white mb-4">Multilingual Threat Detection & Protection</h2>
                <p className="text-slate-400 max-w-4xl leading-relaxed">
                  Our multilingual threat detection framework provides comprehensive voice authentication across all nine languages through advanced acoustic analysis. By training on diverse linguistic datasets and synthetic audio samples, our models identify key indicators of voice spoofing including unnatural frequency transitions, robotic breathing patterns, artificial emotional expression, and spectral anomalies. The detection system operates in real-time, analyzing acoustic fingerprints and phase coherence to distinguish authentic human voices from AI-generated audio with high precision. This unified approach ensures consistent threat identification across English, French, German, Spanish, Catalan, Bengali, Kinyarwanda, Pashto, and Chinese, protecting users regardless of their language while maintaining enterprise-grade security standards.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {languages.map((lang, idx) => (
                  <motion.div 
                    key={lang.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[hsl(var(--card))] border border-cyan-light rounded-xl p-6 transition-all duration-300 hover:border-cyan-medium group flex flex-col h-full"
                  >
                    <div className="flex items-center gap-3 mb-6 border-b border-cyan-light/50 pb-4">
                      <Globe className="w-6 h-6 text-primary-cyan/70 group-hover:text-primary-cyan transition-colors" />
                      <h3 className="text-xl font-bold text-white">{lang.name}</h3>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">ISO 639-3 Code</div>
                          <div className="font-mono text-primary-cyan font-medium">{lang.iso}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">TTS Model</div>
                          <div className={`font-mono text-sm font-medium truncate ${getTtsColorClass(lang.tts)}`} title={lang.tts}>
                            {lang.tts}
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Mozilla Dataset Access</div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          Navigate to the Official Website of Mozilla Data Collective and search "Common Voice Scripted Speech 26.0 - {lang.name}"
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-cyan-light/30">
                        <p className="text-sm text-slate-400 leading-relaxed max-w-4xl">
                          {lang.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

            </div>
          </section>

          {/* ========================================== */}
          {/* SECTION 2: ELEVENLABS V3 GENERATION          */}
          {/* ========================================== */}
          <section className="py-24 border-b border-cyan-light/30 bg-background relative">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                className="max-w-4xl mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">ElevenLabs v3 Synthetic Audio Generation</h2>
                <p className="text-slate-400 leading-relaxed text-lg mb-6">
                  A dedicated synthetic voice pipeline was used to generate 7,700 synthetic audio clips across 7 of the 9 dataset languages (English, German, French, Spanish, Chinese, Catalan, and Bengali), targeting 1,100 clips per language. For this dataset augmentation stage, the <span className="font-mono text-primary-cyan text-sm">eleven_v3</span> model was utilized. Kinyarwanda and Pashto were excluded from this specific stage.
                </p>

                <div className="bg-primary-cyan/10 border border-primary-cyan/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-4">
                  <div className="p-3 bg-primary-cyan/20 rounded-xl shrink-0">
                    <Users className="w-6 h-6 text-primary-cyan" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Comprehensive Vocal Diversity</h4>
                    <p className="text-slate-300 leading-relaxed">
                      A diverse pool of <strong className="text-white">21 naturally-sounding speaker voices</strong> from the ElevenLabs v3 model was leveraged to synthesize the synthetic audio clips, ensuring comprehensive vocal diversity across the generated dataset.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Numbered Steps */}
              <div className="space-y-6 max-w-5xl mb-20">
                {elevenLabsSteps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-card/50 border border-cyan-light/20 rounded-2xl p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start hover:border-cyan-medium/50 transition-colors"
                  >
                    <div className="text-6xl md:text-7xl font-bold text-primary-cyan/20 leading-none shrink-0 font-mono select-none">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="pt-2">
                      <h4 className="text-xl font-bold text-white mb-3">{step.title}</h4>
                      <p className="text-slate-400 leading-relaxed text-base">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

            </div>
          </section>

          {/* ========================================== */}
          {/* SECTION 3: OPENAI & GOOGLE CLOUD GENERATION  */}
          {/* ========================================== */}
          <section className="py-24 bg-background relative">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                className="max-w-4xl mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">OpenAI & Google Cloud TTS Audio Generation</h2>
                <p className="text-slate-400 leading-relaxed text-lg mb-6">
                  A focused 130-clip "synthetic booster pack" was generated specifically to stress-test the final Audio Forensics meta-classifier against unseen, state-of-the-art TTS engines beyond the main training pipeline — using 20 validated authentic sentences per language. 
                </p>
                <p className="text-slate-400 leading-relaxed text-lg">
                  This targeted expansion yielded <strong className="text-white">70 clips via Google Cloud Text-to-Speech</strong> (supporting 7 languages using Neural2 and WaveNet models) and <strong className="text-white">60 clips via OpenAI Text-to-Speech</strong> (supporting 6 languages using the <span className="font-mono text-sm text-primary-cyan">tts-1-hd</span> model).
                </p>
              </motion.div>

              {/* Numbered Steps */}
              <div className="space-y-6 max-w-5xl mb-20">
                {boosterSteps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-card/50 border border-cyan-light/20 rounded-2xl p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start hover:border-cyan-medium/50 transition-colors"
                  >
                    <div className="text-6xl md:text-7xl font-bold text-primary-cyan/20 leading-none shrink-0 font-mono select-none">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="pt-2">
                      <h4 className="text-xl font-bold text-white mb-3">{step.title}</h4>
                      <p className="text-slate-400 leading-relaxed text-base">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Voices & Speaker Models Subsection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-5xl"
              >
                <h3 className="text-2xl font-bold text-white mb-8 border-b border-cyan-light/30 pb-4">
                  Voices & Speaker Models Used
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Google Cloud Block */}
                  <div className="bg-card/50 border border-cyan-light/20 rounded-2xl p-8 hover:border-cyan-medium/50 transition-colors flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-primary-cyan/10 rounded-lg">
                        <Zap className="w-5 h-5 text-primary-cyan" />
                      </div>
                      <h4 className="text-xl font-bold text-white">Google Cloud TTS</h4>
                    </div>
                    
                    <ul className="space-y-4 flex-1">
                      <li className="flex justify-between items-center border-b border-cyan-light/10 pb-3">
                        <span className="text-slate-300 font-medium">English</span>
                        <span className="font-mono text-xs text-primary-cyan/80 bg-primary-cyan/5 px-2.5 py-1 rounded">Journey (en-US-Journey-D)</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-cyan-light/10 pb-3">
                        <span className="text-slate-300 font-medium">French</span>
                        <span className="font-mono text-xs text-primary-cyan/80 bg-primary-cyan/5 px-2.5 py-1 rounded">Neural2 (fr-FR-Neural2-A)</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-cyan-light/10 pb-3">
                        <span className="text-slate-300 font-medium">Spanish</span>
                        <span className="font-mono text-xs text-primary-cyan/80 bg-primary-cyan/5 px-2.5 py-1 rounded">Neural2 (es-ES-Neural2-A)</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-cyan-light/10 pb-3">
                        <span className="text-slate-300 font-medium">German</span>
                        <span className="font-mono text-xs text-primary-cyan/80 bg-primary-cyan/5 px-2.5 py-1 rounded">Neural2 (de-DE-Neural2-B)</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-cyan-light/10 pb-3">
                        <span className="text-slate-300 font-medium">Chinese (Mandarin)</span>
                        <span className="font-mono text-xs text-primary-cyan/80 bg-primary-cyan/5 px-2.5 py-1 rounded">WaveNet (cmn-CN-Wavenet-A)</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-cyan-light/10 pb-3">
                        <span className="text-slate-300 font-medium">Catalan</span>
                        <span className="font-mono text-xs text-primary-cyan/80 bg-primary-cyan/5 px-2.5 py-1 rounded">Standard (ca-ES-Standard-A)</span>
                      </li>
                      <li className="flex justify-between items-center pb-1">
                        <span className="text-slate-300 font-medium">Bengali</span>
                        <span className="font-mono text-xs text-primary-cyan/80 bg-primary-cyan/5 px-2.5 py-1 rounded">WaveNet (bn-IN-Wavenet-A)</span>
                      </li>
                    </ul>
                  </div>

                  {/* OpenAI Block */}
                  <div className="bg-card/50 border border-cyan-light/20 rounded-2xl p-8 hover:border-cyan-medium/50 transition-colors flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-primary-cyan/10 rounded-lg">
                        <Cloud className="w-5 h-5 text-primary-cyan" />
                      </div>
                      <h4 className="text-xl font-bold text-white">OpenAI TTS</h4>
                    </div>
                    
                    <div className="space-y-6 flex-1 flex flex-col">
                      <div>
                        <div className="text-sm text-slate-500 uppercase tracking-wider mb-2">Primary Voice Model</div>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-2xl font-bold text-white">"Nova"</span>
                          <span className="font-mono text-xs text-primary-cyan/80 border border-primary-cyan/20 bg-primary-cyan/5 px-2 py-0.5 rounded-full">tts-1-hd</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-slate-500 uppercase tracking-wider mb-3">Languages Supported</div>
                        <div className="flex flex-wrap gap-2">
                          {['English', 'French', 'Spanish', 'German', 'Chinese', 'Catalan'].map((lang) => (
                            <span key={lang} className="px-3 py-1.5 rounded bg-[hsl(var(--background))] border border-cyan-light/20 text-slate-300 text-sm font-medium">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-auto pt-6">
                        <div className="bg-danger-red/10 border border-danger-red/20 rounded-xl p-4 flex items-start gap-3">
                          <div className="text-danger-red mt-0.5">
                            <Zap className="w-4 h-4" />
                          </div>
                          <p className="text-danger-red/90 text-sm leading-relaxed">
                            <strong>Note:</strong> Bengali was excluded from the OpenAI branch due to lack of language support and was routed entirely through Google Cloud TTS instead.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </section>

        </main>
      </div>
    </>
  );
};

export default MultilingualDatasetIntelligencePage;