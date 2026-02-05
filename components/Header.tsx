import React from 'react';

export const Header: React.FC = () => {
  return (
    
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/ALSA_2019_logo.svg/374px-ALSA_2019_logo.svg.png" 
              alt="ALSA Logo" 
              className="h-8 w-auto object-contain" 
            />
            <div className="h-6 w-px bg-gray-300"></div>
            <span className="text-lg font-medium text-[#002458] tracking-tight">
              Analisador de Relatório GO (TML)
            </span>
          </div>
          <div className="hidden md:flex items-center text-sm font-medium text-gray-500">
             
          </div>
        </div>
      </header>
  );
};