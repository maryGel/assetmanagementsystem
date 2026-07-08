// Utils/approvalHookFactory.js
import { useJobOrderApproval } from '../hooks/useJobOrderApproval';
import { useTRApproval } from '../hooks/useTRApproval';
import { useDisposalApproval } from '../hooks/useADApproval';
import { useAssetAccApproval } from '../hooks/useAssetAccApproval';
import { useAssetLostApproval } from '../hooks/useAssetLostApproval';

// Create a hook that returns all the getTotalLevels functions
export const useAllApprovalLevels = () => {
  // Call all hooks at the top level (following React Hooks rules)
  const jobOrderApproval = useJobOrderApproval();
  const trApproval = useTRApproval();
  const disposalApproval = useDisposalApproval();
  const assetAccApproval = useAssetAccApproval();
  const assetLostApproval = useAssetLostApproval();

  // Create a map of document types to their getTotalLevels functions
  const approvalHooksMap = {
    'Job Order': jobOrderApproval,
    'Transfer Order Form': trApproval,
    'Disposal Form': disposalApproval,
    'Asset Accountability Form': assetAccApproval,
    'Lost Asset Form': assetLostApproval,
  };

  /**
   * Get total levels for a specific document type
   * @param {string} docType - Document type
   * @returns {Promise<number>} Total levels for the document type
   */
  const getTotalLevelsByDocType = async (docType) => {
    try {
      console.log(`🔍 Fetching total levels for: ${docType}`);
      
      const hook = approvalHooksMap[docType];
      if (!hook) {
        console.warn(`⚠️ No hook found for ${docType}, using default 3`);
        return 3;
      }
      
      const result = await hook.getTotalLevels();
      console.log(`📊 ${docType} getTotalLevels result:`, result);
      
      if (result?.success) {
        const totalLevels = result.totalLevels || 3;
        console.log(`✅ ${docType} has ${totalLevels} levels`);
        return totalLevels;
      } else {
        console.warn(`⚠️ ${docType} returned unsuccessful result, using default 3`);
        return 3;
      }
    } catch (err) {
      console.error(`❌ Error fetching total levels for ${docType}:`, err);
      return 3;
    }
  };

  /**
   * Get total levels for multiple document types
   * @param {string[]} docTypes - Array of document types
   * @returns {Promise<Object>} Map of docType to total levels
   */
  const getTotalLevelsForDocTypes = async (docTypes) => {
    const levelsMap = {};
    const uniqueDocTypes = [...new Set(docTypes.filter(Boolean))];
    console.log('📋 Fetching levels for document types:', uniqueDocTypes);
    
    for (const docType of uniqueDocTypes) {
      const totalLevels = await getTotalLevelsByDocType(docType);
      levelsMap[docType] = totalLevels;
    }
    
    console.log('📊 Final levels map:', levelsMap);
    return levelsMap;
  };

  return {
    getTotalLevelsByDocType,
    getTotalLevelsForDocTypes,
    approvalHooksMap,
  };
};