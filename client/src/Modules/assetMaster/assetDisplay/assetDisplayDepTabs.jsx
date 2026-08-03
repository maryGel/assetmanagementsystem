import * as React from 'react';
import { styled } from '@mui/material/styles';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import MuiAccordion from '@mui/material/Accordion';
import MuiAccordionSummary, {
  accordionSummaryClasses,
} from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';

// import Depreciation Component
import AssetDisplayDepSched from './assetDisplayDepSched';
import AssetDisplayDepDocs from './assetDisplayDepDocs';


const Accordion = styled((props) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&::before': {
    display: 'none',
  },
}));

const AccordionSummary = styled((props) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, .03)',
  flexDirection: 'row-reverse',
  [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]:
    {
      transform: 'rotate(90deg)',
    },
  [`& .${accordionSummaryClasses.content}`]: {
    marginLeft: theme.spacing(1),
  },
  ...theme.applyStyles('dark', {
    backgroundColor: 'rgba(255, 255, 255, .05)',
  }),
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}));





// ******************* COMPONENT ASSET DISPLAY
export default function AssetDisplayDepTabs(){

  const [expanded, setExpanded] = React.useState([]); // Initialize with null or false for all closed

  const handleChange = (panel) => () => {
    if (expanded.includes(panel)) {
      // If it's already open, remove it (close it)
      setExpanded(expanded.filter((p) => p !== panel));
    } else {
      // Otherwise, add it to the list (open it)
      setExpanded([...expanded, panel]);
    } 
  };

  return(
    <>
    {/* Full-width wrapper so the accordion (and its inner tables) can use
        all the space its parent gives it, rather than shrink-wrapping. */}
    <div className='w-full min-w-0'>
      <Accordion expanded={expanded.includes('panel1')} onChange={handleChange('panel1')}>
        <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
          <Typography component="span" sx={{ fontSize: 'clamp(0.78rem, 0.65rem + 0.45vw, 0.95rem)' }}>Depreciation Schedule</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography component="div">
            <AssetDisplayDepSched/>
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={expanded.includes('panel2')}onChange={handleChange('panel2')}>
        <AccordionSummary aria-controls="panel2d-content" id="panel2d-header">
          <Typography component="span" sx={{ fontSize: 'clamp(0.78rem, 0.65rem + 0.45vw, 0.95rem)' }}>Depreciation Documents</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography component="div">
            <AssetDisplayDepDocs/>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </div>
    </>
  );
}