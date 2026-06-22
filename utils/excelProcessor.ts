import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { RawRow, ProcessedData, DaySummary, ErrorCount, ProcessedRow } from '../types';

/**
 * Core logic to transform raw JSON data into the Dashboard structure.
 * This is separated from the file parsing to support multiple parsers (XLSX and CSV).
 */
const analyzeRawData = (jsonData: RawRow[], tripMap: Map<string, {fleetNumber: string, employeeId: string}>): ProcessedData => {
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
    
    // Extract Trip ID from Column D (index 3) as requested, instead of Column C
    const rowKeys = Object.keys(row);
    const rawTripId = rowKeys.length > 8 ? row[rowKeys[8]] : row.trip_id;
    const tripId = String(rawTripId || "");

    const date = String(row.operational_date || "");
    
    // Python: .str.replace(r"\|.*?\|", "|X|", regex=True)
    const tripIdNew = tripId.replace(/\|.*?\|/g, "|X|") + "_" + date;

    let vehicleId = String(row.vehicle_ids || "").trim();
    let driverId = String(row.driver_ids || "").trim();

    if (tripMap.has(tripIdNew)) {
        const mappedData = tripMap.get(tripIdNew)!;
        if (!vehicleId || vehicleId === "(vazio)") {
            vehicleId = mappedData.fleetNumber;
        }
        if (!driverId || driverId === "(vazio)") {
            driverId = mappedData.employeeId;
        }
    }

    return {
      "operational_date": date,
      "pattern_id": String(row.pattern_id || ""),
      "TRIP ID New": tripIdNew,
      "trip_id": tripId,
      "vehicle_ids": vehicleId,
      "driver_ids": driverId,
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
  const carCountMap = new Map<string, string[]>();
  mainData.forEach(row => {
      const vid = String(row.vehicle_ids || "").trim();
      // Skip empty or placeholder values
      if (vid && vid !== "(vazio)") {
          if (!carCountMap.has(vid)) {
            carCountMap.set(vid, []);
          }
          carCountMap.get(vid)!.push(row["TRIP ID New"]);
      }
  });
  const errorsByCar: ErrorCount[] = Array.from(carCountMap.entries())
      .map(([id, tripIds]) => ({ id, count: tripIds.length, tripIds }))
      .sort((a, b) => b.count - a.count);

  // 5. Errors by Driver
  const driverCountMap = new Map<string, string[]>();
  mainData.forEach(row => {
      const did = String(row.driver_ids || "").trim();
      // Skip empty or placeholder values
      if (did && did !== "(vazio)") {
          if (!driverCountMap.has(did)) {
            driverCountMap.set(did, []);
          }
          driverCountMap.get(did)!.push(row["TRIP ID New"]);
      }
  });
  const errorsByDriver: ErrorCount[] = Array.from(driverCountMap.entries())
      .map(([id, tripIds]) => ({ id, count: tripIds.length, tripIds }))
      .sort((a, b) => b.count - a.count);

  return {
    mainData,
    errorsByCar,
    errorsByDriver,
    summaryByDay
  };
};

const parseSecondaryFile = (file: File): Promise<Map<string, {fleetNumber: string, employeeId: string}>> => {
    return new Promise((resolve, reject) => {
        const tripMap = new Map<string, {fleetNumber: string, employeeId: string}>();

        const processRows = (rows: any[][]) => {
            // rows is array of arrays [ [colA, colB, colC...], ... ]
            // Skip header (i=0)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 19) continue; // Need at least up to Col S (18)

                const fleetNumber = String(row[1] || "").trim(); // Col B
                const employeeId = String(row[2] || "").trim(); // Col C

                // Try to find GtfsTripID in G (6) or H (7)
                let gtfsTripId = String(row[6] || "").trim();
                if (!gtfsTripId.includes('|')) {
                    gtfsTripId = String(row[7] || "").trim();
                }

                if (!gtfsTripId || (!fleetNumber && !employeeId)) continue;

                // Time from Col S (18)  e.g., "2025-09-01 02:30:00"
                const dateTimeStr = String(row[18] || "").trim(); // YYYY-MM-DD HH:MM:SS
                if (dateTimeStr.length < 13) continue;

                const year = parseInt(dateTimeStr.substring(0, 4), 10);
                const month = parseInt(dateTimeStr.substring(5, 7), 10);
                const day = parseInt(dateTimeStr.substring(8, 10), 10);
                const hour = parseInt(dateTimeStr.substring(11, 13), 10);

                if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour)) continue;

                // Adjust date if hour is between 0 and 3
                let opDateObj = new Date(year, month - 1, day);
                if (hour >= 0 && hour <= 3) {
                    opDateObj.setDate(opDateObj.getDate() - 1);
                }

                const opYear = opDateObj.getFullYear();
                const opMonth = String(opDateObj.getMonth() + 1).padStart(2, '0');
                const opDay = String(opDateObj.getDate()).padStart(2, '0');
                const opDateStr = `${opYear}${opMonth}${opDay}`;

                // Extract parts from GtfsTripId: 4602_0_1|100|0435 -> 4602_0_1|X|0435
                const tripBase = gtfsTripId.replace(/\|.*?\|/g, "|X|");
                
                const newTripId = `${tripBase}_${opDateStr}`;
                tripMap.set(newTripId, { fleetNumber, employeeId });
            }
            resolve(tripMap);
        };

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                   processRows(results.data as any[][]);
                },
                error: reject
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                   const data = e.target?.result;
                   const workbook = XLSX.read(data, { type: 'array' });
                   const firstSheetName = workbook.SheetNames[0];
                   const worksheet = workbook.Sheets[firstSheetName];
                   const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                   processRows(rows as any[][]);
                } catch (err) {
                   reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        }
    });
};

export const processExcelData = async (file: File, secondaryFile?: File): Promise<ProcessedData> => {
  let tripMap = new Map<string, {fleetNumber: string, employeeId: string}>();
  
  if (secondaryFile) {
    try {
        tripMap = await parseSecondaryFile(secondaryFile);
    } catch (e) {
        console.error("Failed to parse secondary file:", e);
    }
  }

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
            const processed = analyzeRawData(results.data as RawRow[], tripMap);
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
        
        const processed = analyzeRawData(jsonData, tripMap);
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

    const applyProfessionalFormatting = (ws: XLSX.WorkSheet) => {
        if (!ws || !ws['!ref']) return;
        ws['!autofilter'] = { ref: ws['!ref'] };
        ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];
    };

    // Sheet 1: Main Data (Failures)
    const wsMain = XLSX.utils.json_to_sheet(data.mainData);
    // Attempt to set column widths roughly based on content
    const wscols = Object.keys(data.mainData[0] || {}).map(() => ({ wch: 20 }));
    wsMain['!cols'] = wscols;
    applyProfessionalFormatting(wsMain);
    XLSX.utils.book_append_sheet(wb, wsMain, "Sheet1");

    // Sheet 2: Erros por Carro
    const carData = data.errorsByCar.map(d => ({ "vehicle_ids": d.id, "erros": d.count }));
    const wsCar = XLSX.utils.json_to_sheet(carData);
    wsCar['!cols'] = [{ wch: 25 }, { wch: 10 }];
    applyProfessionalFormatting(wsCar);
    XLSX.utils.book_append_sheet(wb, wsCar, "Erros por Carro");

    // Sheet 3: Erros por Condutor
    const driverData = data.errorsByDriver.map(d => ({ "driver_ids": d.id, "erros": d.count }));
    const wsDriver = XLSX.utils.json_to_sheet(driverData);
    wsDriver['!cols'] = [{ wch: 25 }, { wch: 10 }];
    applyProfessionalFormatting(wsDriver);
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
    applyProfessionalFormatting(wsSummary);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo por Dia");

    XLSX.writeFile(wb, filename);
};