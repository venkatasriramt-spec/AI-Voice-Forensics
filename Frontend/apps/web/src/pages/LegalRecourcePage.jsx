import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Scale, 
  ShieldAlert, 
  PhoneCall, 
  FileText, 
  Landmark, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Lock
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import { Button } from '@/components/ui/button';

const LegalRecourcePage = () => {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Legal Recourse & Rights | Audio Forensics</title>
        <meta name="description" content="Understand your legal rights and the actionable steps to take against AI voice fraud and deepfakes under Indian Law." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
        <Header />

        <main className="flex-1">
          {/* HERO SECTION */}
          <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1697472771955-d097731571ec" 
                alt="Abstract digital legal scale representing cyber law" 
                className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background"></div>
              <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
              <motion.div 
                initial="initial"
                animate="animate"
                variants={fadeIn}
                className="max-w-4xl mx-auto text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono font-medium mb-8 uppercase tracking-widest">
                  <Scale className="w-4 h-4" />
                  Legal Guidance & Support
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground tracking-tight leading-tight" style={{ letterSpacing: '-0.02em' }}>
                  Fight Back Against <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">AI Voice Fraud</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
                  Know your rights under Indian Law. The Audio Forensics Module not only detects synthetic media but empowers you with a clear legal roadmap to take decisive action against cybercriminals.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-medium" onClick={() => document.getElementById('action-pathway').scrollIntoView({ behavior: 'smooth' })}>
                    View Actionable Steps
                  </Button>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/30 hover:bg-primary/10" onClick={() => document.getElementById('legal-framework').scrollIntoView({ behavior: 'smooth' })}>
                    Explore Legal Framework
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* LEGAL FRAMEWORK SECTION */}
          <section id="legal-framework" className="py-24 bg-background relative">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
              <div className="mb-16 max-w-3xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">The Legal Framework</h2>
                <p className="text-muted-foreground text-lg">
                  Indian law provides robust mechanisms to prosecute perpetrators of AI voice cloning and deepfake fraud. Understanding these provisions is your first line of defense.
                </p>
              </div>

              <motion.div 
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {/* BNS 2023 */}
                <motion.div variants={fadeIn} className="legal-card group">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
                    <Scale className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Bharatiya Nyaya Sanhita (BNS), 2023</h3>
                  <p className="text-muted-foreground mb-6">The primary criminal code addressing fraud, impersonation, and extortion.</p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Section 318(4) - Cheating</strong>
                        <span className="text-sm text-muted-foreground">Punishable with imprisonment up to 3 years, or fine, or both.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Section 319 - Cheating by Personation</strong>
                        <span className="text-sm text-muted-foreground">Using AI to mimic someone's voice. Imprisonment up to 5 years.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Section 336(3) - Forgery</strong>
                        <span className="text-sm text-muted-foreground">Creating false electronic records (deepfakes).</span>
                      </div>
                    </li>
                  </ul>
                </motion.div>

                {/* IT Act 2000 */}
                <motion.div variants={fadeIn} className="legal-card group">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 group-hover:border-primary/50 transition-colors">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Information Technology Act, 2000</h3>
                  <p className="text-muted-foreground mb-6">Specific legislation dealing with cybercrimes and electronic evidence.</p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Section 66C - Identity Theft</strong>
                        <span className="text-sm text-muted-foreground">Fraudulent use of electronic signature or unique identification feature (voice). Up to 3 years imprisonment.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Section 66D - Cheating by Personation</strong>
                        <span className="text-sm text-muted-foreground">Using computer resources for impersonation. Up to 3 years imprisonment and fine.</span>
                      </div>
                    </li>
                  </ul>
                </motion.div>

                {/* DPDP Act 2023 */}
                <motion.div variants={fadeIn} className="legal-card group">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:border-emerald-500/50 transition-colors">
                    <Lock className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">DPDP Act, 2023</h3>
                  <p className="text-muted-foreground mb-6">Digital Personal Data Protection Act governing the misuse of personal biometric data.</p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Unauthorized Processing</strong>
                        <span className="text-sm text-muted-foreground">Scraping or using voice data without explicit consent violates core data principal rights.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Significant Penalties</strong>
                        <span className="text-sm text-muted-foreground">Severe financial penalties for entities failing to protect personal data from breaches.</span>
                      </div>
                    </li>
                  </ul>
                </motion.div>

                {/* IT Amendment Rules 2026 */}
                <motion.div variants={fadeIn} className="legal-card group">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:border-purple-500/50 transition-colors">
                    <ShieldAlert className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">IT Amendment Rules, 2026</h3>
                  <p className="text-muted-foreground mb-6">Recent guidelines specifically targeting synthetic media and deepfakes.</p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Intermediary Liability</strong>
                        <span className="text-sm text-muted-foreground">Platforms must remove deepfake content within 24 hours of receiving a complaint.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></div>
                      <div>
                        <strong className="text-foreground block">Mandatory Watermarking</strong>
                        <span className="text-sm text-muted-foreground">AI generation tools must include detectable metadata for synthetic audio.</span>
                      </div>
                    </li>
                  </ul>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ACTIONABLE PATHWAY SECTION */}
          <section id="action-pathway" className="py-24 bg-background-lighter border-y border-border/40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">What to Do Now: Actionable Pathway</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  If you suspect you are a victim of AI voice fraud, time is critical. Follow these steps immediately to secure your assets and report the crime.
                </p>
              </div>

              <div className="space-y-8">
                {/* Step 1 */}
                <div className="relative pl-8 md:pl-0">
                  <div className="hidden md:block absolute left-[50%] top-0 bottom-0 w-px bg-border/50 -translate-x-1/2"></div>
                  
                  <div className="md:grid md:grid-cols-2 md:gap-12 items-center mb-12 relative">
                    <div className="md:text-right mb-6 md:mb-0">
                      <div className="md:hidden absolute left-0 top-2 w-4 h-4 rounded-full bg-destructive -translate-x-[21px] border-4 border-background-lighter"></div>
                      <div className="hidden md:block absolute left-[50%] top-1/2 w-4 h-4 rounded-full bg-destructive -translate-x-1/2 -translate-y-1/2 border-4 border-background-lighter z-10"></div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">1. Immediate Action</h3>
                      <p className="text-muted-foreground">Stop all communication and secure your accounts.</p>
                    </div>
                    <div className="alert-box-critical">
                      <PhoneCall className="w-8 h-8 text-destructive shrink-0" />
                      <div>
                        <h4 className="font-bold text-lg text-destructive mb-1">Call 1930 Immediately</h4>
                        <p className="text-sm text-foreground/90">
                          Dial the National Cyber Crime Reporting Portal helpline. Reporting within the "Golden Hour" significantly increases the chances of freezing fraudulent transactions.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="md:grid md:grid-cols-2 md:gap-12 items-center mb-12 relative">
                    <div className="md:col-start-2 mb-6 md:mb-0">
                      <div className="md:hidden absolute left-0 top-2 w-4 h-4 rounded-full bg-primary -translate-x-[21px] border-4 border-background-lighter"></div>
                      <div className="hidden md:block absolute left-[50%] top-1/2 w-4 h-4 rounded-full bg-primary -translate-x-1/2 -translate-y-1/2 border-4 border-background-lighter z-10"></div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">2. Official Reporting</h3>
                      <p className="text-muted-foreground">File a formal complaint with authorities.</p>
                    </div>
                    <div className="md:col-start-1 md:row-start-1 bg-card/50 border border-border/50 p-6 rounded-xl">
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>Register the incident on <strong>cybercrime.gov.in</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>Visit your nearest Cyber Cell or local police station to file an FIR.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>Provide the Audio Forensics analysis report as preliminary evidence.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="md:grid md:grid-cols-2 md:gap-12 items-center mb-12 relative">
                    <div className="md:text-right mb-6 md:mb-0">
                      <div className="md:hidden absolute left-0 top-2 w-4 h-4 rounded-full bg-warning -translate-x-[21px] border-4 border-background-lighter"></div>
                      <div className="hidden md:block absolute left-[50%] top-1/2 w-4 h-4 rounded-full bg-warning -translate-x-1/2 -translate-y-1/2 border-4 border-background-lighter z-10"></div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">3. Evidence Collection</h3>
                      <p className="text-muted-foreground">Preserve all digital footprints of the fraud.</p>
                    </div>
                    <div className="alert-box-warning">
                      <AlertTriangle className="w-6 h-6 text-warning shrink-0" />
                      <div>
                        <h4 className="font-bold text-warning mb-2">Do Not Delete Anything</h4>
                        <ul className="space-y-2 text-sm text-foreground/90">
                          <li>• Save all call logs and exact timestamps.</li>
                          <li>• Export and backup the fraudulent audio recordings.</li>
                          <li>• Screenshot any associated text messages or WhatsApp chats.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="md:grid md:grid-cols-2 md:gap-12 items-center relative">
                    <div className="md:col-start-2 mb-6 md:mb-0">
                      <div className="md:hidden absolute left-0 top-2 w-4 h-4 rounded-full bg-emerald-500 -translate-x-[21px] border-4 border-background-lighter"></div>
                      <div className="hidden md:block absolute left-[50%] top-1/2 w-4 h-4 rounded-full bg-emerald-500 -translate-x-1/2 -translate-y-1/2 border-4 border-background-lighter z-10"></div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">4. Bank Notification</h3>
                      <p className="text-muted-foreground">Secure your financial assets immediately.</p>
                    </div>
                    <div className="md:col-start-1 md:row-start-1 bg-card/50 border border-border/50 p-6 rounded-xl flex items-start gap-4">
                      <Landmark className="w-8 h-8 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">
                          If financial details were shared or money was transferred, contact your bank's fraud department immediately to freeze accounts and block cards.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Provide them with the cybercrime complaint number (acknowledgement number) to expedite the process.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* COMPLIANCE & DATA PROTECTION SECTION */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1614064548237-096f735f344f" 
                alt="Secure digital data protection" 
                className="w-full h-full object-cover opacity-10 mix-blend-screen"
              />
              <div className="absolute inset-0 bg-background/95"></div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-6xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">How Audio Forensics Protects You</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Our platform is built on a foundation of strict legal compliance and user privacy, ensuring your data remains secure while providing actionable intelligence.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: "Real-Time Detection",
                    desc: "Identify synthetic audio instantly, preventing fraud before financial or reputational damage occurs."
                  },
                  {
                    title: "DPDP Act Compliant",
                    desc: "Strict adherence to the Digital Personal Data Protection Act. We process data lawfully and transparently."
                  },
                  {
                    title: "Privacy-First Architecture",
                    desc: "Audio samples are analyzed in volatile memory and never permanently stored without explicit consent."
                  },
                  {
                    title: "Evidentiary Reporting",
                    desc: "Generate detailed, timestamped analysis reports that can be submitted as preliminary evidence to authorities."
                  },
                  {
                    title: "Complete User Control",
                    desc: "You retain full ownership of your uploaded data. Delete your analysis history at any time."
                  }
                ].map((point, idx) => (
                  <div key={idx} className="bg-card/40 border border-border/30 p-6 rounded-xl backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{point.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA SECTION */}
          <section className="py-20 bg-primary/5 border-t border-primary/10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
              <h2 className="text-3xl font-bold mb-6">Don't Wait Until It's Too Late</h2>
              <p className="text-lg text-muted-foreground mb-10">
                Equip yourself with the tools to detect AI voice fraud instantly. Protect your personal and professional communications with our advanced Threat Analysis Engine.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/predict" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,217,255,0.2)]">
                    Protect Your Calls Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/how-it-works" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full border-border hover:bg-muted">
                    Learn About Detection
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default LegalRecourcePage;