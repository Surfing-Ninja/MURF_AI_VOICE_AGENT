import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Zap, Shield, ArrowRight, Activity, Home, User, Briefcase, Users } from 'lucide-react';
import { DottedSurface } from '../components/DottedSurface';
import HolographicCard from '../components/HolographicCard';
import CustomCursor from '../components/CustomCursor';
import { TubelightNavbar } from '../components/TubelightNavbar';
import { BlurFade } from '../components/BlurFade';
import HyperspaceLoader from '../components/ui/HyperspaceLoader';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    const navItems = [
        { name: 'Home', url: '#', icon: Home },
        { name: 'Features', url: '#features', icon: Briefcase },
        { name: 'Demo', url: '#demo', icon: User },
        { name: "About Dev's", url: '/about', icon: Users }
    ];

    // Show loading screen first
    if (isLoading) {
        return (
            <HyperspaceLoader 
                onLoadComplete={() => setIsLoading(false)} 
                minDuration={3500}
            />
        );
    }

    return (
        <div className="relative min-h-screen text-white overflow-hidden selection:bg-copper-400/30 selection:text-copper-100 font-sans">
            <CustomCursor />
            <DottedSurface />
            <TubelightNavbar items={navItems} />

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
                <div className="max-w-5xl mx-auto text-center z-50 relative">
                    <BlurFade delay={0.2} inView>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-copper-400/10 border border-copper-400/20 text-copper-300 text-xs font-mono mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-copper-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-copper-500"></span>
                            </span>
                            NEXT GEN VOICE AI
                        </div>
                    </BlurFade>

                    <BlurFade delay={0.3} inView>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold leading-tight mb-6 tracking-tight">
                            The Voice of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-copper-300 via-copper-500 to-copper-300 animate-gradient-x">Future Support</span>
                        </h1>
                    </BlurFade>

                    <BlurFade delay={0.4} inView>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                            Experience the warmth of human connection with the precision of AI.
                            Real-time voice interaction, instant database integration, and
                            <span className="text-cyan-400 font-medium"> zero latency</span>.
                        </p>
                    </BlurFade>

                    <BlurFade delay={0.5} inView>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => {
                                    console.log('Navigating to App...');
                                    navigate('/app');
                                }}
                                className="group relative px-8 py-4 rounded-full bg-copper-500 text-white font-medium text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(212,165,116,0.5)] cursor-pointer z-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shine" />
                                <span className="relative flex items-center gap-2">
                                    Try Live Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-medium text-lg hover:bg-white/10 transition-all backdrop-blur-sm cursor-pointer z-50"
                            >
                                View Documentation
                            </button>
                        </div>
                    </BlurFade>
                </div>

                {/* Scroll Indicator */}
                <BlurFade delay={1.0} inView className="absolute bottom-10 left-1/2 -translate-x-1/2">
                    <div className="flex flex-col items-center gap-2 text-slate-500 text-xs font-mono">
                        SCROLL TO EXPLORE
                        <div className="w-[1px] h-12 bg-gradient-to-b from-copper-500/50 to-transparent" />
                    </div>
                </BlurFade>
            </section>

            {/* Features Section - Bento Grid */}
            <section id="features" className="py-32 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <BlurFade inView>
                        <div className="text-center mb-20">
                            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">Beyond Traditional AI</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto font-light">Powered by Gemini 2.0 Flash, क्रेता-बन्धु understands context, emotion, and intent better than ever before.</p>
                        </div>
                    </BlurFade>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
                        {/* Large Card */}
                        <div className="md:col-span-2 md:row-span-2">
                            <BlurFade delay={0.1} inView className="h-full">
                                <HolographicCard
                                    title="Natural Voice Processing"
                                    icon={<Mic className="w-6 h-6" />}
                                    className="h-full min-h-[300px]"
                                >
                                    <p className="text-lg text-slate-300 mb-4">
                                        Ultra-low latency voice processing that feels like a real conversation.
                                        No awkward pauses, just fluid interaction with emotional intelligence.
                                    </p>
                                    <div className="w-full h-32 bg-gradient-to-r from-copper-500/10 to-transparent rounded-lg border border-copper-500/20 flex items-center justify-center">
                                        <Activity className="w-12 h-12 text-copper-400 animate-pulse-slow" />
                                    </div>
                                </HolographicCard>
                            </BlurFade>
                        </div>

                        {/* Small Card 1 */}
                        <div className="md:col-span-1 md:row-span-1">
                            <BlurFade delay={0.2} inView className="h-full">
                                <HolographicCard
                                    title="Real-time Actions"
                                    icon={<Zap className="w-6 h-6" />}
                                    className="h-full"
                                >
                                    Connected directly to your database. Check stock, place orders, and manage accounts instantly.
                                </HolographicCard>
                            </BlurFade>
                        </div>

                        {/* Small Card 2 */}
                        <div className="md:col-span-1 md:row-span-1">
                            <BlurFade delay={0.3} inView className="h-full">
                                <HolographicCard
                                    title="Enterprise Secure"
                                    icon={<Shield className="w-6 h-6" />}
                                    className="h-full"
                                >
                                    Bank-grade encryption and privacy controls. Your customer data never leaves your secure environment.
                                </HolographicCard>
                            </BlurFade>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section id="demo" className="py-32 px-6 relative z-10">
                <div className="max-w-5xl mx-auto">
                    <BlurFade inView>
                        <HolographicCard className="text-center py-20 px-6 md:px-20">
                            <h2 className="text-4xl md:text-6xl font-heading font-bold mb-8">Ready to transform your support?</h2>
                            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-light">
                                Join thousands of companies using क्रेता-बन्धु to deliver exceptional customer experiences at scale.
                            </p>
                            <button
                                onClick={() => {
                                    console.log('Navigating to App from CTA...');
                                    navigate('/app');
                                }}
                                className="px-10 py-5 rounded-full bg-gradient-to-r from-copper-500 to-copper-600 text-white font-bold text-lg shadow-lg shadow-copper-500/25 hover:scale-105 transition-transform cursor-pointer relative z-50"
                            >
                                Start Free Trial
                            </button>
                        </HolographicCard>
                    </BlurFade>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5 bg-charcoal-900/50 backdrop-blur-lg">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-copper-500 flex items-center justify-center">
                            <Activity className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-heading font-bold text-slate-300">क्रेता-बन्धु</span>
                    </div>
                    <div className="text-slate-500 text-sm font-mono">
                        © 2024 क्रेता-बन्धु AI. All rights reserved.
                    </div>
                    <div className="flex gap-6 text-slate-400 text-sm font-medium">
                        <a href="#" className="hover:text-copper-400 transition-colors">Twitter</a>
                        <a href="#" className="hover:text-copper-400 transition-colors">GitHub</a>
                        <a href="#" className="hover:text-copper-400 transition-colors">Discord</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
