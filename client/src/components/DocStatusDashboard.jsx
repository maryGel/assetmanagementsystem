import { useMemo } from 'react';
import PropTypes from 'prop-types';
import EditNoteIcon from '@mui/icons-material/EditNote';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import TimelapseIcon from '@mui/icons-material/Timelapse';

/**
 * Reusable status dashboard for any document page (Job Order, Transfer,
 * Disposal, Asset Accountability, Lost Asset ...).
 *
 * Usage:
 *   <DocStatusDashboard
 *     docs={jobOrders}                      // any array of documents
 *     getStatus={(doc) => Number(doc.status)}
 *     activeStatus={activeCard}             // number | null
 *     onSelect={(status) => ...}            // click handler (null = cleared)
 *   />
 *
 * Pass a custom `cards` array to show other statuses.
 */

export const DEFAULT_STATUS_CARDS = [
  {
    status: 0,
    label: 'Draft',
    caption: 'Not yet posted',
    icon: EditNoteIcon,
    accent: '#64748b', // slate
    tint: '#f1f5f9',
    borderColor: '#64748b'
  },
  {
    status: 3,
    label: 'For Approval',
    caption: 'Waiting for 1st approver',
    icon: HourglassTopIcon,
    accent: '#d97706', // amber
    tint: '#fef3c7',
    borderColor: '#d97706'
  },
  {
    status: 2,
    label: 'Partially Approved',
    caption: 'Waiting for next level',
    icon: TimelapseIcon,
    accent: '#2563eb', // blue
    tint: '#dbeafe',
    borderColor: '#2563eb'
  },
];

export default function DocStatusDashboard({
  docs = [],
  getStatus = (doc) => Number(doc.status),
  cards = DEFAULT_STATUS_CARDS,
  activeStatus = null,
  onSelect,
  loading = false,
  title,
}) {
  // Count every document per status once
  const counts = useMemo(() => {
    const map = {};
    (docs || []).forEach((doc) => {
      const s = getStatus(doc);
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [docs, getStatus]);

  const handleClick = (status) => {
    if (!onSelect) return;
    // Clicking the active card again clears the dashboard filter
    onSelect(activeStatus === status ? null : status);
  };

  return (
    <section className="w-full max-w-xl mt-2 xl:max-w-2xl 2xl:max-w-3xl md:mt-4">
      {title && (
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-600 uppercase">
          {title}
        </h2>
      )}
      {/* 3 across from tablet up; cards, icons and numbers grow with the screen */}
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3 xl:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeStatus === card.status;
          const count = counts[card.status] || 0;

          return (
            <button
              key={card.status}
              type="button"
              onClick={() => handleClick(card.status)}
              aria-pressed={isActive}
              className={`group flex items-center min-w-0 gap-2 md:gap-3 xl:gap-4 p-1.5 md:p-2 xl:p-3 text-left border rounded-xl shadow-lg transition-all
                hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200
                ${isActive ? 'ring-2' : ''}`}
              style={
                isActive
                  ? { borderColor: card.borderColor || card.accent, '--tw-ring-color': card.accent, backgroundColor: card.tint }
                  : { borderColor: card.borderColor || card.accent, backgroundColor: '#ffffff' }
              }
            >
              <span
                className="flex items-center justify-center flex-shrink-0 w-6 h-6 rounded-lg md:w-7 md:h-7 xl:w-8 xl:h-8"
                style={{ backgroundColor: card.tint, color: card.accent }}
              >
                {Icon && <Icon sx={{ fontSize: { xs: 14, md: 18, xl: 24 } }} />}
              </span>

              <span className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-600 truncate md:text-xs xl:text-sm">{card.label}</span>
                <span className="text-[11px] md:text-xs text-gray-400 truncate">{card.caption}</span>
              </span>

              <span className="text-lg font-bold md:text-xl xl:text-2xl tabular-nums shrink-0" style={{ color: card.accent }}>
                {loading ? '…' : count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

DocStatusDashboard.propTypes = {
  docs: PropTypes.array,
  getStatus: PropTypes.func,
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      status: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
      caption: PropTypes.string,
      icon: PropTypes.elementType,
      accent: PropTypes.string,
      tint: PropTypes.string,
      borderColor: PropTypes.string,
    })
  ),
  activeStatus: PropTypes.number,
  onSelect: PropTypes.func,
  loading: PropTypes.bool,
  title: PropTypes.string,
};