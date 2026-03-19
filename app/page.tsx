'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-600 via-blue-700 to-blue-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-40">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          <div className="absolute top-[12%] left-[18%] w-2 h-2 bg-red-400 rounded-full opacity-60 animate-float"></div>
          <div className="absolute top-[20%] right-[22%] w-2.5 h-2.5 bg-blue-300 rounded-full opacity-55 animate-float-slow animation-delay-2000"></div>
          <div className="absolute top-[30%] left-[42%] w-1.5 h-1.5 bg-white rounded-full opacity-45 animate-twinkle"></div>
          <div className="absolute top-[45%] right-[14%] w-2 h-2 bg-blue-400 rounded-full opacity-40 animate-float animation-delay-1000"></div>
          <div className="absolute top-[58%] left-[25%] w-2.5 h-2.5 bg-red-300 rounded-full opacity-50 animate-float-slow animation-delay-4000"></div>
          <div className="absolute top-[65%] right-[36%] w-1.5 h-1.5 bg-white rounded-full opacity-50 animate-twinkle animation-delay-5000"></div>
          <div className="absolute bottom-[28%] left-[50%] w-2 h-2 bg-red-200 rounded-full opacity-45 animate-float animation-delay-3000"></div>
          <div className="absolute bottom-[20%] right-[20%] w-3 h-3 bg-blue-200 rounded-full opacity-45 animate-float-slow animation-delay-6000"></div>
          <div className="absolute bottom-[14%] left-[14%] w-1.5 h-1.5 bg-white rounded-full opacity-50 animate-twinkle animation-delay-1000"></div>
          <div className="absolute bottom-[8%] right-[44%] w-2 h-2 bg-blue-300 rounded-full opacity-40 animate-float animation-delay-7000"></div>
          <div className="absolute top-[10%] right-[8%] w-1.5 h-1.5 bg-white rounded-full opacity-45 animate-twinkle animation-delay-3000"></div>
          <div className="absolute top-[18%] left-[6%] w-2 h-2 bg-blue-200 rounded-full opacity-45 animate-float-slow animation-delay-1500"></div>
          <div className="absolute top-[38%] left-[9%] w-2 h-2 bg-red-200 rounded-full opacity-40 animate-float animation-delay-2500"></div>
          <div className="absolute top-[52%] left-[48%] w-1.5 h-1.5 bg-white rounded-full opacity-55 animate-twinkle animation-delay-4500"></div>
          <div className="absolute top-[70%] right-[9%] w-2 h-2 bg-blue-300 rounded-full opacity-40 animate-float-slow animation-delay-3500"></div>
          <div className="absolute bottom-[30%] right-[6%] w-1.5 h-1.5 bg-white rounded-full opacity-50 animate-twinkle animation-delay-2200"></div>
          <div className="absolute bottom-[18%] left-[34%] w-2 h-2 bg-red-300 rounded-full opacity-42 animate-float animation-delay-5200"></div>
          <div className="absolute bottom-[6%] left-[28%] w-2.5 h-2.5 bg-blue-200 rounded-full opacity-38 animate-float-slow animation-delay-6200"></div>
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      <div className="relative z-10 p-3 md:p-4">
        <div className="max-w-6xl w-full mx-auto">
          {/* Header Section */}
          <section className="py-4 md:py-5 text-center animate-fade-in">
            <div className="mb-10">
              <div className="inline-block mb-3">
                <div className="px-6 py-2 bg-gradient-to-r from-red-500/20 to-blue-500/20 backdrop-blur-xl border border-red-500/30 rounded-full">
                  <span className="text-red-300 text-sm font-medium">AI-Powered Emergency System</span>
                </div>
              </div>
              <div className="relative w-full mt-1 mb-2 flex justify-center">
                {/* Ambient glow effect */}
                <div className="absolute -inset-8 bg-gradient-to-r from-blue-600/55 via-white/25 to-red-600/55 blur-3xl rounded-full pointer-events-none"></div>
                <h1 
                  className="relative text-center text-[clamp(5rem,11vw,11rem)] font-black tracking-[0.04em] md:tracking-[0.06em] leading-none px-2 animate-logo-lift scale-x-[1.02]"
                  style={{ 
                    filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.72)) drop-shadow(-16px 0 34px rgba(37,99,235,0.72)) drop-shadow(16px 0 34px rgba(239,68,68,0.72)) drop-shadow(0 10px 22px rgba(0,0,0,0.7))',
                  }}
                >
                  <span className="logo-shine">
                    AMBUCLEAR
                  </span>
                </h1>
              </div>
              <p className="text-lg md:text-xl text-blue-100 mt-0.5">
                Intelligent Emergency Response Network
              </p>
            </div>
          </section>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-3 gap-5 mb-3">
            {/* Ambulance Driver Card */}
            <Link href="/ambulance" className="transform transition-all duration-300 hover:scale-105 hover:-translate-y-2">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 h-full border border-slate-700/50 hover:border-red-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/20">
                  <div className="mb-4 flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2 text-center">
                    Ambulance
                  </h2>
                  <p className="text-gray-300 text-center mb-4 leading-relaxed text-sm">
                    Emergency response control with real-time GPS tracking and AI-powered navigation
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Red Alert - Emergency Mode
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      Yellow - Non-Emergency
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Green - Available
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <button className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg transition-all">
                      Access Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </Link>

            {/* Public Driver Card */}
            <Link href="/public" className="transform transition-all duration-300 hover:scale-105 hover:-translate-y-2">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 h-full border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20">
                  <div className="mb-4 flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2 text-center">
                    Public Driver
                  </h2>
                  <p className="text-gray-300 text-center mb-4 leading-relaxed text-sm">
                    Receive intelligent alerts with AI-guided directions when emergency vehicles approach
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-blue-400">✓</span>
                      No Login Required
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-blue-400">✓</span>
                      Real-time Voice Alerts
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-blue-400">✓</span>
                      Smart LEFT/RIGHT Guidance
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg transition-all">
                      Enable Alerts
                    </button>
                  </div>
                </div>
              </div>
            </Link>

            {/* Control Room Card */}
            <Link href="/control" className="transform transition-all duration-300 hover:scale-105 hover:-translate-y-2">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-blue-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 h-full border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20">
                  <div className="mb-4 flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2 text-center">
                    Control Room
                  </h2>
                  <p className="text-gray-300 text-center mb-4 leading-relaxed text-sm">
                    Command center with AI recommendations and real-time fleet monitoring
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-blue-400">✓</span>
                      Live Fleet Tracking
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-blue-400">✓</span>
                      AI Traffic Analysis
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-blue-400">✓</span>
                      SOS Management
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <button className="w-full bg-gradient-to-r from-red-500 to-blue-600 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg transition-all">
                      Admin Login
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="flex justify-center mt-4 mb-3">
            <Link
              href="/simulation"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-white/10 border border-white/20 text-white text-base font-semibold hover:bg-white/20 transition-colors"
            >
              Open Simulation Lab
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-14 mb-13 text-center">
            <p className="text-gray-300 text-xs md:text-sm font-medium">
              © {new Date().getFullYear()} AMBUCLEAR. All copyrights reserved.
            </p>
            <p className="text-gray-400 text-xs md:text-sm mt-0.5">
              🤍 Developed by Divakar M and Team.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-6000 {
          animation-delay: 6s;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-14px) translateX(-8px);
          }
        }
        .animate-float-slow {
          animation: float-slow 9s ease-in-out infinite;
        }
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.25);
          }
        }
        .animate-twinkle {
          animation: twinkle 4s ease-in-out infinite;
        }
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        @keyframes logo-lift {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        .animate-logo-lift {
          animation: logo-lift 4s ease-in-out infinite;
        }
        .logo-shine {
          color: #ffffff;
          -webkit-text-fill-color: #ffffff;
        }
      `}</style>
    </main>
  );
}
