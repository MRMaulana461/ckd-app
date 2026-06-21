// hooks/usePatientScenario.js
//
// Layer C: patient intervention simulation. Wraps POST /simulate-scenario.
import { useState, useCallback } from 'react';
import api from '../api/client';

export function usePatientScenario() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const simulate = useCallback(async (patient, interventions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.simulateScenario(patient, interventions);
      setResult(data);
      return data;
    } catch (e) {
      setError(e.message);
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, simulate, reset };
}

export default usePatientScenario;
