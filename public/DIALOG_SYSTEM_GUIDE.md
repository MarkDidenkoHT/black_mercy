# Dialog System Guide for Fixed Travelers

## Overview

The dialog system allows you to create branching conversations for fixed travelers with multiple choices, outcomes, and game mechanics.

### Three Main Components:

1. **dialog_system.js** - Core system for managing dialogs and executing mechanics
2. **dialog_trees.js** - Editable templates for specific travelers
3. **trigger_data.js** - Legacy trigger system (mostly for backwards compatibility)

---

## How to Create a Dialog Tree

### Basic Structure

All dialog trees are defined in `dialog_trees.js` as JSON objects in the `DIALOG_TREES` constant:

```javascript
const DIALOG_TREES = {
    TreeName: {
        start: {
            text: "Initial dialog text",
            options: [
                {
                    text: "Option 1",
                    next: "node_id"
                },
                {
                    text: "Option 2",
                    next: "another_node"
                }
            ]
        },
        node_id: {
            text: "Response to option 1",
            options: [...]
        }
    }
};
```

### Node Structure

Each node has:

```javascript
{
    text: "Dialog text displayed to player",
    options: [
        {
            text: "Button text shown to player",
            next: "next_node_id",        // Optional: move to next node
            end: false,                 // Optional: true to end dialog
            actions: [...],             // Optional: mechanics to execute
            condition: "optional_check" // Optional: condition to check
        }
    ]
}
```

---

## Node Properties

### `text` (Required)
The dialog text shown to the player. Supports multi-line strings.

### `options` (Required, Array)
Array of player choices. Each option is a button.

### Option Properties

#### `text` (Required)
Button label shown to player.

#### `next` (Optional)
Node ID to show next. If not provided and not `end: true`, dialog ends.

#### `end` (Optional, Default: false)
Set to `true` to end the dialog when this option is chosen.

#### `actions` (Optional, Array)
Array of mechanics to execute when this option is chosen. See Actions section below.

#### `condition` (Optional, String)
Condition to check. If it fails with `gameOverRequired`, triggers game over.

---

## Actions System

Actions are mechanics triggered by dialog choices. They execute in order.

### Simple Action (String)
```javascript
actions: [
    'give_items',
    'unlock_structure'
]
```

### Actions with Parameters (Object)
```javascript
actions: [
    { id: 'give_items', params: { items: { 'holy water': 2 } } },
    { id: 'unlock_structure', params: { structureTemplateId: 1 } }
]
```

---

## Available Actions

### 1. `give_items`
Give items to player's inventory.

```javascript
{
    id: 'give_items',
    params: {
        items: {
            'holy water': 2,
            'lantern fuel': 1,
            'medicinal herbs': 3
        }
    }
}
```

### 2. `unlock_structure`
Activate a building/structure in town.

```javascript
{
    id: 'unlock_structure',
    params: {
        structureTemplateId: 1  // Church
        // 1 = Church
        // 2 = Apothecary
        // 3 = Inn
        // etc.
    }
}
```

### 3. `unlock_interaction`
Unlock a new player interaction type (inspection method).

```javascript
{
    id: 'unlock_interaction',
    params: {
        interaction: 'holy-water'
        // Options: 'check-papers', 'holy-water', 'medicinal-herbs', 'execute'
    }
}
```

### 4. `log_event`
Add an event to the game log shown to player.

```javascript
{
    id: 'log_event',
    params: {
        event: 'Mithrail blessed your supplies. You received 2 Holy Water.'
    }
}
```

### 5. `check_supplies` ⚠️ GAME-OVER CHECK
Check if player has minimum required items. **Triggers game over if check fails.**

```javascript
{
    id: 'check_supplies',
    params: {
        items: {
            'lantern fuel': 1,
            'holy water': 1
        }
    }
}
```

**Result:** If player doesn't have enough, game ends.

### 6. `check_population` ⚠️ GAME-OVER CHECK
Check if town population is above minimum. **Triggers game over if check fails.**

```javascript
{
    id: 'check_population',
    params: {
        minPopulation: 5
    }
}
```

**Result:** If population is below threshold, game ends.

### 7. `trigger_ending`
Explicitly end game with victory or defeat.

```javascript
{
    id: 'trigger_ending',
    params: {
        ending: 'victory',  // or 'defeat'
        message: 'You have saved your town!'
    }
}
```

---

## Example: Complete Dialog Tree

Here's Mithrail's dialog tree from the system:

```javascript
Explanation_H: {
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
        text: "So be it. But when darkness comes, remember that you turned away aid.",
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
                        params: { event: 'You turned away Mithrail of the Inquisition.' } 
                    }
                ]
            }
        ]
    }
}
```

---

## How to Add a Dialog Tree

1. **Add to `DIALOG_TREES` in dialog_trees.js:**
   ```javascript
   const DIALOG_TREES = {
       ExistingTree: { /* ... */ },
       NewTreeName: {
           start: { /* ... */ },
           otherNode: { /* ... */ }
       }
   };
   ```

2. **Update Supabase travelers_templates:**
   Set the dialog column's `trigger` field to match your tree name:
   ```json
   {
       "trigger1": "NewTreeName",
       "trigger2": "anotherTree",
       "greeting": "Optional greeting text"
   }
   ```

3. The dialog system will automatically detect and use it when the traveler appears.

---

## Database Integration

In your Supabase `travelers_templates` table, the `dialog` column should contain:

```json
{
    "trigger": "TreeName",
    "greeting": "Optional greeting text (legacy)"
}
```

Example full row:
```sql
INSERT INTO "public"."travelers_templates" (
    "id", "names", "art", "class", "faction", 
    "fixed", "dialog", "description"
) VALUES (
    '10', 
    '["Mithrail"]', 
    'paladin', 
    'paladin', 
    '["inquisition"]',
    'true',
    '{"trigger": "Explanation_H"}',
    '{"description": "A stern paladin of the Inquisition..."}'
);
```

---

## Dialog Flow Examples

### Simple Choice → Single Outcome
```
Start
├─ Option 1 → End (with actions)
└─ Option 2 → End (with actions)
```

### Multi-Step Dialogue
```
Start
├─ Option 1 → Node_1
│            ├─ Option 1a → End
│            └─ Option 1b → Node_Sub
│                         └─ Option → End
└─ Option 2 → Node_2
             └─ Option → End
```

### With Game-Over Check
```
Start
├─ Option 1 → Node (check_supplies)
│            ├─ Sufficient → End (success)
│            └─ Insufficient → Game Over
└─ Option 2 → End
```

---

## Tips & Best Practices

### 1. Tree Naming
Use descriptive names matching the mechanic:
- `Explanation_H` - Teaches holy water
- `Explanation_M` - Teaches medicinal herbs
- `Inquisition` - Tribunal inspection
- `undead` - Warning about undead
- `cult` - Cult temptation

### 2. Always End Dialogs
Every path should eventually reach either:
- A node with `end: true`
- A node with no options (auto-completes)

### 3. Meaningful Choices
Make all options feel consequential:
```javascript
options: [
    { text: "Accept help", next: "accept_path" },      // Good choice
    { text: "Refuse", next: "refuse_path" }            // Bad choice
]
```

### 4. Log Important Events
Use `log_event` to give player feedback:
```javascript
{ id: 'log_event', params: { event: 'You made a deal with the Inquisition.' } }
```

### 5. Chain Actions in Order
Actions execute sequentially. Put checks last:
```javascript
actions: [
    { id: 'give_items', ... },           // Give items first
    { id: 'unlock_structure', ... },     // Unlock buildings
    { id: 'unlock_interaction', ... },   // Unlock interactions
    { id: 'log_event', ... },            // Log what happened
    { id: 'check_supplies', ... }        // Check for win/loss last
]
```

### 6. Use Conditions for Major Decisions
Game-over checks should be meaningful:
```javascript
{
    id: 'check_supplies',
    params: { items: { 'lantern fuel': 1 } }
}
// Judge needs lantern fuel to inspect records
```

---

## Testing Your Dialog

1. **In Browser Console** (Open DevTools):
   ```javascript
   // Test a dialog tree
   const tree = getDialogTree('Explanation_H');
   console.log(tree.getText());              // See current text
   console.log(tree.getOptions());           // See current options
   tree.selectOption(0);                     // Choose option 0
   ```

2. **Watch Console for Logs**:
   All dialog actions log to console with `[DIALOG]` prefix.

---

## Common Issues

### Dialog not showing
- Check that `trigger` field matches `DIALOG_TREES` key exactly
- Ensure traveler has `is_fixed: true`
- Check browser console for errors

### Actions not executing
- Verify action ID exists in `DialogActions`
- Check params format matches expected schema
- Watch console for action results

### Game over not triggering
- Ensure check action (like `check_supplies`) is in actions array
- Verify condition values are correct
- Check console for action results

---

## Next Steps

1. **Copy an existing tree** and modify it
2. **Add your new tree** to `DIALOG_TREES`
3. **Update Supabase** traveler template with new tree name
4. **Test** in game
5. **Iterate** based on player feedback

Happy designing! 🎭
