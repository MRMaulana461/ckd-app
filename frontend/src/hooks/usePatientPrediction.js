// hooks/usePatientPrediction.js
//
// Layer B: manual single-patient prediction. Wraps POST /predict.
import { useState, useCallback } from 'react';
import api from '../api/client';

export function usePatientPrediction() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorField, setErrorField] = useState(null);

  const predict = useCallback(async (patient) => {
    setLoading(true);
    setError(null);
    setErrorField(null);
    try {
      const data = await api.predictPatient(patient);
      setResult(data);
      return data;
    } catch (e) {
      setError(e.message);
      setErrorField(e.field || null);
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setErrorField(null);
  }, []);

  return { result, loading, error, errorField, predict, reset };
}

export default usePatientPrediction;
