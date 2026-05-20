import { useMemo } from 'react';

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
  const {joHeaders, isLoading, error, joRefresh} = useJO_h(useProps);

  // Transfer Data
  const {trHeaders, trHRefresh} = useTR_h(useProps);

  // Disposal Data
  const {adHeaders, adHRefresh}  = useAD_h(useProps);

  // Asset Accountability Data
  const {assetAccHeaders, accHRefresh} = useAssetAccH(useProps);

  // Asset Lost Data
  const {assetLostHeaders, aLostHRefresh} = useAssetLostH(useProps);

  const docHeaders = useMemo(() => {
    const joTrans = (joHeaders || []).map(jo => ({ transNo: jo.JO_No, type: 'Job Order', status: jo.xpost, rejected: jo.DISAPPROVED, date: jo.xDate, Remarks: jo.Remarks, Departmnet: jo.Department_Code, Location: jo.Department_Code, Maintenance: jo.Sector_Name, appLevel: jo.appStat,  }));
    const trTrans = (trHeaders || []).map(tr => ({ transNo: tr.TR_No, type: 'Transfer Order Form', status: tr.xpost, rejected: tr.DISAPPROVED, date: tr.xDate, Remarks: tr.Remarks, Departmnet: tr.Department, Location: tr.Department, appLevel: tr.appStat }));
    const adTrans = (adHeaders || []).map(ad => ({ transNo: ad.AD_No, type: 'Disposal Form',  status: ad.xpost, rejected: ad.DISAPPROVED, date: ad.xDate, Remarks: ad.Remarks, Departmnet: ad.Department_Code, appLevel: ad.appStat }));
    const aaTrans = (assetAccHeaders || []).map(aa => ({ transNo: aa.AAFNo, type: 'Asset Accountability Form', status: aa.xPosted, rejected: aa.DISAPPROVED, date: aa.xDate, Remarks: aa.Remarks, Departmnet: aa.Dep, appLevel: aa.appStat }));
    const alTrans = (assetLostHeaders || []).map(al => ({ transNo: al.AAFNo, type: 'Lost Asset Form' , status: al.xPosted, rejected: al.DISAPPROVED, date: al.xDate, Remarks: al.Remarks, Departmnet: al.Dep, appLevel: al.appStat })); 
    
    return [...joTrans, ...trTrans, ...adTrans, ...aaTrans, ...alTrans];
  }, [joHeaders, trHeaders, adHeaders, assetAccHeaders, assetLostHeaders]);

  return docHeaders;
}


export const useCombinedDocHeaders = (useProps) => {
  const docHeaders = combinedDocHeaders(useProps);

  return { docHeaders };
};  