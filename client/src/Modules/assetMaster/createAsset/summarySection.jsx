import { Box, Typography, Button } from '@mui/material';

const isBlank = (value) =>
  value === null || value === undefined || String(value).trim() === '';

// fields: [{ label, value, required }]
//  - value present            -> shown normally
//  - blank + required         -> red "Required field missing"
//  - blank + optional         -> muted dash
const SummarySection = ({ title, fields, stepIndex, onEdit }) => (
  <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Typography variant="subtitle1" fontWeight="bold">
        {title}
      </Typography>
      <Button
        size="small"
        onClick={() => onEdit(stepIndex)}
        sx={{ textTransform: 'none' }}
      >
        Edit
      </Button>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
      {fields.map((field) => {
        const blank = isBlank(field.value);
        const missingRequired = blank && field.required;

        return (
          <Box key={field.label}>
            <Typography variant="caption" color="text.secondary">
              {field.label}:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: missingRequired ? 'bold' : 'normal',
                color: missingRequired
                  ? 'error.main'
                  : blank
                    ? 'text.disabled'
                    : 'text.primary'
              }}
            >
              {blank ? (field.required ? 'Required field missing' : '—') : String(field.value)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  </Box>
);

export default SummarySection;