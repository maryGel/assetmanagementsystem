import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Snackbar, Alert, CircularProgress, Box } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BuildIcon from '@mui/icons-material/Build';
import FlagIcon from '@mui/icons-material/Flag';
import TagIcon from '@mui/icons-material/Tag';

// Reusable components
import DocStatusDashboard from '../../../components/DocStatusDashboard';
import FilterAutocomplete from '../../../components/FilterAutocomplete';
import SearchTransactionTable from '../searchTrans/searchTransTable';
import JobOrderDialog from '../jobOrder/JobOrderDialog';

// Utils
import { CustomBtn } from '../../../Utils/groupbtns';
import BulkActionDialogDesktop from '../../../Utils/BulkActionDialogDesktop';

// Hooks
import { useCombinedDocHeaders } from '../../../hooks/combinedDocHeaders';
import { useRefDepartment } from '../../../hooks/refDepartment';
import { useSections } from '../../../hooks/refSection';
import { useBulkApproval } from '../../../hooks/useBulkApproval';
import { useJobOrderApproval } from '../../../hooks/useJobOrderApproval';
import { useUsers } from '../../../hooks/useUsers';
import { buildItemCounts } from '../../../hooks/itemCount';
import { useJO_d } from '../../../hooks/useJO_d';

const DOC_TYPE = 'Job Order';

const STATUS_OPTIONS = [
  { status: 0, label: 'Draft' },
  { status: 3, label: 'For Approval' },
  { status: 2, label: 'Partially Approved' },
  { status: 1, label: 'Fully Approved' },
  { status: 4, label: 'Rejected' },
];

const EMPTY_FILTERS = { department: [], maintenance: [], status: [], joNo: [] };

// Field helpers (combined headers use slightly different field names)
const norm = (v) => String(v ?? '').trim().toLowerCase();
const getDept = (doc) => doc.Departmnet || doc.Department_Code || doc.Department || '';
const getStatus = (doc) => Number(doc.status);

// combinedDocHeaders puts the Job Order's maintenance service in "Maintenance"
// (possibly as a section code). Do NOT fall back to "Location": for Job Orders
// that holds the Department code, which made the filter compare the wrong thing.
const MAINT_FIELDS = ['Maintenance', 'Section', 'section', 'SecCode', 'Sector_Name', 'Sector_name'];
const getRawMaint = (doc) => {
  for (const f of MAINT_FIELDS) {
    const v = doc?.[f];
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }
  return '';
};

export default function JobOrderPage(useProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------- Data ----------
  const { docHeaders = [], isLoading, error, refetch } = useCombinedDocHeaders(useProps);
  const { refDeptData = [] } = useRefDepartment(useProps);
  const { refSections = [] } = useSections();
  const { joDetails } = useJO_d();
  const { selectedUser, setSelectedUser } = useUsers();

  const jobOrders = useMemo(
    () => (Array.isArray(docHeaders) ? docHeaders.filter((d) => d?.type === DOC_TYPE) : []),
    [docHeaders]
  );

  // ---------- Maintenance lookup ----------
  // Maps any value of a section row (code, id, description) to its xdesc,
  // so a doc holding a section code still matches the description shown
  // in the Maintenance filter.
  const sectionLookup = useMemo(() => {
    const map = new Map();
    refSections.forEach((s) => {
      if (!s?.xdesc) return;
      Object.values(s).forEach((v) => {
        if (v !== null && v !== undefined && typeof v !== 'object' && String(v).trim() !== '') {
          if (!map.has(norm(v))) map.set(norm(v), s.xdesc);
        }
      });
    });
    // descriptions always win over codes/ids
    refSections.forEach((s) => s?.xdesc && map.set(norm(s.xdesc), s.xdesc));
    return map;
  }, [refSections]);

  const getMaint = useCallback(
    (doc) => {
      const raw = getRawMaint(doc);
      if (raw === '') return '';
      return sectionLookup.get(norm(raw)) || String(raw).trim();
    },
    [sectionLookup]
  );

  // Dev hint: if no Job Order carries a maintenance field at all, the
  // backend query behind useCombinedDocHeaders is not selecting it.
  useEffect(() => {
    if (!jobOrders.length) return;
    if (!jobOrders.some((d) => getRawMaint(d) !== '')) {
      console.warn(
        '[JobOrderPage] No maintenance/section field found on Job Order headers. ' +
          'See the combinedDocHeaders warning for the raw Job Order columns. Fields received:',
        Object.keys(jobOrders[0])
      );
    }
  }, [jobOrders]);

  const itemCounts = useMemo(
    () =>
      buildItemCounts({
        joDetails,
        trDetails: [],
        adDetails: [],
        assetAccDetails: [],
        assetLostDetails: [],
      }),
    [joDetails]
  );

  // ---------- Filter options ----------
  const departmentOptions = useMemo(() => refDeptData.map((d) => d.Department), [refDeptData]);
  const maintenanceOptions = useMemo(
    () => [...new Set(refSections.map((s) => s.xdesc).filter(Boolean))],
    [refSections]
  );
  const joNoOptions = useMemo(
    () =>
      jobOrders
        .map((d) => d.transNo)
        .filter((n) => typeof n === 'string' && n)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })),
    [jobOrders]
  );

  // ---------- Filter state ----------
  const [draft, setDraft] = useState(EMPTY_FILTERS);     // what the user is selecting
  const [applied, setApplied] = useState(EMPTY_FILTERS); // what the table uses
  const [activeCard, setActiveCard] = useState(null);    // dashboard selection
  const [hasSearched, setHasSearched] = useState(false); // table stays empty until Go / dashboard

  const setDraftField = (field) => (value) => setDraft((prev) => ({ ...prev, [field]: value }));

  // ---------- Table state ----------
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // ---------- Dialog state ----------
  const [dialog, setDialog] = useState({ open: false, docNo: null, create: false });

  // ---------- Toast ----------
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const showToast = useCallback((message, severity = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  // ---------- User info (for approvals) ----------
  const userName = localStorage.getItem('username') || 'User';
  const rawUserId = localStorage.getItem('userId') || userName;
  const cleanUserId = String(rawUserId).replace(/\s*-\s*$/, '').trim();

  useEffect(() => {
    if (userName && userName !== 'User') setSelectedUser(userName);
  }, [userName, setSelectedUser]);

  const getUserInfo = useCallback(
    () => ({
      user: cleanUserId,
      fname: selectedUser?.fname || '',
      lname: selectedUser?.lname || '',
      multiApp: selectedUser?.multiApp || [],
    }),
    [selectedUser, cleanUserId]
  );

  // ---------- Deep links: ?docId=JO-0001 opens the dialog, ?status=3 filters ----------
  useEffect(() => {
    const docId = searchParams.get('docId');
    if (docId) setDialog({ open: true, docNo: docId, create: false });

    const statusParam = searchParams.get('status');
    if (statusParam !== null && STATUS_OPTIONS.some((o) => o.status === Number(statusParam))) {
      const s = Number(statusParam);
      setActiveCard(s);
      setDraft((prev) => ({ ...prev, status: STATUS_OPTIONS.filter((o) => o.status === s) }));
      setApplied((prev) => ({ ...prev, status: STATUS_OPTIONS.filter((o) => o.status === s) }));
      setHasSearched(true);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Filtering ----------
  const filteredDocs = useMemo(() => {
    if (!hasSearched) return [];
    const statusCodes = applied.status.map((o) => o.status);
    const maintSet = new Set(applied.maintenance.map(norm));
    const deptSet = new Set(applied.department.map(norm));
    return jobOrders.filter((doc) => {
      if (applied.joNo.length && !applied.joNo.includes(doc.transNo)) return false;
      if (deptSet.size && !deptSet.has(norm(getDept(doc)))) return false;
      if (maintSet.size && !maintSet.has(norm(getMaint(doc)))) return false;
      if (statusCodes.length && !statusCodes.includes(getStatus(doc))) return false;
      return true;
    });
  }, [jobOrders, applied, hasSearched, getMaint]);

  // Back to page 1 whenever the result set changes shape
  useEffect(() => {
    setPage(0);
  }, [applied]);

  const tableData = useMemo(
    () =>
      filteredDocs.map((doc) => ({
        DocNo: doc.transNo,
        DocType: doc.type,
        Date: doc.date,
        Status: doc.status,
        Remarks: doc.Remarks,
        Department: getDept(doc),
        Location: doc.Location || '',
        Maintenance: getMaint(doc), // own column, enabled with showMaintenance
        Rejected: doc.DISAPPROVED,
        appStat: doc.appStat || '',
      })),
    [filteredDocs, getMaint]
  );

  const selectedDocuments = useMemo(
    () =>
      filteredDocs
        .filter((doc) => selected.includes(doc.transNo))
        .map((doc) => ({
          DocNo: doc.transNo,
          DocType: doc.type,
          Status: doc.status,
          appStat: doc.appStat || '',
          Remarks: doc.Remarks,
          Department: getDept(doc),
          Location: doc.Location || '',
          Rejected: doc.DISAPPROVED,
          ...doc,
          Maintenance: getMaint(doc),
        })),
    [filteredDocs, selected, getMaint]
  );

  // ---------- Actions ----------
  const handleGo = () => {
    setSelected([]);
    setApplied(draft);
    setHasSearched(true);
    // keep the dashboard highlight in sync with a single selected status
    const codes = draft.status.map((o) => o.status);
    setActiveCard(codes.length === 1 ? codes[0] : null);
  };

  const handleClear = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setActiveCard(null);
    setHasSearched(false);
    setSelected([]);
    showToast('Filters cleared', 'info');
  };

  const refreshData = useCallback(
    async ({ silent = false } = {}) => {
      setIsRefreshing(true);
      try {
        if (refetch) await refetch();
        setDataVersion((v) => v + 1);
        setSelected([]);
        if (!silent) showToast('Data refreshed successfully', 'success');
      } catch (err) {
        showToast('Failed to refresh data: ' + err.message, 'error');
      } finally {
        setIsRefreshing(false);
      }
    },
    [refetch, showToast]
  );

  // Dashboard click: filter the table by that status immediately.
  // Clicking the active card again (status === null) un-selects it and
  // empties the table, the same as before any search.
  const handleCardSelect = (status) => {
    setActiveCard(status);
    setSelected([]);
    if (status === null) {
      setDraft((prev) => ({ ...prev, status: [] }));
      setApplied((prev) => ({ ...prev, status: [] }));
      setHasSearched(false);
      return;
    }
    const statusFilter = STATUS_OPTIONS.filter((o) => o.status === status);
    setDraft((prev) => ({ ...prev, status: statusFilter }));
    setApplied((prev) => ({ ...prev, status: statusFilter }));
    setHasSearched(true);
  };

  const openCreate = () => setDialog({ open: true, docNo: null, create: true });
  const openDocument = (row) => setDialog({ open: true, docNo: row.DocNo, create: false });

  const closeDialog = () => {
    setDialog({ open: false, docNo: null, create: false });
    if (searchParams.get('docId')) {
      searchParams.delete('docId');
      setSearchParams(searchParams, { replace: true });
    }
    refreshData({ silent: true });
  };

  // ---------- Bulk approval (Job Order only) ----------
  const jobOrderHook = useJobOrderApproval();
  const {
    bulkDialogOpen,
    bulkActionType,
    bulkItemNames,
    bulkRemarks,
    bulkLoading,
    bulkError,
    openBulkDialog,
    executeBulkAction,
    closeBulkDialog,
    setBulkRemarks,
  } = useBulkApproval({
    approvalHooks: {
      jobOrder: {
        approveDocument: jobOrderHook.approveJobOrder,
        rejectDocument: jobOrderHook.rejectJobOrder,
      },
    },
    onRefresh: () => refreshData({ silent: true }),
    showToast,
    getUserInfo,
  });

  const handleBulkApprove = useCallback(() => {
    if (!selectedDocuments.length) return showToast('Please select documents to approve', 'warning');
    openBulkDialog('approve', selectedDocuments);
  }, [openBulkDialog, selectedDocuments, showToast]);

  const handleBulkReject = useCallback(() => {
    if (!selectedDocuments.length) return showToast('Please select documents to reject', 'warning');
    openBulkDialog('reject', selectedDocuments);
  }, [openBulkDialog, selectedDocuments, showToast]);

  // ---------- Render ----------
  return (
    <div className="flex flex-col w-full gap-4 ">
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={(e, reason) => reason !== 'clickaway' && setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ width: '100%' }}
          onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>

      {/* 1. Dashboard */}
      <div className='px-9'>
        <DocStatusDashboard
          docs={jobOrders}
          getStatus={getStatus}
          activeStatus={activeCard}
          onSelect={handleCardSelect}
          loading={isLoading}
        />
      </div>

      {/* 2. Filters + 3. Buttons */}
      <div className="flex flex-col gap-3 p-5 m-3 border border-gray-200 shadow-sm bg-neutral-100 rounded-xl">
        <div className="flex flex-wrap gap-3">
          <FilterAutocomplete
            label="Job Order No."
            icon={TagIcon}
            options={joNoOptions}
            value={draft.joNo}
            onChange={setDraftField('joNo')}
          />
          <FilterAutocomplete
            label="Department"
            icon={ApartmentIcon}
            options={departmentOptions}
            value={draft.department}
            onChange={setDraftField('department')}
          />
          <FilterAutocomplete
            label="Maintenance"
            icon={BuildIcon}
            options={maintenanceOptions}
            value={draft.maintenance}
            onChange={setDraftField('maintenance')}
          />
          <FilterAutocomplete
            label="Document Status"
            icon={FlagIcon}
            options={STATUS_OPTIONS}
            value={draft.status}
            onChange={setDraftField('status')}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.status === v.status}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <CustomBtn variant="goBtn" iconType="go" onClick={handleGo}>
            Go
          </CustomBtn>
          <CustomBtn variant="clearBtn" iconType="clear" onClick={handleClear}>
            Clear
          </CustomBtn>
          {isRefreshing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
              <CircularProgress size={20} />
              <span className="text-sm text-gray-600">Refreshing...</span>
            </Box>
          ) : (
            <CustomBtn variant="refreshBtn" iconType="refresh" onClick={() => refreshData()}>
              Refresh
            </CustomBtn>
          )}
          <CustomBtn variant="createBtn" iconType="add" onClick={openCreate}>
            Create New Job Order
          </CustomBtn>
        </div>
      </div>

      {/* 4. Table (reused) */}
      <SearchTransactionTable
        key={`jo-table-${dataVersion}`}
        title="Job Orders"
        showMaintenance
        emptyMessage={
          hasSearched
            ? 'No Job Orders match the selected filters.'
            : 'Select filters and click Go, or click a dashboard card to load Job Orders.'
        }
        loading={isLoading && !jobOrders.length}
        error={error}
        displayedDocs={tableData}
        page={page}
        total={filteredDocs.length}
        setPage={setPage}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        isTableActive
        selected={selected}
        setSelected={setSelected}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        selectedDocuments={selectedDocuments}
        isRefreshing={isRefreshing}
        dataVersion={dataVersion}
        itemCounts={itemCounts}
        onOpenDocument={openDocument}
      />

      <BulkActionDialogDesktop
        isOpen={bulkDialogOpen}
        onClose={closeBulkDialog}
        onConfirm={executeBulkAction}
        actionType={bulkActionType}
        itemCount={bulkItemNames.length}
        itemNames={bulkItemNames}
        loading={bulkLoading}
        remarks={bulkRemarks}
        onRemarksChange={setBulkRemarks}
        error={bulkError}
      />

      <JobOrderDialog
        open={dialog.open}
        initialDocNo={dialog.docNo}
        startInCreate={dialog.create}
        joNumbers={joNoOptions}
        onClose={closeDialog}
        onDataChanged={() => refreshData({ silent: true })}
      />
    </div>
  );
}