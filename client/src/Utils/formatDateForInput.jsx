import { format, parseISO } from 'date-fns';

export const formatDateForInput = (dateString, formatType = 'P') => {
  if (!dateString) return '';
   
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const formats = {
    short: date.toLocaleDateString(), // MM/DD/YYYY
    iso: date.toISOString().split('T')[0], // YYYY-MM-DD
    long: date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), // January 1, 2024
    custom: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` // Custom format
  };
  
  return formats[format] || formats.short;
  
};

// Date Formatter Component
const DateDisplay = ({ value, format = 'short' }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '—';

    // Handle YYYY-MM-DD safely
    if (
      typeof dateString === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
      const [year, month, day] = dateString.split('-');

      switch (format) {
        case 'short':
          return `${month}/${day}/${year}`;

        case 'long':
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(new Date(Number(year), Number(month) - 1, Number(day)));

        case 'iso':
          return dateString;

        default:
          return `${month}/${day}/${year}`;
      }
    }

    // fallback for true Date objects or timestamps
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return dateString;

    switch (format) {
      case 'short':
        return date.toLocaleDateString();

      case 'long':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

      case 'iso':
        return [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0'),
        ].join('-');

      default:
        return date.toLocaleDateString();
    }
  };

  return <span>{formatDate(value)}</span>;
};

export default DateDisplay;