'use client';

import Link from 'next/link';
import ChennaiTrafficSimulationV2 from '@/components/ChennaiTrafficSimulationV2';

export default function SimulationPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-red-600 via-blue-700 to-blue-900 relative overflow-hidden p-4 sm:p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-35">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Traffic Simulation Lab</h1>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-gradient-to-r from-red-500/90 to-blue-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-red-500 hover:to-blue-500 hover:shadow-xl"
          >
            ← Back to Home
          </Link>
        </div>

        <ChennaiTrafficSimulationV2 />
      </div>

      <style jsx>{`
        @keyframes blob {
          0%,
          100% {
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
      `}</style>
    </main>
  );
}
