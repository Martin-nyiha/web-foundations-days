let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const term = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(term));
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";
  return `${total} ${word}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

function isDuplicate(text) {
  const clean = text.trim().replace(/\s+/g, " ").toLowerCase();
  return notes.some(
    (note) => note.text.trim().replace(/\s+/g, " ").toLowerCase() === clean
  );
}

function addNote(text, category) {
  const clean = text.trim();
  const allowed = ["personal", "work", "study"];

  if (clean.length < 1 || clean.length > 200) {
    console.log("Not added: text must be 1-200 characters.");
    return false;
  }
  if (!allowed.includes(category)) {
    console.log("Not added: category must be personal, work or study.");
    return false;
  }
  if (isDuplicate(clean)) {
    console.log("Not added: that note already exists.");
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: clean, category: category });
  return true;
}

// ---------- Tests ----------

// searchNotes
console.log(searchNotes("milk"));
// [ { id: 1, text: "Buy milk and bread", category: "personal" } ]
console.log(searchNotes("JAVASCRIPT"));
// [ { id: 4, text: "Revise JavaScript arrays", category: "study" } ]
console.log(searchNotes("zebra"));
// []

// longestNote
console.log(longestNote());
// { id: 3, text: "Email the project report to Grace", category: "work" }
const backup = notes;
notes = [];
console.log(longestNote());
// null
notes = backup;

// countByCategory
console.log(countByCategory());
// { personal: 2, study: 2, work: 1 }
notes = [];
console.log(countByCategory());
// {}
notes = backup;

// getSummary
console.log(getSummary());
// "5 notes: 2 personal, 1 work, 2 study."
notes = [backup[0]];
console.log(getSummary());
// "1 note: 1 personal, 0 work, 0 study."
notes = backup;

// isDuplicate
console.log(isDuplicate("buy milk and bread"));
// true
console.log(isDuplicate("  CALL   MUM "));
// true
console.log(isDuplicate("Walk the dog"));
// false

// addNote (keep these last)
console.log(addNote("Walk the dog", "personal"));
// true
console.log(addNote("Walk the dog", "personal"));
// logs the duplicate reason, then false
console.log(addNote("", "work"));
// logs the length reason, then false
console.log(addNote("Plan trip", "hobby"));
// logs the category reason, then false
console.log(addNote("a".repeat(201), "work"));
// logs the length reason, then false
console.log(getSummary());
// "6 notes: 3 personal, 1 work, 2 study."