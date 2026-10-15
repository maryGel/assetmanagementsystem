// Builds a lookup of "number of items" (distinct FAC_NO) per document, per document type.
//
//   const itemCounts = buildItemCounts({ joDetails, trDetails, adDetails, assetAccDetails, assetLostDetails });
//   itemCounts['Job Order']['JO-0001']  // -> 3
//
// Each detail row is matched to its document through the first doc-number field found
// in `docFields` (case-insensitive). If your detail tables use a different column name
// for the document number, add it to the right list below.

const SOURCES = [
  { docType: 'Job Order',            key: 'joDetails',        docFields: ['JO_No', 'JONo', 'DocNo'] },
  { docType: 'Internal Transfer',             key: 'trDetails',        docFields: ['TR_No', 'TRNo', 'TRNO', 'Transfer_No', 'DocNo'] },
  { docType: 'Disposal',             key: 'adDetails',        docFields: ['AD_No', 'ADNo', 'Disposal_No', 'DocNo'] },
  { docType: 'Asset Accountability', key: 'assetAccDetails',  docFields: ['AAFNo', 'AANo', 'AccNo', 'DocNo'] },
  { docType: 'Lost Asset',           key: 'assetLostDetails', docFields: ['AAFNo', 'ALNo', 'LostNo', 'DocNo'] },
];

const FAC_FIELDS = ['FAC_NO', 'Fac_No', 'FacNo', 'fac_no', 'ItemNo'];

// Read the first matching field from a row, ignoring letter case.
function pick(row, names) {
  const lower = {};
  Object.keys(row).forEach((k) => { lower[k.toLowerCase()] = k; });
  for (const n of names) {
    const actual = lower[n.toLowerCase()];
    if (actual !== undefined && row[actual] !== null && row[actual] !== '') return row[actual];
  }
  return undefined;
}

export function buildItemCounts(detailsByKey = {}) {
  const result = {};

  SOURCES.forEach(({ docType, key, docFields }) => {
    const rows = Array.isArray(detailsByKey[key]) ? detailsByKey[key] : [];
    const perDoc = {}; // docNo -> Set of FAC_NO

    rows.forEach((row) => {
      const docNo = pick(row, docFields);
      const fac = pick(row, FAC_FIELDS);
      if (docNo === undefined || fac === undefined) return;
      const id = String(docNo).trim();
      if (!perDoc[id]) perDoc[id] = new Set();
      perDoc[id].add(String(fac).trim());
    });

    result[docType] = {};
    Object.keys(perDoc).forEach((id) => { result[docType][id] = perDoc[id].size; });
  });

  return result;
}