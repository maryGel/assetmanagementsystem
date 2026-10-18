import PropTypes from 'prop-types';
import { Autocomplete, TextField } from '@mui/material';

/**
 * Reusable header fields for any document form (Job Order, Transfer, Disposal ...).
 * Everything scales with the screen: tablet -> laptop -> large monitor.
 *
 *   <FormField label="Department" icon={ApartmentIcon}>
 *     <FieldAutocomplete options={departments} value={dept} onChange={setDept} disabled={readOnly} />
 *   </FormField>
 *
 *   <FormField label="Document Date" icon={EventIcon}>
 *     <FieldInput type="date" value={date} onChange={setDate} disabled={readOnly} />
 *   </FormField>
 *
 *   <FormField label="Status" icon={FlagIcon}>
 *     <FieldValue bold>Fully Approved</FieldValue>
 *   </FormField>
 *
 *   <FormField label="Remarks" icon={NotesIcon} fullWidth alignTop>
 *     <FieldInput multiline minRows={2} value={remarks} onChange={setRemarks} />
 *   </FormField>
 */

// ---------- Shared responsive sizes (one place to tune) ----------
export const FIELD_SIZES = {
  height: { xs: 32, lg: 34, xl: 38 },
  fontSize: { xs: '0.8125rem', xl: '0.875rem' },
};
const BORDER = 'rgba(0,0,0,0.18)';

const baseFieldSx = (readOnly) => ({
  width: '100%',
  '& .MuiInputBase-root': {
    minHeight: FIELD_SIZES.height,
    fontSize: FIELD_SIZES.fontSize,
    borderRadius: '8px',
    backgroundColor: readOnly ? '#f3f4f6' : '#fff',
  },
  '& .MuiInputBase-input': { fontSize: FIELD_SIZES.fontSize },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
  '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'rgba(0,0,0,0.7)' },
});

// ---------- Label row: [icon] Label | control ----------
export function FormField({ label, icon: Icon, children, fullWidth = false, alignTop = false, required = false, className = '' }) {
  return (
    <div
      className={`flex gap-2 min-w-0 ${alignTop ? 'items-start' : 'items-center'} ${fullWidth ? 'col-span-full' : ''} ${className}`}
    >
      <label
        className={`flex items-center shrink-0 gap-1.5 text-gray-500
          w-28 md:w-32 xl:w-36 text-xs md:text-[0.8125rem] xl:text-sm ${alignTop ? 'pt-2' : ''}`}
      >
        {Icon && (
          <Icon
            sx={{ fontSize: { xs: 16, md: 17, xl: 19 }, color: '#94a3b8', flexShrink: 0 }}
            aria-hidden
          />
        )}
        <span className="truncate">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      </label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  children: PropTypes.node,
  fullWidth: PropTypes.bool,
  alignTop: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
};

// ---------- Text / date / number / multiline input ----------
export function FieldInput({ value, onChange, disabled = false, type = 'text', multiline = false, minRows, maxRows, placeholder }) {
  return (
    <TextField
      variant="outlined" // stays boxed even under a theme that defaults to underlined
      size="small"
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      multiline={multiline}
      minRows={minRows}
      maxRows={maxRows}
      placeholder={placeholder}
      sx={{
        ...baseFieldSx(disabled),
        '& .MuiInputBase-input': {
          fontSize: FIELD_SIZES.fontSize,
          padding: multiline ? '0 !important' : '0 10px !important',
          height: multiline ? 'auto' : FIELD_SIZES.height,
          boxSizing: 'border-box',
          lineHeight: 1.4,
        },
        ...(multiline && { '& .MuiInputBase-root': { ...baseFieldSx(disabled)['& .MuiInputBase-root'], py: 1, px: 1.25 } }),
      }}
    />
  );
}

FieldInput.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  type: PropTypes.string,
  multiline: PropTypes.bool,
  minRows: PropTypes.number,
  maxRows: PropTypes.number,
  placeholder: PropTypes.string,
};

// ---------- Single-select autocomplete ----------
export function FieldAutocomplete({ options = [], value, onChange, disabled = false, placeholder, getOptionLabel, isOptionEqualToValue }) {
  return (
    <Autocomplete
      size="small"
      disabled={disabled}
      options={options}
      value={value || null}
      onChange={(e, newValue) => onChange?.(newValue)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      ListboxProps={{ sx: { fontSize: FIELD_SIZES.fontSize } }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          placeholder={disabled ? '' : placeholder}
          sx={{
            ...baseFieldSx(disabled),
            '& .MuiInputBase-root': {
              ...baseFieldSx(disabled)['& .MuiInputBase-root'],
              height: FIELD_SIZES.height,
              py: '0 !important',
              pl: '4px !important',
            },
            '& .MuiAutocomplete-input': { py: '0 !important' },
          }}
        />
      )}
    />
  );
}

FieldAutocomplete.propTypes = {
  options: PropTypes.array,
  value: PropTypes.any,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  getOptionLabel: PropTypes.func,
  isOptionEqualToValue: PropTypes.func,
};

// ---------- Plain read-only value (no box) ----------
export function FieldValue({ children, bold = false, hint }) {
  return (
    <div className="flex items-center min-w-0 gap-2 min-h-[32px] lg:min-h-[34px] xl:min-h-[38px]">
      <span
        className={`truncate text-gray-800 text-[0.8125rem] xl:text-sm ${bold ? 'font-semibold' : ''}`}
      >
        {children || '—'}
      </span>
      {hint && <span className="text-xs text-blue-600 whitespace-nowrap">{hint}</span>}
    </div>
  );
}

FieldValue.propTypes = {
  children: PropTypes.node,
  bold: PropTypes.bool,
  hint: PropTypes.node,
};

// ---------- Responsive grid for the fields ----------
// 1 column on phones, 2 on tablet / small laptop, 3 from 1280px up
export function FormGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 xl:gap-x-8 gap-y-2 ${className}`}>
      {children}
    </div>
  );
}

FormGrid.propTypes = { children: PropTypes.node, className: PropTypes.string };