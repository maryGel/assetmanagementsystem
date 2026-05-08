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
    const joTrans = (joHeaders || []).map(jo => ({ transNo: jo.JO_No, type: 'Job Order', status: jo.xpost, date: jo.xDate, Remarks: jo.Remarks, Departmnet: jo.Department_Code, Location: jo.Department_Code, Maintenance: jo.Sector_Name, appLevel: jo.appStat,  }));
    const trTrans = (trHeaders || []).map(tr => ({ transNo: tr.TR_No, type: 'Transfer Order Form', status: tr.xpost, date: tr.xDate, Remarks: tr.Remarks, Departmnet: tr.Department, Location: tr.Department, appLevel: tr.appStat }));
    const adTrans = (adHeaders || []).map(ad => ({ transNo: ad.AD_No, type: 'Disposal Form',  status: ad.xpost, date: ad.xDate, Remarks: ad.Remarks, Departmnet: ad.Department_Code, appLevel: ad.appStat }));
    const aaTrans = (assetAccHeaders || []).map(aa => ({ transNo: aa.AAFNo, type: 'Asset Accountability Form', status: aa.xPosted, date: aa.xDate, Remarks: aa.Remarks, Departmnet: aa.Dep, appLevel: aa.appStat }));
    const alTrans = (assetLostHeaders || []).map(al => ({ transNo: al.AAFNo, type: 'Lost Asset Form' , status: al.xPosted, date: al.xDate, Remarks: al.Remarks, Departmnet: al.Dep, appLevel: al.appStat })); 
    
    return [...joTrans, ...trTrans, ...adTrans, ...aaTrans, ...alTrans];
  }, [joHeaders, trHeaders, adHeaders, assetAccHeaders, assetLostHeaders]);

  return docHeaders;
}

const intialState = {
  docHeaders: [],
  displayedHeaders: [],
  singleDoc: null,
  isLoading: false,
  error: null,
  filters: {
    type: '',
    transNo: '',
    location: '',
    department: '',
    // status: ''
  },
  page: 0,
  pageSize: 10,
  total: 0,
};

function searchTransReducer(state, action) {
  switch (action.type) {
    case 'SET_DOC_HEADERS':
      return {
        ...state,
        docHeaders: action.payload,
        displayedHeaders: action.payload,
        isLoading: false,
        error: null
      };

    case 'SET_ALL_DOC_HEADERS':
      return {
        ...state,
        allDocHeaders: action.payload
      };

    case 'SET_SINGLE_DOC':
      return {
        ...state,
        singleDoc: action.payload,
        isLoading: false,
        error: null
      };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: action.payload
      };

    case 'LOADING':
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case 'ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    default:
      return state;
  }
}

export const useCombinedDocHeaders = (useProps) => {
  const docHeaders = combinedDocHeaders(useProps);

  return { docHeaders };
};  