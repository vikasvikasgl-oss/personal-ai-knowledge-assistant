import React from 'react';
import { Bot, FileText, Cpu, ShieldCheck, Sparkles } from 'lucide-react';

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen w-full flex bg-slate-50 antialiased font-sans">
      {/* Left Gradient Panel - Hidden on mobile, visible on lg screens */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-12 text-white flex-col justify-between select-none">
        {/* Subtle decorative glow circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />

        {/* Top: Logo & App Name */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-lg leading-tight block">
                Personal AI
              </span>
              <span className="text-[11px] text-indigo-200 font-medium tracking-wide uppercase">
                Knowledge Assistant
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Value Prop & 3 Feature Highlights */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-4 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Private RAG Platform
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            Your personal knowledge,<br />powered by AI.
          </h1>
          <p className="text-indigo-100/90 text-sm xl:text-base leading-relaxed mb-8 max-w-md">
            Upload your files, index them locally with FAISS, and chat securely with an intelligent assistant customized to your own documents.
          </p>

          <div className="space-y-4">
            {/* Feature 1 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform duration-200 hover:translate-x-1">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0 border border-white/10 text-white">
                <FileText className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Private Document RAG</h2>
                <p className="text-xs text-indigo-200/80 mt-0.5 leading-normal">
                  Vector search using sentence-transformers and local FAISS indexes tailored to your uploads.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform duration-200 hover:translate-x-1">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0 border border-white/10 text-white">
                <Cpu className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">OCR & Smart Classification</h2>
                <p className="text-xs text-indigo-200/80 mt-0.5 leading-normal">
                  Extracts text from scanned files with Tesseract and classifies contents using machine learning.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform duration-200 hover:translate-x-1">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0 border border-white/10 text-white">
                <ShieldCheck className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Strict Per-User Isolation</h2>
                <p className="text-xs text-indigo-200/80 mt-0.5 leading-normal">
                  Every user’s documents, FAISS indexes, chats, and memories are strictly segregated and private.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom footer text */}
        <div className="relative z-10 text-xs text-indigo-200/70 flex items-center justify-between border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} Personal AI Assistant</span>
          <span>End-to-End Private RAG</span>
        </div>
      </div>

      {/* Right Side: Form Card Area */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-12 py-12 relative overflow-y-auto">
        {/* Mobile branding header */}
        <div className="w-full max-w-md lg:hidden mb-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md mb-3">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Personal AI Knowledge Assistant</h1>
          <p className="text-sm text-slate-500 mt-1">Your personal knowledge, powered by AI</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 sm:p-10 transition-all duration-300">
          <div className="mb-6 text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
