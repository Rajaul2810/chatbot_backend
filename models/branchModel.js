const branches = require('../data/branches.json');

// Get branch information based on input
const getBranchInfo = (userInput) => {
  const input = userInput.toLowerCase();
  console.log('input', input);
  const branchData = branches.branches;

  // Check for head office
  if (input.includes('head office') || input.includes('kolabagan') || input.includes('main office')) {
    return {
      name: 'Kalabagan Branch',
      ...branchData.Kalabagan
    };
  }

  
  // Check for local branches
  for (const [branchName, branchInfo] of Object.entries(branchData)) {
    if (input.includes(branchName.toLowerCase())) {
      return {
        name: `${branchName} Branch`,
        ...branchInfo
      };
    }
  }

  return null;
};

// Get formatted information for a single branch
const getBranchContext = (branchInfo) => {
  if (!branchInfo) return null;
  
  return `
📍 ${branchInfo.name}
   • Location: ${branchInfo.location}
   • Phone: ${branchInfo.phone}
   • Email: ${branchInfo.email}
  `;
};

// Get all branches information in a formatted string
const getAllBranchesContext = async () => {
  const branchData = branches.branches;
  const sections = [];

  // All Branches Section
  sections.push('🏪 OUR BRANCHES');
  for (const [branchName, branchInfo] of Object.entries(branchData)) {
    sections.push(getBranchContext({
      name: `${branchName} Branch`,
      ...branchInfo
    }));
  }

  return sections.join('\n');
};

// Get branches by city/area
const getBranchesByArea = (area) => {
  const branchData = branches.branches;
  const matchingBranches = [];
  const areaLower = area.toLowerCase();

  // Check all branches
  for (const [branchName, branchInfo] of Object.entries(branchData)) {
    if (branchInfo.location.toLowerCase().includes(areaLower) || 
        branchName.toLowerCase().includes(areaLower)) {
      matchingBranches.push({
        name: `${branchName} Branch`,
        ...branchInfo
      });
    }
  }

  return matchingBranches;
};

// Check if a location has any branches
const hasBranchesInLocation = (location) => {
  const matchingBranches = getBranchesByArea(location);
  return matchingBranches.length > 0;
};

// Get response for location query
const getLocationResponse = (location) => {
  const matchingBranches = getBranchesByArea(location);
  
  if (matchingBranches.length === 0) {
    return `Sorry, ${location} location e kono branch nai.`;
  }
  
  if (matchingBranches.length === 1) {
    return `Haan, ${location} te ${matchingBranches[0].name} ache:\n${getBranchContext(matchingBranches[0])}`;
  }
  
  const response = [`Haan, ${location} location e ${matchingBranches.length} ta branch ache:`];
  matchingBranches.forEach(branch => {
    response.push(getBranchContext(branch));
  });
  
  return response.join('\n');
};

module.exports = {
  getBranchInfo,
  getBranchContext,
  getAllBranchesContext,
  getBranchesByArea,
  hasBranchesInLocation,
  getLocationResponse
};
