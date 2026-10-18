import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/axios';

const emptyLookups = {
  statuses: [],
  items: [],
  workOrders: [],
  jobOrders: [],
  maintenances: [],
  departments: [],
};

// Every filter is multi-select, so each one holds a list.
// items holds { FAC_NO, FAC_name } objects; the rest hold plain strings.
const emptyFilters = {
  statuses: [],
  items: [],
  workOrders: [],
  jobOrders: [],
  maintenances: [],
  departments: [],
};

// Shows the server's message plus the database detail (e.g. "Unknown column ...") when there is one
const apiError = (err, fallback) => {
  const data = err.response?.data;
  const base = data?.error || err.message || fallback;
  return data?.details ? `${base}: ${data.details}` : base;
};

export const useMaintenanceReport = () => {
  const [lookups, setLookups] = useState(emptyLookups);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const [filters, setFilters] = useState(emptyFilters);

  const [rows, setRows] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadLookups = useCallback(async () => {
    try {
      setLookupsLoading(true);
      const res = await api.get('/maintenanceReportRoute/lookups');
      if (!res.data || !Array.isArray(res.data.statuses)) {
        throw new Error('Maintenance report API not found. Check that /maintenanceReportRoute is mounted in server.js and the server was restarted.');
      }
      setLookups({ ...emptyLookups, ...res.data });
    } catch (err) {
      setError(apiError(err, 'Failed to load filter options'));
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Changing a filter invalidates the generated table
  const setFilter = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setRows([]);
    setGenerated(false);
  }, []);

  // GO
  const go = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Each multi-select filter is sent as one JSON array string
      const params = {};
      const add = (key, list) => {
        if (list && list.length > 0) params[key] = JSON.stringify(list);
      };
      add('status', filters.statuses);
      add('facNo', filters.items.map((item) => item.FAC_NO));
      add('workNo', filters.workOrders);
      add('joNo', filters.jobOrders);
      add('maintenance', filters.maintenances);
      add('department', filters.departments);

      const res = await api.get('/maintenanceReportRoute', { params });
      if (!Array.isArray(res.data)) {
        throw new Error('Maintenance report API not found. Check that /maintenanceReportRoute is mounted in server.js and the server was restarted.');
      }
      setRows(res.data);
      setGenerated(true);
    } catch (err) {
      setRows([]);
      setGenerated(false);
      setError(apiError(err, 'Failed to generate the report'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Clear: resets all six filters, the table and any error
  const clear = useCallback(() => {
    setFilters(emptyFilters);
    setRows([]);
    setGenerated(false);
    setError(null);
  }, []);

  // Refresh: reload the filter options and, if a report is showing, regenerate it
  const refresh = useCallback(async () => {
    await loadLookups();
    if (generated) await go();
  }, [loadLookups, generated, go]);

  return {
    lookups,
    lookupsLoading,
    filters,
    rows,
    generated,
    isLoading,
    error,
    setFilter,
    go,
    clear,
    refresh,
  };
};