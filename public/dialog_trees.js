const DIALOG_TREES = {  
    
    mithrail_greeting: {
        start: {
            text: "A stern man in Inquisitorial garb approaches. His eyes scan you with unsettling intensity. 'I am Mithrail of the Church. Tell me, gatekeeper—that gravedigger who passed through before me. Did he seem... unusual to you?'",
            options: [
                {
                    text: "He was terrified and spoke of the dead rising.",
                    next: "truth_acknowledged"
                },
                {
                    text: "He seemed like any other traveler.",
                    next: "lie_detected"
                },
                {
                    text: "Why do you ask about him?",
                    next: "question_mithrail"
                }
            ]
        },
        truth_acknowledged: {
            text: "Mithrail nods slowly, a hint of approval in his expression. 'Good. You observe. That man was digging in places he should not have been. The Inquisition has been... watching him. Your honesty is noted.'",
            options: [
                {
                    text: "What does the Church want from us?",
                    next: "explain_help"
                },
                {
                    text: "That's none of my concern.",
                    next: "dismissive_response"
                }
            ]
        },
        lie_detected: {
            text: "Mithrail's jaw tightens. His hand drifts toward a holy symbol at his belt. 'Curious. Because my scouts saw him raving about the undead and defiling graves. Yet you noticed nothing?' He studies you with barely contained disdain. 'The Inquisition does not take kindly to deception, gatekeeper.'",
            options: [
                {
                    text: "I misspoke. He did seem troubled.",
                    next: "half_truth"
                },
                {
                    text: "I answer to no one but myself.",
                    next: "defiant_response"
                }
            ]
        },
        question_mithrail: {
            text: "Mithrail's gaze sharpens. 'Because the Church concerns itself with the shadows that gather beyond your walls. That man has been under watch—he disturbs graves and speaks of things rising from the earth. I need to know if you're complicit in his heresy, or merely blind.'",
            options: [
                {
                    text: "He spoke of the dead rising. I listened but took no action.",
                    next: "truth_acknowledged"
                },
                {
                    text: "He said nothing of importance.",
                    next: "lie_detected"
                }
            ]
        },
        half_truth: {
            text: "Mithrail's expression softens only slightly. 'A moment of clarity. Very well. I shall assume you are merely overwhelmed by the chaos at your gates. The Church can work with that.' He extends a hand. 'We are not enemies, gatekeeper.'",
            options: [
                {
                    text: "What can the Church offer?",
                    next: "neutral_alliance"
                },
                {
                    text: "I'm still not sure about you.",
                    next: "cautious_response"
                }
            ]
        },
        defiant_response: {
            text: "Mithrail's hand closes into a fist. 'Pride. How predictable. The Church will remember your defiance when plague and shadow consume your town. We came to offer salvation. You chose isolation.' He turns to leave, then pauses. 'When the darkness comes, do not reach out to us.'",
            options: [
                {
                    text: "Wait—I apologize.",
                    next: "reconciliation_attempt"
                },
                {
                    text: "Go then. We don't need the Church.",
                    end: true,
                    actions: [
                        { id: 'modify_reputation', params: { changes: { inquisition: -2 } } },
                        { 
                            id: 'log_event', 
                            params: { event: 'You turned away Mithrail. The Church marks you as unreliable. An enemy, perhaps.' } 
                        }
                    ]
                }
            ]
        },
        dismissive_response: {
            text: "Mithrail's eyes narrow. 'Foolish. That man walks between worlds—neither living nor properly dead. The undead are stirring, and you dismiss it as 'not your concern?' The Church came to protect you, gatekeeper. But we cannot help those who will not see.'",
            options: [
                {
                    text: "The Church's help comes with a price. What is it?",
                    next: "negotiation"
                },
                {
                    text: "Then we need nothing from you.",
                    next: "rejection_path"
                }
            ]
        },
        reconciliation_attempt: {
            text: "Mithrail turns back. 'An apology, at last. Perhaps there is wisdom in you after all, gatekeeper. I came here seeking answers, and I have found them. You are pragmatic. The Church respects that.' He extends his hand once more. 'We can be allies.'",
            options: [
                {
                    text: "Yes. Tell me how we can work together.",
                    next: "explain_help"
                }
            ]
        },
        cautious_response: {
            text: "Mithrail studies you for a long moment. 'Caution is wise. I do not blame you for questioning the Church. But know this—we have seen what is coming. The undead will not wait for you to make up your mind. When you're ready to ask for aid, send word.'",
            options: [
                {
                    text: "What kind of aid? What have you seen?",
                    next: "reveal_knowledge"
                },
                {
                    text: "We will call if we need the Church.",
                    end: true,
                    actions: [
                        { id: 'modify_reputation', params: { changes: { inquisition: 0 } } },
                        { 
                            id: 'log_event', 
                            params: { event: 'Mithrail left on uncertain terms. The Church remains... watchful.' } 
                        }
                    ]
                }
            ]
        },
        negotiation: {
            text: "Mithrail's expression hardens into something almost like respect. 'Ah, now you show intelligence. Yes, there is a price. But it is not gold or tithes. The Church seeks knowledge of what passes through your gates. We need to know what dangers approach. In exchange, we offer the light of faith—blessed water, holy ground, and the strength of the Church behind you.'",
            options: [
                {
                    text: "I agree. We will share information.",
                    next: "explain_help"
                },
                {
                    text: "That's too much to ask.",
                    next: "rejection_path"
                }
            ]
        },
        rejection_path: {
            text: "Mithrail nods, though his jaw tightens. 'So be it. But remember this moment when darkness knocks at your gate, and you have no light to answer it.' He begins to leave, then calls back: 'The offer stands, should you change your mind.'",
            options: [
                {
                    text: "Actually, wait.",
                    next: "last_chance"
                },
                {
                    text: "Goodbye.",
                    end: true,
                    actions: [
                        { id: 'modify_reputation', params: { changes: { inquisition: -1 } } },
                        { 
                            id: 'log_event', 
                            params: { event: 'Mithrail departed without the Church\'s blessing. You have made a powerful potential enemy.' } 
                        }
                    ]
                }
            ]
        },
        last_chance: {
            text: "Mithrail turns back, an eyebrow raised. 'Yes?'",
            options: [
                {
                    text: "I was wrong. I accept your help.",
                    next: "explain_help"
                },
                {
                    text: "Nothing. Farewell.",
                    next: "rejection_path"
                }
            ]
        },
        explain_help: {
            text: "Mithrail steps closer, and his austere expression softens into something almost like a smile. 'The possessed scream when exposed to blessed water. Use this knowledge wisely. I shall join your cause, gatekeeper. Together, we will hold back the darkness.' He places a hand on his chest. 'Mithrail of the Inquisition now stands with you.'",
            options: [
                {
                    text: "Thank you, Mithrail. Welcome.",
                    end: true,
                    actions: [
                        { id: 'give_items', params: { items: { 'holy water': 2 } } },
                        { id: 'unlock_structure', params: { structureTemplateId: 1 } },
                        { id: 'unlock_interaction', params: { interaction: 'holy-water' } },
                        { 
                            id: 'recruit_hero', 
                            params: { 
                                hero: 'Mithrail', 
                                reputation: { inquisition: 1, cult: 0, undead: 0 } 
                            } 
                        },
                        { 
                            id: 'log_event', 
                            params: { event: 'Mithrail of the Inquisition has joined you. The Church\'s blessing now rests upon your town. You receive 2 Holy Water.' } 
                        }
                    ]
                }
            ]
        },
        reveal_knowledge: {
            text: "Mithrail leans in, his voice dropping. 'The undead stir in the burial grounds beyond your walls. We do not yet know their purpose or strength, but they are gathering. The man who fled your gates—he has been desecrating graves, perhaps awakening something older than the plague itself. You need us, gatekeeper. And we need you to be our eyes and ears at this crossroads.'",
            options: [
                {
                    text: "Then let's work together.",
                    next: "explain_help"
                },
                {
                    text: "This is too much. I can't help you.",
                    next: "rejection_path"
                }
            ]
        }
    },

    nora_greeting: {
        start: {
            text: "I am Nora. I know the old remedies - the ones that burn in the lungs of the infected.",
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
                        { id: 'recruit_hero', params: { hero: 'Nora' } },
                        { 
                            id: 'log_event', 
                            params: { event: 'Nora joins your cause and teaches you to use medicinal herbs. You receive 2 Medicinal Herbs and the Apothecary is now active.' } 
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

function getDialogTree(treeId) {
    const treeData = DIALOG_TREES[treeId];
    if (!treeData) {
        console.warn('[DIALOG_TREES] Unknown tree:', treeId);
        return null;
    }
    return new DialogTree(treeId, treeData);
}