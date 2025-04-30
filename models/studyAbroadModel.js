const studyAbroad = require('../data/studyAbroad.json');

const getStudyAbroadContext = async () => {
    const { mentorsStudyAbroad } = studyAbroad;
    
    let context = `
    # Mentors Study Abroad
    
    ## Overview
    ${mentorsStudyAbroad.overview}
    
    ## Countries We Provide Information For
    ${mentorsStudyAbroad.countries.map(country => `- ${country.name}: ${country.link}`).join('\n')}
    
    ## Important Note
    ${mentorsStudyAbroad.remarks}
    
    ## Our Services
    ${Object.entries(mentorsStudyAbroad.services).map(([service, description]) => `- ${service}: ${description}`).join('\n')}
    
    ## Online Consultation
    ${mentorsStudyAbroad.onlineConsultation.description}
    Zoom Link: ${mentorsStudyAbroad.onlineConsultation.zoomLink}
    Note: ${mentorsStudyAbroad.onlineConsultation.remarks}
    
    ## Contact Information
    Email: ${mentorsStudyAbroad.contact.email}
    Phone: ${mentorsStudyAbroad.contact.phone}
    Website: ${mentorsStudyAbroad.contact.website}
    Offices: ${mentorsStudyAbroad.contact.offices.join(', ')}
    
    ## Our Branches
    ${Object.entries(mentorsStudyAbroad.branches).map(([branch, info]) => {
        let branchInfo = `- ${branch}: ${info.location}`;
        if (info.phone) branchInfo += `, Phone: ${info.phone}`;
        return branchInfo;
    }).join('\n')}
    
    ${mentorsStudyAbroad.branchesRemarks}
    
    ## Success Stories
    ${mentorsStudyAbroad.successStories.description}
    `;
    
    return context;
};

module.exports = {
    getStudyAbroadContext
};
