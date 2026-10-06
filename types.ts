export interface RawRow {
  driver_ids?: string;
  pattern_id?: string;
  trip_id?: string;
  vehicle_ids?: string;
  operational_date?: string;
  operational_status?: string;
  start_time_observed?: string;
  start_time_scheduled?: string;
  end_time_observed?: string;
  end_time_scheduled?: string;
  passengers_observed?: string;
  analysis_SIMPLE_THREE_VEHICLE_EVENTS?: string;
  analysis_SIMPLE_THREE_VEHICLE_EVENTS_reason?: string;
  justification_cause?: string;
  pto_message?: string;
  [key: string]: any;
}

export interface ProcessedRow {
  "operational_date": string;
  "pattern_id": string;
  "TRIP ID New": string;
  "trip_id": string;
  "vehicle_ids": string;
  "driver_ids": string;
  "passengers_observed": string;
  "start_time_scheduled": string;
  "start_time_observed": string;
  "end_time_scheduled": string;
  "end_time_observed": string;
  "analysis_SIMPLE_THREE_VEHICLE_EVENTS": string;
  "analysis_SIMPLE_THREE_VEHICLE_EVENTS_reason": string;
  "justification_cause": string;
  "pto_message": string;
}

export interface ErrorCount {
  id: string;
  count: number;
  tripIds: string[];
}

export interface DaySummary {
  date: string;
  pass: number;
  fail: number;
  total: number;
  percentPass: number;
  percentPassFormatted: string;
}

export interface ProcessedData {
  mainData: ProcessedRow[];
  errorsByCar: ErrorCount[];
  errorsByDriver: ErrorCount[];
  summaryByDay: DaySummary[];
}