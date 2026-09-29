// hooks/useCombinedDocPerFacNo.js
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

// ---------------------------------------------------------------------------
// FIELD-NAME ASSUMPTIONS — CONFIRM THESE, then delete the fallback chains.
// ---------------------------------------------------------------------------
// Only useJO_d.js has shown a real field name so far: its updateJODetails
// payload sends "FAC_NO" on each JO detail row. Everything below extends
// that same assumption to the other four detail tables, and additionally
// assumes each detail table reuses its header's doc-number column as the
// join key (JO_No, TR_No, AD_No, AAFNo, AAFNo) — the same pattern
// combinedDocHeaders.js already relies on for the headers themselves, and a
// common FK-naming convention. But useTR_d, useAD_d, useAssetAccD and
// useAssetLostD never expose a row shape (they just setXDetails(data) with
// no field access), so none of this is confirmed for those four types.
//
// To confirm: console.log(data[0]) right after each set...Details(data)
// call in the five *_d.js hooks, or check the backend model for each table.
const getFacNo = (row) => row?.FAC_NO ?? row?.FacNO ?? row?.facNo ?? row?.Fac_No ?? '';
const getJoNo = (row) => row?.JO_No ?? row?.joNo ?? row?.JoNo ?? '';
const getTrNo = (row) => row?.TR_No ?? row?.trNo ?? row?.TrNo ?? '';
const getAdNo = (row) => row?.AD_No ?? row?.adNo ?? row?.AdNo ?? '';
const getAafNo = (row) => row?.AAFNo ?? row?.aafNo ?? row?.AafNo ?? '';

export const useCombinedDocPerFacNo = (facNo, useProps) => {
  // Headers — same five hooks combinedDocHeaders.js already uses.
  const { joHeaders, isLoading: joHLoading, error: joHError, joRefresh } = useJO_h(useProps);
  const { trHeaders, isLoading: trHLoading, error: trHError, trHRefresh } = useTR_h(useProps);
  const { adHeaders, isLoading: adHLoading, error: adHError, adHRefresh } = useAD_h(useProps);
  const { assetAccHeaders, isLoading: accHLoading, error: accHError, accHRefresh } = useAssetAccH(useProps);
  const { assetLostHeaders, isLoading: alostHLoading, error: alostHError, aLostHRefresh } = useAssetLostH(useProps);

  // Details — the line-item tables that actually carry FAC_NO.
  const { joDetails, isLoading: joDLoading, error: joDError, joDetailsRefresh } = useJO_d();
  const { trDetails, isLoading: trDLoading, error: trDError, trDRefresh } = useTR_d();
  const { adDetails, isLoading: adDLoading, error: adDError, adDRefresh } = useAD_d();
  const { assetAccDetails, isLoading: accDLoading, error: accDError, accDRefresh } = useAssetAccD();
  const { assetLostDetails, isLoading: alostDLoading, error: alostDError, aLostDRefresh } = useAssetLostD();

  // For each document type: filter its detail rows down to this asset,
  // then look up each matched row's parent header for date/status/remarks.
  const transactions = useMemo(() => {
    if (!facNo) return [];

    const joHeaderByNo = new Map((joHeaders || []).map((h) => [h.JO_No, h]));
    const trHeaderByNo = new Map((trHeaders || []).map((h) => [h.TR_No, h]));
    const adHeaderByNo = new Map((adHeaders || []).map((h) => [h.AD_No, h]));
    const accHeaderByNo = new Map((assetAccHeaders || []).map((h) => [h.AAFNo, h]));
    const alostHeaderByNo = new Map((assetLostHeaders || []).map((h) => [h.AAFNo, h]));

    const matchedAssetRows = (details, getDocNo, headerByNo) =>
      (details || [])
        .filter((d) => String(getFacNo(d)) === String(facNo))
        .map((d) => headerByNo.get(getDocNo(d)))
        .filter(Boolean);

    const joTrans = matchedAssetRows(joDetails, getJoNo, joHeaderByNo).map((h) => ({
      transNo: h.JO_No, type: 'Job Order', status: h.xpost,
      rejected: h.DISAPPROVED, date: h.xDate, Remarks: h.Remarks,
    }));

    const trTrans = matchedAssetRows(trDetails, getTrNo, trHeaderByNo).map((h) => ({
      transNo: h.TR_No, type: 'Transfer Order Form', status: h.xpost,
      rejected: h.DISAPPROVED, date: h.xDate, Remarks: h.Remarks,
    }));

    const adTrans = matchedAssetRows(adDetails, getAdNo, adHeaderByNo).map((h) => ({
      transNo: h.AD_No, type: 'Disposal Form', status: h.xpost,
      rejected: h.DISAPPROVED, date: h.xDate, Remarks: h.Remarks,
    }));

    const aaTrans = matchedAssetRows(assetAccDetails, getAafNo, accHeaderByNo).map((h) => ({
      transNo: h.AAFNo, type: 'Asset Accountability Form', status: h.xPosted,
      rejected: h.DISAPPROVED, date: h.xDate, Remarks: h.Remarks,
    }));

    const alTrans = matchedAssetRows(assetLostDetails, getAafNo, alostHeaderByNo).map((h) => ({
      transNo: h.AAFNo, type: 'Lost Asset Form', status: h.xPosted,
      rejected: h.DISAPPROVED, date: h.xDate, Remarks: h.Remarks,
    }));

    return [...joTrans, ...trTrans, ...adTrans, ...aaTrans, ...alTrans];
  }, [
    facNo,
    joHeaders, trHeaders, adHeaders, assetAccHeaders, assetLostHeaders,
    joDetails, trDetails, adDetails, assetAccDetails, assetLostDetails,
  ]);

  const isLoading = joHLoading || trHLoading || adHLoading || accHLoading || alostHLoading
    || joDLoading || trDLoading || adDLoading || accDLoading || alostDLoading;

  const error = joHError || trHError || adHError || accHError || alostHError
    || joDError || trDError || adDError || accDError || alostDError;

  const refetch = useCallback(async () => {
    const refreshes = [
      joRefresh, trHRefresh, adHRefresh, accHRefresh, aLostHRefresh,
      joDetailsRefresh, trDRefresh, adDRefresh, accDRefresh, aLostDRefresh,
    ].filter(Boolean);
    await Promise.all(refreshes.map((fn) => fn()));
  }, [
    joRefresh, trHRefresh, adHRefresh, accHRefresh, aLostHRefresh,
    joDetailsRefresh, trDRefresh, adDRefresh, accDRefresh, aLostDRefresh,
  ]);

  return { transactions, isLoading, error, refetch };
};