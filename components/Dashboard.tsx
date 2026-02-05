import React from 'react';
import { ProcessedData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertCircle, CheckCircle, FileText, Download, Bus, User } from 'lucide-react';
import { downloadExcel } from '../utils/excelProcessor';

interface DashboardProps {
  data: ProcessedData;
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const totalProcessed = data.summaryByDay.reduce((acc, curr) => acc + curr.total, 0);
  const totalFailures = data.summaryByDay.reduce((acc, curr) => acc + curr.fail, 0);
  const totalPass = data.summaryByDay.reduce((acc, curr) => acc + curr.pass, 0);
  const globalCompliance = totalProcessed > 0 ? ((totalPass / totalProcessed) * 100).toFixed(2) : "0.00";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Resultados da Análise</h2>
          <p className="text-gray-500">Visão geral da performance operacional</p>
        </div>
        <button
          onClick={() => downloadExcel(data)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          <Download className="mr-2 h-4 w-4" />
          Baixar Excel Completo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Processado</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{totalProcessed.toLocaleString()}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-500">
                      viagens
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Falhas</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-red-600">{totalFailures.toLocaleString()}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-red-500">
                      incidentes
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Taxa de Cumprimento Média</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-green-600">{globalCompliance}%</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Performance Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Performance Diária (% Cumprimento)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.summaryByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(str) => str.split('-').slice(1).join('/')} />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Cumprimento']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="percentPass" name="Cumprimento" stroke="#002E5D" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failures Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Falhas vs Sucesso por Dia</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.summaryByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(str) => str.split('-').slice(1).join('/')} />
                <YAxis />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Legend />
                <Bar dataKey="pass" name="Sucesso" stackId="a" fill="#10B981" />
                <Bar dataKey="fail" name="Falha" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vehicles */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center">
              <Bus className="mr-2 h-5 w-5 text-gray-500" />
              Veículos com mais Incidentes
            </h3>
            <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-1">Top 10</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veículo ID</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Erros</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.errorsByCar.slice(0, 10).map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Drivers */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center">
              <User className="mr-2 h-5 w-5 text-gray-500" />
              Condutores com mais Incidentes
            </h3>
            <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-1">Top 10</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condutor ID</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Erros</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.errorsByDriver.slice(0, 10).map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};