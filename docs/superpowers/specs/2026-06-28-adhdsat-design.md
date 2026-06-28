# ADHDSat — ADHD-Focused SAT Prep Platform

An SAT prep platform designed specifically for students with ADHD or who struggle to study effectively, targeting 1500+ scores through gamification, paced sprints, adaptive learning, and a distraction-free experience.

---

## 1. Problem Statement

Traditional SAT prep platforms assume sustained focus and self-regulation — two things students with ADHD struggle with most. Students who are intellectually capable of scoring 1500+ often underperform because:

- They can't sustain long study sessions
- They lose motivation without immediate, tangible feedback
- Decision paralysis prevents them from starting
- Careless errors (not content gaps) tank their scores
- They lack external structure for scheduling and pacing

ADHDSat solves this by wrapping rigorous SAT content in an experience purpose-built for how ADHD brains actually work.

---

## 2. Target User

- High school students (primarily juniors/seniors) with ADHD or focus challenges
- Students already scoring 1200–1400 who need the push to 1500+
- Students who have tried other platforms (Khan Academy, Bluebook) but couldn't stick with them

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React (Vite) | Fast SPA with hot reload; component-based for modular UI |
| **Styling** | Vanilla CSS | Full control over the premium, custom dark-mode aesthetic |
| **Backend/DB** | Supabase (PostgreSQL) | Managed auth, realtime DB, row-level security, SQL migrations |
| **Hosting** | Vercel or Netlify | Free tier, automatic deploys from Git |
| **Fonts** | Google Fonts (Inter, JetBrains Mono) | Clean, modern, highly readable |

---

## 4. UI/UX Design

### 4.1 Layout: "High-Dopamine Zones" (Option C)

The core layout splits the screen into two distinct zones:

**Left Zone — Focus Area (~70% width)**
- Contains ONLY the active question, passage (if R&W), and answer choices
- Dark charcoal background (`#1a1a2e`) with off-white text (`#e8e8e8`) — avoids halation from pure black/white
- Generous whitespace, large readable type (18px+ body)
- Minimal UI chrome — no nav bar, no logos, no links during a sprint
- Progress bar at the top showing questions completed in current sprint

**Right Zone — Gamification Dashboard (~30% width)**
- Vibrant, high-dopamine sidebar with:
  - **Sprint Timer** — countdown with visual ring animation
  - **Streak Counter** — fire emoji + day count, pulses on increment
  - **XP Counter** — running total with "+XP" pop animations on correct answers
  - **Level & Progress Ring** — current mastery level with circular progress to next level
  - **Daily Goal** — "12/20 questions today" with fill bar
  - **Achievements** — most recent unlocked badge
  - **Weekly Goals** — completion percentage ring

### 4.2 Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background (main) | Dark navy | `#0f0f1a` |
| Card background | Dark charcoal | `#1a1a2e` |
| Sidebar background | Deep purple-black | `#16162a` |
| Primary accent | Electric cyan | `#00d4ff` |
| Success | Vibrant green | `#00e676` |
| Error | Soft red | `#ff5252` |
| XP/Gold | Amber | `#ffd740` |
| Text primary | Off-white | `#e8e8e8` |
| Text secondary | Muted gray | `#8888aa` |

### 4.3 Accessibility & Neurodivergent Accommodations

- **"Reduce Motion" toggle** in settings + automatic `prefers-reduced-motion` CSS media query support
- **Adjustable text size** (14/16/18/20/22px)
- **Theme options**: Dark (default), Light, Sepia, High Contrast
- **Font options**: Inter (default), OpenDyslexic (dyslexia-friendly)
- **WCAG 4.5:1 contrast ratio** minimum for all text
- **No auto-playing animations** — all motion is triggered by user action
- **No parallax, no sudden movements, no flashing** (WCAG 2.3.1 compliance)
- **Color never used alone** — always paired with icons, patterns, or text labels

---

## 5. Core Features

### 5.1 Paced Sprints (Pomodoro-Style)

The primary study mode. Students work in timed bursts with enforced breaks.

- **Configurable sprint length**: 10 / 15 / 20 / 25 minutes (default: 15)
- **Break length**: 5 minutes (15 min after every 4 sprints)
- **"Hyperfocus Extension"**: If a sprint ends mid-question, offer a "Keep Going" button to extend by 5 minutes — no penalty, just flexibility
- **Sprint summary screen**: After each sprint, show questions answered, accuracy, XP earned, streak status
- **Break screen**: During breaks, show motivational stats, suggest stretching, or show a fun fact
- **Visual timer**: Circular countdown ring in the gamification sidebar — always visible but not intrusive

### 5.2 Gamification System

**XP (Experience Points)**
- +10 XP per correct answer (Easy)
- +20 XP per correct answer (Medium)
- +40 XP per correct answer (Hard)
- +5 XP for attempting (even if wrong) — rewards effort, not just accuracy
- Bonus XP multipliers for **in-sprint correct-answer streaks** (1.5x at 5 correct in a row, 2x at 10 correct in a row). This is separate from the daily login streak.

**Levels**
| Level | Title | XP Required |
|-------|-------|-------------|
| 1 | Beginner | 0 |
| 2 | Apprentice | 500 |
| 3 | Scholar | 1,500 |
| 4 | Strategist | 3,500 |
| 5 | Expert | 7,000 |
| 6 | Master | 12,000 |
| 7 | Grandmaster | 20,000 |
| 8 | SAT Sage | 35,000 |

**Streaks**
- Daily streak: incremented by completing at least 1 sprint per day
- Streak milestones at 3, 7, 14, 30, 60, 100 days with bonus XP rewards
- "Streak Freeze" power-up: bank 1 per week, auto-activates if you miss a day

**Achievements/Badges** (25 total at launch)
- "First Sprint" — Complete your first sprint
- "Perfect Sprint" — 100% accuracy in a sprint
- "Math Ace" — 50 correct math answers
- "Grammar Guru" — 50 correct English answers
- "Night Owl" — Study after 10pm
- "Early Bird" — Study before 7am
- "Ironclad" — 30-day streak
- "Module 1 Master" — Pass 5 Module 1 Gauntlets
- "Century" — Answer 100 questions total
- "Half-K" — Answer 500 questions total
- "Thousand Club" — Answer 1,000 questions total
- "Streak Starter" — 3-day streak
- "Week Warrior" — 7-day streak
- "Fortnight Fighter" — 14-day streak
- "Two Months Strong" — 60-day streak
- "The Hundred" — 100-day streak
- "Hint Master" — Use 50 hints (learning is not weakness)
- "Error Analyst" — Tag 25 errors with Error DNA
- "Algebra Boss" — 90%+ accuracy across 50 Algebra questions
- "Geometry Guru" — 90%+ accuracy across 50 Geometry questions
- "Reading Rockstar" — 90%+ accuracy across 50 R&W questions
- "Speed Demon" — Complete a sprint in under 10 minutes
- "Daily Devotee" — Complete 10 daily challenges
- "Score Climber" — Increase predicted score by 50+ points
- "Full Sim" — Complete a full practice test

**Daily Challenge**
- 1 curated hard question per day
- Bonus +50 XP for correct answer
- Visible on dashboard even when not in a sprint

### 5.3 Question Engine

**Question Types**
- **Multiple Choice (4 options)** — R&W and Math
- **Student-Produced Response (Grid-in)** — Math only, free text input with validation

**Question Metadata**
Each question stores:
- `id` (UUID)
- `section` (english | math)
- `domain` (e.g., "Craft & Structure", "Algebra")
- `skill` (e.g., "Vocabulary in Context", "Linear Equations")
- `difficulty` (easy | medium | hard)
- `question_text` (with LaTeX support for math via KaTeX)
- `passage_text` (for R&W questions, nullable)
- `choices` (JSON array of {label, text, is_correct})
- `is_grid_in` (boolean, math only)
- `grid_in_answer` (numeric, for grid-in validation)
- `explanation` (step-by-step explanation text)
- `hint_1` (gentle nudge hint)
- `hint_2` (more specific directional hint)
- `tags` (array of topic tags for search/filter)

**Difficulty Distribution (for 1500+ prep)**
- Easy: ~20% of bank
- Medium: ~35% of bank
- Hard: ~45% of bank

**Target Bank Size**: ~2,500 questions total
- English (R&W): ~1,250 questions across 4 domains
- Math: ~1,250 questions across 4 domains

### 5.4 Hint System

Instead of immediately showing the answer, offer progressive hints:

1. **Hint Level 1**: A gentle nudge (e.g., "Think about what the author's main argument is")
2. **Hint Level 2**: A more specific direction (e.g., "Look at the contrast between paragraphs 2 and 3")
3. **Full Explanation**: Complete step-by-step walkthrough (shown after answering or giving up)

- Using a hint reduces XP earned by 50% (still rewards attempting)
- Hints are human-written, not generated

### 5.5 Spaced Repetition (SM-2 Algorithm)

Missed or hinted questions are automatically scheduled for review:

- Interval calculation based on SM-2 algorithm (same as Satori Prep's implementation)
- Questions rated on a 0–5 quality scale based on performance
- Review queue integrated into sprint mode — sprints mix new + review questions
- Students can see their "Review Due" count on the dashboard

### 5.6 Error DNA Analysis

After each sprint/test, categorize every wrong answer:

| Error Type | Description | Icon |
|------------|-------------|------|
| **Content Gap** | Didn't know the concept | 📚 |
| **Careless Error** | Knew it but misread/miscalculated | ⚡ |
| **Time Pressure** | Rushed due to timer | ⏰ |

Students self-tag their errors after reviewing the explanation. The system pre-selects a suggested tag based on simple heuristics (e.g., if time_spent < 30s → suggest "Time Pressure"; if hint was used → suggest "Content Gap"), but the student always makes the final choice. No AI/LLM is used for this — just rule-based suggestions. Over time, the dashboard shows:
- "68% of your errors are Careless Errors" → suggests focus exercises
- "Your Content Gaps are concentrated in Geometry" → suggests targeted drills
- Trend over time: "Your careless errors dropped 15% this month!"

### 5.7 "What To Do Next" Flow

Every screen ends with a single, clear call-to-action. Never present an empty dashboard.

- After login: "Ready for your daily sprint? [Start Sprint]" or "You have 8 review questions due. [Review Now]"
- After a sprint: "Great sprint! Take a 5-minute break. [Start Break Timer]"
- After a break: "Ready to go again? [Next Sprint]" or "You've hit your daily goal! [View Stats]"
- If no sprint completed today: "Your streak is at risk! Complete 1 sprint to keep it alive. [Quick Sprint]"

### 5.8 Module 1 Gauntlet

A specialized practice mode simulating Digital SAT Module 1:
- 27 R&W questions in 32 minutes OR 22 Math questions in 35 minutes
- Scored and graded: "Would you be routed to Hard Module 2?"
- Tracks routing history: "You've been routed to Hard in 7/10 attempts"
- Builds confidence and familiarity with the adaptive test structure

### 5.9 Full Practice Test Mode

Simulates the complete Digital SAT experience:
- Module 1 R&W (27 questions, 32 min) → Module 2 R&W adaptive (27 questions, 32 min)
- 10-minute break
- Module 1 Math (22 questions, 35 min) → Module 2 Math adaptive (22 questions, 35 min)
- Score estimation using IRT-approximated scoring
- Detailed score report with Error DNA breakdown

**Adaptive Routing Logic:** If the student scores ≥70% on Module 1, they are routed to the "Hard" Module 2 pool (drawn from hard-difficulty questions). Below 70% routes to the "Standard" Module 2 pool (drawn from easy/medium questions). The 70% threshold approximates the real College Board routing behavior. Scoring is weighted: correct answers on Hard Module 2 are worth more toward the final estimated score.

### 5.10 Score Predictor

Based on practice performance, estimate a real SAT score range:
- Uses rolling accuracy across the last 50 R&W questions and last 50 Math questions separately, then combines into a composite 400–1600 score
- Weighted by difficulty: Easy correct = 1 point, Medium correct = 2 points, Hard correct = 4 points. The ratio of earned points to maximum possible points maps to a 200–800 section score
- Displays as a range (e.g., "1420–1480") with ±30 point confidence interval
- Updates after every answered question on the dashboard
- Requires a minimum of 25 questions answered per section before displaying a prediction (shows "Need more data" otherwise)

---

## 6. Data Model

### 6.1 Tables

**`users`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Supabase auth user ID |
| display_name | TEXT | User's display name |
| total_xp | INTEGER | Cumulative XP |
| current_level | INTEGER | Derived from total_xp |
| current_streak | INTEGER | Consecutive days studied |
| longest_streak | INTEGER | All-time longest streak |
| last_active_date | DATE | For streak calculation |
| streak_freezes | INTEGER | Remaining streak freezes |
| sprint_length_pref | INTEGER | Preferred sprint length in minutes |
| theme_pref | TEXT | dark / light / sepia / high-contrast |
| font_pref | TEXT | inter / opendyslexic |
| font_size_pref | INTEGER | 14 / 16 / 18 / 20 / 22 |
| reduce_motion | BOOLEAN | Accessibility preference |
| created_at | TIMESTAMPTZ | Account creation |

**`questions`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Question ID |
| section | TEXT | english / math |
| domain | TEXT | e.g., "Craft & Structure" |
| skill | TEXT | e.g., "Vocabulary in Context" |
| difficulty | TEXT | easy / medium / hard |
| question_text | TEXT | Question content (supports LaTeX) |
| passage_text | TEXT | Passage for R&W (nullable) |
| choices | JSONB | Array of {label, text, is_correct} |
| is_grid_in | BOOLEAN | Math grid-in flag |
| grid_in_answer | NUMERIC | Correct grid-in answer |
| explanation | TEXT | Step-by-step explanation |
| hint_1 | TEXT | Gentle nudge |
| hint_2 | TEXT | More specific direction |
| tags | TEXT[] | Topic tags for filtering |
| created_at | TIMESTAMPTZ | |

**`user_answers`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK → users) | |
| question_id | UUID (FK → questions) | |
| selected_choice | TEXT | User's answer |
| is_correct | BOOLEAN | |
| hints_used | INTEGER | 0, 1, or 2 |
| error_type | TEXT | content_gap / careless / time_pressure (nullable) |
| time_spent_seconds | INTEGER | Time on this question |
| sprint_id | UUID (FK → sprints) | Which sprint this was in |
| created_at | TIMESTAMPTZ | |

**`sprints`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK → users) | |
| sprint_type | TEXT | practice / review / gauntlet / full_test |
| section_filter | TEXT | english / math / mixed |
| domain_filter | TEXT | Specific domain (nullable) |
| difficulty_filter | TEXT | easy / medium / hard / mixed |
| duration_minutes | INTEGER | Sprint length |
| questions_attempted | INTEGER | |
| questions_correct | INTEGER | |
| xp_earned | INTEGER | |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |

**`spaced_repetition`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK → users) | |
| question_id | UUID (FK → questions) | |
| easiness_factor | REAL | SM-2 easiness factor (default 2.5) |
| interval_days | INTEGER | Days until next review |
| repetitions | INTEGER | Number of successful reviews |
| next_review_date | DATE | When to show again |
| last_quality | INTEGER | Last quality rating (0–5) |

**`achievements`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK → users) | |
| achievement_key | TEXT | e.g., "first_sprint", "perfect_sprint" |
| unlocked_at | TIMESTAMPTZ | |

**`daily_challenges`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| question_id | UUID (FK → questions) | |
| challenge_date | DATE | The date this challenge is active |
| bonus_xp | INTEGER | XP reward (default 50) |

---

## 7. Page Structure

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Marketing/info page with CTA to sign up |
| `/login` | Login/Signup | Supabase Auth (email + Google OAuth) |
| `/dashboard` | Dashboard | "What To Do Next" + stats overview |
| `/sprint` | Sprint Mode | Active practice session (core experience) |
| `/sprint/summary` | Sprint Summary | Post-sprint results + Error DNA |
| `/review` | Review Queue | Spaced repetition review session |
| `/gauntlet` | Module 1 Gauntlet | Timed Module 1 simulation |
| `/test` | Full Practice Test | Complete SAT simulation |
| `/test/report` | Test Report | Detailed score report |
| `/stats` | Statistics | Detailed progress analytics |
| `/settings` | Settings | Preferences, accessibility, account |
| `/daily` | Daily Challenge | Today's challenge question |

---

## 8. Question Content — Scope & Priority

### Phase 1: English (R&W) — ~1,250 questions

| Domain | Skill | Easy | Med | Hard | Total |
|--------|-------|------|-----|------|-------|
| **Craft & Structure** | Vocabulary in Context | 25 | 45 | 55 | 125 |
| | Text Structure & Purpose | 23 | 40 | 50 | 113 |
| | Cross-Text Connections | 22 | 40 | 50 | 112 |
| **Information & Ideas** | Central Ideas | 22 | 38 | 48 | 108 |
| | Command of Evidence (Textual) | 22 | 38 | 48 | 108 |
| | Command of Evidence (Quantitative) | 21 | 39 | 47 | 107 |
| **Standard English Conventions** | Boundaries (Punctuation) | 22 | 38 | 48 | 108 |
| | Form, Structure & Sense | 22 | 38 | 48 | 108 |
| | Other Conventions | 21 | 39 | 47 | 107 |
| **Expression of Ideas** | Transitions | 25 | 35 | 45 | 105 |
| | Rhetorical Synthesis | 25 | 35 | 45 | 105 |
| | **Subtotal** | | | | **~1,226** |

### Phase 2: Math — ~1,250 questions

| Domain | Skill | Easy | Med | Hard | Total |
|--------|-------|------|-----|------|-------|
| **Algebra** | Linear Equations (1 var) | 22 | 38 | 50 | 110 |
| | Linear Equations (2 var) | 22 | 38 | 50 | 110 |
| | Linear Functions | 22 | 38 | 50 | 110 |
| | Systems of Linear Equations | 22 | 36 | 48 | 106 |
| **Advanced Math** | Quadratics & Polynomials | 22 | 38 | 50 | 110 |
| | Exponential Functions | 22 | 38 | 50 | 110 |
| | Nonlinear Equations | 22 | 38 | 50 | 110 |
| | Absolute Value & Other | 22 | 36 | 48 | 106 |
| **Problem Solving & Data** | Ratios, Rates, Proportions | 20 | 33 | 42 | 95 |
| | Percentages | 18 | 30 | 40 | 88 |
| | Statistics & Probability | 18 | 30 | 40 | 88 |
| **Geometry & Trig** | Area, Volume, Angles | 18 | 30 | 40 | 88 |
| | Right Triangles & Trig | 18 | 30 | 40 | 88 |
| | Circles | 15 | 25 | 35 | 75 |
| | **Subtotal** | | | | **~1,264** |

**Grand Total: ~2,490 questions**

---

## 9. Verification Plan

### Automated Tests
- Unit tests for SM-2 spaced repetition algorithm
- Unit tests for XP calculation and level progression
- Unit tests for streak logic (including streak freeze)
- Unit tests for score predictor algorithm
- Component tests for question rendering (multiple choice + grid-in)
- Component tests for sprint timer
- Integration tests for Supabase auth flow
- Integration tests for answer submission and scoring

### Manual Verification
- Accessibility audit: screen reader, keyboard navigation, color contrast
- `prefers-reduced-motion` testing
- Mobile responsiveness testing
- Sprint timer accuracy testing
- Full practice test flow end-to-end
- Error DNA tagging UX review

---

## 10. Out of Scope (for v1)

- Mobile native app (responsive web only)
- AI-powered question generation (all questions human-written)
- Social/community features (leaderboards, friends)
- Tutoring/live instruction
- Payment/subscription tiers
- Semantic search (future enhancement)
