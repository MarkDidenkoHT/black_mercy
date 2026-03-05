# Dialog System Implementation - Summary

## 🎭 What Was Implemented

A complete **branching dialog system** for fixed travelers in Black Mercy. Players now make choices during conversations with special NPCs, leading to different outcomes and game mechanics.

---

## ✨ Key Features

### 1. **Branching Conversations**
- Players choose from multiple dialog options
- Each choice leads to different text and outcomes
- Supports unlimited depth of branching

### 2. **Editable Templates**
- Dialog trees are pure JSON in `dialog_trees.js`
- No need to code - just edit JSON
- Easy to add new travelers and trees

### 3. **Game Mechanics Integration**
- Give items to player
- Unlock structures (buildings)
- Unlock new interactions (check-papers, holy-water, execute)
- Log events to game

### 4. **Win/Loss Conditions**
- Check if player has required supplies
- Check if town has minimum population
- Explicit game-over triggers
- Everything can be configured per-dialog

### 5. **Backwards Compatible**
- Old trigger system still works
- Existing fixed travelers automatically use new system if dialog tree exists
- No breaking changes

---

## 📁 Files Created/Modified

### New Files
```
public/dialog_system.js          - Core dialog engine (don't edit)
public/dialog_trees.js           - Dialog templates (EDIT THIS)
public/DIALOG_SYSTEM_GUIDE.md    - Full documentation
public/DIALOG_TEMPLATE.js        - Copy-paste templates
public/MIGRATION_GUIDE.md        - Converting old triggers
public/QUICK_REFERENCE.md        - Quick lookup
```

### Modified Files
```
public/main.js                   - Added dialog UI display & handlers
public/index.html                - Added script includes
public/trigger_data.js           - Comments about new system (mostly unchanged)
```

---

## 🏗️ Architecture

### Three-Layer System

```
dialog_trees.js (Templates)
        ↓
dialog_system.js (Engine)
        ↓
main.js (UI Display)
```

### Data Flow
```
1. Traveler appears
   ↓
2. Check for dialog tree (in dialog field)
   ↓
3. Load tree from DIALOG_TREES
   ↓
4. Display start node text
   ↓
5. Show option buttons
   ↓
6. Player clicks option
   ↓
7. Execute actions (if any)
   ↓
8. Display next node OR end dialog
```

---

## 🎮 How It Works for Players

### On Screen
```
┌─────────────────────────────┐
│ Traveler Art (left)         │
├─────────────────────────────┤
│ Dialog Text:                │
│ "Greetings, friend!"        │
│                             │
│ [Option 1 Button]           │
│ [Option 2 Button]           │
│ [Option 3 Button]           │
└─────────────────────────────┘
```

### What Happens Behind the Scenes
```
Player clicks "Option 1"
    ↓
Check for actions in that option
    ↓
Execute actions (give items, unlock, etc.)
    ↓
Check for game-over conditions
    ↓
Show next dialog or end conversation
```

---

## 📝 How to Create a Dialog Tree

### 1. **Simplest Example** (3 minutes)
```javascript
// In dialog_trees.js
const DIALOG_TREES = {
    MyNewTree: {
        start: {
            text: "Hello there!",
            options: [
                {
                    text: "Hi",
                    end: true
                }
            ]
        }
    }
};
```

### 2. **With Choices** (5 minutes)
```javascript
MyDialog: {
    start: {
        text: "Accept my gift?",
        options: [
            {
                text: "Yes",
                end: true,
                actions: [
                    { id: 'give_items', params: { items: { 'holy water': 1 } } },
                    { id: 'log_event', params: { event: 'You received a gift.' } }
                ]
            },
            {
                text: "No",
                end: true
            }
        ]
    }
}
```

### 3. **With Branching** (10 minutes)
```javascript
ChoiceDialog: {
    start: {
        text: "Which path?",
        options: [
            { text: "Left", next: "path_left" },
            { text: "Right", next: "path_right" }
        ]
    },
    path_left: {
        text: "You went left.",
        options: [{ text: "Continue", end: true }]
    },
    path_right: {
        text: "You went right.",
        options: [{ text: "Continue", end: true }]
    }
}
```

### 4. **With Game-Over Check** (15 minutes)
```javascript
CriticalDialog: {
    start: {
        text: "Show your supplies.",
        options: [
            {
                text: "OK",
                end: true,
                actions: [
                    // If player doesn't have lantern fuel → GAME OVER
                    { id: 'check_supplies', params: { items: { 'lantern fuel': 1 } } }
                ]
            }
        ]
    }
}
```

---

## 🔧 Available Actions (Mechanics)

| Action | What It Does | Example |
|--------|-------------|---------|
| `give_items` | Add items to inventory | Give 2 holy water |
| `unlock_structure` | Activate a building | Open the Church |
| `unlock_interaction` | Add new player action | Enable "Check Papers" |
| `log_event` | Add to event log | "You learned about holy water" |
| `check_supplies` | **Game-over if fails** | Must have lantern fuel |
| `check_population` | **Game-over if fails** | Must have 5+ people |
| `trigger_ending` | Force game end | Victory or Defeat |

---

## 🗄️ Database Integration

### No Schema Changes Needed!

Your `travelers_templates` table already has a `dialog` column. Just use the `trigger` field:

```sql
-- Update a traveler to use new dialog system
UPDATE travelers_templates 
SET dialog = '{"trigger": "Explanation_H"}'
WHERE id = 10;

-- Create a new fixed traveler
INSERT INTO travelers_templates (names, art, fixed, dialog)
VALUES ('["Nora"]', 'herbalist', true, '{"trigger": "Explanation_M"}');
```

---

## 📚 When to Use Game-Over Checks

### Use `check_supplies` When:
- Traveler demands proof of equipment
- Traveler asks to inspect your tools
- Outcome depends on what you have
- Failure = game over

Example: Judge checks your lantern fuel records. If you don't have it, you're unfit to guard.

### Use `check_population` When:
- Traveler asks about town status
- Number of people matters for outcome
- Low population = critical threat

Example: Plague spreads too much. If fewer than 5 people left → town is lost.

### Use `trigger_ending` For:
- Explicit victory conditions
- Explicit defeat conditions  
- Planned ending bosses

Example: Final traveler - defens town successfully → Victory!

---

## 🧪 Testing Your Dialogs

### Test 1: In Browser Console (F12)
```javascript
// Try the dialog system
const tree = getDialogTree('Explanation_H');
console.log(tree.getText());        // See dialog text
console.log(tree.getOptions());     // See options
tree.selectOption(0);               // Choose option 0
console.log(tree.getText());        // See next text
```

### Test 2: In Game
1. Start new game
2. Reach the fixed traveler
3. Check that dialog shows
4. Try all options
5. Verify mechanics execute (items added, events logged)
6. Check console for `[DIALOG]` logs

### Test 3: Check Console Logs
Every dialog action logs to console with `[DIALOG]` prefix:
```
[DIALOG] give_items executed
[DIALOG] unlock_structure executed
[DIALOG] Action results: [...]
```

---

## 🐛 Common Issues & Fixes

### Dialog Not Showing
**Problem:** Fixed traveler shows old greeting instead of new dialog
**Solution:** 
- Verify tree name matches `trigger` field exactly (case-sensitive)
- Check tree exists in `dialog_trees.js`
- Restart browser

### Options Don't Display
**Problem:** Dialog text shows but no buttons
**Solution:**
- Ensure node has `options` array
- Each option needs `text` field
- Check for JavaScript errors in console

### Actions Don't Execute
**Problem:** Mechanics (giving items, etc.) don't happen
**Solution:**
- Verify action ID exists: `give_items`, `unlock_structure`, etc.
- Check params format: `{ id: 'name', params: { ... } }`
- Look for errors in console

### Game Won't End
**Problem:** Dialog completes but game doesn't recognize it
**Solution:**
- Ensure final option has `end: true`
- Check all paths lead to `end: true`
- Verify no nodes have infinite loops

---

## 📖 Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `QUICK_REFERENCE.md` | Cheat sheet | Creating dialogs (30 sec) |
| `DIALOG_SYSTEM_GUIDE.md` | Full documentation | Learning deeply (10 min) |
| `DIALOG_TEMPLATE.js` | Copy-paste examples | Starting a tree (2 min) |
| `MIGRATION_GUIDE.md` | Converting old triggers | Moving existing content (5 min) |

---

## 🚀 Quick Start (5 Minutes)

1. **Open** `public/dialog_trees.js`

2. **Copy** a simple tree and rename:
   ```javascript
   MyNewTree: {
       start: {
           text: "Hello world!",
           options: [{
               text: "Bye",
               end: true
           }]
       }
   }
   ```

3. **Add** to Supabase:
   ```sql
   UPDATE travelers_templates 
   SET dialog = '{"trigger": "MyNewTree"}'
   WHERE id = YOUR_ID;
   ```

4. **Test** in game - Done! ✓

---

## 💡 Design Tips

### Make Choices Matter
```javascript
// Good: Different outcomes
options: [
    { text: "Accept", next: "accept_path", actions: [...] },
    { text: "Reject", next: "reject_path", actions: [...] }
]

// Bad: Same outcome
options: [
    { text: "Yes", end: true },
    { text: "No", end: true }
]
```

### Show Consequences
```javascript
// Use log_event to show what happened
actions: [
    { id: 'give_items', params: { items: { 'holy water': 2 } } },
    { id: 'log_event', params: { event: 'You received a blessing.' } }
]
```

### Create Pressure
```javascript
// Use checks to add stakes
actions: [
    { id: 'check_supplies', params: { items: { 'lantern fuel': 1 } } }
]
// Players MUST have this or lose
```

---

## 🎯 Next Steps

1. **Read** `QUICK_REFERENCE.md` (2 min)
2. **Copy** template from `DIALOG_TEMPLATE.js` (2 min)
3. **Create** your first custom tree (5 min)
4. **Test** in game (3 min)
5. **Iterate** based on feedback

---

## 📞 Got Questions?

### Specific problem?
→ Check `QUICK_REFERENCE.md`

### Need full docs?
→ Read `DIALOG_SYSTEM_GUIDE.md`

### Converting old content?
→ See `MIGRATION_GUIDE.md`

### Want examples?
→ Look at `DIALOG_TEMPLATE.js`

### Have bugs?
1. Check browser console (F12)
2. Look for `[DIALOG]` logs
3. Try testing in console manually

---

## ✅ What's Working

- ✓ Dialog tree loading from JSON
- ✓ Multi-node branching
- ✓ Player choice buttons
- ✓ Item giving mechanics
- ✓ Structure unlocking
- ✓ Interaction unlocking
- ✓ Event logging
- ✓ Game-over checks (supplies/population)
- ✓ Game ending mechanics
- ✓ Backwards compatibility with old triggers
- ✓ Full documentation

---

## 🎬 Let's Make Great Dialogs!

You now have everything needed to create meaningful, branching conversations that make players feel their choices matter. The system is flexible, easy to edit, and ready for complex scenarios.

**Start with something simple, test it, iterate, and build up from there.**

The game's story comes from these moments of choice. Make them count! 🎭

---

**Questions? Check the docs. Ready to build? Open `dialog_trees.js`!**
