const courseFees = require('../data/courseFees.json');

// Match course based on Banglish input
const getCourseInfo = (userInput) => {
  const input = userInput.toLowerCase();

  if (input.includes('ielts')) {
    return courseFees.IELTS;
  } else if (input.includes('sat')) {
    return courseFees.SAT;
  } else if (input.includes('ged')) {
    return courseFees.GED;
  } else if (input.includes('pte')) {
    return courseFees.PTE;
  } else if (input.includes('junior english')) {
    return courseFees.JuniorEnglish;
  } else if (input.includes('junior')) {
    return courseFees.JuniorEnglish;
  } else if (input.includes('abacus')) {
    return courseFees.AbacusBrainDevelopment;
  } else if (input.includes('kids english')) {
    return courseFees.KidsEnglish;
  } else if (input.includes('grammar writing')) {
    return courseFees.GrammarWriting;
  } else if (input.includes('advanced writing')) {
    return courseFees.AdvancedWritingCourse;
  } else if (input.includes('private university admission')) {
    return courseFees.PrivateUniversityAdmission;
  } else if (input.includes('spoken english')) {
    return courseFees.SpokenEnglish;
  } else if (input.includes('package') || input.includes('packages') || input.includes('bundle')) {
    return courseFees.packages;
  } else {
    return null;
  }
};

// Build a full course context as a string for chatbot prompt
const getCoursesContext = async () => {
  const lines = [];

  for (const [category, details] of Object.entries(courseFees)) {
    lines.push(`🔹 ${category} Courses:`);

    for (const [type, feeInfo] of Object.entries(details)) {
      if (typeof feeInfo === 'object') {
        lines.push(`  - ${type}: ${JSON.stringify(feeInfo)}`);
      } else {
        lines.push(`  - ${type}: ${feeInfo} BDT`);
      }
    }

    lines.push('\n');
  }

  return lines.join('\n');
};

module.exports = {
  getCourseInfo,
  getCoursesContext
};


  