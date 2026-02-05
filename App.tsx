import React, { useState } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { ProcessedData } from './types';
import { processExcelData } from './utils/excelProcessor';
import { AlertCircle } from 'lucide-react';

function App() {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const processed = await processExcelData(file);
      setData(processed);
    } catch (err) {
      console.error(err);
      setError("Erro ao processar o arquivo. Verifique se o formato está correto (.csv ou .xlsx).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {!data && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Análise de Relatório GO
              </h2>
              <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
                Carregue o relatório operacional para gerar estatísticas automáticas, filtrar falhas de veículos e condutores e exportar o relatório padronizado.
              </p>
            </div>
            
            <FileUpload onFileUpload={handleFileUpload} isLoading={loading} />

            {error && (
              <div className="mt-8 max-w-xl mx-auto bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {data && <Dashboard data={data} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/ALSA_2019_logo.svg/374px-ALSA_2019_logo.svg.png" alt="Alsa Todi" className="h-6 opacity-80" />
            <span className="text-sm text-slate-500">© {new Date().getFullYear()} Alsa Todi. Todos os direitos reservados.</span>
          </div>
          <div className="text-sm text-slate-400 font-medium">
            Desenvolvido por Bruno Pachú ®
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;