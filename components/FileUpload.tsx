import React, { useCallback } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  return (
    <div className="w-full max-w-xl mx-auto mt-10">
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors bg-white">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-blue-50 rounded-full">
            <UploadCloud className="w-10 h-10 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              Carregar Relatório
            </h3>
            <p className="text-sm text-gray-500">
              Selecione o arquivo .csv ou .xlsx para análise
            </p>
          </div>
          <label className="relative cursor-pointer">
            <span className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#002E5D] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}>
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-5 w-5" />
                  Selecionar Arquivo
                </>
              )}
            </span>
            <input 
              type="file" 
              className="hidden" 
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
        </div>
      </div>
    </div>
  );
};