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
  },
  {
    id: 2,
    names: ['merchant1', 'merchant2'],
    art: 'merchant',
    traits: {
      trait1: ['honest', 'lying'],
      trait2: ['nervous'],
      trait3: ['frightened']
    },
    faction: ['human', 'infected'],
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
      human: 'inquisition +2',
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
        human: 'You examine the merchant carefully. They seem eager, almost too eager to proceed.\n\nYou won\'t regret it. Trade keeps towns alive.',
        infected: 'The merchant stands before you, shifting their weight. Their breathing seems labored.\n\nThank you. I\'ll sell quickly and be out of everyone\'s way.'
      },
      out: {
        human: 'The merchant\'s expression hardens as they turn to leave.\n\nThen this town will pay higher prices elsewhere. Remember that.',
        infected: 'The merchant\'s shoulders slump. They glance back at the gate with something like despair.\n\nPlease… I don\'t know if I\'ll make another stop.'
      },
      papers: {
        human: 'You unfold the merchant\'s documents. The stamps are recent, from the last market town over. The edges are worn but the seals look standard.\n\nStamped at the last market town. You know how slow scribes have become.',
        infected: 'The papers are damp and wrinkled. The ink has bled in places, making some letters illegible. You can make out signatures, but barely.\n\nThe ink smudged in the rain. The road hasn\'t been kind to paper—or people.'
      },
      greeting: {
        human: 'Good day, gatekeeper. I bring goods and coin, both sorely needed these days.',
        infected: 'Good day. I\'ve come a long way, and I\'d rather trade here than sleep on the road again.'
      },
      execution: {
        human: 'This is madness. Coin and goods mean nothing to you people anymore.',
        infected: 'Wait—this is illness, not crime!'
      },
      holy_water: {
        human: 'You splash the merchant with holy water. They flinch but remain composed.\n\nIs that necessary? Merchants aren\'t demons, last I checked.',
        infected: 'You splash the merchant with holy water. They gasp sharply, their hand flying to their chest.\n\n—Ah! Cold enough to stop a heart. You nearly did.'
      },
      papers_image: 'papers${Math.floor(Math.random() * 5) + 1}.png',
      medicinal_herbs: {
        human: 'You wave medicinal herbs toward the merchant. They wrinkle their nose but stand firm.\n\nI don\'t take remedies unless I must. They dull the senses.',
        infected: 'You wave medicinal herbs toward the merchant. They suddenly double over, a violent cough wracking their frame.\n\n*cough*—forgive me. The dust from the road hasn\'t left my lungs.'
      }
    },
    description: {
      lying_nervous: 'The merchant smiles too quickly, speaking before you ask, fingers drumming against a coin pouch.',
      honest_nervous: 'The merchant keeps checking the straps on their packs, counting them twice before looking up at you.',
      lying_frightened: 'The merchant avoids your gaze, shifting their weight as if ready to flee at the slightest word.',
      honest_frightened: 'The merchant\'s goods are neatly packed, but their face betrays exhaustion and unease from the road.',
      nervous_frightened: 'The merchant smells faintly of sweat and old leather, their breath uneven as they wait for your judgment.'
    },
    structure: 5,
    hero_data: null
  },
  {
    id: 3,
    names: ['refugee1', 'refugee2'],
    art: 'refugee',
    traits: {
      trait1: ['honest', 'lying'],
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
        human: 'The refugee nods solemnly, their shoulders relaxing slightly.\n\nThank you. I will cause no trouble and leave with the dawn.',
        infected: 'The refugee bows their head, visibly relieved but still trembling.\n\nI\'m grateful. I will ensure I\'ll disturb no one.',
        possessed: 'The refugee\'s eyes seem to focus on something beyond you for a moment.\n\nYour mercy will be remembered. I will not linger long.'
      },
      out: {
        human: 'The refugee straightens, their expression hardening with resignation.\n\nI will leave at first light. May your town prosper.',
        infected: 'The refugee\'s face falls. They gather themselves slowly, as if each movement costs them.\n\nThen we go. I pray the next village is more forgiving.',
        possessed: 'The refugee turns away, and you notice something hollow in their gait.\n\nVery well. Some doors are not meant to open.'
      },
      papers: {
        human: 'You examine the travel permits carefully. They\'re worn but legible, stamped by the previous village with their seal intact.\n\nThese are my travel permits from the last village. They should be sufficient.',
        infected: 'The papers are damp and stained. Parts of the seal have been washed away by water damage, making verification difficult. The handwriting is shaky in places.\n\nI had them written at the last town, but the rain… it ruined part of the seal.',
        possessed: 'The documents are pristine, almost unnaturally so given the refugee\'s appearance. The seals are perfect, the signatures methodical.\n\nThe papers are correct. They speak truth as they always have.'
      },
      greeting: {
        human: 'Please, I\'ve nowhere else to go. I beg for shelter and a moment\'s safety.',
        infected: 'I… I just need a place to rest. The road has been unforgiving, and I am weary.',
        possessed: 'I come seeking refuge. Let this town not be our undoing.'
      },
      execution: {
        human: 'No! We have done nothing wrong—please, reconsider!',
        infected: 'Wait… this is sickness, not sin. I beg you!',
        possessed: 'If it must be, do what is required. Others have already suffered.'
      },
      holy_water: {
        human: 'You splash the refugee with holy water. They recoil but remain standing.\n\nPlease… do not! I mean no harm, I only wish to rest.',
        infected: 'You splash the refugee with holy water. They cry out, their entire body convulsing, skin flushing red.\n\nAh! The water… it burns, forgive me, I cannot stop trembling.',
        possessed: 'You splash the refugee with holy water. They do not flinch. They do not even blink.\n\n—No. You mistake your power. I am unharmed.'
      },
      papers_image: 'papers${Math.floor(Math.random() * 5) + 1}.png',
      medicinal_herbs: {
        human: 'You wave medicinal herbs toward the refugee. They cough once, then control themselves.\n\nI cough, but it is just the dust and chill from the road.',
        infected: 'You wave medicinal herbs toward the refugee. They immediately bend double, wracked by violent, uncontrollable coughing.\n\n*cough*—I cannot stop it… I fear it has taken hold.',
        possessed: 'You wave medicinal herbs toward the refugee. They stand motionless, unbothered.\n\nI require no medicine. The sickness of the land is not mine.'
      }
    },
    description: {
      lying_calm: 'The refugee\'s voice is smooth, practiced, but their eyes betray a hint of unease beneath the mask of composure.',
      honest_calm: 'The refugee stands quietly, steadying their children with a hand on each shoulder, eyes calm but alert.',
      lying_brave: 'The refugee speaks boldly, but each claim seems rehearsed, their courage slightly hollow.',
      honest_brave: 'The refugee straightens as best they can, lifting their chin despite the weariness and danger behind them.',
      lying_nervous: 'The refugee avoids your gaze, fidgeting with a piece of cloth, their story slipping through hurried words and stammers.',
      honest_nervous: 'The refugee clutches a small bundle to their chest, glancing at the gate nervously as if expecting trouble at every moment.',
      lying_frightened: 'The refugee shifts constantly, mumbling half-truths and looking to the crowd for reassurance.',
      honest_frightened: 'The refugee\'s face is pale and tight, fear written in every tremble of their hands and every glance at the shadows.'
    },
    structure: 5,
    hero_data: null
  },
  {
    id: 4,
    names: ['deserter1', 'deserter2'],
    art: 'deserter',
    traits: {
      trait1: ['honest', 'lying'],
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
        human: 'The deserter nods curtly, relieved to avoid further scrutiny.\n\nThank you. I will stay quiet and keep to the outskirts.',
        infected: 'The deserter\'s shoulders sag with visible relief, though they still seem feverish.\n\nI appreciate your mercy. I\'ll disturb no one.',
        possessed: 'The deserter\'s eyes gleam strangely in the torchlight.\n\nYour caution will be noted. I shall not linger unnecessarily.'
      },
      out: {
        human: 'The deserter straightens, preparing to leave with quiet dignity.\n\nVery well, I will leave at first light. May this town stand strong.',
        infected: 'The deserter turns away slowly, their gait unsteady.\n\nThen I will go. The road is long, but better than lingering here.',
        possessed: 'The deserter departs without another word, their movements precise and deliberate.\n\nUnderstood. Some gates are meant to stay closed.'
      },
      papers: {
        human: 'You examine the documents. They are military orders, the seal bearing an official garrison mark. The ink is fresh, the paper unmarred. Almost too perfect.\n\nThese are my orders. They\'re real, I swear. I can\'t show more than that.',
        infected: 'You study the papers. They are clearly military documents, but the edges are water-stained and warped. The seal is partially obscured. Parts of the writing have bled into illegibility.\n\nThe documents… they may be smudged. I could not keep them dry on the road.',
        possessed: 'You inspect the orders. They are immaculate—almost impossibly so. The handwriting is perfect, the seals pristine, yet something about their uniformity feels... constructed.\n\nThese are what they are. You have my word.'
      },
      greeting: {
        human: 'I\'ve walked a long road, seeking safety. I mean no trouble here.',
        infected: 'I… I just need a place to rest. The illness is catching up with me.',
        possessed: 'I seek passage. The night is dark, and the road is cruel.'
      },
      execution: {
        human: 'Please! I\'ve deserted, not murdered. I mean no harm!',
        infected: 'Wait… this is sickness, not sin! I beg you!',
        possessed: 'Do as you will. Others have faced this already.'
      },
      holy_water: {
        human: 'You splash the deserter with holy water. They hiss and pull back sharply.\n\nEnough! I am no demon. The cold burns, but I am flesh and blood.',
        infected: 'You splash the deserter with holy water. They cry out, their skin reddening where the water touches them, trembling uncontrollably.\n\nAh! It… it stings. Forgive me, I cannot help this weakness.',
        possessed: 'You splash the deserter with holy water. They do not react. Their eyes remain fixed on you, unblinking.\n\nYou mistake me for what I am not. Stop this!'
      },
      papers_image: 'papers${Math.floor(Math.random() * 5) + 1}.png',
      medicinal_herbs: {
        human: 'You wave medicinal herbs toward the deserter. They grimace but steady themselves.\n\nI\'ve avoided herbs before; they make me woozy. Just a light touch, if you must.',
        infected: 'You wave medicinal herbs toward the deserter. They immediately break into a violent coughing fit, doubling over.\n\n*cough*—the herbs… they worsen it slightly, I think. Forgive me.',
        possessed: 'You wave medicinal herbs toward the deserter. They stand motionless, unfazed.\n\nI require no remedy. The sickness is not mine.'
      }
    },
    description: {
      lying_calm: 'The deserter speaks smoothly, carefully choosing words, but something in their posture suggests a hidden agenda.',
      honest_calm: 'The deserter stands steadily, hands open, voice measured, as if trying to show they mean no harm.',
      lying_brave: 'The deserter\'s stance is bold, but their words feel practiced, like a story memorized to survive.',
      honest_brave: 'Despite the road behind them, the deserter faces you squarely, eyes steady and hands unclenched.',
      lying_nervous: 'The deserter fidgets and mutters excuses, words tripping over one another as if rehearsed and fragile.',
      honest_nervous: 'The deserter shifts on their feet, avoiding direct eye contact, yet their story seems sincere enough.',
      lying_frightened: 'The deserter trembles slightly, giving quick answers and darting glances toward the horizon.',
      honest_frightened: 'Sweat glistens on their brow, and every glance over their shoulder betrays fear of pursuit.'
    },
    structure: 5,
    hero_data: null
  },
  {
    id: 5,
    names: ['courier1', 'courier2'],
    art: 'courier',
    traits: {
      trait1: ['honest', 'lying'],
      trait2: ['calm'],
      trait3: ['brave']
    },
    faction: ['human', 'possessed'],
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
        human: 'The courier nods efficiently, their hand already on their pack.\n\nI will pass through swiftly, keeping disturbance minimal.',
        possessed: 'The courier\'s gaze lingers on you longer than necessary, a faint smile crossing their lips.\n\nEntry is granted… but the town will notice more than it should.'
      },
      out: {
        human: 'The courier adjusts their cloak with practiced precision.\n\nVery well. My route continues without delay.',
        possessed: 'The courier turns to leave, yet something in their bearing suggests they\'ve already begun their work.\n\nThen I depart… some things remain, despite absence.'
      },
      papers: {
        human: 'You examine the courier\'s documents. The seals are official and recent, the permits stamped by the capital with unmistakable authority. Everything appears legitimate and in order.\n\nOrders and permits are in order. Check them carefully, though time presses.',
        possessed: 'You study the documents carefully. The seals are present, the stamps appear genuine, yet something about them feels... inexact. The ink seems to shift slightly in the light, and the signatures lack the usual pressure marks of a genuine hand.\n\nThe documents are… correct, as far as one can say.'
      },
      greeting: {
        human: 'I have urgent dispatches. I mean no trouble and will only remain briefly.',
        possessed: 'I carry messages… but the words twist themselves, as all truth here is bound.'
      },
      execution: {
        human: 'I am but a courier. No cause for such measures exists.',
        possessed: 'Do what you will. Others have suffered; I will not resist.'
      },
      holy_water: {
        human: 'You splash the courier with holy water. They step back calmly, unaffected.\n\nI require no blessing. My path is already set.',
        possessed: 'You splash the courier with holy water. They do not cry out, but their form seems to flicker momentarily, as if caught between states.\n\n—This is not meant for me. Leave the water be.'
      },
      papers_image: 'papers${Math.floor(Math.random() * 5) + 1}.png',
      medicinal_herbs: {
        human: 'You wave medicinal herbs toward the courier. They do not react, standing perfectly still.\n\nNo need. I have traveled far and know my limits.',
        possessed: 'You wave medicinal herbs toward the courier. They do not cough, do not flinch. They simply stare at you with unsettling calm.\n\nI do not need remedies. They serve no purpose here.'
      }
    },
    description: {
      lying_calm: 'The courier\'s hands are steady, but their eyes flick briefly to the road behind them, hinting at something unsaid.',
      honest_calm: 'The courier stands straight, papers neatly folded, every movement precise and purposeful.',
      lying_brave: 'The courier carries themselves boldly, yet their words feel carefully rehearsed, as if each step is calculated.',
      honest_brave: 'The courier meets your gaze directly, posture steady, with a quiet confidence that suggests experience.'
    },
    structure: 4,
    hero_data: null
  },
  {
    id: 10,
    names: ['Mithrail'],
    art: 'Mithrail',
    traits: null,
    faction: ['inquisition'],
    effect_in: null,
    effect_out: null,
    effect_ex: null,
    fixed: true,
    effect_in_hidden: null,
    fixed_data: { 1: '2' },
    dialog: {
      trigger1: 'mithrail_greeting',
      greeting1: 'Greetings, citizen. I am Mithrail of the Inquisition. TEST'
    },
    description: {
      description: 'Mithrail, a stern paladin of the Inquisition, approaches with measured steps.'
    },
    structure: null,
    hero_data: {
      art: 'Mithrail',
      hero: 'Mithrail',
      stats: {
        zeal: 3,
        mercy: 1,
        insight: 1,
        authority: 3,
        swiftness: 1
      },
      talents: 'divine_guidance',
      reputation: { player: 0 }
    }
  },
  {
    id: 11,
    names: ['Nora'],
    art: 'Nora',
    traits: null,
    faction: ['apothecary'],
    effect_in: null,
    effect_out: null,
    effect_ex: null,
    fixed: true,
    effect_in_hidden: null,
    fixed_data: { 1: '4' },
    dialog: {
      trigger1: 'nora_greeting',
      greeting1: 'Greetings. I am Nora, doctor of the apothecary. I will inspect your medicinal supplies and ensure you are prepared for the road ahead.'
    },
    description: {
      description: 'A plague doctor in a dark cloak and beaked mask approaches cautiously.'
    },
    structure: null,
    hero_data: {
      art: 'Nora',
      hero: 'Nora',
      stats: {
        zeal: 1,
        mercy: 2,
        insight: 2,
        authority: 1,
        swiftness: 3
      },
      talents: 'sixth_sence',
      reputation: { player: 0 }
    }
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TRAVELERS_TEMPLATES;
} else {
  window.TRAVELERS_TEMPLATES = TRAVELERS_TEMPLATES;
}