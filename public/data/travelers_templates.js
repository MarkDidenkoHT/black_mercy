const TRAVELERS_TEMPLATES = [
  {
    id: 1,
    names: ['traveller1', 'traveller2'],
    art: 'traveller',
    traits: {
      trait1: ['honest'],
      trait2: ['nervous', 'calm'],
      trait3: ['frightened', 'brave']
    },
    faction: ['human', 'infected', 'possessed'],
    effect_in: {
      human: '+1',
      infected: '+1',
      possessed: '+1'
    },
    effect_out: {
      infected: 'undead +1',
      possessed: 'cult +1'
    },
    effect_ex: {
      human: 'inquisition +1',
      infected: 'undead -1',
      possessed: 'cult -1'
    },
    fixed: false,
    effect_in_hidden: {
      human: 'inquisition +1',
      infected: 'undead +1',
      possessed: 'cult +1'
    },
    fixed_data: null,
    dialog: {
      in: {
        human: 'Thank you. I will keep to myself and trouble no one.',
        infected: 'You are kind. I will rest… only briefly.',
        possessed: 'The town will remember this mercy.'
      },
      out: {
        human: 'Then I will go. May this place find peace without me.',
        infected: 'Please… the roads are worse than you think.',
        possessed: 'Very well. Some gates are meant to remain closed.'
      },
      papers: {
        human: 'You examine the documents closely. The seals are faded but bear familiar shrine markings.\n\nThe seal is old but true. Many shrines no longer replace them.',
        infected: 'You study the papers in your hands. The ink is smudged in places, the writing hurried. The signatures are barely legible.\n\nThey were written in haste when I left that place. I was eager to leave where I came from.',
        possessed: 'You inspect the documents. The seal is embossed clearly, but something about its design feels... unfamiliar to you.\n\nAre they not sufficient? I followed the rites as instructed.'
      },
      greeting: {
        human: 'Blessings upon this town. I ask only for rest and prayer before continuing on.',
        infected: 'Blessings… yes. The road has been long, and the air grows heavy at night.',
        possessed: 'Blessings upon you and what watches over this gate. I seek entry.'
      },
      execution: {
        human: 'Wait—there must be a mistake. I\'ve done nothing wrong.',
        infected: 'No—listen—this is sickness, not sin!',
        possessed: 'Do what you believe is required. Others already have.'
      },
      holy_water: {
        human: 'Cold—by the Saints, warn someone before you do that.',
        infected: 'Ah—! It\'s freezing… apologies, my nerves are thin.',
        possessed: '—! Enough. Such tests are not meant for the faithful.'
      },
      papers_image: 'papers${Math.floor(Math.random() * 5) + 1}.png',
      medicinal_herbs: {
        human: 'The smell alone turns my stomach. I\'ve never tolerated strong remedies.',
        infected: 'I—*cough*—forgive me. The dust caught my throat.',
        possessed: 'I need no medicine. Whatever ails this land is not mine.'
      }
    },
    description: {
      calm_brave: 'The pilgrim waits patiently, composed and steady, as if they have already accepted whatever judgment comes.',
      honest_calm: 'The pilgrim stands quietly, hands visible, posture relaxed. There is no urgency in their movements.',
      honest_brave: 'The pilgrim meets your gaze without hesitation, standing straighter than their worn clothes suggest.',
      nervous_brave: 'The pilgrim forces themselves to stand firm, though their hands betray a slight tremor.',
      honest_nervous: 'The pilgrim grips their satchel tightly, as if afraid it might be taken. Their eyes flick to you often, but never linger.',
      calm_frightened: 'The pilgrim appears composed, but their eyes are wide, watching every movement around the gate.',
      honest_frightened: 'The pilgrim looks exhausted and afraid, as though the road behind them weighs heavier than the one ahead.',
      nervous_frightened: 'The pilgrim shifts their weight constantly, glancing toward the road and the treeline, breathing shallow and quick.'
    },
    structure: 1,
    hero_data: null
  }
];

module.exports = TRAVELERS_TEMPLATES;
