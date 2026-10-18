import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { AppBar, Tabs, Tab, Box } from '@mui/material';
import { HEADER_BG } from './tableHeaderStyle';

/**
 * Reusable tab bar + panels for any document form
 * (Job Order, Transfer, Disposal, Asset Accountability, Lost Asset ...).
 *
 *   <DocTabs
 *     tabs={[
 *       { key: 'items',    label: 'Item List',     icon: ListAltIcon, content: <JOLineItems ... /> },
 *       { key: 'approval', label: 'Approval Logs', icon: HistoryIcon, content: <ApprovalHistoryTable docNo={no} />, hidden: !showLogs },
 *     ]}
 *   />
 *
 * - Tabs are identified by `key`, so hiding one never shifts the others.
 * - If the active tab becomes hidden, it falls back to the first visible tab.
 * - Only the active tab's content is rendered.
 */
export default function DocTabs({ tabs = [], defaultTab, headerColor = HEADER_BG, ariaLabel = 'document tabs' }) {
  const visibleTabs = useMemo(() => tabs.filter((t) => !t.hidden), [tabs]);
  const [active, setActive] = useState(defaultTab ?? visibleTabs[0]?.key);

  // Active tab got hidden (e.g. status changed back to Draft) → first visible tab
  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === active)) {
      setActive(visibleTabs[0]?.key);
    }
  }, [visibleTabs, active]);

  const current = visibleTabs.find((t) => t.key === active) || visibleTabs[0];

  return (
    <Box sx={{ bgcolor: 'background.paper', width: '100%', borderRadius: 1, boxShadow: 2, pb: 1 }}>
      <AppBar position="static" sx={{ borderRadius: 2, boxShadow: 3 }}>
        <Tabs
          value={current?.key ?? false}
          onChange={(e, key) => setActive(key)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile={false}
          sx={{ bgcolor: headerColor, color: 'white', width: '100%', minHeight: 40 }}
          indicatorColor="secondary"
          textColor="inherit"
          aria-label={ariaLabel}
        >
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            return (
              <Tab
                key={t.key}
                value={t.key}
                label={t.label}
                icon={Icon ? <Icon fontSize="small" /> : undefined}
                iconPosition="start"
                id={`doc-tab-${t.key}`}
                aria-controls={`doc-tabpanel-${t.key}`}
                sx={{
                  letterSpacing: '0.10em',
                  minHeight: 40,
                  py: 0.5,
                  '& .MuiTab-iconWrapper': { mr: 0.75, mb: '0 !important' },
                }}
              />
            );
          })}
        </Tabs>
      </AppBar>

      {current && (
        <div role="tabpanel" id={`doc-tabpanel-${current.key}`} aria-labelledby={`doc-tab-${current.key}`}>
          <Box className="w-full px-1 pt-1 md:px-2">{current.content}</Box>
        </div>
      )}
    </Box>
  );
}

DocTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      content: PropTypes.node,
      hidden: PropTypes.bool,
    })
  ).isRequired,
  defaultTab: PropTypes.string,
  headerColor: PropTypes.string,
  ariaLabel: PropTypes.string,
};