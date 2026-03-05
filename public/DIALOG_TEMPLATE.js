/**
 * DIALOG TREE TEMPLATE
 * 
 * Copy this and modify for new fixed travelers.
 * 
 * Steps:
 * 1. Copy this template
 * 2. Replace 'TemplateTreeName' with your tree name
 * 3. Define your nodes
 * 4. Add to DIALOG_TREES in dialog_trees.js
 * 5. Update Supabase travelers_templates with trigger: "TemplateTreeName"
 */

const TEMPLATE = {
    TemplateTreeName: {
        // REQUIRED: Starting node (must be named 'start')
        start: {
            text: "First dialog text shown to player",
            options: [
                {
                    text: "Option 1 button text",
                    next: "node_1",
                    // actions: [...]  // Optional: mechanics to execute
                },
                {
                    text: "Option 2 button text",
                    next: "node_2",
                    // actions: [...]
                }
            ]
        },

        // Additional nodes
        node_1: {
            text: "Response text for option 1",
            options: [
                {
                    text: "Continue",
                    next: "node_1_sub"
                }
            ]
        },

        node_1_sub: {
            text: "Sub-response",
            options: [
                {
                    text: "Accept",
                    end: true,  // Ends dialog
                    actions: [
                        { id: 'log_event', params: { event: 'You accepted the offer.' } }
                    ]
                }
            ]
        },

        node_2: {
            text: "Response text for option 2",
            options: [
                {
                    text: "Finish",
                    end: true,
                    actions: [
                        { id: 'log_event', params: { event: 'You declined.' } }
                    ]
                }
            ]
        }
    }
};

/**
 * COMMON ACTION PATTERNS
 */

// Pattern 1: Give items only
const PATTERN_GIVE_ITEMS = [
    { id: 'give_items', params: { items: { 'holy water': 2 } } }
];

// Pattern 2: Unlock structure
const PATTERN_UNLOCK_STRUCTURE = [
    { id: 'unlock_structure', params: { structureTemplateId: 1 } }
];

// Pattern 3: Unlock interaction + give items + log
const PATTERN_TEACH = [
    { id: 'give_items', params: { items: { 'holy water': 2 } } },
    { id: 'unlock_structure', params: { structureTemplateId: 1 } },
    { id: 'unlock_interaction', params: { interaction: 'holy-water' } },
    { id: 'log_event', params: { event: 'You learned something important.' } }
];

// Pattern 4: Check supplies (game-over condition)
const PATTERN_CHECK_SUPPLIES = [
    { 
        id: 'check_supplies', 
        params: { 
            items: { 
                'lantern fuel': 1,
                'holy water': 1 
            } 
        } 
    }
];

// Pattern 5: Check population (game-over condition)
const PATTERN_CHECK_POPULATION = [
    { 
        id: 'check_population', 
        params: { minPopulation: 5 } 
    }
];

// Pattern 6: End game
const PATTERN_VICTORY = [
    { 
        id: 'trigger_ending', 
        params: { 
            ending: 'victory',
            message: 'You have saved your town!' 
        } 
    }
];

const PATTERN_DEFEAT = [
    { 
        id: 'trigger_ending', 
        params: { 
            ending: 'defeat',
            message: 'Your town has fallen.' 
        } 
    }
];

/**
 * REAL EXAMPLE: Minimal Dialog
 */

const EXAMPLE_SIMPLE = {
    SimpleVisitor: {
        start: {
            text: "A fellow traveler stops by.",
            options: [
                {
                    text: "Chat",
                    end: true,
                    actions: [
                        { id: 'log_event', params: { event: 'You spoke with the traveler.' } }
                    ]
                },
                {
                    text: "Move on",
                    end: true
                }
            ]
        }
    }
};

/**
 * REAL EXAMPLE: Complex Dialog with Branching
 */

const EXAMPLE_COMPLEX = {
    ComplexVisitor: {
        start: {
            text: "A mysterious merchant approaches.",
            options: [
                {
                    text: "What do you want?",
                    next: "merchant_explain"
                },
                {
                    text: "State your business quickly.",
                    next: "merchant_impatient"
                },
                {
                    text: "Leave. We're busy.",
                    end: true,
                    actions: [
                        { id: 'log_event', params: { event: 'You turned away the merchant.' } }
                    ]
                }
            ]
        },
        
        merchant_explain: {
            text: "I have supplies to trade. Holy water, herbs, lamp oil - all for a good price.",
            options: [
                {
                    text: "We could use those.",
                    next: "merchant_trade"
                },
                {
                    text: "Not interested.",
                    end: true
                }
            ]
        },

        merchant_impatient: {
            text: "Fine. I have supplies. Interested?",
            options: [
                {
                    text: "Show me.",
                    next: "merchant_trade"
                },
                {
                    text: "Get out.",
                    end: true
                }
            ]
        },

        merchant_trade: {
            text: "Excellent. Here, take these. On the house - a gift of goodwill.",
            options: [
                {
                    text: "Thank you?",
                    end: true,
                    actions: [
                        { 
                            id: 'give_items', 
                            params: { 
                                items: { 
                                    'holy water': 1,
                                    'lantern fuel': 1,
                                    'medicinal herbs': 1
                                } 
                            } 
                        },
                        { id: 'log_event', params: { event: 'The merchant gave you supplies and left.' } }
                    ]
                }
            ]
        }
    }
};

/**
 * REAL EXAMPLE: With Game-Over Check
 */

const EXAMPLE_CRITICAL = {
    CriticalInspection: {
        start: {
            text: "The Tribunal Inspector arrives. 'Show me your operation.'",
            options: [
                {
                    text: "Present your records.",
                    next: "show_records"
                },
                {
                    text: "Refuse inspection.",
                    end: true,
                    actions: [
                        { id: 'log_event', params: { event: 'You defied the Tribunal.' } }
                    ]
                }
            ]
        },

        show_records: {
            text: "The inspector examines your records carefully. 'And your supplies?'",
            options: [
                {
                    text: "Show everything.",
                    end: true,
                    actions: [
                        // This check happens at the end
                        // If you don't have lantern fuel, GAME OVER
                        { 
                            id: 'check_supplies', 
                            params: { 
                                items: { 'lantern fuel': 1 } 
                            } 
                        }
                    ]
                }
            ]
        }
    }
};
