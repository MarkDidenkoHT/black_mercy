/**
 * Dialog Trees - Editable Templates for Fixed Travelers
 * 
 * Format:
 * {
 *   "start": {
 *     "text": "Dialog text shown to player",
 *     "options": [
 *       {
 *         "text": "Option button text",
 *         "next": "nodeId",      // next node to show
 *         "end": false,          // OR set to true to end dialogue
 *         "actions": [...],      // Actions to execute when chosen
 *         "condition": "optional_check"
 *       }
 *     ]
 *   },
 *   "nodeId": { ... }
 * }
 */

const DIALOG_TREES = {
    /**
     * MITHRAIL - Inquisition Paladin
     * Teaches about holy water, unlocks church
     */
    mithrail_greeting: {
        start: {
            text: "Greetings, citizen. I am Mithrail of the Inquisition. I will teach you to discern truth from deception.",
            options: [
                {
                    text: "What can you teach me?",
                    next: "explanation"
                },
                {
                    text: "We don't need your help.",
                    next: "rejected"
                }
            ]
        },
        explanation: {
            text: "The possessed scream when exposed to blessed water. Use this knowledge wisely. I shall grant your town the blessings of the Church.",
            options: [
                {
                    text: "Thank you, Mithrail.",
                    end: true,
                    actions: [
                        { id: 'give_items', params: { items: { 'holy water': 2 } } },
                        { id: 'unlock_structure', params: { structureTemplateId: 1 } },
                        { id: 'unlock_interaction', params: { interaction: 'holy-water' } },
                        { 
                            id: 'log_event', 
                            params: { event: 'Mithrail blessed your supplies. You received 2 Holy Water. The Church is now active.' } 
                        }
                    ]
                }
            ]
        },
        rejected: {
            text: "So be it. But when darkness comes, remember that you turned away aid. The Church's blessing will be needed.",
            options: [
                {
                    text: "Perhaps I was hasty...",
                    next: "explanation"
                },
                {
                    text: "Leave us.",
                    end: true,
                    actions: [
                        { 
                            id: 'log_event', 
                            params: { event: 'You turned away Mithrail of the Inquisition. The Church remains closed to you.' } 
                        }
                    ]
                }
            ]
        }
    },

    /**
     * NORA - Herbalist
     * Teaches about medicinal herbs, unlocks apothecary
     */
    Explanation_M: {
        start: {
            text: "A weathered herbalist approaches. 'I am Nora. I know the old remedies - the ones that burn in the lungs of the infected.'",
            options: [
                {
                    text: "Can you help us?",
                    next: "offer_help"
                },
                {
                    text: "We have our own healers.",
                    next: "declined"
                }
            ]
        },
        offer_help: {
            text: "I have medicinal herbs - burn them as incense. When the plague-touched breathe the smoke, they cough and reveal themselves. I'll leave some for you.",
            options: [
                {
                    text: "Accept her herbs.",
                    end: true,
                    actions: [
                        { id: 'give_items', params: { items: { 'medicinal herbs': 2 } } },
                        { id: 'unlock_structure', params: { structureTemplateId: 2 } },
                        { id: 'unlock_interaction', params: { interaction: 'medicinal-herbs' } },
                        { 
                            id: 'log_event', 
                            params: { event: 'Nora taught you to use medicinal herbs. You received 2 Medicinal Herbs. The Apothecary is now active.' } 
                        }
                    ]
                }
            ]
        },
        declined: {
            text: "A pity. But illness respects no pride. When suffering comes to your town, know that I offered aid.",
            options: [
                {
                    text: "Wait - I was wrong.",
                    next: "offer_help"
                },
                {
                    text: "Move on.",
                    end: true,
                    actions: [
                        { 
                            id: 'log_event', 
                            params: { event: 'You refused Nora\'s knowledge. The Apothecary remains closed.' } 
                        }
                    ]
                }
            ]
        }
    },

    /**
     * THE JUDGE - Tribunal member
     * Critical decision: failing this check = game over
     */
    Inquisition: {
        start: {
            text: "A stern figure in formal attire blocks your gate. 'I am from the High Tribunal. I must inspect your operations. Do you keep proper records?'",
            options: [
                {
                    text: "Yes, all records are in order.",
                    next: "inspect",
                    condition: "check_supplies"  // Must have lantern fuel
                },
                {
                    text: "We do our best with what we have.",
                    next: "unsure"
                },
                {
                    text: "That is none of your concern.",
                    next: "refuse"
                }
            ]
        },
        inspect: {
            text: "You present your records. The Judge examines them carefully, then nods. 'Satisfactory. Your diligence is noted. The Tribunal will remember this.'",
            options: [
                {
                    text: "Thank you for understanding.",
                    end: true,
                    actions: [
                        { 
                            id: 'log_event', 
                            params: { event: 'The Judge approved your records. The Tribunal favors you.' } 
                        }
                    ]
                }
            ]
        },
        unsure: {
            text: "The Judge studies you with narrowed eyes. 'Then prove it. Show me your records... your supplies... your people.'",
            options: [
                {
                    text: "Here, inspect everything.",
                    next: "supplies_check"
                },
                {
                    text: "I cannot allow this intrusion.",
                    next: "refuse"
                }
            ]
        },
        supplies_check: {
            text: "The Judge checks your supplies and records. If you lack basic tools, the Tribunal may declare you unfit to govern... This could end everything.",
            options: [
                {
                    text: "Accept the judgment.",
                    end: true,
                    actions: [
                        { 
                            id: 'check_supplies',
                            params: { items: { 'lantern fuel': 1 } }
                        }
                    ]
                }
            ]
        },
        refuse: {
            text: "The Judge's expression hardens. 'Refusing the Tribunal. This will be reported. You have made a grave mistake.'",
            options: [
                {
                    text: "Let them report.",
                    end: true,
                    actions: [
                        { 
                            id: 'log_event', 
                            params: { event: 'You defied the Tribunal. The Judge has left... and you know this will have consequences.' } 
                        }
                    ]
                }
            ]
        }
    },

    /**
     * scared_man - Claims to see the dead rise
     * Warning about undead threat
     */
    scared_man_greeting: {
        start: {
            text: "A gaunt man covered in grave soil approaches. His eyes are wide with fear. 'They're rising. The dead are rising from the earth. I've seen them.'",
            options: [
                {
                    text: "What are you talking about?",
                    next: "explain"
                },
                {
                    text: "You're mad.",
                    next: "dismiss"
                }
            ]
        },
        explain: {
            text: "The gravedigger trembles. 'Beyond the walls, graves have been disturbed. Things that should stay buried are walking again. You must prepare. Get blessed water, holy ground... something.'",
            options: [
                {
                    text: "We'll be ready.",
                    end: true,
                    actions: [
                        { 
                            id: 'log_event', 
                            params: { event: 'The gravedigger warns of undead stirring. A chill runs down your spine.' } 
                        }
                    ]
                },
                {
                    text: "Leave or I'll throw you out.",
                    next: "dismiss"
                }
            ]
        },
        dismiss: {
            text: "The gravedigger backs away, muttering. 'Fool. When they come, don't say you weren't warned.'",
            options: [
                {
                    text: "Go.",
                    end: true,
                    actions: [
                        { 
                            id: 'log_event', 
                            params: { event: 'You turned away the gravedigger\'s warning. Perhaps you were right to doubt him.' } 
                        }
                    ]
                }
            ]
        }
    },

     /**
     * TODO - add undead dialog and check
     */


    /**
     * THE CULTIST - Temptation and threat
     */
    cult: {
        start: {
            text: "A hooded figure approaches. 'Our master sees potential in you. Join us, and we shall grant you knowledge and power beyond mortal understanding.'",
            options: [
                {
                    text: "What is your master?",
                    next: "explain_cult"
                },
                {
                    text: "I refuse your offer.",
                    next: "refuse_cult"
                }
            ]
        },
        explain_cult: {
            text: "The figure leans close. 'That which dwells beyond the veil. That which hungers. Help us, and your town will be spared when the transformation begins.'",
            options: [
                {
                    text: "Never. Leave.",
                    next: "refuse_cult"
                },
                {
                    text: "I must think about this...",
                    next: "tempted"
                }
            ]
        },
        tempted: {
            text: "The cultist smiles. 'Wise to consider. We will return, gatekeeper. The choice will always be yours... until it is too late.'",
            options: [
                {
                    text: "Go.",
                    end: true,
                    actions: [
                        { 
                            id: 'log_event', 
                            params: { event: 'You entertained the cultist\'s offer. Dark thoughts now linger in your mind.' } 
                        }
                    ]
                }
            ]
        },
        refuse_cult: {
            text: "The figure's voice turns cold. 'A mistake. When our master rises, you will kneel or burn.'",
            options: [
                {
                    text: "Damn you.",
                    end: true,
                    actions: [
                        { 
                            id: 'log_event', 
                            params: { event: 'You refused the cult. They left with a curse on their lips.' } 
                        }
                    ]
                }
            ]
        }
    }
};

/**
 * Get a dialog tree by ID
 */
function getDialogTree(treeId) {
    const treeData = DIALOG_TREES[treeId];
    if (!treeData) {
        console.warn('[DIALOG_TREES] Unknown tree:', treeId);
        return null;
    }
    return new DialogTree(treeId, treeData);
}
