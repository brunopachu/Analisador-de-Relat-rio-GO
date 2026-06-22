import React, { useState } from 'react';
import { FileSpreadsheet, CheckCircle2, Play } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (mainFile: File, secondaryFile?: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);

  const handleMainFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) setMainFile(event.target.files[0]);
  };

  const handleSecondaryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) setSecondaryFile(event.target.files[0]);
  };

  const handleAnalyze = () => {
    if (mainFile) onFileUpload(mainFile, secondaryFile || undefined);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main File */}
        <label className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors bg-white cursor-pointer ${mainFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'}`}>
          <div className="flex flex-col items-center justify-center space-y-2">
            {mainFile ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <FileSpreadsheet className="w-8 h-8 text-blue-600" />}
            <h3 className="text-sm font-medium text-gray-900">1. Relatório GO (Obrigatório)</h3>
            <p className="text-xs text-gray-500 line-clamp-1">{mainFile ? mainFile.name : 'Selecionar .csv / .xlsx'}</p>
          </div>
          <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleMainFileChange} disabled={isLoading} />
        </label>

        {/* Secondary File */}
        <label className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors bg-white cursor-pointer ${secondaryFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'}`}>
          <div className="flex flex-col items-center justify-center space-y-2">
           {secondaryFile ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <FileSpreadsheet className="w-8 h-8 text-gray-400" />}
            <h3 className="text-sm font-medium text-gray-900">2. Trips Realizadas (Opcional)</h3>
            <p className="text-xs text-gray-500 line-clamp-1">{secondaryFile ? secondaryFile.name : 'Cruzamento de frota'}</p>
          </div>
          <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleSecondaryFileChange} disabled={isLoading} />
        </label>
      </div>

      <div className="flex justify-center mt-6">
        <button 
          onClick={handleAnalyze}
          disabled={!mainFile || isLoading}
          className={`inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-all ${(!mainFile || isLoading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#002E5D] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analisando Dados...
            </>
          ) : (
             <>
               <Play className="w-5 h-5 mr-2" />
               Gerar Dashboard
             </>
          )}
        </button>
      </div>
    </div>
  );
};