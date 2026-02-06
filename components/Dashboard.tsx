import React, { useState, useMemo } from 'react';
import { ProcessedData, ProcessedRow } from '../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, BarChart, Bar, ReferenceLine
} from 'recharts';
import { AlertCircle, CheckCircle, FileText, Download, Bus, User, Calendar, Filter } from 'lucide-react';
import { downloadExcel } from '../utils/excelProcessor';

interface DashboardProps {
  data: ProcessedData;
}

// Helper to format date for display
const formatDate = (dateStr: string) => {
  const str = String(dateStr);
  
  // Handle YYYYMMDD (e.g. 20231025)
  if (/^\d{8}$/.test(str)) {
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
  
  // Handle YYYY-MM-DD (e.g. 2023-10-25)
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  
  return str;
};

// Helper for Axis (Short date DD/MM)
const formatAxisDate = (dateStr: string) => {
  const str = String(dateStr);
  
  // Handle YYYYMMDD
  if (/^\d{8}$/.test(str)) {
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return `${day}/${month}`;
  }

  // Handle YYYY-MM-DD
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
  }

  return str;
};

// Custom Tooltip for detailed daily info
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const dateStr = formatDate(label);
    
    return (
      <div 
        className="bg-white p-3 border border-gray-200 shadow-lg rounded-md text-sm z-50 relative"
        style={{ backgroundColor: '#ffffff', color: '#1f2937' }} // Explicit background and base text color
      >
        <p 
          className="font-bold mb-2 border-b border-gray-100 pb-1"
          style={{ color: '#000000' }} // Force pure black for the date header
        >
          {`Dia ${dateStr}`}
        </p>
        <p className="mb-1" style={{ color: '#002E5D' }}>
          <span className="font-semibold">Cumprimento:</span> {item.percentPassFormatted}
        </p>
        <p style={{ color: '#4b5563' }}>
          <span className="font-semibold">Total Viagens:</span> {item.total}
        </p>
        <p style={{ color: '#16a34a' }}>
          <span className="font-semibold">Sucesso:</span> {item.pass}
        </p>
        <p style={{ color: '#dc2626' }}>
          <span className="font-semibold">Falhas:</span> {item.fail}
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState<string>('all');

  // 1. Calculate KPIs based on selection
  const kpiData = useMemo(() => {
    if (selectedDate === 'all') {
      const totalProcessed = data.summaryByDay.reduce((acc, curr) => acc + curr.total, 0);
      const totalFailures = data.summaryByDay.reduce((acc, curr) => acc + curr.fail, 0);
      const totalPass = data.summaryByDay.reduce((acc, curr) => acc + curr.pass, 0);
      const globalCompliance = totalProcessed > 0 ? ((totalPass / totalProcessed) * 100).toFixed(2) : "0.00";
      return { totalProcessed, totalFailures, compliance: globalCompliance };
    } else {
      const dayStats = data.summaryByDay.find(d => d.date === selectedDate);
      if (dayStats) {
        return {
          totalProcessed: dayStats.total,
          totalFailures: dayStats.fail,
          compliance: dayStats.percentPass.toFixed(2)
        };
      }
      return { totalProcessed: 0, totalFailures: 0, compliance: "0.00" };
    }
  }, [data, selectedDate]);

  // 2. Filter Failures Data (MainData) for Tables and Hourly Charts
  const filteredFailures = useMemo(() => {
    if (selectedDate === 'all') {
      return data.mainData;
    }
    return data.mainData.filter(row => row.operational_date === selectedDate);
  }, [data.mainData, selectedDate]);

  // 3. Dynamic Top Tables based on filtered data
  const { dynamicErrorsByCar, dynamicErrorsByDriver } = useMemo(() => {
    if (selectedDate === 'all') {
      return { 
        dynamicErrorsByCar: data.errorsByCar, 
        dynamicErrorsByDriver: data.errorsByDriver 
      };
    }

    const carMap = new Map<string, number>();
    const driverMap = new Map<string, number>();

    filteredFailures.forEach(row => {
      const vid = String(row.vehicle_ids || "").trim();
      if (vid && vid !== "(vazio)") carMap.set(vid, (carMap.get(vid) || 0) + 1);

      const did = String(row.driver_ids || "").trim();
      if (did && did !== "(vazio)") driverMap.set(did, (driverMap.get(did) || 0) + 1);
    });

    const sortFn = (a: any, b: any) => b.count - a.count;

    return {
      dynamicErrorsByCar: Array.from(carMap.entries()).map(([id, count]) => ({ id, count })).sort(sortFn),
      dynamicErrorsByDriver: Array.from(driverMap.entries()).map(([id, count]) => ({ id, count })).sort(sortFn)
    };
  }, [filteredFailures, data, selectedDate]);

  // 4. Calculate Hourly Data for Single Day View
  const hourlyData = useMemo(() => {
    if (selectedDate === 'all') return [];

    const hours = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0, label: `${String(i).padStart(2, '0')}:00` }));
    
    filteredFailures.forEach(row => {
      // Assuming HH:MM:SS format
      const timeParts = row.start_time_scheduled.split(':');
      if (timeParts.length >= 1) {
        const h = parseInt(timeParts[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) {
          hours[h].count++;
        }
      }
    });
    return hours;
  }, [filteredFailures, selectedDate]);


  // Chart Scale Logic (Global View)
  const minPercent = Math.min(...data.summaryByDay.map(d => d.percentPass));
  const effectiveMin = Math.min(minPercent, 96.5);
  const yAxisMin = Math.floor(effectiveMin) - 1;
  const domainMin = yAxisMin < 0 ? 0 : yAxisMin;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Resultados da Análise</h2>
          <p className="text-gray-500">
            {selectedDate === 'all' 
              ? "Visão geral da performance operacional" 
              : `Detalhes operacionais para o dia ${formatDate(selectedDate)}`
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none h-full text-gray-700 font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <option value="all">Todos os Dias</option>
              {data.summaryByDay.map(day => (
                <option key={day.date} value={day.date}>
                  {formatDate(day.date)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          <button
            onClick={() => downloadExcel(data)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar Excel
          </button>
        </div>
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
                    <div className="text-2xl font-semibold text-gray-900">{kpiData.totalProcessed.toLocaleString()}</div>
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
                    <div className="text-2xl font-semibold text-red-600">{kpiData.totalFailures.toLocaleString()}</div>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Taxa de Cumprimento</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-green-600">{kpiData.compliance}%</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedDate === 'all' ? (
          <>
            {/* GLOBAL: Daily Performance Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Performance Diária (% Cumprimento)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.summaryByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatAxisDate} 
                      stroke="#9ca3af"
                      tick={{ fill: '#374151' }}
                      fontSize={12}
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={[domainMin, 100]} 
                      tickCount={10}
                      stroke="#9ca3af" 
                      tick={{ fill: '#374151' }}
                      fontSize={12}
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine 
                      y={97} 
                      stroke="#dc2626" 
                      strokeDasharray="3 3" 
                      label={{ value: '97%', position: 'top', fill: '#dc2626', fontSize: 12, fontWeight: 500 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentPass" 
                      name="Cumprimento" 
                      stroke="#002E5D" 
                      strokeWidth={3} 
                      dot={{ strokeWidth: 2, r: 4, fill: 'white', stroke: '#002E5D' }}
                      activeDot={{ r: 6, stroke: '#002E5D', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GLOBAL: Failures vs Success Stacked Bar Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Falhas vs Sucesso por Dia</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.summaryByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatAxisDate} 
                      stroke="#9ca3af"
                      tick={{ fill: '#374151' }}
                      fontSize={12}
                      minTickGap={30}
                    />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#374151' }} fontSize={12} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="pass" name="Sucesso" stackId="a" fill="#10B981" />
                    <Bar dataKey="fail" name="Falha" stackId="a" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <>
             {/* DAILY: Hourly Failures Chart */}
             <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Distribuição de Falhas por Hora ({formatDate(selectedDate)})
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="label" 
                      stroke="#9ca3af"
                      tick={{ fill: '#374151' }}
                      fontSize={12}
                    />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#374151' }} fontSize={12} allowDecimals={false} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#1f2937' }}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Quantidade de Falhas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
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
            <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-1">
              {selectedDate === 'all' ? 'Top 10 Geral' : 'Top 10 do Dia'}
            </span>
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
                {dynamicErrorsByCar.length > 0 ? (
                  dynamicErrorsByCar.slice(0, 10).map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">Nenhum veículo com erros encontrado neste período.</td>
                  </tr>
                )}
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
            <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-1">
              {selectedDate === 'all' ? 'Top 10 Geral' : 'Top 10 do Dia'}
            </span>
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
                {dynamicErrorsByDriver.length > 0 ? (
                  dynamicErrorsByDriver.slice(0, 10).map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">Nenhum condutor com erros encontrado neste período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};