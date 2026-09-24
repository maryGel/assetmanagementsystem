import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/axios';
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';

import CreateAssetGenInfo from '../createAsset/createAssetGenInfo';
import CreateAssetCapitalization from '../createAsset/createAssetCapitalization';
import ValidationAlert from '../createAsset/assetValidationAlert';
import AssetFileUpload from '../createAsset/assetFileUpload';
import SummarySection from '../createAsset/summarySection';

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useRefCategory } from '../../../hooks/refCategory';
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';
import { useCompanyConfig } from '../../../hooks/useCompanyConfig';

import {
  assetMasterFields,
  requiredFields,
  prepareAssetPayload,
  validationFinalSubmission,
  getStepValidationErrors,
  isFieldMissing,
  toNumber
} from '../createAsset/assetMasterFields';

const steps = ['General Info', 'Capitalization Parameters', 'Upload Picture'];

// Fields we never copy from the source asset
const COPY_EXCLUDED = ['FacNO', 'uploadPicture'];

// DB dates come back as ISO timestamps; <input type="date"> needs YYYY-MM-DD
const toDateInput = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatMoney = (value) =>
  value === '' || value === null || value === undefined
    ? ''
    : toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// NOTE: props must be destructured. `function CreateAsset(setHeaderTitle)` receives the
// whole props object, so setHeaderTitle(...) would throw "is not a function".
export default function CreateAsset({ setHeaderTitle }) {
  const {
    singleAsset,
    fetchAssetByFacN0,
    clearSingleAsset,
    createAsset,
    isMutating,
    isLoadingSingle,
    error: assetError
  } = useAssetMasterData();

  const { refCategoryData } = useRefCategory();
  const { companyConfig } = useCompanyConfig();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Defaults to auto (on) while companyConfig is still loading, matching the
  // pre-toggle behavior so the form doesn't flash into manual mode on load.
  const autoNumbering = companyConfig ? !!Number(companyConfig.AutoFacNO ?? 1) : true;

  const [asset, setAsset] = useState(assetMasterFields);
  const [activeStep, setActiveStep] = useState(0);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [facNOLoading, setFacNOLoading] = useState(false);

  const copyFacN0 = searchParams.get('copyFrom');

  // ---------------------------------------------------------------------
  // Copy flow
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (copyFacN0) {
      fetchAssetByFacN0(copyFacN0).catch(() => {}); // error is exposed through assetError
    } else {
      clearSingleAsset();
    }
    return () => clearSingleAsset();
  }, [copyFacN0, fetchAssetByFacN0, clearSingleAsset]);

  useEffect(() => {
    if (!singleAsset) return;

    // Only copy known form fields (skips id, Picpath, xStatus, ...)
    const copied = {};
    Object.keys(assetMasterFields).forEach((key) => {
      if (!COPY_EXCLUDED.includes(key) && singleAsset[key] !== null && singleAsset[key] !== undefined) {
        copied[key] = singleAsset[key];
      }
    });

    setAsset({
      ...assetMasterFields,
      ...copied,
      FacNO: '', // regenerated from the category
      FacName: singleAsset.FacName ? `${singleAsset.FacName} (Copy)` : '',
      Adate: toDateInput(singleAsset.Adate),
      StartDate: toDateInput(singleAsset.StartDate),
      EndDate: toDateInput(singleAsset.EndDate),
      Percent: toNumber(singleAsset.Percent) > 0 ? singleAsset.Percent : 1
    });
  }, [singleAsset]);

  // ---------------------------------------------------------------------
  // Asset number: the server works out the next free number for the category
  // ---------------------------------------------------------------------
  const fetchNextFacNO = useCallback(async (category) => {
    const xCode = refCategoryData?.find((c) => c.category === category)?.xCode;
    if (!xCode) return '';
    const { data } = await api.get('/itemlist/next-facno', { params: { xCode } });
    return data.facNO || '';
  }, [refCategoryData]);

  useEffect(() => {
    // Manual mode: the user owns FacNO entirely, so don't touch it or call the server.
    if (!autoNumbering) {
      setFacNOLoading(false);
      return;
    }

    if (!asset.CATEGORY) {
      // Category cleared: don't keep a number that belongs to the previous one
      setFacNOLoading(false);
      setAsset((prev) => (prev.FacNO ? { ...prev, FacNO: '' } : prev));
      return;
    }

    let cancelled = false; // ignore stale responses when the category changes quickly
    setFacNOLoading(true);

    fetchNextFacNO(asset.CATEGORY)
      .then((newFacNO) => {
        if (cancelled) return;
        setAsset((prev) => ({ ...prev, FacNO: newFacNO }));
        if (!newFacNO && refCategoryData?.length) {
          setSubmitError(`Category "${asset.CATEGORY}" has no category code, so an asset number can't be generated.`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setAsset((prev) => ({ ...prev, FacNO: '' }));
        setSubmitError(`Could not generate the asset number: ${err.response?.data?.error || err.message}`);
      })
      .finally(() => {
        if (!cancelled) setFacNOLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [asset.CATEGORY, fetchNextFacNO, refCategoryData, autoNumbering]);

  // ---------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------
  const updateAssetData = (fieldsUpdates) => {
    setAsset((prev) => ({ ...prev, ...fieldsUpdates }));
  };

  const handleNext = () => {
    setSubmitError(null);

    const validationErrors = getStepValidationErrors(activeStep, asset, requiredFields);
    if (validationErrors.length > 0) {
      setSubmitError(validationErrors);
      return;
    }
    setActiveStep((prev) => prev + 1); // last step (steps.length - 1) -> summary (steps.length)
  };

  const handleBack = () => {
    setSubmitError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = () => {
    if (asset.uploadPicture?.preview) {
      URL.revokeObjectURL(asset.uploadPicture.preview);
    }
    setActiveStep(0);
    setAsset(assetMasterFields);
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    const validationErrors = validationFinalSubmission(asset, requiredFields);
    if (validationErrors.length > 0) {
      setSubmitError(validationErrors);
      return;
    }

    try {
      await createAsset(prepareAssetPayload(asset));
      setSubmitSuccess(true);

      setTimeout(() => {
        navigate(`/assetFolder/assetMasterDisplay?copyFrom=${asset.FacNO}`);
        setHeaderTitle?.('Asset Master Display');
      }, 2000);
    } catch (error) {
      // Someone else took this number between generation and submit
      if (error.response?.status === 409) {
        const takenFacNO = asset.FacNO;

        if (!autoNumbering) {
          setSubmitError(`Asset number ${takenFacNO} is already in use. Please enter a different number.`);
          return;
        }

        const newFacNO = await fetchNextFacNO(asset.CATEGORY).catch(() => '');
        if (newFacNO) updateAssetData({ FacNO: newFacNO });
        setSubmitError(
          `Asset number ${takenFacNO} was just taken.` +
          (newFacNO ? ` A new number (${newFacNO}) has been assigned. Please review and submit again.` : '')
        );
        return;
      }

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create asset';
      setSubmitError(`Error: ${errorMessage}`);
    }
  };

  // ---------------------------------------------------------------------
  // Step content
  // ---------------------------------------------------------------------
  const getStepContent = (step) => {
    const stepProps = {
      asset,
      updateAssetData,
      originalAsset: singleAsset,
      loading: isLoadingSingle,
      // Only surface the hook's error if loading the copy source failed. Otherwise a failed
      // submit would replace the whole form with "Error loading asset data".
      error: copyFacN0 && !singleAsset ? assetError : null,
      facNOLoading,
      autoNumbering
    };

    switch (step) {
      case 0:
        return <CreateAssetGenInfo {...stepProps} />;
      case 1:
        return <CreateAssetCapitalization {...stepProps} />;
      case 2:
        return <AssetFileUpload asset={asset} updateAssetData={updateAssetData} />;
      default:
        return 'Unknown step';
    }
  };

  // Builds one summary row. Required fields that are empty come through as '' so
  // SummarySection can flag them; a real 0 (e.g. residual value) is shown as 0.
  const field = (label, key, format = (v) => v) => {
    const required = key in requiredFields;
    return {
      label,
      required,
      value: required && isFieldMissing(key, asset) ? '' : format(asset[key])
    };
  };

  const summarySections = [
    {
      title: 'General Information',
      stepIndex: 0,
      fields: [
        field('Asset Number', 'FacNO'),
        field('Asset Name', 'FacName'),
        field('Description', 'Description'),
        field('Serial Number', 'serialNo'),
        field('Brand', 'Brand'),
        field('Reference No.', 'ReferenceNo'),
        field('Supplier', 'suppName'),
        field('Color', 'Color')
      ]
    },
    {
      title: 'Capitalization Details',
      stepIndex: 1,
      fields: [
        field('Category', 'CATEGORY'),
        field('Item Class', 'ItemClass'),
        field('Unit', 'Unit'),
        field('Quantity', 'balance_unit'),
        field('Acquisition Date', 'Adate'),
        field('Acquired Value', 'AAmount', formatMoney),
        field('Residual Value', 'Abre', formatMoney),
        field('Life in Years', 'Percent'),
        field('Location', 'ItemLocation'),
        field('Department', 'Department')
      ]
    },
    {
      title: 'Additional Information',
      stepIndex: 2,
      fields: [
        { label: 'Picture Uploaded', value: asset.uploadPicture?.file ? 'Yes' : 'No', required: false }
      ]
    }
  ];

  const renderFinalStepSummary = () => {
    const validationErrors = validationFinalSubmission(asset, requiredFields);

    return (
      <React.Fragment>
        <Box className="pl-4 mt-4 text-base">
          <Typography variant="h6" gutterBottom>
            Review and Submit
          </Typography>
        </Box>

        {summarySections.map((section) => (
          <SummarySection key={section.title} {...section} onEdit={setActiveStep} />
        ))}

        <ValidationAlert errors={validationErrors} type="warning" />

        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button color="inherit" onClick={handleBack} sx={{ mr: 1 }}>
            Back to Previous Step
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          <Button onClick={handleReset} variant="outlined" sx={{ mr: 1 }}>
            Reset All
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isMutating || submitSuccess || validationErrors.length > 0}
          >
            {isMutating ? <CircularProgress size={24} /> : 'Submit Asset'}
          </Button>
        </Box>
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ width: '100%', mt: 6, px: 30 }}>
      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Asset created successfully! Redirecting...
        </Alert>
      )}

      <ValidationAlert errors={submitError} />

      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === steps.length ? (
        renderFinalStepSummary()
      ) : (
        <React.Fragment>
          {getStepContent(activeStep)}
          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, px: 3 }}>
            <Button color="inherit" disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button onClick={handleNext} variant="contained" disabled={facNOLoading}>
              {activeStep === steps.length - 1 ? 'Review' : 'Next'}
            </Button>
          </Box>
        </React.Fragment>
      )}
    </Box>
  );
}