export const LIMITS = {
  nameMaxLength: 120,
  companyMaxLength: 120,
  phoneMaxLength: 32,
  phoneMinDigits: 7,
  phoneMaxDigits: 15,
  noteMaxLength: 5000,
  noteCounterThreshold: 4500,
  searchMaxLength: 100,
  leadsPageSize: 30,
  activitiesPageSize: 50,
} as const;

export const TIMING = {
  searchDebounceMs: 250,
  undoToastMs: 6000,
  nowTickMs: 60_000,
  staleTimeMs: 30_000,
  highlightMs: 2400,
  maxQueryRetries: 2,
} as const;
