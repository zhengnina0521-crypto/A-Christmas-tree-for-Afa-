import React from 'react';

interface UIOverlayProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ isMenuOpen, onToggleMenu }) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-8 text-white select-none pointer-events-none">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="pointer-events-auto z-50">
            {/* Updated Title with Cursive Font */}
            <h1 className="text-5xl md:text-7xl font-cursive text-retro-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse-slow">
            🎄Christmas tree for Afa
            </h1>
            <p className="text-xs md:text-sm text-retro-green mt-2 tracking-widest uppercase opacity-80 font-mono pl-2">
            FESTIVE_PROTOCOL: ENGAGED // YEAR: 2025
            </p>
        </div>

        <button 
            onClick={onToggleMenu}
            className="pointer-events-auto group flex flex-col items-end gap-1.5 cursor-pointer z-50"
        >
            <span className={`h-0.5 bg-retro-gold transition-all duration-300 ${isMenuOpen ? 'w-8 rotate-45 translate-y-2' : 'w-8'}`} />
            <span className={`h-0.5 bg-retro-gold transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'w-6'}`} />
            <span className={`h-0.5 bg-retro-gold transition-all duration-300 ${isMenuOpen ? 'w-8 -rotate-45 -translate-y-2' : 'w-4 group-hover:w-8'}`} />
        </button>
      </div>

      {/* Center Interaction Hint */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-0 animate-[fadeIn_3s_ease-in_forwards]">
        <div className="w-64 h-64 border border-retro-green/20 rounded-full flex items-center justify-center animate-pulse-slow">
            <span className="text-xs font-mono text-retro-green tracking-widest opacity-70">AWAITING SANTA</span>
        </div>
      </div>

      {/* Footer / Data Display */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="font-mono text-xs text-retro-green space-y-1 backdrop-blur-sm bg-black/40 p-4 rounded border border-retro-green/20 pointer-events-auto transition-colors hover:border-retro-gold/50 shadow-[0_0_15px_rgba(0,255,65,0.1)]">
            <div className="flex gap-4">
                <span className="text-retro-gold">SPIRIT.LEVEL</span>
                <span>99.9%</span>
            </div>
            <div className="flex gap-4">
                <span className="text-retro-red">TEMP.C</span>
                <span>-2.4°</span>
            </div>
            <div className="flex gap-4">
                <span className="text-white">SNOW.DENSITY</span>
                <span>HIGH</span>
            </div>
        </div>

        <div className="text-right">
             <p className="text-xs text-retro-green font-mono mb-1">LIGHT MODE</p>
             <div className="flex gap-2 pointer-events-auto">
                <button className="px-4 py-1 border border-retro-green/30 text-xs font-bold text-retro-green hover:bg-retro-green hover:text-black transition-all">TWINKLE</button>
                <button className="px-4 py-1 border border-retro-red/30 text-xs font-bold text-retro-red hover:bg-retro-red hover:text-black hover:border-retro-red transition-all">NEON</button>
             </div>
        </div>
      </div>

        {/* Side Menu (Conditional) */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-black/90 backdrop-blur-xl border-l border-retro-green/20 transform transition-transform duration-500 ease-out z-40 pointer-events-auto ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-10 flex flex-col h-full">
            <h2 className="text-2xl font-mono text-retro-gold mb-8 border-b border-retro-green/20 pb-4">SETTINGS</h2>
            
            <div className="space-y-8">
                <div>
                    <label className="text-xs font-bold text-retro-green mb-2 block">GLOW INTENSITY</label>
                    <div className="w-full h-1 bg-retro-dim rounded overflow-hidden">
                        <div className="h-full bg-retro-gold w-3/4 shadow-[0_0_10px_rgba(255,215,0,0.8)]"></div>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-retro-green mb-2 block">SNOW SPEED</label>
                     <div className="w-full h-1 bg-retro-dim rounded overflow-hidden">
                        <div className="h-full bg-white w-1/2"></div>
                    </div>
                </div>
                 <div>
                    <label className="text-xs font-bold text-retro-green mb-2 block">STAR POWER</label>
                     <div className="w-full h-1 bg-retro-dim rounded overflow-hidden">
                        <div className="h-full bg-retro-red w-full shadow-[0_0_10px_rgba(255,0,51,0.8)]"></div>
                    </div>
                </div>
            </div>

            <div className="mt-auto">
                <button className="w-full py-3 border border-retro-green/50 text-retro-green font-mono text-sm hover:bg-retro-green hover:text-black transition-all">
                    REBOOT HOLIDAYS
                </button>
            </div>
        </div>
      </div>

    </div>
  );
};

export default UIOverlay;