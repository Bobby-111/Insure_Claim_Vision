import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Zap, Award, Phone, Shield, Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from 'react';
import LandingFeatures from '../components/LandingFeatures';

// Custom hook to handle scroll animations
function useScrollReveal(options = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }) {
    const refs = useRef<HTMLElement[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                } else {
                    entry.target.classList.remove('is-visible');
                }
            });
        }, options);

        refs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [options]);

    const addToRefs = (el: HTMLElement | null) => {
        if (el && !refs.current.includes(el)) {
            refs.current.push(el);
        }
    };

    return addToRefs;
}

export default function LandingPage() {
    const revealRef = useScrollReveal();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [videoOpacity, setVideoOpacity] = useState(1);

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            setIsScrolled(y > 50);
            // Fade the video from opacity 1 → 0 over the first 500px of scroll
            setVideoOpacity(Math.max(0, 1 - y / 500));
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-gray-950 min-h-screen font-sans antialiased text-white selection:bg-blue-600/30 font-smooth scroll-smooth">
            {/* --- HERO SECTION --- */}
            <section className="relative h-screen overflow-hidden">
                {/* Dynamic Background Video */}
                <div className="absolute inset-0 bg-black" style={{ opacity: videoOpacity, transition: 'opacity 0.1s linear' }}>
                    <video
                        className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                        src="https://www.pexels.com/download/video/3052883/"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                </div>

                <nav className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-gray-950/90 backdrop-blur-md shadow-lg shadow-blue-900/10 py-4 border-b border-gray-800/50' : 'bg-transparent py-6'} animate-slide-down`} style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
                    <div className="flex justify-between items-center max-w-7xl mx-auto px-6 lg:px-12 text-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg flex items-center justify-center">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-2xl font-bold tracking-tight">InsureClaim <span className="text-blue-400">Vision</span></div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
                            <a href="#coverage" className="hover:text-blue-400 transition">Coverage</a>
                            <a href="#how-it-works" className="hover:text-blue-400 transition">How It Works</a>
                            <a href="#contact" className="hover:text-blue-400 transition">Contact</a>
                        </div>
                        <div className="hidden md:flex items-center space-x-6">
                            <Link to="/estimate" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium transition cursor-pointer">Get Started</Link>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <div className="md:hidden flex items-center">
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white hover:text-blue-400 focus:outline-none transition">
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Dropdown */}
                    {isMobileMenuOpen && (
                        <div className="md:hidden absolute top-full left-0 w-full bg-gray-950 border-b border-gray-800 shadow-xl flex flex-col py-4 px-6 gap-4 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
                            <a href="#coverage" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-blue-400 transition text-lg font-medium border-b border-gray-800 pb-2">Coverage</a>
                            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-blue-400 transition text-lg font-medium border-b border-gray-800 pb-2">How It Works</a>
                            <a href="#contact" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-blue-400 transition text-lg font-medium border-b border-gray-800 pb-2">Contact</a>
                            <Link to="/estimate" onClick={() => setIsMobileMenuOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white text-center px-5 py-3 rounded-full text-base font-medium transition cursor-pointer mt-2 w-full">Get Started</Link>
                        </div>
                    )}
                </nav>

                <div className="relative z-10 flex flex-col justify-center items-start h-full px-12 md:px-24 max-w-4xl mx-auto text-left w-full left-0 right-0">
                    <h1 className="text-6xl md:text-7xl font-extrabold text-white leading-tight mb-4 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
                        Drive Safe.<br />
                        <span className="text-blue-400">Stay Protected.</span>
                    </h1>
                    <p className="text-xl text-gray-300 font-medium mb-10 animate-fade-in-up" style={{ animationDelay: '1.0s', animationFillMode: 'both' }}>
                        Comprehensive motor insurance that's there when you need it most.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up justify-start" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
                        <Link to="/estimate" className="w-fit bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-full transition flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer text-lg hover:scale-105 duration-300">
                            Start Your Claim Now
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* --- COVERAGE SECTION --- */}
            <section id="coverage" className="py-24 bg-gray-900 border-t border-gray-800 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div ref={revealRef} className="reveal-element text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Comprehensive <span className="text-blue-500">Coverage</span></h2>
                        <p className="text-gray-400 text-lg">We offer flexible plans tailored to your needs, ensuring you and your vehicle are protected under all circumstances.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[{
                            title: "Collision Damage",
                            desc: "Full coverage for repairs or replacement of your vehicle after an accident, regardless of fault.",
                            icon: <ShieldCheck className="w-8 h-8 text-blue-500" />
                        }, {
                            title: "Theft & Fire",
                            desc: "Total protection against vehicle theft, vandalism, and fire damage with instant payouts.",
                            icon: <Zap className="w-8 h-8 text-blue-500" />
                        }, {
                            title: "Third-Party Liability",
                            desc: "Extensive coverage for damages caused to other vehicles or property in the event of an accident.",
                            icon: <Award className="w-8 h-8 text-blue-500" />
                        }].map((item, idx) => (
                            <div key={idx} ref={revealRef} className="reveal-element bg-gray-800/50 border border-gray-700 p-8 rounded-2xl hover:border-blue-500/50 transition duration-300" style={{ transitionDelay: (idx * 150) + "ms" }}>
                                <div className="bg-gray-900 w-16 h-16 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- FEATURES SECTION --- */}
            <div id="features" className="relative bg-slate-950 border-t border-slate-800/50">
                <LandingFeatures />
            </div>

            {/* --- CONTACT/FOOTER SECTION --- */}
            <footer id="contact" className="bg-gray-950 py-16 border-t border-gray-900 text-center md:text-left">
                <div ref={revealRef} className="reveal-element max-w-7xl mx-auto px-6 lg:px-12 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                            <div className="bg-blue-600 p-2.5 rounded-xl flex items-center justify-center">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-extrabold flex items-center">InsureClaim <span className="text-blue-500 ml-2">Vision</span></h2>
                        </div>
                        <p className="text-gray-400 max-w-md mx-auto md:mx-0 mb-8">
                            Redefining motor insurance with artificial intelligence, providing faster claims, accurate estimates, and total peace of mind.
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-gray-300">
                            <Phone className="w-5 h-5 text-blue-400" />
                            <span>1-800-INSURE-AI (467-8732)</span>
                        </div>
                    </div>
                    <div className="md:text-right text-gray-500 text-sm flex flex-col items-center md:items-end justify-center">
                        <div className="flex gap-6 mb-4">
                            <a href="#" className="hover:text-blue-400 transition">Privacy Policy</a>
                            <a href="#" className="hover:text-blue-400 transition">Terms of Service</a>
                        </div>
                        <p>&copy; 2026 InsureClaim Vision. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                html {
                  scroll-behavior: smooth;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out forwards;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-down {
                    animation: slideDown 0.8s ease-out forwards;
                }
                
                /* Scroll Reveal Classes */
                .reveal-element {
                    opacity: 0;
                    transform: translateY(40px);
                    transition: all 0.7s cubic-bezier(0.5, 0, 0, 1);
                }
                .reveal-from-right {
                    transform: translateX(40px);
                }
                .reveal-element.is-visible {
                    opacity: 1;
                    transform: translateY(0) translateX(0);
                }
            `}} />
        </div>
    );
}
