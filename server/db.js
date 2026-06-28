import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'adhdsat.db');
const db = new Database(dbPath);

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      total_xp INTEGER DEFAULT 0,
      current_level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      section TEXT,
      domain TEXT,
      skill TEXT,
      difficulty TEXT,
      question_text TEXT,
      passage_text TEXT,
      choices TEXT,
      is_grid_in INTEGER DEFAULT 0,
      grid_in_answer REAL,
      explanation TEXT,
      hint_1 TEXT,
      hint_2 TEXT,
      tags TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_answers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      question_id TEXT,
      selected_choice TEXT,
      is_correct INTEGER,
      hints_used INTEGER,
      error_type TEXT,
      time_spent_seconds INTEGER,
      sprint_id TEXT,
      created_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS sprints (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      sprint_type TEXT,
      duration_minutes INTEGER,
      questions_attempted INTEGER DEFAULT 0,
      questions_correct INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS review_cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      next_review_at TEXT NOT NULL,
      interval_days REAL DEFAULT 1,
      ease_factor REAL DEFAULT 2.5,
      rep_count INTEGER DEFAULT 0,
      last_reviewed_at TEXT,
      UNIQUE(user_id, question_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(question_id) REFERENCES questions(id)
    );
  `);

  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('study_plan')) db.exec("ALTER TABLE users ADD COLUMN study_plan TEXT DEFAULT NULL");
  if (!userCols.includes('baseline_english')) db.exec("ALTER TABLE users ADD COLUMN baseline_english INTEGER DEFAULT 0");
  if (!userCols.includes('baseline_math')) db.exec("ALTER TABLE users ADD COLUMN baseline_math INTEGER DEFAULT 0");
  if (!userCols.includes('weak_areas')) db.exec("ALTER TABLE users ADD COLUMN weak_areas TEXT DEFAULT '[]'");
  if (!userCols.includes('onboarding_completed')) db.exec("ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0");
  if (!userCols.includes('subscores')) db.exec("ALTER TABLE users ADD COLUMN subscores TEXT DEFAULT NULL");

  const qCols = db.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
  if (!qCols.includes('source')) db.exec("ALTER TABLE questions ADD COLUMN source TEXT DEFAULT 'ingest'");
};

initDb();

export default db;
