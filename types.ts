export interface RawRow {
  _id?: string; // may contain the operational_date embedded, e.g. "...-44-YYYYMMDD-..."
  driver_ids?: string;
  pattern_id?: string;
  trip_id?: string;
  vehicle_ids?: string;
  operational_date?: string;
  status?: string; // formerly "operational_status"
  start_time_observed?: string;
  start_time_scheduled?: string;
  end_time_observed?: string;
  end_time_scheduled?: string;
  validations_count?: string; // used as source for "passengers_observed" (no direct equivalent in new format)
  passengers_estimated?: string;
  "SIMPLE_THREE_VEHICLE_EVENTS-grade"?: string; // formerly "analysis_SIMPLE_THREE_VEHICLE_EVENTS"
  "SIMPLE_THREE_VEHICLE_EVENTS-reason"?: string; // formerly "analysis_SIMPLE_THREE_VEHICLE_EVENTS_reason"
  // "justification_cause" and "pto_message" have no equivalent column in the new format.
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