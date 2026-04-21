const TRAVELERS_TEMPLATES = require('../public/data/travelers_templates');

const LOGS = [];

function addLog(source, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${source}] ${message}`;
  console.log(logEntry);
  LOGS.push(logEntry);
}

function getLogs() {
  return LOGS;
}

function clearLogs() {
  LOGS.length = 0;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function processRandomTraveler(template) {
  addLog('GENERATOR', `Processing random traveler from template ID ${template.id}`);

  let selectedFaction = 'human';
  if (template.faction && Array.isArray(template.faction) && template.faction.length > 0) {
    const factionIndex = Math.floor(Math.random() * template.faction.length);
    selectedFaction = template.faction[factionIndex];
    addLog('GENERATOR', `  Selected faction: ${selectedFaction}`);
  }

  let selectedName = 'Traveler';
  if (template.names && Array.isArray(template.names) && template.names.length > 0) {
    const nameIndex = Math.floor(Math.random() * template.names.length);
    selectedName = template.names[nameIndex];
    addLog('GENERATOR', `  Selected name: ${selectedName}`);
  }

  const selectedTraits = {};
  let traitDescriptionKey = '';

  if (template.traits && typeof template.traits === 'object') {
    const traitPairs = Object.entries(template.traits);
    addLog('GENERATOR', `  Available trait pairs: ${traitPairs.length}`);

    const shuffledPairs = [...traitPairs].sort(() => Math.random() - 0.5);
    const selectedPairs = shuffledPairs.slice(0, 2);

    const traitKeys = [];
    selectedPairs.forEach(([pairKey, traits], index) => {
      if (Array.isArray(traits) && traits.length > 0) {
        const traitIndex = Math.floor(Math.random() * traits.length);
        const selectedTrait = traits[traitIndex];
        selectedTraits[`trait${index + 1}`] = selectedTrait;
        traitKeys.push(selectedTrait);
        addLog('GENERATOR', `  Selected ${pairKey}: ${selectedTrait}`);
      }
    });

    if (traitKeys.length === 2) {
      traitDescriptionKey = `${traitKeys[0]}_${traitKeys[1]}`;
    } else if (traitKeys.length === 1) {
      traitDescriptionKey = traitKeys[0];
    }
    addLog('GENERATOR', `  Trait description key: ${traitDescriptionKey}`);
  }

  let selectedDescription = '';
  if (template.description && typeof template.description === 'object' && traitDescriptionKey) {
    selectedDescription = template.description[traitDescriptionKey] || '';
  }

  let effectIn = null;
  let effectInHidden = null;
  let effectOut = null;
  let effectEx = null;

  if (template.effect_in && typeof template.effect_in === 'object') {
    effectIn = template.effect_in[selectedFaction] || null;
  }

  if (template.effect_in_hidden && typeof template.effect_in_hidden === 'object') {
    effectInHidden = template.effect_in_hidden[selectedFaction] || null;
  }

  if (template.effect_out && typeof template.effect_out === 'object') {
    effectOut = template.effect_out[selectedFaction] || null;
  }

  if (template.effect_ex && typeof template.effect_ex === 'object') {
    effectEx = template.effect_ex[selectedFaction] || null;
  }

  let selectedDialog = {};
  if (template.dialog && typeof template.dialog === 'object') {
    Object.entries(template.dialog).forEach(([dialogType, dialogContent]) => {
      if (typeof dialogContent === 'object' && dialogContent[selectedFaction]) {
        selectedDialog[dialogType] = dialogContent[selectedFaction];
      }
    });
  }

  const traveler = {
    template_id: template.id,
    name: selectedName,
    art: template.art,
    faction: selectedFaction,
    traits: selectedTraits,
    effect_in: effectIn,
    effect_in_hidden: effectInHidden,
    effect_out: effectOut,
    effect_ex: effectEx,
    structure: template.structure || null,
    is_fixed: false
  };

  addLog('GENERATOR', `  Traveler processed: ${selectedName} (${selectedFaction})`);
  return traveler;
}

function processFixedTraveler(template) {
  addLog('GENERATOR', `Processing fixed traveler from template ID ${template.id}`);

  const traveler = {
    template_id: template.id,
    name: template.names[0],
    art: template.art,
    faction: template.faction[0],
    traits: {},
    effect_in: null,
    effect_in_hidden: null,
    effect_out: null,
    effect_ex: null,
    structure: template.structure || null,
    is_fixed: true,
    hero_data: template.hero_data || null
  };

  addLog('GENERATOR', `  Fixed traveler processed: ${traveler.name} (${traveler.faction})`);
  return traveler;
}

function generateFactionDistribution() {
  addLog('GENERATOR', 'Generating faction distribution for 6 structures');
  
  const structures = [
    { human: 2, infected: 0, possessed: 0 },
    { human: 2, infected: 0, possessed: 0 },
    { human: 2, infected: 0, possessed: 0 },
    { human: 2, infected: 0, possessed: 0 },
    { human: 2, infected: 0, possessed: 0 },
    { human: 3, infected: 0, possessed: 0 }
  ];

  const infectedPositions = [0, 1, 2, 3, 4, 5];
  shuffleArray(infectedPositions);

  const infectedStructures = infectedPositions.slice(0, 6);

  const infectedTypes = ['infected', 'infected', 'infected', 'possessed', 'possessed', 'possessed'];
  shuffleArray(infectedTypes);

  infectedStructures.forEach((structIndex, i) => {
    const type = infectedTypes[i];
    structures[structIndex].human -= 1;
    if (type === 'infected') {
      structures[structIndex].infected = 1;
    } else {
      structures[structIndex].possessed = 1;
    }
  });

  const result = structures.map(s => ({
    human: s.human.toString(),
    infected: s.infected.toString(),
    possessed: s.possessed.toString()
  }));

  addLog('GENERATOR', `  Faction distribution generated`);
  return result;
}

function generateTravelersForSession(playerId, sessionId, structureTemplates) {
  clearLogs();
  addLog('GENERATOR', `Starting traveler generation for player ${playerId}, session ${sessionId}`);

  const totalTravelers = 60;
  const days = 10;
  const travelersPerDay = 6;

  addLog('GENERATOR', `Total configuration: ${totalTravelers} travelers over ${days} days, ${travelersPerDay} per day`);
  addLog('GENERATOR', `Structure templates available: ${structureTemplates.length}`);

  if (structureTemplates.length < 6) {
    throw new Error('Need at least 6 structure templates');
  }

  const schedule = Array.from({ length: days }, () => []);
  const usedTemplatesPerDay = Array.from({ length: days }, () => new Set());
  const recentTemplateDays = new Map();

  const randomTemplates = TRAVELERS_TEMPLATES.filter(t => !t.fixed);
  const fixedTemplates = TRAVELERS_TEMPLATES.filter(t => t.fixed);
  const maxRecentMemory = 3;

  addLog('GENERATOR', `Random templates available: ${randomTemplates.length}`);
  addLog('GENERATOR', `Fixed templates available: ${fixedTemplates.length}`);

  const fixedSlots = new Set();
  for (const template of fixedTemplates) {
    if (!template.fixed_data) continue;
    for (const [day, position] of Object.entries(template.fixed_data)) {
      fixedSlots.add(`${parseInt(day) - 1}_${parseInt(position) - 1}`);
    }
  }

  for (let day = 0; day < days; day++) {
    for (let position = 0; position < travelersPerDay; position++) {
      if (fixedSlots.has(`${day}_${position}`)) {
        schedule[day][position] = null;
        continue;
      }

      const availableTemplates = randomTemplates.filter(template => {
        if (usedTemplatesPerDay[day].has(template.id)) return false;

        const lastUsedDay = recentTemplateDays.get(template.id);
        if (lastUsedDay !== undefined && (day - lastUsedDay) < maxRecentMemory) {
          return false;
        }

        return true;
      });

      let selectedTemplate;
      if (availableTemplates.length === 0) {
        selectedTemplate = randomTemplates[Math.floor(Math.random() * randomTemplates.length)];
        addLog('GENERATOR', `Day ${day + 1}, Position ${position + 1}: No available templates, using random fallback`);
      } else {
        selectedTemplate = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
      }

      const processedTraveler = processRandomTraveler(selectedTemplate);
      schedule[day][position] = processedTraveler;
      usedTemplatesPerDay[day].add(selectedTemplate.id);
      recentTemplateDays.set(selectedTemplate.id, day);
    }
  }

  for (const template of fixedTemplates) {
    if (!template.fixed_data) continue;
    for (const [day, position] of Object.entries(template.fixed_data)) {
      const dayIndex = parseInt(day) - 1;
      const posIndex = parseInt(position) - 1;
      schedule[dayIndex][posIndex] = processFixedTraveler(template);
      addLog('GENERATOR', `Injected fixed traveler ${template.names[0]} at Day ${day}, Position ${position}`);
    }
  }

  const factionDistribution = generateFactionDistribution();

  const selectedStructureTemplates = structureTemplates.slice(0, 6);
  
  const generatedStructures = selectedStructureTemplates.map((template, index) => ({
    structure: template.id,
    status: factionDistribution[index],
    player: playerId,
    session: sessionId
  }));

  addLog('GENERATOR', `Generated ${generatedStructures.length} structures`);

  const generatedTravelers = [];

  for (let day = 0; day < days; day++) {
    const dayNumber = day + 1;

    for (let position = 0; position < travelersPerDay; position++) {
      const scheduledTraveler = schedule[day][position];

      generatedTravelers.push({
        day: dayNumber,
        traveler: scheduledTraveler,
        player: playerId,
        session: sessionId,
        order: { position: position + 1 },
        hero_data: scheduledTraveler.hero_data || null
      });
    }
  }

  addLog('GENERATOR', `Total travelers generated: ${generatedTravelers.length}`);
  addLog('GENERATOR', 'Generation completed successfully');

  return {
    travelers: generatedTravelers,
    structures: generatedStructures,
    logs: getLogs()
  };
}

module.exports = {
  generateTravelersForSession,
  processRandomTraveler,
  processFixedTraveler,
  generateFactionDistribution,
  getLogs,
  clearLogs,
  addLog,
  TRAVELERS_TEMPLATES
};