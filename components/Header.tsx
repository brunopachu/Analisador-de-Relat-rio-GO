import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center">
            <img 
              className="h-12 w-auto" 
              src="https://upload.wikimedia.org/wikipedia/commons/5/52/ALSA_2019_logo.svg" 
              alt="Alsa Logo" 
            />
          </div>
          <div className="ml-4 flex items-center">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">
              Analisador de Relatório GO (TML)
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};