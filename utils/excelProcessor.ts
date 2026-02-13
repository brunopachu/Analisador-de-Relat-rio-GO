import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { RawRow, ProcessedData, DaySummary, ErrorCount, ProcessedRow } from '../types';

/**
 * Core logic to transform raw JSON data into the Dashboard structure.
 * This is separated from the file parsing to support multiple parsers (XLSX and CSV).
 */
const analyzeRawData = (jsonData: RawRow[]): ProcessedData => {
  // 1. Calculate Summary per Day (using FULL dataset)
  const summaryMap = new Map<string, { pass: number; fail: number }>();

  jsonData.forEach(row => {
    // Cast to string to avoid runtime type errors
    const date = String(row.operational_date || "");
    if (!date) return;

    const analysis = String(row.analysis_SIMPLE_THREE_VEHICLE_EVENTS || "");
    
    if (!summaryMap.has(date)) {
      summaryMap.set(date, { pass: 0, fail: 0 });
    }

    const current = summaryMap.get(date)!;
    if (analysis === 'pass') current.pass++;
    if (analysis === 'fail') current.fail++;
  });

  const summaryByDay: DaySummary[] = Array.from(summaryMap.entries()).map(([date, counts]) => {
    const total = counts.pass + counts.fail;
    const percent = total > 0 ? (counts.pass / total) : 0;
    return {
      date,
      pass: counts.pass,
      fail: counts.fail,
      total,
      percentPass: percent,
      
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // 2. Filter for Failures
  const failures = jsonData.filter(r => String(r.analysis_SIMPLE_THREE_VEHICLE_EVENTS) === 'fail');

  // 3. Transform Data (Reorder columns, Create TRIP ID New)
  const mainData: ProcessedRow[] = failures.map(row => {
    // Explicit string conversion for all fields that might be treated as numbers
    const tripId = String(row.trip_id || "");
    const date = String(row.operational_date || "");
    
    // Python: .str.replace(r"\|.*?\|", "|X|", regex=True)
    const tripIdNew = tripId.replace(/\|.*?\|/g, "|X|") + "_" + date;

    return {
      "operational_date": date,
      "pattern_id": String(row.pattern_id || ""),
      "TRIP ID New": tripIdNew,
      "trip_id": tripId,
      "vehicle_ids": String(row.vehicle_ids || ""),
      "driver_ids": String(row.driver_ids || ""),
      "passengers_observed": String(row.passengers_observed || ""),
      "start_time_scheduled": String(row.start_time_scheduled || ""),
      "start_time_observed": String(row.start_time_observed || ""),
      "end_time_scheduled": String(row.end_time_scheduled || ""),
      "end_time_observed": String(row.end_time_observed || ""),
      "analysis_SIMPLE_THREE_VEHICLE_EVENTS": String(row.analysis_SIMPLE_THREE_VEHICLE_EVENTS || ""),
      "analysis_SIMPLE_THREE_VEHICLE_EVENTS_reason": String(row.analysis_SIMPLE_THREE_VEHICLE_EVENTS_reason || ""),
      "justification_cause": String(row.justification_cause || ""),
      "pto_message": String(row.pto_message || "")
    };
  });

  // Sort by operational_date and start_time_scheduled
  mainData.sort((a, b) => {
    if (a.operational_date !== b.operational_date) {
      return a.operational_date.localeCompare(b.operational_date);
    }
    return a.start_time_scheduled.localeCompare(b.start_time_scheduled);
  });

  // 4. Errors by Car
  const carCountMap = new Map<string, number>();
  failures.forEach(row => {
      const vid = String(row.vehicle_ids || "").trim();
      // Skip empty or placeholder values
      if (vid && vid !== "(vazio)") {
          carCountMap.set(vid, (carCountMap.get(vid) || 0) + 1);
      }
  });
  const errorsByCar: ErrorCount[] = Array.from(carCountMap.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);

  // 5. Errors by Driver
  const driverCountMap = new Map<string, number>();
  failures.forEach(row => {
      const did = String(row.driver_ids || "").trim();
      // Skip empty or placeholder values
      if (did && did !== "(vazio)") {
          driverCountMap.set(did, (driverCountMap.get(did) || 0) + 1);
      }
  });
  const errorsByDriver: ErrorCount[] = Array.from(driverCountMap.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);

  return {
    mainData,
    errorsByCar,
    errorsByDriver,
    summaryByDay
  };
};

export const processExcelData = (file: File): Promise<ProcessedData> => {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();

    // Use PapaParse for CSV files (Much faster and memory efficient for large datasets)
    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            // results.data contains the array of objects
            const processed = analyzeRawData(results.data as RawRow[]);
            resolve(processed);
          } catch (err) {
            reject(err);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
      return;
    }

    // Fallback to XLSX for Excel files (.xlsx, .xls)
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Use array buffer for better encoding support
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Read raw data
        const jsonData: RawRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        const processed = analyzeRawData(jsonData);
        resolve(processed);

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const downloadExcel = (data: ProcessedData, filename: string = "Relatório_GO_filtrado.xlsx") => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Main Data (Failures)
    const wsMain = XLSX.utils.json_to_sheet(data.mainData);
    // Attempt to set column widths roughly based on content
    const wscols = Object.keys(data.mainData[0] || {}).map(() => ({ wch: 20 }));
    wsMain['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, wsMain, "Sheet1");

    // Sheet 2: Erros por Carro
    const carData = data.errorsByCar.map(d => ({ "vehicle_ids": d.id, "erros": d.count }));
    const wsCar = XLSX.utils.json_to_sheet(carData);
    wsCar['!cols'] = [{ wch: 25 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsCar, "Erros por Carro");

    // Sheet 3: Erros por Condutor
    const driverData = data.errorsByDriver.map(d => ({ "driver_ids": d.id, "erros": d.count }));
    const wsDriver = XLSX.utils.json_to_sheet(driverData);
    wsDriver['!cols'] = [{ wch: 25 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsDriver, "Erros por Condutor");

    // Sheet 4: Resumo por Dia
    const summaryData = data.summaryByDay.map(d => ({
        "operational_date": d.date,
        "pass_count": d.pass,
        "fail_count": d.fail,
        "total": d.total,
        "percent_pass": d.percentPass
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
    const range = XLSX.utils.decode_range(wsSummary['!ref']!);

    // coluna 4 = percent_pass (começa do zero)
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 4 });
      if (wsSummary[cellAddress]) {
      wsSummary[cellAddress].t = 'n';
      wsSummary[cellAddress].z = '0.00%';
    }
  }
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo por Dia");

    XLSX.writeFile(wb, filename);
};