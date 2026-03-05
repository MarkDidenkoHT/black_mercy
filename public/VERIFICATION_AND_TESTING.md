# Dialog System - Verification & Testing

## ✅ Self-Check: Everything Installed Correctly?

### 1. Files Exist
```
public/dialog_system.js      ✓ Core system
public/dialog_trees.js       ✓ Templates
public/DIALOG_SYSTEM_GUIDE.md    ✓ Docs
public/DIALOG_TEMPLATE.js    ✓ Examples
public/QUICK_REFERENCE.md    ✓ Quick lookup
public/MIGRATION_GUIDE.md    ✓ Converting old
```

### 2. Script Order in index.html
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="trigger_data.js"></script>
<script src="dialog_system.js"></script>      <!-- Must be before dialog_trees -->
<script src="dialog_trees.js"></script>       <!-- Must be before main -->
<script src="pet.js"></script>
<script src="main.js"></script>               <!-- Main script last -->
```

### 3. Key Objects Available
- `DialogTree` class ✓
- `DialogActions` object ✓
- `DIALOG_TREES` object ✓
- `getDialogTree()` function ✓
- `executeDialogAction()` function ✓
- `executeDialogActions()` function ✓

---

## 🧪 Test in Browser Console

Open DevTools (F12) in your game and run these tests:

### Test 1: System Loaded
```javascript
// Should return true
typeof DialogTree === 'function' &&
typeof DIALOG_TREES === 'object' &&
typeof getDialogTree === 'function'
```

**Expected:** `true`

### Test 2: Tree Exists
```javascript
// Should return the Explanation_H tree
const tree = getDialogTree('Explanation_H');
tree !== null && tree instanceof DialogTree
```

**Expected:** `true`

### Test 3: Get Dialog Text
```javascript
const tree = getDialogTree('Explanation_H');
console.log(tree.getText());
```

**Expected:** 
```
"Greetings, citizen. I am Mithrail of the Inquisition. I will teach you to discern truth from deception."
```

### Test 4: Get Options
```javascript
const tree = getDialogTree('Explanation_H');
console.log(tree.getOptions());
```

**Expected:** Array with 2 options:
```javascript
[
    { text: "What can you teach me?", next: "explanation" },
    { text: "We don't need your help.", next: "rejected" }
]
```

### Test 5: Select Option
```javascript
const tree = getDialogTree('Explanation_H');
const result = tree.selectOption(0);
console.log(tree.getText());  // Next node text
```

**Expected:** 
```
"The possessed scream when exposed to blessed water. Use this knowledge wisely. I shall grant your town the blessings of the Church."
```

### Test 6: Execute Action
```javascript
// Test giving items
const result = await executeDialogAction('give_items', {
    items: { 'holy water': 1 }
});
console.log(result);
```

**Expected:** `{ success: true, data: {...} }`

### Test 7: All Trees Load
```javascript
// Check that all trees can be loaded without error
Object.keys(DIALOG_TREES).forEach(treeName => {
    const tree = getDialogTree(treeName);
    console.log(`✓ ${treeName}: ${tree.getText().substring(0, 50)}...`);
});
```

**Expected:** List of all trees with first 50 chars of text

---

## 🎮 Test in Game

### Test 1: Start Game
1. Start a new game
2. Go through tutorial and pet selection
3. **Verify:** You reach home screen with travelers

### Test 2: Trigger Fixed Traveler with Dialog
1. Make sure you have a fixed traveler (check day 1 travelers)
2. Click "Gate" button to see travelers
3. First traveler should have dialog
4. **Verify:** See branching dialog with multiple choice buttons

### Test 3: Make a Choice
1. In dialog, click one of the choice buttons
2. **Verify:** Dialog text changes and shows new options

### Test 4: Complete Dialog
1. Continue making choices
2. Eventually dialog should end
3. **Verify:** Traveler is marked complete

### Test 5: Actions Execute
1. Make a choice that gives items
2. **Verify:** Inventory updates
3. **Verify:** Event log shows the event

### Test 6: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Make dialog choices
4. **Verify:** See `[DIALOG]` logs for actions

---

## 🔍 Debugging Checklist

### Dialog Not Appearing?
```javascript
// 1. Check if traveler is fixed
console.log(currentTraveler.traveler.is_fixed);  // Should be true

// 2. Check if tree ID exists
const id = currentTraveler.traveler.dialog?.trigger;
console.log(DIALOG_TREES[id] ? '✓ Tree found' : '✗ Tree NOT found');

// 3. Try loading manually
const tree = getDialogTree(id);
console.log(tree ? '✓ Tree loaded' : '✗ Tree NOT loaded');
```

### Buttons Not Showing?
```javascript
// Check current node has options
const tree = getDialogTree('Explanation_H');
console.log(tree.getOptions());  // Should be array with items
```

### Actions Not Executing?
```javascript
// Check action manually
const result = await executeDialogAction('give_items', {
    items: { 'holy water': 1 }
});
console.log(result);  // Should show success
```

### Dialog Infinite Loop?
```javascript
const tree = getDialogTree('YourTree');

// Check for cycles
const visited = new Set(['start']);
let current = 'start';

for (let i = 0; i < 100; i++) {
    current = tree.data[current]?.options[0]?.next;
    if (!current) break;
    if (visited.has(current)) {
        console.log('⚠️ CYCLE DETECTED at:', current);
        break;
    }
    visited.add(current);
}

console.log('Nodes visited:', visited);
```

---

## 📊 Visual Test

### Expected Flow in Game

```
1. Traveler Appears
   ├─ Art image shows
   ├─ Dialog text displays
   └─ Choice buttons appear

2. Player Clicks Choice
   ├─ Buttons disappear
   ├─ New text appears
   └─ New buttons appear (or continues as needed)

3. Dialog Completes
   ├─ Final choice has end: true
   ├─ Traveler is marked complete
   └─ Game returns to normal
```

---

## 🐛 Common Test Failures

### Test Failure: "Tree not found"
```javascript
// Problem: Tree name doesn't match
const DIALOG_TREES = { Explanation_H: {...} };
getDialogTree('explanation_h');  // ✗ Wrong case!
getDialogTree('Explanation_H');  // ✓ Correct

// Solution: Check exact spelling and case
```

### Test Failure: "Action failed"
```javascript
// Problem: Missing params wrapper
{ id: 'give_items', items: {...} }  // ✗ Wrong
{ id: 'give_items', params: {...} } // ✓ Correct
```

### Test Failure: "Dialog loops"
```javascript
// Problem: node_1 next points to node_1
node_1: {
    options: [{ next: 'node_1' }]  // ✗ Infinite loop!
}

// Solution: Point to different node or use end: true
```

### Test Failure: "No buttons show"
```javascript
// Problem: Node has no options
node_1: {
    text: "Never ends",
    // Missing options array!
}

// Solution: Add options
node_1: {
    text: "What now?",
    options: [{ text: "Continue", end: true }]
}
```

---

## ✅ Pre-Launch Checklist

Before deploying to players:

- [ ] All trees load without errors
- [ ] Fixed travelers show dialog (not old greeting)
- [ ] All choice buttons appear and work
- [ ] Actions execute (items given, events logged)
- [ ] Dialog completes properly
- [ ] Game-over checks work correctly
- [ ] No infinite loops
- [ ] No console errors
- [ ] Tested on mobile (Telegram app)

---

## 🚀 Launch Verification

### Just Before Going Live

```javascript
// Run this in console to verify everything
console.log('=== DIALOG SYSTEM VERIFICATION ===');

// 1. Check all trees
let treeCount = 0;
for (let [name, tree] of Object.entries(DIALOG_TREES)) {
    const loaded = getDialogTree(name) ? '✓' : '✗';
    console.log(`${loaded} ${name}`);
    treeCount++;
}
console.log(`Total trees: ${treeCount}`);

// 2. Check all actions
let actionCount = 0;
for (let action of Object.keys(DialogActions)) {
    console.log(`✓ ${action}`);
    actionCount++;
}
console.log(`Total actions: ${actionCount}`);

// 3. System ready?
console.log('✓ Dialog system ready for launch!');
```

---

## 📞 Troubleshooting

### "Everything breaks when I add a tree"
1. Check syntax (missing commas, brackets)
2. Verify tree is valid JSON
3. Test in console before using in game

### "Dialog shows but no choices appear"
1. Verify node has `options` array
2. Each option needs `text` field
3. Check for JavaScript errors (F12)

### "Same traveler shows old greeting"
1. Make sure traveler has `is_fixed: true`
2. Check `dialog` field has `trigger` matching tree name
3. Reload page and game

### "Actions don't execute"
1. Watch console for `[DIALOG]` logs
2. Verify action ID is correct
3. Check params format matches schema

---

## 🎓 What Should Happen

### When Game Loads
```
Console: No errors
DIALOG_TREES defined
All trees loadable
```

### When Fixed Traveler Appears
```
Dialog text shows (not old greeting)
Choice buttons appear
Can click buttons
New text appears
```

### When Selecting Option
```
Console shows [DIALOG] logs
Actions execute
Inventory/events update
Next dialog or completion
```

### When Dialog Ends
```
Traveler marked complete
Game returns to normal
Can continue with next traveler
```

---

## 🎉 Success Indicators

- ✓ Multiple fixed travelers with different dialogs
- ✓ Player choices lead to different outcomes  
- ✓ Game mechanics execute correctly
- ✓ Game-over checks work properly
- ✓ No errors in console
- ✓ Players engage with choices

---

## Need Help?

1. **Error in console?** → Read the error message and check `QUICK_REFERENCE.md`
2. **Tree not loading?** → Verify name matches exactly (case-sensitive)
3. **Action failing?** → Check params format with examples
4. **Logic issue?** → Test manually in console with `getDialogTree()`
5. **Performance?** → Dialog system is lightweight, shouldn't impact

---

**System verified? Time to create amazing dialogs!** 🎭
