# Dialog System - Quick Reference Card

## Files Overview

| File | Purpose |
|------|---------|
| `dialog_system.js` | Core system - don't touch |
| `dialog_trees.js` | **EDIT THIS** - Your dialog templates |
| `DIALOG_SYSTEM_GUIDE.md` | Full documentation |
| `DIALOG_TEMPLATE.js` | Copy-paste templates |
| `MIGRATION_GUIDE.md` | Convert old triggers |

---

## Quick Start: Create a Dialog Tree

### 1. Open `dialog_trees.js`

### 2. Add Your Tree
```javascript
const DIALOG_TREES = {
    // ... existing trees ...
    
    YourTreeName: {
        start: {
            text: "Initial dialog text",
            options: [
                {
                    text: "Choice 1",
                    end: true,
                    actions: [ /* ... */ ]
                },
                {
                    text: "Choice 2",
                    end: true,
                    actions: [ /* ... */ ]
                }
            ]
        }
    }
};
```

### 3. Update Database
```sql
UPDATE travelers_templates 
SET dialog = '{"trigger": "YourTreeName"}'
WHERE id = YOUR_TRAVELER_ID;
```

### 4. Done! ✓

---

## Node Structure (Copy-Paste)

```javascript
nodeName: {
    text: "Dialog text shown to player",
    options: [
        {
            text: "Button text",
            next: "nextNodeId",      // OR use end: true
            end: false,
            actions: [],            // Optional
            condition: "optional"   // Optional
        }
    ]
}
```

---

## Quick Action Reference

### Simple: Just Give Items
```javascript
actions: [
    { id: 'give_items', params: { items: { 'holy water': 2 } } }
]
```

### Teach: Give + Unlock Structure + Unlock Interaction
```javascript
actions: [
    { id: 'give_items', params: { items: { 'holy water': 2 } } },
    { id: 'unlock_structure', params: { structureTemplateId: 1 } },
    { id: 'unlock_interaction', params: { interaction: 'holy-water' } },
    { id: 'log_event', params: { event: 'You learned!' } }
]
```

### Game Over: Check Supplies
```javascript
actions: [
    { 
        id: 'check_supplies', 
        params: { items: { 'lantern fuel': 1 } } 
    }
]
// If player doesn't have it → GAME OVER
```

### Game Over: Check Population
```javascript
actions: [
    { 
        id: 'check_population', 
        params: { minPopulation: 5 } 
    }
]
// If population < 5 → GAME OVER
```

### Explicit Game End
```javascript
actions: [
    { 
        id: 'trigger_ending', 
        params: { 
            ending: 'victory',
            message: 'You saved the town!' 
        } 
    }
]
```

---

## Available Actions Cheat Sheet

```
give_items         → Add items to inventory
unlock_structure   → Activate a building  
unlock_interaction → Unlock a player action
log_event          → Add to event log
check_supplies     → Win/lose check (items)
check_population   → Win/lose check (people)
trigger_ending     → Explicit game end
```

---

## Structure IDs

```
1 = Church
2 = Apothecary
3 = Inn
4 = Post Office
5 = Fortune Teller
6 = Blacksmith
```

## Interaction IDs

```
'check-papers'       (lantern fuel)
'holy-water'         (holy water)
'medicinal-herbs'    (medicinal herbs)
'execute'            (killing)
```

## Item Names

```
'holy water'
'lantern fuel'
'medicinal herbs'
```

---

## Common Patterns (Copy-Paste)

### Pattern: Simple Accept/Reject
```javascript
start: {
    text: "A visitor offers...",
    options: [
        {
            text: "Accept",
            end: true,
            actions: [{ id: 'log_event', params: { event: 'You accepted.' } }]
        },
        {
            text: "Reject",
            end: true,
            actions: [{ id: 'log_event', params: { event: 'You rejected.' } }]
        }
    ]
}
```

### Pattern: Three-Choice
```javascript
start: {
    text: "What do you do?",
    options: [
        { text: "Option A", next: "path_a" },
        { text: "Option B", next: "path_b" },
        { text: "Option C", next: "path_c" }
    ]
},
path_a: { text: "...", options: [{ text: "End", end: true }] },
path_b: { text: "...", options: [{ text: "End", end: true }] },
path_c: { text: "...", options: [{ text: "End", end: true }] }
```

### Pattern: Follow-up Question
```javascript
start: {
    text: "First question",
    options: [
        { text: "Yes", next: "yes_response" },
        { text: "No", next: "no_response" }
    ]
},
yes_response: {
    text: "Great! Follow-up?",
    options: [
        { text: "Okay", end: true }
    ]
},
no_response: {
    text: "Alright then.",
    options: [
        { text: "Goodbye", end: true }
    ]
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Dialog not showing | Check `trigger` field matches tree name exactly |
| Buttons don't appear | Ensure node has `options` array |
| Action didn't run | Check params format: `{ id: 'name', params: { ... } }` |
| Game doesn't end | Missing `end: true` on final option |
| Items not given | Check item name spelling in params |

---

## Database Format

### travelers_templates → dialog column:
```json
{
    "trigger": "TreeNameHere",
    "greeting": "optional"
}
```

### Full example:
```sql
UPDATE travelers_templates 
SET dialog = '{"trigger": "Explanation_H", "greeting": "Greetings!"}'
WHERE id = 10;
```

---

## Testing in Console

```javascript
// Get the tree
const tree = getDialogTree('TreeName');

// Check current text
console.log(tree.getText());

// Check options
console.log(tree.getOptions());

// Select option 0
tree.selectOption(0);

// Check if ended
console.log(tree.isEnded());

// Reset
tree.reset();
```

---

## Naming Convention (Optional but Recommended)

```
Explanation_H      = Teaching holy water (H = holy)
Explanation_M      = Teaching medicinal herbs (M = medicinal)
Inquisition        = Tribunal/authority
undead             = Warning/threat
cult               = Temptation/dark
Warning_*          = Generic warnings
Trade_*            = Commerce
Blessing_*         = Gifts/help
Challenge_*        = Tests/checks
```

---

## Pro Tips

✓ Use meaningful node names: `merchant_offer` not `node2`
✓ Keep text concise - fitting mobile screens
✓ Always provide an "out" from every node
✓ Chain actions: give → unlock → log
✓ Put checks at the END of action chains
✓ Log important decisions with events
✓ Test with console before deplying

---

## Key Insight

**Every choice should matter.**
- Different paths = different outcomes
- Outcomes have real game consequences
- Players feel their choices matter
- That's what makes this system powerful

---

## Emergency Syntax Check

before values, after params

Did you forget the `params` wrapper?
```javascript
// ❌ Wrong
actions: [ { id: 'give_items', items: { 'holy water': 2 } } ]

// ✓ Correct  
actions: [ { id: 'give_items', params: { items: { 'holy water': 2 } } } ]
```

---

## Get Help

1. Read `DIALOG_SYSTEM_GUIDE.md` (full documentation)
2. Copy template from `DIALOG_TEMPLATE.js`
3. Check browser console (F12) for `[DIALOG]` logs
4. Review examples in `dialog_trees.js`

---

**Happy dialog writing!** 🎭
