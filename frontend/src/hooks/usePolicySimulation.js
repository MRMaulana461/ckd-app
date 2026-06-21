// hooks/usePolicySimulation.js
//
// Replaces the old App.jsx pattern of calling computeResults/buildTimeSeries/
// buildPopulationFlow locally with a setTimeout. Now calls POST /policy-simulation
// and stores the full backend response (which already contains all 4 scenarios,
// time series, population flow, radar data, trade-offs, and a recommendation).
import { useState, useCallback } from 'react';
import api from '../api/client';

export function usePolicySimulation() {
  const [data, setData] = useState(null); // raw backend response for the active scenario request
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async ({ scenario, maxRows = null }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.policySimulation({ scenario, maxRows });
      setData(result);
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, run };
}

export default usePolicySimulation;
