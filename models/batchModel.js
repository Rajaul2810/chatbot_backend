
// Build a context string for the chatbot based on batch information
const getBatchContext = async () => {
  return `
  To check our current batch schedules, please visit: https://mentors.com.bd/batch_schedule 
  
  On this page, you can select your preferred branch and course to see all running batches.
  This will provide you with the most up-to-date information about available batches, schedules, and start dates.
  `;
};

module.exports = { 
  getBatchContext,
};


