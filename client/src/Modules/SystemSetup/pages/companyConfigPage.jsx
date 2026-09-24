import { useState, useEffect, useRef } from 'react';
import { CustomBtn } from '../../../Utils/groupbtns';
import { useCompanyConfig } from '../../../hooks/useCompanyConfig';

// Auto-numbering fields shown in the Advanced Setup section.
// label -> DB column on user0002inv
const AUTO_NUMBER_FIELDS = [
  { label: 'Job Order Form', field: 'XJONum' },
  { label: 'Transfer Order Form', field: 'XTRNum' },
  { label: 'Asset Disposal Form', field: 'XADNum' },
  { label: 'Asset Accountability Form', field: 'XAANum' },
  { label: 'Lost Asset Form', field: 'XALNum' },
  { label: 'Work Order Form', field: 'AutoWO' },
];

const emptyForm = {
  Company: '',
  address: '',
  CompTel: '',
  CInitial: '',
  XJONum: 0,
  XTRNum: 0,
  XADNum: 0,
  XAANum: 0,
  XALNum: 0,
  AutoWO: 0,
  AutoFacNO: 1, // default on: asset numbers are generated from the category code
};

export default function CompanySetupPage() {
  const {
    companyConfig,
    isLoading,
    isSaving,
    error,
    refreshCompanyConfig,
    saveCompanyConfig,
    uploadCompanyLogo,
  } = useCompanyConfig();

  const [isEditing, setIsEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Sync the form with whatever is loaded from the server
  useEffect(() => {
    if (companyConfig) {
      setFormData({
        Company: companyConfig.Company || '',
        address: companyConfig.address || '',
        CompTel: companyConfig.CompTel || '',
        CInitial: companyConfig.CInitial || '',
        XJONum: companyConfig.XJONum ?? 0,
        XTRNum: companyConfig.XTRNum ?? 0,
        XADNum: companyConfig.XADNum ?? 0,
        XAANum: companyConfig.XAANum ?? 0,
        XALNum: companyConfig.XALNum ?? 0,
        AutoWO: companyConfig.AutoWO ?? 0,
        // Coerce whatever the DB gives back (0/1, null, "1") into a clean boolean-ish 0/1
        AutoFacNO: companyConfig.AutoFacNO === undefined || companyConfig.AutoFacNO === null
          ? 1
          : Number(companyConfig.AutoFacNO),
      });
    }
  }, [companyConfig]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.checked ? 1 : 0 }));
  };

  const handleLogoPick = () => {
    if (isEditing) fileInputRef.current?.click();
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleEdit = () => {
    setSaveMessage(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (companyConfig) {
      setFormData({
        Company: companyConfig.Company || '',
        address: companyConfig.address || '',
        CompTel: companyConfig.CompTel || '',
        CInitial: companyConfig.CInitial || '',
        XJONum: companyConfig.XJONum ?? 0,
        XTRNum: companyConfig.XTRNum ?? 0,
        XADNum: companyConfig.XADNum ?? 0,
        XAANum: companyConfig.XAANum ?? 0,
        XALNum: companyConfig.XALNum ?? 0,
        AutoWO: companyConfig.AutoWO ?? 0,
        AutoFacNO: companyConfig.AutoFacNO === undefined || companyConfig.AutoFacNO === null
          ? 1
          : Number(companyConfig.AutoFacNO),
      });
    }
    setLogoFile(null);
    setLogoPreview(null);
    setSaveMessage(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaveMessage(null);

    const payload = {
      ...formData,
      // Auto-numbering fields must be persisted as numbers
      XJONum: Number(formData.XJONum) || 0,
      XTRNum: Number(formData.XTRNum) || 0,
      XADNum: Number(formData.XADNum) || 0,
      XAANum: Number(formData.XAANum) || 0,
      XALNum: Number(formData.XALNum) || 0,
      AutoWO: Number(formData.AutoWO) || 0,
      AutoFacNO: formData.AutoFacNO ? 1 : 0,
    };

    const result = await saveCompanyConfig(payload);

    if (result.success && logoFile) {
      const logoResult = await uploadCompanyLogo(logoFile);
      if (!logoResult.success) {
        setSaveMessage({ type: 'error', text: `Saved, but logo upload failed: ${logoResult.error}` });
        setIsEditing(false);
        setLogoFile(null);
        return;
      }
    }

    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Company setup saved successfully.' });
      setLogoFile(null);
      setIsEditing(false);
    } else {
      setSaveMessage({ type: 'error', text: result.error });
    }
  };

  const logoSrc = logoPreview || companyConfig?.ReportHeader || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading company setup...
      </div>
    );
  }

  return (
    <div className="max-w-3xl p-6 mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Company Setup</h1>
        <div className="flex gap-2">
          {!isEditing ? (
            <CustomBtn variant="editBtn" iconType="edit" onClick={handleEdit}>
              Edit
            </CustomBtn>
          ) : (
            <>
              <CustomBtn
                variant="saveBtn"
                iconType="save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </CustomBtn>
              <CustomBtn variant="cancelBtn" iconType="cancel" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </CustomBtn>
            </>
          )}
          <CustomBtn
            variant="refreshBtn"
            iconType="refresh"
            onClick={refreshCompanyConfig}
            disabled={isEditing || isSaving}
            title="Refresh"
          >
            Refresh
          </CustomBtn>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded">
          {error}
        </div>
      )}
      {saveMessage && (
        <div
          className={`p-3 text-sm border rounded ${
            saveMessage.type === 'success'
              ? 'text-green-700 bg-green-100 border-green-300'
              : 'text-red-700 bg-red-100 border-red-300'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* ===================== Basic Info ===================== */}
      <div className="p-5 space-y-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <div
            onClick={handleLogoPick}
            className={`flex items-center justify-center w-24 h-24 overflow-hidden bg-gray-100 border border-gray-300 rounded ${
              isEditing ? 'cursor-pointer hover:bg-gray-200' : ''
            }`}
            title={isEditing ? 'Click to upload logo' : ''}
          >
            {logoSrc ? (
              <img src={logoSrc} alt="Company logo" className="object-contain w-full h-full" />
            ) : (
              <span className="px-2 text-xs text-center text-gray-400">No logo</span>
            )}
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Company Logo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
            {isEditing && (
              <CustomBtn variant="createBtn" onClick={handleLogoPick} className="text-sm">
                {logoSrc ? 'Change Logo' : 'Upload Logo'}
              </CustomBtn>
            )}
            <p className="mt-1 text-xs text-gray-400">PNG, JPG, WEBP, or SVG. Max 2MB.</p>
          </div>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Company Name</label>
          <input
            type="text"
            value={formData.Company}
            onChange={handleChange('Company')}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter company name"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Company Address</label>
          <textarea
            value={formData.address}
            onChange={handleChange('address')}
            disabled={!isEditing}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter company address"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Contact Information</label>
          <input
            type="text"
            value={formData.CompTel}
            onChange={handleChange('CompTel')}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Phone / email / contact details"
          />
        </div>
      </div>

      {/* ===================== Advanced Setup ===================== */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center justify-between w-full px-5 py-4 text-left"
        >
          <span className="text-base font-semibold text-gray-800">Advanced Setup</span>
          <span className="text-gray-400">{showAdvanced ? '\u2212' : '+'}</span>
        </button>

        {showAdvanced && (
          <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
            <div className="pt-4">
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Company Initial Transaction Format
              </label>
              <input
                type="text"
                value={formData.CInitial}
                onChange={handleChange('CInitial')}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500 md:w-1/2"
                placeholder="e.g. COMP-"
              />
              <p className="mt-1 text-xs text-gray-400">
                Prefix/format used when generating new transaction numbers.
              </p>
            </div>

            <div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={!!formData.AutoFacNO}
                  onChange={handleCheckboxChange('AutoFacNO')}
                  disabled={!isEditing}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-700">
                    Auto-generate asset numbers
                  </span>
                  <span className="block text-xs text-gray-400">
                    When checked, new assets get a number generated automatically from the
                    selected category&apos;s code. When unchecked, the person creating the
                    asset must type the asset number in by hand.
                  </span>
                </span>
              </label>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Auto Numbering (last document number)
              </h3>
              <p className="mb-3 text-xs text-gray-400">
                Set the last used document number for each form. New documents will continue
                numbering from here — useful when migrating data or initializing a form for the
                first time.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {AUTO_NUMBER_FIELDS.map(({ label, field }) => (
                  <div key={field}>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      value={formData[field]}
                      onChange={handleChange(field)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}