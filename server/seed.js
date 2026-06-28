import db from './db.js';

const questions = [
  {
    id: 'q1',
    section: 'english',
    domain: 'Craft & Structure',
    skill: 'Vocabulary in Context',
    difficulty: 'easy',
    question_text: 'As used in line 5, "formidable" most nearly means:',
    passage_text: 'The opponent was formidable, towering over the other players with a stern expression.',
    choices: JSON.stringify([
      { label: 'A', text: 'Intimidating', is_correct: true },
      { label: 'B', text: 'Fragile', is_correct: false },
      { label: 'C', text: 'Welcoming', is_correct: false },
      { label: 'D', text: 'Average', is_correct: false }
    ]),
    is_grid_in: 0,
    explanation: 'The context "towering" and "stern expression" suggests the opponent was intimidating.',
    hint_1: 'Look at the description "towering" and "stern".',
    hint_2: 'Which word means something that causes fear or respect through being impressively powerful?',
    tags: JSON.stringify(['vocabulary'])
  },
  {
    id: 'q2',
    section: 'math',
    domain: 'Algebra',
    skill: 'Linear Equations',
    difficulty: 'medium',
    question_text: 'If $2x + 3 = 11$, what is the value of $4x$?',
    choices: JSON.stringify([
      { label: 'A', text: '4', is_correct: false },
      { label: 'B', text: '8', is_correct: false },
      { label: 'C', text: '16', is_correct: true },
      { label: 'D', text: '32', is_correct: false }
    ]),
    is_grid_in: 0,
    explanation: 'Subtract 3 from both sides to get 2x = 8. Multiply by 2 to get 4x = 16.',
    hint_1: 'First, isolate the term with x.',
    hint_2: 'Once you find 2x, can you find 4x without solving for x?',
    tags: JSON.stringify(['algebra', 'linear'])
  },
  {
    id: 'q3',
    section: 'math',
    domain: 'Geometry',
    skill: 'Area',
    difficulty: 'easy',
    question_text: 'A rectangle has a length of 5 and a width of 4. What is its area?',
    choices: JSON.stringify([]),
    is_grid_in: 1,
    grid_in_answer: 20,
    explanation: 'Area = length × width = 5 × 4 = 20.',
    hint_1: 'The formula for the area of a rectangle is length times width.',
    hint_2: 'Multiply 5 and 4.',
    tags: JSON.stringify(['geometry', 'area'])
  }
];

const seed = () => {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO questions (id, section, domain, skill, difficulty, question_text, passage_text, choices, is_grid_in, grid_in_answer, explanation, hint_1, hint_2, tags, created_at)
    VALUES (@id, @section, @domain, @skill, @difficulty, @question_text, @passage_text, @choices, @is_grid_in, @grid_in_answer, @explanation, @hint_1, @hint_2, @tags, @created_at)
  `);

  const insertMany = db.transaction((qs) => {
    for (const q of qs) {
      q.created_at = new Date().toISOString();
      q.passage_text = q.passage_text || null;
      q.grid_in_answer = q.grid_in_answer ?? null;
      insert.run(q);
    }
  });

  insertMany(questions);
  console.log('Database seeded with questions!');
};

seed();
