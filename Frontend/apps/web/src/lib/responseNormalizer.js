
export const normalizeStaticAnalysisResponse = (response) => {
  return {
    status: response?.analysis?.status,
    color_code: response?.analysis?.color_code,
    synthetic_ai: response?.analysis?.probabilities?.synthetic_ai ?? 0,
    authentic_human: response?.analysis?.probabilities?.authentic_human ?? 0,
    threat_level: response?.analysis?.threat_level,
    language: response?.languages_detected,
    action_report: response?.action_report || [],
    latency_ms: response?.latency_ms ?? 0
  };
};

export const normalizeLiveStreamFinalResponse = (backendResponse) => {
  return {
    status: backendResponse?.status || 'UNKNOWN',
    color_code: backendResponse?.color_code || '#ef4444',
    synthetic_ai: backendResponse?.probabilities?.synthetic_ai ?? 0,
    authentic_human: backendResponse?.probabilities?.authentic_human ?? 0,
    action_report: Array.isArray(backendResponse?.action_report) ? backendResponse.action_report : []
  };
};

export const normalizeLiveStreamChunkResponse = (backendResponse) => {
  return {
    status: backendResponse?.status || 'ANALYZING',
    color_code: backendResponse?.color_code || '#ef4444',
    synthetic_ai: backendResponse?.probabilities?.synthetic_ai ?? 0,
    authentic_human: backendResponse?.probabilities?.authentic_human ?? 0,
    latency_ms: backendResponse?.latency_ms ?? 0
  };
};
