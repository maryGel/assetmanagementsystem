// Place this file at: client/src/Modules/Reports/pages/lineItemReportPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, Radio, RadioGroup, TextField } from '@mui/material';
import { api } from '../../../api/axios';
import { CustomBtn } from '../../../Utils/groupbtns';
import { useRefAssetGroup } from '../../../hooks/refAssetGroup';
import { useRefCategory } from '../../../hooks/refCategory';
import { useRefItemClass } from '../../../hooks/refClass';
import LineItemReportTable, { buildColumns, exportValue } from '../lineItemReportTable';
import DownloadIcon from '@mui/icons-material/Download';
import WorkOrderDialog from '../../Movement/maintenance/workOrderDialog';
import { useJO_h} from '../../../hooks/useJO_h';

// Each of these maps to its own line-item table/API on the backend
// (Job Order -> jo_d, Transfer Order Form -> tr_d, Disposal Form -> ad_d,
// Asset Accountability Form -> assetaccd, Lost Asset Form -> assetLostD).
// Every one of those tables names its document-number column differently, so
// the /lineItemReport endpoint is expected to normalize it to a single `DocNo`
// field (and set `DocType` to one of the labels below) when it joins them in.
const transTypes = [
  'Job Order',
  'Transfer Order Form',
  'Disposal Form',
  'Asset Accountability Form',
  'Lost Asset Form',
];
const statuses = ['Pending JO', 'Ongoing Repair', 'For Repair Outsource', 'For Repair Inhouse', 'For Disposal', 'Disposed', 'Borrowed/Issues', 'Lost Asset'];
const emptyFilters = {
  docNo: [], docType: [], assetGroup: [], category: [], itemClass: [], activeOnly: 'all', status: [],
  acquiredFrom: '', acquiredTo: '', amountFrom: '', amountTo: '', writtenOff: 'all',
};
const emptyIncludes = { department: true, location: true, holder: false, brand: false, serialNumber: false, writtenOff: false, workOrderInfo: false };

export default function LineItemReportPage({ setHeaderTitle }) {
  const { assetGroups, assetGroupsRefresh } = useRefAssetGroup();
  const { refCategoryData, refreshRefCategories } = useRefCategory();
  const { refItemClassData, refreshItemClasses } = useRefItemClass();
  const [filters, setFilters] = useState(emptyFilters);
  const [includes, setIncludes] = useState(emptyIncludes);
  const [rows, setRows] = useState([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); const [pageSize, setPageSize] = useState(10); const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [woTarget, setWoTarget] = useState(null); // { JO_No, workNo } or null
  const {joHeaders = [], joRefresh,  updateJOHeader, createJOHeader, } = useJO_h();


  useEffect(() => { setHeaderTitle?.('Line Item Report'); }, [setHeaderTitle]);
  const options = useMemo(() => ({
    groups: assetGroups.map((item) => ({ label: item.AssetGroup, value: item.AssetGrpCode })),
    categories: refCategoryData.map((item) => item.category), classes: refItemClassData.map((item) => item.itemClass),
  }), [assetGroups, refCategoryData, refItemClassData]);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const buildParams = (nextPage, nextPageSize) => ({
    page: nextPage + 1, pageSize: nextPageSize,
    docNo: filters.docNo.join(','), docType: filters.docType.join(','),
    // assetGroup is sent as AssetGrpCode(s); the table displays the joined
    // refassetgroup.AssetGroup name that the API returns per row.
    assetGroup: filters.assetGroup.map((item) => item.value).join(','), category: filters.category.join(','), itemClass: filters.itemClass.join(','),
    status: filters.status.join(','), activeOnly: filters.activeOnly === 'active', // -> xStatus
    writtenOff: filters.writtenOff === 'all' ? undefined : filters.writtenOff === 'yes', // -> writeoff
    acquiredFrom: filters.acquiredFrom || undefined, acquiredTo: filters.acquiredTo || undefined,
    amountFrom: filters.amountFrom || undefined, amountTo: filters.amountTo || undefined,
  });
  const fetchReport = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    try {
      const response = await api.get('/lineItemReport', { params: buildParams(nextPage, nextPageSize) });
      setRows(response.data.data || []); setTotal(response.data.total || 0);
    } finally { setLoading(false); }
  };
  const go = () => { setPage(0); fetchReport(0); };
  const clear = () => { setFilters(emptyFilters); setIncludes(emptyIncludes); setRows([]); setTotal(0); setPage(0); };
  const refresh = async () => { await Promise.all([assetGroupsRefresh(), refreshRefCategories(), refreshItemClasses()]); fetchReport(0); };
  const EXPORT_PAGE_SIZE = 200;
  const exportToExcel = async () => {
    setExporting(true);
    try {
      // The API caps pageSize per request, so page through everything instead of asking for it all at once.
      const allRows = [];
      let currentPage = 0;
      let expectedTotal = Infinity;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const response = await api.get('/lineItemReport', { params: buildParams(currentPage, EXPORT_PAGE_SIZE) });
        const pageRows = response.data.data || [];
        expectedTotal = response.data.total ?? pageRows.length;
        allRows.push(...pageRows);
        if (pageRows.length === 0 || allRows.length >= expectedTotal) break;
        currentPage += 1;
      }
      const columns = buildColumns(includes);
      const header = columns.map(([, label]) => `"${label}"`).join(',');
      const body = allRows
        .map((row) => columns
          .map(([key]) => `"${String(exportValue(key, row[key])).replace(/"/g, '""')}"`)
          .join(','))
        .join('\n');
      const csv = `${header}\n${body}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `LineItemReport_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };
  const multi = (label, value, onChange, list) => <Autocomplete multiple limitTags={1} size="small" options={list} value={value} onChange={(_, next) => onChange(next)} renderInput={(params) => <TextField {...params} label={label} />} sx={{ minWidth: 220, flex: '1 1 220px' }} />;

  return <div className="w-full">
    <div className="flex flex-wrap items-start gap-2 p-4">
      <Autocomplete
        multiple
        freeSolo
        limitTags={1}
        size="small"
        options={[]}
        value={filters.docNo}
        onChange={(_, next) => set('docNo', next)}
        renderInput={(params) => <TextField {...params} label="Document No." placeholder="Type a doc no. and press Enter" />}
        sx={{ minWidth: 240, flex: '1 1 240px' }}
      />
      {multi('Document Type', filters.docType, (value) => set('docType', value), transTypes)}
      {multi('Asset Group', filters.assetGroup, (value) => set('assetGroup', value), options.groups)}
      {multi('Category', filters.category, (value) => set('category', value), options.categories)}
      {multi('Item Class', filters.itemClass, (value) => set('itemClass', value), options.classes)}
      {multi('Status', filters.status, (value) => set('status', value), statuses)}
      <div className='gap-2 py-2'>
        <div className='flex flex-wrap gap-2'>
          <TextField label="Acquired from" type="date" size="small" InputLabelProps={{ shrink: true }} value={filters.acquiredFrom} onChange={(event) => set('acquiredFrom', event.target.value)} />
          <TextField label="Acquired to" type="date" size="small" InputLabelProps={{ shrink: true }} value={filters.acquiredTo} onChange={(event) => set('acquiredTo', event.target.value)} />
          <TextField label="Cost Min" type="number" size="small" value={filters.amountFrom} onChange={(event) => set('amountFrom', event.target.value)} />
          <TextField label="Cost Max" type="number" size="small" value={filters.amountTo} onChange={(event) => set('amountTo', event.target.value)} />
          <FormControl sx={{border: '.5px solid', borderColor: 'divider', borderRadius: 1, p: 1}}><FormLabel>Written off</FormLabel><RadioGroup row value={filters.writtenOff} onChange={(event) => set('writtenOff', event.target.value)}><FormControlLabel value="all" control={<Radio />} label="All" /><FormControlLabel value="yes" control={<Radio />} label="Yes" /><FormControlLabel value="no" control={<Radio />} label="No" /></RadioGroup></FormControl>
          <FormControl sx={{border: '.5px solid', borderColor: 'divider', borderRadius: 1, p: 1}}><FormLabel>Show Active only</FormLabel><RadioGroup row value={filters.activeOnly} onChange={(event) => set('activeOnly', event.target.value)}><FormControlLabel value="all" control={<Radio />} label="All" /><FormControlLabel value="active" control={<Radio />} label="Active" /></RadioGroup></FormControl>
        </div>

        <FormControl component="fieldset" sx={{ minWidth: 260 }}><FormLabel>Includes</FormLabel><FormGroup row sx={{ columnGap: 0.5, rowGap: 0 }}>{Object.entries({ department: 'Department', location: 'Location', holder: 'Holder', brand: 'Brand', serialNumber: 'Serial Number', writtenOff: 'Written off', workOrderInfo: 'Work Details Info' }).map(([key, label]) => <FormControlLabel key={key} label={label} sx={{ mr: 0.75 }} control={<Checkbox size="small" checked={includes[key]} onChange={(event) => setIncludes((current) => ({ ...current, [key]: event.target.checked }))} />} />)}</FormGroup></FormControl>
      </div>
    </div>
    <div className="flex justify-end gap-2 p-3 pr-5 bg-gray-100">
      <CustomBtn variant="goBtn" iconType="go" onClick={go}>Go</CustomBtn>
      <CustomBtn variant="clearBtn" iconType="clear" onClick={clear}>Clear</CustomBtn>
      <CustomBtn variant="refreshBtn" iconType="refresh" onClick={refresh}>Refresh</CustomBtn>
      <CustomBtn variant="exportBtn" iconType="export" onClick={exportToExcel} disabled={exporting || total === 0}>{exporting ? 'Exporting…' : <DownloadIcon />}</CustomBtn>
    </div>
    <LineItemReportTable 
        rows={rows} 
        total={total} 
        page={page} 
        pageSize={pageSize} 
        loading={loading} 
        includes={includes} 
        onPageChange={(next) => { setPage(next); fetchReport(next); }} 
        onPageSizeChange={(next) => { setPageSize(next); setPage(0); fetchReport(0, next); }} 
        onWorkOrderClick={setWoTarget}
    />
    
    <WorkOrderDialog
        open={Boolean(woTarget)}
        onClose={() => setWoTarget(null)}
        jo={woTarget}
        updateJOHeader={updateJOHeader}   // wherever your JO-header update fn lives — not in any file you've shared yet
        onSaved={() => fetchReport(page)} // refresh the report row after a save, since it has no joRefresh/joDetailsRefresh of its own
    />
  </div>;


}