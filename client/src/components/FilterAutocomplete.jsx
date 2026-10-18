import PropTypes from 'prop-types';
import { Autocomplete, TextField, InputAdornment, Checkbox } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

/**
 * Multi-select Autocomplete with an icon inside the input.
 * Reusable for any filter bar.
 *
 *   <FilterAutocomplete
 *     label="Department"
 *     icon={ApartmentIcon}
 *     options={departmentOptions}
 *     value={draftDepartment}
 *     onChange={setDraftDepartment}
 *   />
 */
export default function FilterAutocomplete({
  label,
  placeholder,
  icon: Icon,
  options = [],
  value = [],
  onChange,
  getOptionLabel = (o) => (typeof o === 'string' ? o : o?.label ?? ''),
  isOptionEqualToValue,
  disabled = false,
  sx,
}) {
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      limitTags={1}
      size="small"
      disabled={disabled}
      options={options}
      value={value}
      onChange={(e, newValue) => onChange?.(newValue)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={(props, option, { selected }) => {
        const { key, ...rest } = props;
        return (
          <li key={key} {...rest}>
            <Checkbox
              size="small"
              icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
              checkedIcon={<CheckBoxIcon fontSize="small" />}
              checked={selected}
              sx={{ mr: 1, p: 0.5 }}
            />
            {getOptionLabel(option)}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          // The inside icon forces MUI to float the label even when empty.
          // So: no label while empty (placeholder shows instead), label on
          // top only once something is selected.
          label={value.length ? label : undefined}
          placeholder={value.length ? '' : placeholder || label}
          inputProps={{ ...params.inputProps, 'aria-label': label }}
          InputProps={{
            ...params.InputProps,
            // Keep MUI's chips (startAdornment) and put our icon in front of them
            startAdornment: (
              <>
                {Icon && (
                  <InputAdornment position="start" sx={{ ml: 0.5, mr: 0.25 }}>
                    <Icon sx={{ color: 'text.secondary', fontSize: { xs: 16, md: 18, xl: 20 } }} />
                  </InputAdornment>
                )}
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
      sx={{
        // tablet: 2 per row, laptop: 4 per row, large screens: capped width
        flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', lg: '1 1 0' },
        minWidth: { xs: 0, lg: 180 },
        maxWidth: { xs: '100%', lg: 320, xl: 360 },
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'white',
          borderRadius: '0.6rem',
          minHeight: { xs: 36, xl: 40 },
          fontSize: { xs: '0.8125rem', xl: '0.875rem' },
        },
        '& .MuiInputLabel-root': { fontSize: { xs: '0.8125rem', xl: '0.875rem' } },
        '& .MuiChip-root': { height: { xs: 22, xl: 26 }, fontSize: { xs: '0.75rem', xl: '0.8125rem' } },
        ...sx,
      }}
    />
  );
}

FilterAutocomplete.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  icon: PropTypes.elementType,
  options: PropTypes.array,
  value: PropTypes.array,
  onChange: PropTypes.func,
  getOptionLabel: PropTypes.func,
  isOptionEqualToValue: PropTypes.func,
  disabled: PropTypes.bool,
  sx: PropTypes.object,
};