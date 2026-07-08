// Utils/approvalLevelUtils.js

/**
 * Get the next approval level based on document status and appStat
 * This matches the logic used in JOFormPage
 * @param {Object} header - Document header object with xpost and appStat
 * @returns {number|null} Next level or null if no pending approval
 */
export const getNextLevel = (header) => {
  if (!header) return null;
  
  // Get the xpost value (handle both xpost and xPosted)
  const xpost = header.xpost || header.xPosted;
  if (!xpost) return null;
  
  // If document is For Approval (3), it's at level 1
  if (xpost === 3) {
    return 1;
  }
  
  // If document is Partially Approved (2), calculate next level from appStat
  if (xpost === 2) {
    // If appStat exists, calculate from it
    if (header.appStat) {
      const appStatStr = String(header.appStat);
      // Count how many levels have been approved
      const approvedLevels = appStatStr.includes(',') 
        ? appStatStr.split(',').length 
        : 1;
      // Next level is approved levels + 1
      return approvedLevels + 1;
    } else {
      // If no appStat, default to level 2 (assuming level 1 is approved)
      // This handles the case where appStat is not passed from the API
      console.log('⚠️ appStat is empty for partially approved document, defaulting to level 2');
      return 2;
    }
  }
  
  return null;
};

/**
 * Check if a document is pending approval
 * @param {Object} header - Document header
 * @returns {boolean} True if document needs approval
 */
export const isPendingApproval = (header) => {
  if (!header) return false;
  const xpost = header.xpost || header.xPosted;
  return xpost === 2 || xpost === 3;
};

/**
 * Get the approval level for a document (used for approval actions)
 * This matches the getApprovalLevel function in JOFormPage
 * @param {Object} header - Document header
 * @param {boolean} forApproval - Whether this is for approval action
 * @returns {number} The current approval level
 */
export const getApprovalLevel = (header, forApproval = true) => {
  if (!header) return 1;
  
  const xpost = header.xpost || header.xPosted;
  
  if (xpost === 3) {
    return 1; // First approval
  } else if (xpost === 2 && header.appStat) {
    // Parse appStat safely - handle both string and number
    let approvedLevels = [];
    const appStatStr = String(header.appStat);
    if (appStatStr.includes(',')) {
      approvedLevels = appStatStr.split(',').map(l => parseInt(l.trim()));
    } else {
      approvedLevels = [parseInt(appStatStr)];
    }
    const nextLevel = approvedLevels.length + 1;
    return forApproval ? nextLevel : nextLevel;
  } else if (xpost === 2) {
    // If partially approved but no appStat, default to level 2
    return 2;
  }
  return 1;
};

/**
 * Format the level display string
 * @param {number} nextLevel - Current next level
 * @param {number} totalLevels - Total levels
 * @returns {string} Formatted display string
 */
export const formatLevelDisplay = (nextLevel, totalLevels) => {
  if (!nextLevel) return '';
  return `Level ${nextLevel} of ${totalLevels}`;
};