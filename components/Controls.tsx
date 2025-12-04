
import React, { useState } from 'react';
import { useStore } from '../store';
import { ShapeType } from '../types';
import { generateTheme } from '../services/geminiService';
import { Palette, Hand, Sparkles, AlertCircle, Maximize2, Video, VideoOff } from 'lucide-react';

export const Controls: React.FC = () => {
  const { currentShape, setShape, theme, setTheme, handData, toggleDebug, showDebug, isCameraActive, toggleCamera } = useStore();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const result = await generateTheme(prompt);
    if (result) {
      setTheme(result);
    }
    setIsGenerating(false);
    setPrompt('');
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Header */}
      <div className="pointer-events-auto flex justify-between items-start">
        <div>
           <h1 className="text-4xl font-light text-white tracking-tighter drop-shadow-lg">Zen<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Particles</span></h1>
           <p className="text-white/60 text-sm mt-1">Interactive Hand Tracking System</p>
        </div>
        
        <div className="flex gap-2">
            <button
                onClick={toggleCamera}
                className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md transition-colors ${isCameraActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/20 text-red-200 hover:bg-red-500/30'}`}
                title={isCameraActive ? "Stop Camera" : "Start Camera"}
            >
                {isCameraActive ? <Video size={16} /> : <VideoOff size={16} />}
                <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">{isCameraActive ? 'Cam On' : 'Cam Off'}</span>
            </button>

            <button 
                onClick={toggleDebug} 
                className={`p-2 rounded-full backdrop-blur-md transition-colors ${showDebug ? 'bg-white/20 text-white' : 'bg-black/20 text-white/50 hover:bg-white/10'}`}
                title="Toggle Debug View"
            >
                <Maximize2 size={20} />
            </button>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md transition-all ${handData.isPresent ? 'bg-green-500/20 text-green-200' : 'bg-white/5 text-white/30'}`}>
                <Hand size={16} />
                <span className="text-xs font-medium tracking-wide">
                    {handData.isPresent ? 'HAND DETECTED' : 'NO HANDS'}
                </span>
            </div>
        </div>
      </div>

      {/* Main Controls Overlay */}
      <div className="flex flex-col md:flex-row gap-6 items-end pointer-events-auto">
        
        {/* Shape Selectors */}
        <div className="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 w-full md:w-auto">
           <div className="text-xs font-bold text-white/40 uppercase mb-3 tracking-widest">Shapes</div>
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
             {Object.values(ShapeType).map((shape) => (
               <button
                 key={shape}
                 onClick={() => setShape(shape)}
                 className={`px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                   currentShape === shape 
                    ? 'bg-white text-black font-semibold scale-105' 
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                 }`}
               >
                 {shape}
               </button>
             ))}
           </div>
        </div>

        {/* Color & AI Controls */}
        <div className="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 w-full md:w-96">
            <div className="text-xs font-bold text-white/40 uppercase mb-3 tracking-widest flex items-center gap-2">
                <Palette size={12} /> Style & Theme
            </div>
            
            <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label className="text-[10px] text-white/50 block mb-1">Primary</label>
                    <input 
                        type="color" 
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({ primaryColor: e.target.value })}
                        className="w-full h-8 rounded cursor-pointer bg-transparent"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-[10px] text-white/50 block mb-1">Size</label>
                    <input 
                        type="range" 
                        min="0.05" max="0.5" step="0.01"
                        value={theme.particleSize}
                        onChange={(e) => setTheme({ particleSize: parseFloat(e.target.value) })}
                        className="w-full h-8 accent-white"
                    />
                </div>
            </div>

            <form onSubmit={handleAISubmit} className="relative">
                <input 
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe a mood (e.g. 'Neon Rain')..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors pr-10"
                />
                <button 
                    type="submit" 
                    disabled={isGenerating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                >
                    {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full" /> : <Sparkles size={16} />}
                </button>
            </form>
            {!process.env.API_KEY && (
                <div className="mt-2 text-[10px] text-yellow-500 flex items-center gap-1">
                    <AlertCircle size={10} /> AI features require API Key
                </div>
            )}
        </div>
      </div>
      
      {/* Instructions Overlay if No Hand */}
      {!handData.isPresent && isCameraActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
             <div className="bg-black/40 backdrop-blur-sm p-6 rounded-3xl border border-white/5">
                <Hand className="w-12 h-12 text-white/20 mx-auto mb-4 animate-pulse" />
                <h2 className="text-xl text-white font-light">Show your hands</h2>
                <p className="text-white/50 text-sm mt-2">Open palms to expand • Pinch to pulse</p>
             </div>
        </div>
      )}
      
      {/* Instruction if Camera is Off */}
      {!isCameraActive && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
             <div className="bg-black/40 backdrop-blur-sm p-6 rounded-3xl border border-white/5">
                <VideoOff className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h2 className="text-xl text-white font-light">Camera Paused</h2>
                <p className="text-white/50 text-sm mt-2">Enable camera to interact</p>
             </div>
        </div>
      )}
    </div>
  );
};
