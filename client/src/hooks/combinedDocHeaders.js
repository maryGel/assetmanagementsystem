// hooks/useCombinedDocHeaders.js
import { useMemo, useCallback } from 'react';

import { useJO_h } from './useJO_h';
import { useJO_d } from './useJO_d';
import { useTR_h } from './useTR_h';
import { useTR_d } from './useTR_d';
import { useAD_h } from './useAD_h';
import { useAD_d } from './useAD_d';
import { useAssetAccH } from './useAssetAccH';
import { useAssetAccD } from './useAssetAccD';
import { useAssetLostH } from './useAssetLostH';
import { useAssetLostD } from './useAssetLostD';

export const combinedDocHeaders = (useProps) => {
  // Job Orders Data
  const { joHeaders, isLoading: joLoading, error: joError, joRefresh } = useJO_h(useProps);

  // Transfer Data
  const { trHeaders, isLoading: trLoading, error: trError, trHRefresh } = useTR_h(useProps);

  // Disposal Data
  const { adHeaders, isLoading: adLoading, error: adError, adHRefresh } = useAD_h(useProps);

  // Asset Accountability Data
  const { assetAccHeaders, isLoading: accLoading, error: accError, accHRefresh } = useAssetAccH(useProps);

  // Asset Lost Data
  const { assetLostHeaders, isLoading: alostLoading, error: alostError, aLostHRefresh } = useAssetLostH(useProps);

  // Combine all documents
  const docHeaders = useMemo(() => {
    const joTrans = (joHeaders || []).map(jo => ({ 
      transNo: jo.JO_No, 
      type: 'Job Order', 
      status: jo.xpost, 
      rejected: jo.DISAPPROVED, 
      date: jo.xDate, 
      Remarks: jo.Remarks, 
      Departmnet: jo.Department_Code, 
      Location: jo.Department_Code, 
      Maintenance: jo.Sector_Name, 
      appStat: jo.appStat 
    }));
    
    const trTrans = (trHeaders || []).map(tr => ({ 
      transNo: tr.TR_No, 
      type: 'Transfer Order Form', 
      status: tr.xpost, 
      rejected: tr.DISAPPROVED, 
      date: tr.xDate, 
      Remarks: tr.Remarks, 
      Departmnet: tr.Department, 
      Location: tr.Department, 
      appStat: tr.appStat 
    }));
    
    const adTrans = (adHeaders || []).map(ad => ({ 
      transNo: ad.AD_No, 
      type: 'Disposal Form', 
      status: ad.xpost, 
      rejected: ad.DISAPPROVED, 
      date: ad.xDate, 
      Remarks: ad.Remarks, 
      Departmnet: ad.Department_Code, 
      appStat: ad.appStat 
    }));
    
    const aaTrans = (assetAccHeaders || []).map(aa => ({ 
      transNo: aa.AAFNo, 
      type: 'Asset Accountability Form', 
      status: aa.xPosted, 
      rejected: aa.DISAPPROVED, 
      date: aa.xDate, 
      Remarks: aa.Remarks, 
      Departmnet: aa.Dep, 
      appStat: aa.appStat 
    }));
    
    const alTrans = (assetLostHeaders || []).map(al => ({ 
      transNo: al.AAFNo, 
      type: 'Lost Asset Form', 
      status: al.xPosted, 
      rejected: al.DISAPPROVED, 
      date: al.xDate, 
      Remarks: al.Remarks, 
      Departmnet: al.Dep, 
      appStat: al.appStat 
    }));
    
    return [...joTrans, ...trTrans, ...adTrans, ...aaTrans, ...alTrans];
  }, [joHeaders, trHeaders, adHeaders, assetAccHeaders, assetLostHeaders]);

  // Combined loading state
  const isLoading = joLoading || trLoading || adLoading || accLoading || alostLoading;
  
  // Combined error state (first error found)
  const error = joError || trError || adError || accError || alostError;

  // Combined refresh function that refreshes all modules
  const refreshAll = useCallback(async () => {
    console.log('🔄 Refreshing all document headers...');
    
    const refreshPromises = [];
    
    // Collect all refresh functions
    if (joRefresh) refreshPromises.push(joRefresh());
    if (trHRefresh) refreshPromises.push(trHRefresh());
    if (adHRefresh) refreshPromises.push(adHRefresh());
    if (accHRefresh) refreshPromises.push(accHRefresh());
    if (aLostHRefresh) refreshPromises.push(aLostHRefresh());
    
    // Execute all refreshes in parallel
    await Promise.all(refreshPromises);
    
    console.log('✅ All document headers refreshed');
  }, [joRefresh, trHRefresh, adHRefresh, accHRefresh, aLostHRefresh]);

  return { 
    docHeaders, 
    isLoading, 
    error, 
    refreshAll,
    // Individual refresh functions if needed
    joRefresh,
    trHRefresh,
    adHRefresh,
    accHRefresh,
    aLostHRefresh
  };
};

export const useCombinedDocHeaders = (useProps) => {
  const { 
    docHeaders, 
    isLoading, 
    error, 
    refreshAll,
    joRefresh,
    trHRefresh,
    adHRefresh,
    accHRefresh,
    aLostHRefresh 
  } = combinedDocHeaders(useProps);
  
  return { 
    docHeaders, 
    isLoading, 
    error, 
    refetch: refreshAll, 
    joRefresh,
    trHRefresh,
    adHRefresh,
    accHRefresh,
    aLostHRefresh
  };
};