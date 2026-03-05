# Migration Guide: From Legacy to Dialog System

## What's New

You now have a full dialog branching system that replaces the old trigger-only approach.

### Old System (Legacy)
- Fixed travelers showed greeting + executed a single trigger
- Triggers were hardcoded in JavaScript
- No branching, no player choices
- Limited mechanics execution

### New System (Dialog Trees)
- Fixed travelers show branching dialog trees
- Multiple player-controlled choices
- Each choice can trigger different outcomes
- Easy-to-edit JSON templates
- Game-over checks built in
- Backwards compatible with old system

---

## Migration Path

### Existing Fixed Travelers

If you have existing fixed travelers using triggers like `Explanation_H`, `Explanation_M`, etc., they will **automatically** use the new dialog trees if:

1. **Dialog Trees Exist**  
   The tree in `dialog_trees.js` matches the trigger name:
   ```javascript
   DIALOG_TREES = {
       Explanation_H: { ... },  // Matches trigger
       Explanation_M: { ... }   // Matches trigger
   }
   ```

2. **Database Trigger Field**  
   Your travelers_templates row has:
   ```json
   {
       "trigger": "Explanation_H",
       "greeting": "optional"
   }
   ```

3. **That's It!**  
   The system detects the tree and uses it automatically.

---

## Moving Your Old Triggers to Dialog Trees

### Step 1: Identify Your Trigger
Find the trigger in your `travelers_templates`:
```sql
SELECT id, names, dialog FROM travelers_templates WHERE fixed = true;
```

Example result:
```
id  | names          | dialog
----|----------------|-----------------------------------
10  | Mithrail       | {"trigger":"Explanation_H"}
11  | Nora           | {"trigger":"Explanation_M"}
```

### Step 2: Convert to Dialog Tree

**Old Trigger in trigger_data.js:**
```javascript
Explanation_H: async (traveler, session) => {
    await fetch('/api/inventory/give', { /* give items */ });
    await fetch('/api/structures/set-active', { /* unlock */ });
    await fetch('/api/events/add', { /* log */ });
}
```

**New Dialog Tree in dialog_trees.js:**
```javascript
Explanation_H: {
    start: {
        text: "Initial greeting...",
        options: [
            {
                text: "Accept",
                end: true,
                actions: [
                    { id: 'give_items', params: { items: { 'holy water': 2 } } },
                    { id: 'unlock_structure', params: { structureTemplateId: 1 } },
                    { id: 'log_event', params: { event: 'Event text' } }
                ]
            }
        ]
    }
}
```

### Step 3: Test
1. Start a new game session
2. See if the new traveler dialog appears
3. Check browser console for `[DIALOG]` logs
4. Verify mechanics execute correctly

---

## Backwards Compatibility

The old system **still works** if you don't define a dialog tree:

- If trigger `MyTrigger` has no tree in `DIALOG_TREES`, the system calls `TRIGGER_HANDLERS[MyTrigger]`
- Old trigger functions still exist and work
- No breaking changes

---

## Converting Examples

### Example 1: Simple Trigger (Give Items)

**Old:**
```javascript
GiveItems: async (traveler, session) => {
    const response = await fetch('/api/inventory/give', {
        method: 'POST',
        body: JSON.stringify({ chatId: currentPlayer.chat_id, items: { 'holy water': 2 } })
    });
}
```

**New:**
```javascript
GiveItems: {
    start: {
        text: "Here, take these supplies.",
        options: [
            {
                text: "Thank you",
                end: true,
                actions: [
                    { id: 'give_items', params: { items: { 'holy water': 2 } } },
                    { id: 'log_event', params: { event: 'You received supplies.' } }
                ]
            }
        ]
    }
}
```

### Example 2: Trigger with Multiple Mechanics

**Old:**
```javascript
TeachMagic: async (traveler, session) => {
    await fetch('/api/inventory/give', { /* give items */ });
    await fetch('/api/structures/set-active', { /* unlock */ });
    await fetch('/api/session/add-interaction', { /* unlock */ });
    await fetch('/api/events/add', { /* log */ });
}
```

**New:**
```javascript
TeachMagic: {
    start: {
        text: "I will teach you the ways of magic.",
        options: [
            {
                text: "Learn from me",
                end: true,
                actions: [
                    { id: 'give_items', params: { items: { 'magic scroll': 1 } } },
                    { id: 'unlock_structure', params: { structureTemplateId: 5 } },
                    { id: 'unlock_interaction', params: { interaction: 'magic' } },
                    { id: 'log_event', params: { event: 'You learned magic!' } }
                ]
            },
            {
                text: "No thanks",
                end: true,
                actions: [
                    { id: 'log_event', params: { event: 'You refused to learn.' } }
                ]
            }
        ]
    }
}
```

### Example 3: Complex Branching

**Old (Not Really Possible):**
```javascript
// Could only do one path
Merchant: async (traveler, session) => {
    // Pick one outcome, execute it
}
```

**New (Full Branching):**
```javascript
Merchant: {
    start: {
        text: "I have wares to sell.",
        options: [
            { text: "Show me", next: "merchant_catalog" },
            { text: "Not interested", end: true }
        ]
    },
    merchant_catalog: {
        text: "Here's what I have...",
        options: [
            { 
                text: "Buy holy water", 
                end: true,
                actions: [
                    { id: 'give_items', params: { items: { 'holy water': 3 } } }
                ]
            },
            { 
                text: "Buy herbs", 
                end: true,
                actions: [
                    { id: 'give_items', params: { items: { 'medicinal herbs': 3 } } }
                ]
            },
            { text: "Leave", end: true }
        ]
    }
}
```

---

## Common Conversion Mistakes

### ❌ Wrong: Forgetting the `params` object
```javascript
// This won't work
actions: [
    { id: 'give_items', items: { 'holy water': 2 } }
]

// Correct
actions: [
    { id: 'give_items', params: { items: { 'holy water': 2 } } }
]
```

### ❌ Wrong: Tree ID doesn't match trigger
```javascript
// In database: trigger = "MyTree"
// But in dialog_trees.js: DIALOG_TREES = { MyT ree: ... }  // Typo!

// Solution: Match exactly
```

### ❌ Wrong: Missing `start` node
```javascript
// This won't work
MyTree: {
    node_1: { /* ... */ }
}

// Correct: Must have 'start' node
MyTree: {
    start: { /* ... */ },
    node_1: { /* ... */ }
}
```

### ❌ Wrong: No exit paths
```javascript
// This will loop forever
MyTree: {
    start: {
        text: "Hello",
        options: [
            { text: "Continue", next: "node_1" }
        ]
    },
    node_1: {
        text: "Hello again",
        options: [
            { text: "Continue", next: "start" }  // Loops back!
        ]
    }
}

// Add end: true to exit
options: [
    { text: "Done", end: true }
]
```

---

## Checklist: Converting a Trigger

- [ ] Identify the trigger name in database
- [ ] Copy the tree template from `DIALOG_TEMPLATE.js`
- [ ] Name it to match the trigger
- [ ] Define the `start` node with greeting text
- [ ] Create branches for each choice
- [ ] Convert mechanics to action objects
- [ ] Ensure all paths lead to `end: true`
- [ ] Add to `DIALOG_TREES` in `dialog_trees.js`
- [ ] Test in game
- [ ] Check console logs for `[DIALOG]`

---

## File Changes Summary

### New Files
- `dialog_system.js` - Core system
- `dialog_trees.js` - Editable templates  
- `DIALOG_SYSTEM_GUIDE.md` - Full documentation
- `DIALOG_TEMPLATE.js` - Copy-paste templates

### Modified Files
- `main.js` - Added dialog UI display
- `index.html` - Added script includes
- `trigger_data.js` - Comments about new system

### No Breaking Changes
- Old system still works for non-dialog travelers
- Database schema unchanged
- All old mechanics still functional

---

## Testing Your Migration

### Test 1: Old Trigger Still Works
```javascript
// In browser console
executeTrigger('Explanation_H', currentTraveler.traveler, currentSession);
// Should log: "[TRIGGER] Explanation_H fired by: ..."
```

### Test 2: New Dialog Works
```javascript
// In browser console
const tree = getDialogTree('Explanation_H');
console.log(tree.getText());        // Should show first dialog
console.log(tree.getOptions());     // Should show choices
```

### Test 3: Actions Execute
```javascript
// Watch console for [DIALOG] logs during dialog
// Actions should execute in order
// Check inventory, structures, events update correctly
```

---

## Support

If something breaks:

1. Check **browser console** for errors (F12 → Console)
2. Look for `[DIALOG]` logs
3. Verify tree IDs match exactly (case-sensitive)
4. Ensure tree has `start` node
5. Check action params format

---

## Next Steps

1. Test existing travelers with new system
2. Convert one trigger to dialog tree
3. Add new dialog trees for new travelers
4. Create branches for complex scenarios
5. Add game-over checks for critical decisions

Good luck! 🎭
