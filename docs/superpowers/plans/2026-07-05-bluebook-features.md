# Bluebook Suite + Esc-Quit/Pause + Time-Budget Sprints + Pomodoro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared Bluebook-style annotation toolbar (highlight, strikethrough, line reader, text size, hide timer, Desmos calculator, reference sheet) to all three question-taking surfaces, plus Esc-quit for regular sprints, Pause for timed modes, a time-budget sprint mode, and a global Pomodoro widget.

**Architecture:** New shared hooks/components live in `src/lib/` and `src/components/`; each of the three page files (`Sprint.jsx`, `PracticeTest.jsx`, `ReviewSprint.jsx`) mounts the shared pieces and wires them to its own local state, since the three pages do not currently share any base component. `App.jsx` mounts the Pomodoro widget once at the shell level.

**Tech Stack:** React 19, react-router-dom 7, lucide-react (icons — `Highlighter`, `Strikethrough`, `Rows3`, `Type`, `EyeOff`, `Eye`, `Pause`, `Play`, `Settings2`, `Timer`, `Coffee`, `X`, `Calculator`, `BookOpen`, `RotateCcw`, `Bell` all confirmed present in the installed version), Desmos `calculator.js` API (loaded at runtime via `<script>` tag, not an npm package), plain CSS custom properties (no CSS-in-JS library — this codebase uses inline `style={{}}` objects throughout).

**Testing approach — read before starting:** This repository has **no unit test runner** (no jest/vitest, no `test` script in `package.json`; `playwright` is a devDependency used only for one-off manual/demo scripts like `server/record-demo.mjs`). Every feature in this codebase's history has been verified by running `npm run dev` and manually exercising the flow in a browser (see `CHECKPOINT_LAST.md` — "Verified live", "Verified end-to-end in browser" appear throughout). This plan follows that same convention: every task's verification step is a concrete manual browser check (exact URL, exact interaction, exact expected result) instead of an automated test. Do not introduce a test framework as a side effect of this work — that would be an unrelated infrastructure change.

## Global Constraints

- No em dashes in any UI copy or code comments.
- Code comments explain why, not what — only add a comment where the reasoning isn't obvious from the code itself.
- Match existing code style exactly: inline `style={{...}}` objects, `var(--token)` for all colors (never hardcode hex outside of rgba() tints that already exist as patterns), function components with hooks, no CSS-in-JS libraries, no TypeScript (this is a `.jsx`/`.js` codebase).
- All new colors must reference existing CSS custom properties from `src/index.css` (`--bg-main`, `--bg-card`, `--bg-sidebar`, `--bg-elevated`, `--border`, `--primary`, `--primary-hover`, `--primary-contrast`, `--success`, `--teal`, `--error`, `--xp-gold`, `--text-primary`, `--text-secondary`) — do not add new tokens unless a task explicitly says to.
- Persisted preferences use `localStorage` (matching `src/lib/theme.js`'s pattern), never a backend call — these are device-local UI preferences, not account data.
- Every new modal/overlay follows the z-index convention already in use: `100` for nav/modals that sit above page content, `9998` for full-screen decorative overlays, `9999` for toasts that must sit above everything (see `AuthModal.jsx:55`, `BottomNav.jsx:29`, `Sprint.jsx:51`, `Sprint.jsx:917`).
- Frequent commits: one commit per task, after its manual verification step passes.

---

## Task 1: Toolbar state hook + highlight utility

**Files:**
- Create: `src/lib/useTestToolbarState.js`
- Create: `src/lib/highlightSelection.js`

**Interfaces:**
- Produces: `useTestToolbarState()` returning `{ textSize, cycleTextSize, timerHidden, toggleTimerHidden, highlightMode, toggleHighlightMode, lineReaderOn, toggleLineReader, struckChoices, toggleStrike(label), calculatorOpen, setCalculatorOpen, referenceOpen, setReferenceOpen, resetPerQuestion() }` — `struckChoices` is a `Set<string>` of choice labels (e.g. `'A'`).
- Produces: `TEXT_SIZE_SCALE` — exported `{ S: 0.85, M: 1, L: 1.15, XL: 1.3 }` map, consumed by Task 2's page integrations to scale font sizes.
- Produces: `applyHighlightToSelection(containerEl)` returning `boolean` (whether a highlight was applied).

- [ ] **Step 1: Create the toolbar state hook**

Write `src/lib/useTestToolbarState.js`:

```js
import { useState, useCallback, useEffect } from 'react';

const TEXT_SIZES = ['S', 'M', 'L', 'XL'];
export const TEXT_SIZE_SCALE = { S: 0.85, M: 1, L: 1.15, XL: 1.3 };
const TEXT_SIZE_KEY = 'tally-textsize';
const TIMER_HIDDEN_KEY = 'tally-timer-hidden';

// Shared annotation/preference state for the Bluebook-style toolbar, used by
// Sprint, PracticeTest, and ReviewSprint. Highlights and struck choices reset
// per question (call resetPerQuestion when the active question changes);
// text size and hide-timer are the only settings that persist, globally,
// across questions and sessions.
export function useTestToolbarState() {
  const [textSize, setTextSizeState] = useState(() => {
    const saved = localStorage.getItem(TEXT_SIZE_KEY);
    return TEXT_SIZES.includes(saved) ? saved : 'M';
  });
  const [timerHidden, setTimerHiddenState] = useState(
    () => localStorage.getItem(TIMER_HIDDEN_KEY) === 'true'
  );
  const [highlightMode, setHighlightMode] = useState(false);
  const [lineReaderOn, setLineReaderOn] = useState(false);
  const [struckChoices, setStruckChoices] = useState(() => new Set());
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);

  useEffect(() => { localStorage.setItem(TEXT_SIZE_KEY, textSize); }, [textSize]);
  useEffect(() => { localStorage.setItem(TIMER_HIDDEN_KEY, String(timerHidden)); }, [timerHidden]);

  const cycleTextSize = useCallback(() => {
    setTextSizeState((prev) => TEXT_SIZES[(TEXT_SIZES.indexOf(prev) + 1) % TEXT_SIZES.length]);
  }, []);

  const toggleTimerHidden = useCallback(() => setTimerHiddenState((h) => !h), []);
  const toggleHighlightMode = useCallback(() => setHighlightMode((h) => !h), []);
  const toggleLineReader = useCallback(() => setLineReaderOn((v) => !v), []);

  const toggleStrike = useCallback((label) => {
    setStruckChoices((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }, []);

  const resetPerQuestion = useCallback(() => {
    setStruckChoices(new Set());
    setHighlightMode(false);
  }, []);

  return {
    textSize, cycleTextSize,
    timerHidden, toggleTimerHidden,
    highlightMode, toggleHighlightMode,
    lineReaderOn, toggleLineReader,
    struckChoices, toggleStrike,
    calculatorOpen, setCalculatorOpen,
    referenceOpen, setReferenceOpen,
    resetPerQuestion,
  };
}
```

- [ ] **Step 2: Create the highlight-selection utility**

Write `src/lib/highlightSelection.js`:

```js
// Wraps the current browser text selection in a <mark class="tally-highlight">,
// but only when the selection lies entirely within containerEl and doesn't
// touch a KaTeX-rendered subtree. KaTeX builds a dense internal DOM to render
// math; surrounding part of it in another element corrupts that structure, so
// we skip (no-op) rather than risk breaking the rendered equation.
export function applyHighlightToSelection(containerEl) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;

  const range = sel.getRangeAt(0);
  if (!containerEl.contains(range.commonAncestorContainer)) return false;

  const touchesKatex = (node) => {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return !!el?.closest('.katex');
  };
  if (touchesKatex(range.startContainer) || touchesKatex(range.endContainer)) return false;

  const mark = document.createElement('mark');
  mark.className = 'tally-highlight';
  try {
    range.surroundContents(mark);
  } catch {
    // Selection spans multiple sibling elements; surroundContents can't wrap
    // a range that doesn't nest cleanly in one node, so skip instead of
    // partially corrupting the DOM.
    return false;
  }
  sel.removeAllRanges();
  return true;
}
```

- [ ] **Step 3: Add highlight styling to the global stylesheet**

Modify `src/index.css`. Add near the end of the file:

```css
mark.tally-highlight {
  background-color: color-mix(in srgb, var(--xp-gold) 35%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`. This step has no UI yet (no component consumes the hook), so verify by import: temporarily add `import { useTestToolbarState } from './lib/useTestToolbarState';` to `src/App.jsx` and call it once inside `AppInner` (e.g. `useTestToolbarState();` with no assignment) to confirm it compiles with no console errors, then remove that temporary line before committing. Confirm the dev server shows no errors in the terminal or browser console.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useTestToolbarState.js src/lib/highlightSelection.js src/index.css
git commit -m "feat: add toolbar state hook and highlight-selection utility"
```

---

## Task 2: Toolbar UI + strike control, wired into Sprint.jsx

**Files:**
- Create: `src/components/TestToolbar.jsx`
- Create: `src/components/StrikeToggle.jsx`
- Modify: `src/pages/Sprint.jsx`

**Interfaces:**
- Consumes: `useTestToolbarState()` shape from Task 1.
- Produces: `<TestToolbar toolbar={toolbarState} mathOnly={boolean} onOpenCalculator={fn} onOpenReference={fn} />` (the `onOpenCalculator`/`onOpenReference` props are wired to no-ops in this task; Tasks 3 and 4 replace them with real modal openers).
- Produces: `<StrikeToggle struck={boolean} onToggle={fn} />`.

- [ ] **Step 1: Create the toolbar component**

Write `src/components/TestToolbar.jsx`:

```jsx
import React from 'react';
import { Highlighter, Rows3, Type, Eye, EyeOff, Calculator, BookOpen } from 'lucide-react';

const btnBase = {
  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
  borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer',
  transition: 'border-color 0.15s, color 0.15s',
};
const btnActive = {
  borderColor: 'var(--primary)', color: 'var(--primary)', backgroundColor: 'rgba(232, 100, 60,0.08)',
};

// Shared Bluebook-style toolbar for Sprint, PracticeTest, and ReviewSprint.
// `toolbar` is the object returned by useTestToolbarState(). `mathOnly` shows
// the calculator + reference sheet buttons only when the active question is
// a math question (matches the real Bluebook, which hides them on R&W).
export default function TestToolbar({ toolbar, mathOnly, onOpenCalculator, onOpenReference }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
      <button
        onClick={toolbar.toggleHighlightMode}
        style={{ ...btnBase, ...(toolbar.highlightMode ? btnActive : {}) }}
        title="Highlight: select text in the passage or question"
      >
        <Highlighter size={15} /> Highlight
      </button>
      <button
        onClick={toolbar.toggleLineReader}
        style={{ ...btnBase, ...(toolbar.lineReaderOn ? btnActive : {}) }}
        title="Line reader: a ruler that follows your cursor"
      >
        <Rows3 size={15} /> Line Reader
      </button>
      <button onClick={toolbar.cycleTextSize} style={btnBase} title="Cycle text size">
        <Type size={15} /> Text {toolbar.textSize}
      </button>
      <button
        onClick={toolbar.toggleTimerHidden}
        style={{ ...btnBase, ...(toolbar.timerHidden ? btnActive : {}) }}
        title={toolbar.timerHidden ? 'Show timer' : 'Hide timer'}
      >
        {toolbar.timerHidden ? <EyeOff size={15} /> : <Eye size={15} />} Timer
      </button>
      {mathOnly && (
        <>
          <button onClick={onOpenCalculator} style={btnBase} title="Open calculator">
            <Calculator size={15} /> Calculator
          </button>
          <button onClick={onOpenReference} style={btnBase} title="Open reference sheet">
            <BookOpen size={15} /> Reference
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the strike-toggle control**

Write `src/components/StrikeToggle.jsx`:

```jsx
import React from 'react';
import { Strikethrough } from 'lucide-react';

// Small cross-out control rendered inline on each answer choice. Purely a
// visual elimination aid, matching real Bluebook: a struck choice stays
// clickable and selectable, it is not locked out.
export default function StrikeToggle({ struck, onToggle }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={struck ? 'Restore choice' : 'Cross out choice'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
        border: `1px solid ${struck ? 'var(--primary)' : 'var(--border)'}`,
        backgroundColor: struck ? 'rgba(232, 100, 60,0.1)' : 'transparent',
        color: struck ? 'var(--primary)' : 'var(--text-secondary)',
      }}
    >
      <Strikethrough size={13} />
    </button>
  );
}
```

- [ ] **Step 3: Wire the toolbar into Sprint.jsx**

Modify `src/pages/Sprint.jsx`. Add imports at the top (after the existing `MathText` import at line 4):

```js
import TestToolbar from '../components/TestToolbar';
import StrikeToggle from '../components/StrikeToggle';
import { useTestToolbarState, TEXT_SIZE_SCALE } from '../lib/useTestToolbarState';
import { applyHighlightToSelection } from '../lib/highlightSelection';
```

Inside the `Sprint` component function, add the hook call alongside the other `useState` declarations near line 300 (right after `const [milestone, setMilestone] = useState(null);`):

```js
  const toolbar = useTestToolbarState();
  const questionContentRef = useRef(null);
```

Reset per-question annotation state whenever the question changes. Find the `fetchNextQuestion` function (it resets `selectedChoice`, `isAnswered`, etc. — same pattern as `ReviewSprint.jsx:55-79`) and add `toolbar.resetPerQuestion();` at its start, alongside the other per-question resets.

Replace the "Progress bar + timer" block (`Sprint.jsx:927-946`) — insert the toolbar directly above it, and gate the timer display on `toolbar.timerHidden`:

```jsx
      <TestToolbar
        toolbar={toolbar}
        mathOnly={sprintMode === 'math' || sprintMode === 'test-math'}
        onOpenCalculator={() => {}}
        onOpenReference={() => {}}
      />

      {/* Progress bar + timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {Array.from({ length: SPRINT_LENGTH }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '5px', borderRadius: '3px',
              backgroundColor: i < questionNum - 1 ? 'var(--primary)' : i === questionNum - 1 ? 'rgba(232, 100, 60,0.4)' : 'var(--border)',
              transition: 'background-color 0.3s'
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '100px', justifyContent: 'flex-end' }}>
          {toolbar.timerHidden ? (
            <button onClick={toolbar.toggleTimerHidden}
              style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px 8px', backgroundColor: 'transparent' }}>
              Timer hidden — tap to show
            </button>
          ) : (
            <span style={{ color: timerColor, fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums', fontWeight: isAnswered ? 'normal' : '500' }}>
              {timerStr}
            </span>
          )}
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Q{questionNum}/{SPRINT_LENGTH}
          </div>
        </div>
      </div>
```

Apply text-size scaling and the highlight container to the "Question content" block (`Sprint.jsx:968-978`):

```jsx
      {/* Question content */}
      <div
        ref={questionContentRef}
        onMouseUp={() => { if (toolbar.highlightMode) applyHighlightToSelection(questionContentRef.current); }}
        style={{ display: 'flex', flexDirection: window.innerWidth < 768 && question.passage_text ? 'column' : 'row', gap: '24px', marginBottom: '40px', fontSize: `${TEXT_SIZE_SCALE[toolbar.textSize]}em` }}
      >
        {question.passage_text && (
          <div style={{ flex: 1, borderRight: window.innerWidth < 768 ? 'none' : '1px solid var(--border)', borderBottom: window.innerWidth < 768 ? '1px solid var(--border)' : 'none', paddingRight: window.innerWidth < 768 ? '0' : '32px', paddingBottom: window.innerWidth < 768 ? '16px' : '0', fontSize: '0.95em', lineHeight: 1.75, color: 'var(--text-secondary)' }}>
            <MathText>{question.passage_text}</MathText>
          </div>
        )}
        <div style={{ flex: question.passage_text ? 1 : 'none', width: question.passage_text ? 'auto' : '100%', fontSize: '1.1em', lineHeight: 1.65, overflowX: 'auto', minWidth: 0 }}>
          <MathText>{question.question_text}</MathText>
        </div>
      </div>
```

(Setting `fontSize` in `em` on the outer flex container, and switching the passage/question children from fixed `rem` to relative `em`, makes them scale together with `toolbar.textSize` while preserving their existing relative proportions.)

Add the `StrikeToggle` next to each choice letter in the "Answer choices" block (`Sprint.jsx:1004-1018` area). Find the choice-rendering `.map` and add the toggle plus a struck-out visual style:

```jsx
          question.choices.map((c, idx) => {
            let bgColor = 'var(--bg-card)', borderColor = 'var(--border)', textColor = 'var(--text-primary)';
            if (isAnswered) {
              if (c.is_correct) { bgColor = 'rgba(70,183,159,0.08)'; borderColor = 'var(--success)'; }
              else if (selectedChoice === c.label) { bgColor = 'rgba(255,82,82,0.08)'; borderColor = 'var(--error)'; }
            } else if (selectedChoice === c.label) {
              borderColor = 'var(--primary)'; bgColor = 'rgba(232, 100, 60,0.07)'; textColor = 'var(--primary)';
            }
            const struck = toolbar.struckChoices.has(c.label);
            return (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StrikeToggle struck={struck} onToggle={() => toolbar.toggleStrike(c.label)} />
                <button disabled={isAnswered} onClick={() => setSelectedChoice(c.label)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '14px 18px', backgroundColor: bgColor, border: `2px solid ${borderColor}`, textAlign: 'left', fontSize: '1em', gap: '14px', borderRadius: '12px', transition: 'all 0.15s', color: textColor, opacity: struck ? 0.45 : 1, textDecoration: struck ? 'line-through' : 'none', animation: isAnswered && c.is_correct ? 'correctPop 0.4s ease' : undefined }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: selectedChoice === c.label && !isAnswered ? 'var(--primary)' : 'var(--border)', color: selectedChoice === c.label && !isAnswered ? 'var(--primary-contrast)' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.85rem' }}>
                    {c.label}
                  </div>
```

Leave the rest of that button's JSX (the `<MathText>` choice text and closing tags) unchanged, just close the new wrapping `<div>` after the existing `</button>` for that choice.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open the app, start a regular Math sprint. Confirm: the toolbar renders above the progress bar; clicking "Highlight" then drag-selecting text in the question wraps it in a gold-tinted highlight; clicking a choice's cross-out icon dims and strikes that choice while the choice remains clickable; clicking "Text S/M/L/XL" cycles the question/passage font size; clicking the timer button replaces the readout with "Timer hidden — tap to show" and clicking it again restores the readout; advancing to the next question clears the highlight and any struck choices. Reload the page and confirm the text size and hide-timer preferences persisted.

- [ ] **Step 5: Commit**

```bash
git add src/components/TestToolbar.jsx src/components/StrikeToggle.jsx src/pages/Sprint.jsx
git commit -m "feat: add Bluebook toolbar (highlight, strikethrough, text size, hide timer) to Sprint"
```

---

## Task 3: Reference sheet modal

**Files:**
- Create: `src/components/ReferenceSheet.jsx`
- Modify: `src/pages/Sprint.jsx`

**Interfaces:**
- Produces: `<ReferenceSheet onClose={fn} />`.
- Consumes: `toolbar.referenceOpen` / `toolbar.setReferenceOpen` from Task 1's hook, already mounted in Sprint.jsx by Task 2.

- [ ] **Step 1: Create the reference sheet component**

Write `src/components/ReferenceSheet.jsx`:

```jsx
import React from 'react';
import { X } from 'lucide-react';

const FORMULAS = [
  { label: 'Circle area', formula: 'A = \\pi r^2' },
  { label: 'Circle circumference', formula: 'C = 2\\pi r' },
  { label: 'Triangle area', formula: 'A = \\frac{1}{2} b h' },
  { label: 'Pythagorean theorem', formula: 'a^2 + b^2 = c^2' },
  { label: 'Slope', formula: 'm = \\frac{y_2 - y_1}{x_2 - x_1}' },
  { label: 'Slope-intercept form', formula: 'y = mx + b' },
  { label: 'Quadratic formula', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: 'Volume of a rectangular prism', formula: 'V = lwh' },
  { label: 'Volume of a cylinder', formula: 'V = \\pi r^2 h' },
  { label: 'Volume of a sphere', formula: 'V = \\frac{4}{3} \\pi r^3' },
  { label: 'Sum of interior angles (n-gon)', formula: '(n - 2) \\times 180' },
  { label: 'Special right triangle (45-45-90)', formula: 'x, x, x\\sqrt{2}' },
  { label: 'Special right triangle (30-60-90)', formula: 'x, x\\sqrt{3}, 2x' },
];

// Static SAT math reference sheet, matching the formulas printed on the real
// Bluebook reference screen. No external dependency (unlike the calculator).
export default function ReferenceSheet({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(5,8,18,0.6)', backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '28px', position: 'relative',
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 14, right: 14, padding: 6, borderRadius: 8,
          background: 'transparent', border: 'none', color: 'var(--text-secondary)',
        }}><X size={18} /></button>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 18, color: 'var(--text-primary)' }}>Reference Sheet</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
          {FORMULAS.map((f) => (
            <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{f.label}</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{`$${f.formula}$`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Note: `MathText` (`src/components/MathText.jsx`) already parses `$...$` for KaTeX rendering elsewhere in the app — reuse it here instead of raw text so the formulas render as math. Replace the `<span style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{`$${f.formula}$`}</span>` line with `<MathText style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{`$${f.formula}$`}</MathText>` and add `import MathText from './MathText';` to the top of the file.

- [ ] **Step 2: Wire it into Sprint.jsx**

Modify `src/pages/Sprint.jsx`. Add the import near the other new imports from Task 2:

```js
import ReferenceSheet from '../components/ReferenceSheet';
```

Replace the placeholder `onOpenReference={() => {}}` prop added in Task 2 with `onOpenReference={() => toolbar.setReferenceOpen(true)}`.

Render the modal conditionally right after the `<TestToolbar ... />` element:

```jsx
      {toolbar.referenceOpen && <ReferenceSheet onClose={() => toolbar.setReferenceOpen(false)} />}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, start a Math sprint, click "Reference" in the toolbar. Confirm the modal opens showing rendered (not raw LaTeX) formulas, clicking the X or the backdrop closes it, and the "Reference" button is not shown at all when the sprint mode is English (non-math).

- [ ] **Step 4: Commit**

```bash
git add src/components/ReferenceSheet.jsx src/pages/Sprint.jsx
git commit -m "feat: add static math reference sheet modal"
```

---

## Task 4: Desmos calculator

**Files:**
- Create: `src/lib/loadDesmosScript.js`
- Create: `src/components/DesmosCalculator.jsx`
- Modify: `src/pages/Sprint.jsx`

**Interfaces:**
- Produces: `loadDesmosCalculatorScript()` returning a `Promise<void>` that resolves once `window.Desmos` is available (memoized — safe to call multiple times).
- Produces: `<DesmosCalculator onClose={fn} />`.

- [ ] **Step 1: Create the script loader**

Write `src/lib/loadDesmosScript.js`:

```js
// Loads Desmos's official calculator.js exactly once per page session and
// resolves when window.Desmos is ready. A plain iframe of desmos.com is
// blocked by X-Frame-Options, so the real embed API is the only supported
// path (see docs/superpowers/specs/2026-07-05-bluebook-features-design.md).
let loadPromise = null;

export function loadDesmosCalculatorScript() {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (window.Desmos) { resolve(); return; }
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_DESMOS_API_KEY;
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Desmos calculator script'));
    document.head.appendChild(script);
  });
  return loadPromise;
}
```

- [ ] **Step 2: Create the calculator panel component**

Write `src/components/DesmosCalculator.jsx`:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { loadDesmosCalculatorScript } from '../lib/loadDesmosScript';

// Embeds the real Desmos graphing calculator via the official API (not a
// plain iframe of desmos.com, which blocks framing via X-Frame-Options).
export default function DesmosCalculator({ onClose }) {
  const containerRef = useRef(null);
  const calcRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDesmosCalculatorScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
          keypad: true, expressions: true, settingsMenu: false,
        });
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => {
      cancelled = true;
      calcRef.current?.destroy();
      calcRef.current = null;
    };
  }, []);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(5,8,18,0.6)', backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 640, height: '70vh', maxHeight: 560,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '16px', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1, padding: 6, borderRadius: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
        }}><X size={18} /></button>
        {error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
            Could not load the calculator. Check your connection and try again.
          </div>
        ) : (
          <div ref={containerRef} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into Sprint.jsx**

Modify `src/pages/Sprint.jsx`. Add the import:

```js
import DesmosCalculator from '../components/DesmosCalculator';
```

Replace the placeholder `onOpenCalculator={() => {}}` prop from Task 2 with `onOpenCalculator={() => toolbar.setCalculatorOpen(true)}`.

Render the modal conditionally next to the `ReferenceSheet` render added in Task 3:

```jsx
      {toolbar.calculatorOpen && <DesmosCalculator onClose={() => toolbar.setCalculatorOpen(false)} />}
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, start a Math sprint, click "Calculator". Confirm the real Desmos graphing calculator loads and is interactive (type `y=x^2` in the expression list and see the parabola plot), and closing/reopening it works without a console error. Confirm `VITE_DESMOS_API_KEY` is present in your local `.env` (it was added in an earlier session per `CHECKPOINT_LAST.md`) — if it's missing, `npm run dev` will still start but the calculator will show the "Could not load" error state, which is also an acceptable manual-verification outcome to confirm the error path works.

- [ ] **Step 5: Commit**

```bash
git add src/lib/loadDesmosScript.js src/components/DesmosCalculator.jsx src/pages/Sprint.jsx
git commit -m "feat: add embedded Desmos calculator to the Bluebook toolbar"
```

---

## Task 5: Roll the toolbar into PracticeTest.jsx and ReviewSprint.jsx

**Files:**
- Modify: `src/pages/PracticeTest.jsx`
- Modify: `src/pages/ReviewSprint.jsx`

**Interfaces:**
- Consumes: `TestToolbar`, `StrikeToggle`, `ReferenceSheet`, `DesmosCalculator`, `useTestToolbarState`, `TEXT_SIZE_SCALE`, `applyHighlightToSelection` — all produced by Tasks 1-4.

- [ ] **Step 1: Wire the toolbar into PracticeTest.jsx**

Modify `src/pages/PracticeTest.jsx`. Add imports after the existing `useCountUp` import (line 5):

```js
import TestToolbar from '../components/TestToolbar';
import StrikeToggle from '../components/StrikeToggle';
import ReferenceSheet from '../components/ReferenceSheet';
import DesmosCalculator from '../components/DesmosCalculator';
import { useTestToolbarState, TEXT_SIZE_SCALE } from '../lib/useTestToolbarState';
import { applyHighlightToSelection } from '../lib/highlightSelection';
```

Inside the `PracticeTest` component, add the hook and a content ref alongside the other refs (near line 114, after `const savedRef = useRef(false);`):

```js
  const toolbar = useTestToolbarState();
  const questionContentRef = useRef(null);
```

In `loadModule` (`PracticeTest.jsx:162-182`), add `toolbar.resetPerQuestion();` right after `setSelected(null);` so annotation state also clears between modules. In `recordAndAdvance` (`PracticeTest.jsx:223-233`), add `toolbar.resetPerQuestion();` right after `setSelected(null);` there too, so it clears on every question, not just module boundaries.

In the MODULE render block (`PracticeTest.jsx:420-478`), insert the toolbar and modals right after the progress bar (after the closing `</div>` of the progress-bar block at line 436, before the domain/difficulty line at 438):

```jsx
      <TestToolbar
        toolbar={toolbar}
        mathOnly={mod.section === 'math'}
        onOpenCalculator={() => toolbar.setCalculatorOpen(true)}
        onOpenReference={() => toolbar.setReferenceOpen(true)}
      />
      {toolbar.referenceOpen && <ReferenceSheet onClose={() => toolbar.setReferenceOpen(false)} />}
      {toolbar.calculatorOpen && <DesmosCalculator onClose={() => toolbar.setCalculatorOpen(false)} />}
```

Apply the highlight container and text-size scaling to the passage/question block (`PracticeTest.jsx:441-448`):

```jsx
      {q.passage_text && (
        <div
          ref={questionContentRef}
          onMouseUp={() => { if (toolbar.highlightMode) applyHighlightToSelection(questionContentRef.current); }}
          style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', marginBottom: '16px', lineHeight: 1.6, fontSize: `${0.95 * TEXT_SIZE_SCALE[toolbar.textSize]}rem` }}
        >
          <MathText>{q.passage_text}</MathText>
        </div>
      )}
      <div
        ref={q.passage_text ? undefined : questionContentRef}
        onMouseUp={q.passage_text ? undefined : () => { if (toolbar.highlightMode) applyHighlightToSelection(questionContentRef.current); }}
        style={{ fontSize: `${1.1 * TEXT_SIZE_SCALE[toolbar.textSize]}rem`, lineHeight: 1.5, marginBottom: '24px' }}
      >
        <MathText>{q.question_text}</MathText>
      </div>
```

Add the `StrikeToggle` to each choice in the answer-rendering block (`PracticeTest.jsx:456-467`):

```jsx
          q.choices.map(c => {
            const active = selected === c.label;
            const struck = toolbar.struckChoices.has(c.label);
            return (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StrikeToggle struck={struck} onToggle={() => toolbar.toggleStrike(c.label)} />
                <button onClick={() => setSelected(c.label)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', backgroundColor: active ? 'rgba(232, 100, 60,0.07)' : 'var(--bg-card)', border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '12px', textAlign: 'left', fontSize: '1rem', color: active ? 'var(--primary)' : 'var(--text-primary)', opacity: struck ? 0.45 : 1, textDecoration: struck ? 'line-through' : 'none' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: active ? 'var(--primary)' : 'var(--border)', color: active ? 'var(--primary-contrast)' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.85rem' }}>{c.label}</div>
                  <MathText style={{ flex: 1 }}>{c.text}</MathText>
                </button>
              </div>
            );
          })
```

- [ ] **Step 2: Wire the toolbar into ReviewSprint.jsx**

Modify `src/pages/ReviewSprint.jsx`. Add imports after the existing `MathText` import (line 4):

```js
import TestToolbar from '../components/TestToolbar';
import StrikeToggle from '../components/StrikeToggle';
import ReferenceSheet from '../components/ReferenceSheet';
import DesmosCalculator from '../components/DesmosCalculator';
import { useTestToolbarState, TEXT_SIZE_SCALE } from '../lib/useTestToolbarState';
import { applyHighlightToSelection } from '../lib/highlightSelection';
```

Add the hook and content ref inside the component, alongside the other hooks near line 26:

```js
  const toolbar = useTestToolbarState();
  const questionContentRef = useRef(null);
```

In `fetchNextQuestion` (`ReviewSprint.jsx:55-79`), add `toolbar.resetPerQuestion();` alongside the other per-question resets (e.g. right after `setSelectedChoice(null);`).

In the main render (the return block starting at `ReviewSprint.jsx:282`), insert the toolbar and modals right after the "Progress bar" block closes (after line 307, before the "Domain header" comment at line 309):

```jsx
      <TestToolbar
        toolbar={toolbar}
        mathOnly={question.section === 'math'}
        onOpenCalculator={() => toolbar.setCalculatorOpen(true)}
        onOpenReference={() => toolbar.setReferenceOpen(true)}
      />
      {toolbar.referenceOpen && <ReferenceSheet onClose={() => toolbar.setReferenceOpen(false)} />}
      {toolbar.calculatorOpen && <DesmosCalculator onClose={() => toolbar.setCalculatorOpen(false)} />}
```

Apply the highlight container and text-size scaling to the "Question" block (`ReviewSprint.jsx:320-329`):

```jsx
      <div
        ref={questionContentRef}
        onMouseUp={() => { if (toolbar.highlightMode) applyHighlightToSelection(questionContentRef.current); }}
        style={{ display: 'flex', flexDirection: window.innerWidth < 768 && question.passage_text ? 'column' : 'row', gap: '24px', marginBottom: '40px', fontSize: `${TEXT_SIZE_SCALE[toolbar.textSize]}em` }}
      >
        {question.passage_text && (
          <div style={{ flex: 1, borderRight: window.innerWidth < 768 ? 'none' : '1px solid var(--border)', borderBottom: window.innerWidth < 768 ? '1px solid var(--border)' : 'none', paddingRight: window.innerWidth < 768 ? '0' : '32px', paddingBottom: window.innerWidth < 768 ? '16px' : '0', fontSize: '0.95em', lineHeight: 1.75, color: 'var(--text-secondary)' }}>
            <MathText>{question.passage_text}</MathText>
          </div>
        )}
        <div style={{ flex: question.passage_text ? 1 : 'none', width: question.passage_text ? 'auto' : '100%', fontSize: '1.1em', lineHeight: 1.65, overflowX: 'auto', minWidth: 0 }}>
          <MathText>{question.question_text}</MathText>
        </div>
      </div>
```

Add the `StrikeToggle` to each choice in the answer-rendering block (`ReviewSprint.jsx:353-374`):

```jsx
          question.choices.map(c => {
            let bgColor = 'var(--bg-card)', borderColor = 'var(--border)', textColor = 'var(--text-primary)';
            if (isAnswered) {
              if (c.is_correct) { bgColor = 'rgba(70,183,159,0.08)'; borderColor = 'var(--success)'; }
              else if (selectedChoice === c.label) { bgColor = 'rgba(255,82,82,0.08)'; borderColor = 'var(--error)'; }
            } else if (selectedChoice === c.label) {
              borderColor = 'var(--primary)'; bgColor = 'rgba(232, 100, 60,0.07)'; textColor = 'var(--primary)';
            }
            const struck = toolbar.struckChoices.has(c.label);
            return (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StrikeToggle struck={struck} onToggle={() => toolbar.toggleStrike(c.label)} />
                <button disabled={isAnswered} onClick={() => setSelectedChoice(c.label)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '14px 18px', backgroundColor: bgColor, border: `2px solid ${borderColor}`, textAlign: 'left', fontSize: '1rem', gap: '14px', borderRadius: '12px', transition: 'all 0.15s', color: textColor, opacity: struck ? 0.45 : 1, textDecoration: struck ? 'line-through' : 'none', animation: isAnswered && c.is_correct ? 'correctPop 0.4s ease' : undefined }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: selectedChoice === c.label && !isAnswered ? 'var(--primary)' : 'var(--border)', color: selectedChoice === c.label && !isAnswered ? 'var(--primary-contrast)' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.85rem' }}>
                    {c.label}
                  </div>
                  <MathText style={{ flex: 1, color: 'var(--text-primary)' }}>{c.text}</MathText>
                  {isAnswered && c.is_correct && <CheckCircle2 size={18} color="var(--success)" />}
                  {isAnswered && selectedChoice === c.label && !c.is_correct && <XCircle size={18} color="var(--error)" />}
                </button>
              </div>
            );
          })
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`. Navigate to `/practice-test`, start the test, confirm the toolbar (with strike toggles, highlight, text size, hide timer) appears on both the R&W and Math modules, and Calculator/Reference only appear during the Math module. Then answer a question incorrectly in a sprint, navigate to `/review`, confirm the toolbar appears there too with the same behavior.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PracticeTest.jsx src/pages/ReviewSprint.jsx
git commit -m "feat: roll Bluebook toolbar into Practice Test and Review Sprint"
```

---

## Task 6: Esc-quit for regular sprints

**Files:**
- Create: `src/components/QuitConfirmDialog.jsx`
- Modify: `src/pages/Sprint.jsx`

**Interfaces:**
- Produces: `<QuitConfirmDialog onResume={fn} onQuitSave={fn} onQuitDiscard={fn} />`.

- [ ] **Step 1: Create the confirm dialog**

Write `src/components/QuitConfirmDialog.jsx`:

```jsx
import React from 'react';

// Esc-quit confirmation for regular (untimed) sprints only. Timed test-mode
// sprints and Practice Test use Pause instead (see PauseOverlay.jsx) — real
// Bluebook keeps these two flows separate rather than overloading one key.
export default function QuitConfirmDialog({ onResume, onQuitSave, onQuitDiscard }) {
  return (
    <div onClick={onResume} style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(5,8,18,0.6)', backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 380, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 20, padding: '28px',
      }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 10, color: 'var(--text-primary)' }}>Quit sprint?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 22, fontSize: '0.9rem', lineHeight: 1.5 }}>
          You can save your progress on the questions you've already answered, or discard this sprint entirely.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="primary" onClick={onResume} style={{ padding: '12px', borderRadius: 12, fontWeight: 700 }}>
            Resume
          </button>
          <button onClick={onQuitSave} style={{ padding: '12px', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'transparent' }}>
            Quit & Save
          </button>
          <button onClick={onQuitDiscard} style={{ padding: '12px', borderRadius: 12, border: '1px solid var(--error)', color: 'var(--error)', backgroundColor: 'transparent' }}>
            Quit & Discard
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire Esc-quit into Sprint.jsx**

Modify `src/pages/Sprint.jsx`. Add the import:

```js
import QuitConfirmDialog from '../components/QuitConfirmDialog';
```

Add state alongside the other `useState` declarations near line 300:

```js
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
```

Modify the keyboard shortcuts effect (`Sprint.jsx:612-640`) to handle Escape and to bail out while the dialog is open:

```jsx
  useEffect(() => {
    const onKey = (e) => {
      if (!question || loading || showSummary) return;
      if (e.target.tagName === 'INPUT') return;

      if (e.key === 'Escape' && !isTestMode) {
        setShowQuitConfirm((v) => !v);
        return;
      }
      if (showQuitConfirm) return;

      if (!isAnswered) {
        if (['1','2','3','4'].includes(e.key) && !question.is_grid_in) {
          const labels = ['A','B','C','D'];
          const label = labels[parseInt(e.key) - 1];
          if (label && question.choices.find(c => c.label === label)) {
            setSelectedChoice(label);
          }
        }
        if (e.key === 'Enter') {
          handleAnswerSubmit();
        }
        if (e.key === 'h' || e.key === 'H') {
          if (hintsUsed < 2) setHintsUsed(h => h + 1);
        }
      } else {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, isAnswered, loading, showSummary, selectedChoice, hintsUsed, handleAnswerSubmit, handleNext, isTestMode, showQuitConfirm]);
```

Render the dialog inside the main question JSX, right after the milestone toast block (after `Sprint.jsx:925`, before the "Progress bar + timer" comment):

```jsx
      {showQuitConfirm && (
        <QuitConfirmDialog
          onResume={() => setShowQuitConfirm(false)}
          onQuitSave={() => { setShowQuitConfirm(false); finishSprint(stats); }}
          onQuitDiscard={() => { setShowQuitConfirm(false); sessionStorage.removeItem('activeSprint'); navigate('/'); }}
        />
      )}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, start a regular (non-test-mode) sprint, answer one question, press Escape. Confirm the confirm dialog opens and pressing number keys or Enter while it's open does nothing to the sprint underneath. Click "Resume" and confirm the dialog closes with the sprint state intact. Press Escape again, click "Quit & Save", confirm it navigates to the normal summary screen showing "1 attempted". Start a new sprint, press Escape, click "Quit & Discard", confirm it returns to the dashboard with no summary screen and no `activeSprint` entry in sessionStorage (check via devtools). Finally, start a timed test-mode sprint (Math Module) and press Escape — confirm nothing happens (Esc-quit is disabled in test mode).

- [ ] **Step 4: Commit**

```bash
git add src/components/QuitConfirmDialog.jsx src/pages/Sprint.jsx
git commit -m "feat: add Esc-quit confirm dialog for regular sprints"
```

---

## Task 7: Shared Pause overlay component

**Files:**
- Create: `src/components/PauseOverlay.jsx`

**Interfaces:**
- Produces: `<PauseOverlay onResume={fn} />`, consumed by Tasks 8 and 9.

- [ ] **Step 1: Create the component**

Write `src/components/PauseOverlay.jsx`:

```jsx
import React from 'react';
import { Play } from 'lucide-react';

// Covers the question content (no peeking) while a timed test-mode sprint
// or Practice Test module is paused. The timer/header stays visible outside
// this component; only the question area renders it, in place of the
// question content, per the approved design.
export default function PauseOverlay({ onResume }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: '60px 24px', backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>Paused</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.5, margin: 0 }}>
        The timer is frozen and the question is hidden. Resume when you're ready to continue.
      </p>
      <button className="primary" onClick={onResume}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, fontWeight: 700 }}>
        <Play size={16} /> Resume
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

This component has no page to render it in yet. Verify by temporarily importing and rendering `<PauseOverlay onResume={() => {}} />` at the top of `Dashboard.jsx`'s return block, confirming it renders correctly in the browser (centered card, Resume button clickable with no console errors), then remove the temporary render before committing.

- [ ] **Step 3: Commit**

```bash
git add src/components/PauseOverlay.jsx
git commit -m "feat: add shared PauseOverlay component"
```

---

## Task 8: Pause for timed test-mode Sprint

**Files:**
- Modify: `src/pages/Sprint.jsx`

**Interfaces:**
- Consumes: `<PauseOverlay onResume={fn} />` from Task 7.

- [ ] **Step 1: Add pause state and refs**

Modify `src/pages/Sprint.jsx`. Add the import:

```js
import PauseOverlay from '../components/PauseOverlay';
```

Add state and a ref alongside the other declarations near line 300:

```js
  const [paused, setPaused] = useState(false);
  const pausedAtRef = useRef(null);
```

- [ ] **Step 2: Implement pause/resume timer freeze**

Add a `togglePause` function near `startTimer`/`stopTimer` (`Sprint.jsx:330-368`):

```js
  const togglePause = () => {
    if (!paused) {
      clearInterval(timerRef.current);
      pausedAtRef.current = Date.now();
      setPaused(true);
    } else {
      const pauseDurationMs = Date.now() - pausedAtRef.current;
      sprintStartRef.current += pauseDurationMs;
      timeStartRef.current += pauseDurationMs;
      pausedAtRef.current = null;
      setPaused(false);
      startTimer();
    }
  };
```

- [ ] **Step 3: Gate keyboard shortcuts on paused**

Modify the keyboard shortcuts effect from Task 6 (`Sprint.jsx:612-640`) to also bail out while paused. Add `if (paused) return;` right after the `if (showQuitConfirm) return;` line, and add `paused` to the effect's dependency array.

- [ ] **Step 4: Add the Pause button and overlay to the render**

In the "Progress bar + timer" block modified in Task 2, add a Pause button next to the timer, only in test mode:

```jsx
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '100px', justifyContent: 'flex-end' }}>
          {isTestMode && (
            <button onClick={togglePause} title={paused ? 'Resume' : 'Pause'}
              style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)' }}>
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}
          {toolbar.timerHidden ? (
            <button onClick={toolbar.toggleTimerHidden}
              style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px 8px', backgroundColor: 'transparent' }}>
              Timer hidden — tap to show
            </button>
          ) : (
            <span style={{ color: timerColor, fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums', fontWeight: isAnswered ? 'normal' : '500' }}>
              {timerStr}
            </span>
          )}
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Q{questionNum}/{SPRINT_LENGTH}
          </div>
        </div>
```

Wrap the "Question content", "Hints", and "Answer choices" blocks (`Sprint.jsx:968` through the choices `.map` closing, roughly lines 968-1032) in a conditional: render `<PauseOverlay onResume={togglePause} />` instead when `paused` is true. Concretely, wrap those existing blocks as:

```jsx
      {paused ? (
        <PauseOverlay onResume={togglePause} />
      ) : (
        <>
          {/* existing Question content, Hints, and Answer choices blocks go here, unchanged */}
        </>
      )}
```

- [ ] **Step 5: Manual verification**

Run `npm run dev`, start a timed test-mode sprint (Math Module). Confirm a Pause button appears next to the timer. Click it: the question content is replaced by the Paused card, the countdown stops changing, and pressing 1-4/Enter does nothing. Wait 5 seconds, click Resume: confirm the question reappears and the countdown resumes from where it left off (not jumped forward or backward by the pause duration — check the displayed seconds before pausing vs. right after resuming, they should differ by roughly the time the question was visible, not include the paused interval). Confirm the Pause button does not appear in a regular (non-test-mode) sprint.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Sprint.jsx
git commit -m "feat: add Pause for timed test-mode sprints"
```

---

## Task 9: Pause for Practice Test

**Files:**
- Modify: `src/pages/PracticeTest.jsx`

**Interfaces:**
- Consumes: `<PauseOverlay onResume={fn} />` from Task 7.

- [ ] **Step 1: Add pause state**

Modify `src/pages/PracticeTest.jsx`. Add the import:

```js
import PauseOverlay from '../components/PauseOverlay';
```

Add state alongside the other `useState` declarations near line 105:

```js
  const [paused, setPaused] = useState(false);
```

- [ ] **Step 2: Implement pause/resume by stopping the interval**

Modify the countdown timer effect (`PracticeTest.jsx:208-221`) to skip ticking while paused:

```jsx
  useEffect(() => {
    if (phase !== 'module' || paused) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          finishModule();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, moduleIndex, finishModule, paused]);
```

(Practice Test's timer is a plain tick-down on `timeLeft` state with no wall-clock derivation, unlike Sprint's — so simply not running the interval while `paused` is true is sufficient; there's no timestamp math to correct on resume.)

- [ ] **Step 3: Gate keyboard shortcuts on paused**

Modify the keyboard shortcuts effect (`PracticeTest.jsx:236-250`) to bail out while paused:

```jsx
  useEffect(() => {
    if (phase !== 'module' || paused) return;
    const q = questions[qIndex];
    const onKey = (e) => {
      if (!q) return;
      if (!q.is_grid_in && ['1', '2', '3', '4'].includes(e.key)) {
        const c = q.choices[parseInt(e.key, 10) - 1];
        if (c) setSelected(c.label);
      } else if (e.key === 'Enter') {
        recordAndAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
```

- [ ] **Step 4: Add the Pause button and overlay to the render**

In the MODULE render's header (`PracticeTest.jsx:423-430`), add a Pause button next to the Clock/timer:

```jsx
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          {mod.label} &middot; Question {qIndex + 1} of {questions.length}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setPaused(p => !p)} title={paused ? 'Resume' : 'Pause'}
            style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: timerColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            <Clock size={15} /> {fmtTime(timeLeft)}
          </div>
        </div>
      </div>
```

Wrap the domain/passage/question/answers/Next-button blocks (`PracticeTest.jsx:438-477`, everything between the progress bar and the closing `</div>` of the component's module return) in a conditional, same pattern as Task 8:

```jsx
      {paused ? (
        <PauseOverlay onResume={() => setPaused(false)} />
      ) : (
        <>
          {/* existing domain/difficulty line, passage, question, answers, and Next button blocks go here, unchanged */}
        </>
      )}
```

- [ ] **Step 5: Manual verification**

Run `npm run dev`, navigate to `/practice-test`, start the test. Confirm a Pause button appears next to the module timer. Click it: content is replaced by the Paused card, the countdown stops changing, 1-4/Enter do nothing. Click Resume: content reappears and the countdown continues from exactly where it was (no time lost or gained, since this timer doesn't do wall-clock math).

- [ ] **Step 6: Commit**

```bash
git add src/pages/PracticeTest.jsx
git commit -m "feat: add Pause to Practice Test modules"
```

---

## Task 10: Time-budget sprint mode

**Files:**
- Modify: `src/pages/Sprint.jsx`

**Interfaces:**
- Produces: sprint state fields `sprintByTime` (bool), `sprintTimeLimitRef`/`sprintTimeLimit` (seconds), `timeUp` (bool) — internal to Sprint.jsx, not consumed elsewhere.

- [ ] **Step 1: Add time-budget state**

Modify `src/pages/Sprint.jsx`. Add state alongside the other declarations near line 300 (near `sprintLengthRef`/`sprintLength`):

```js
  const [pickByTime, setPickByTime] = useState(false);
  const sprintTimeLimitRef = useRef(0);
  const [sprintTimeLimit, setSprintTimeLimit] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
```

- [ ] **Step 2: Extend startSprint to accept a time budget**

Modify `startSprint` (`Sprint.jsx:372` onward). Change its signature and the length-setting branch:

```js
  const startSprint = async (mode, timeBudgetSeconds) => {
    const testModeMap = { 'test-math': { section: 'math', seconds: 35 * 60, questions: 22 }, 'test-english': { section: 'english', seconds: 32 * 60, questions: 27 } };
    const testConfig = testModeMap[mode];
    const effectiveMode = testConfig ? testConfig.section : mode;
    const isTest = !!testConfig;
    isTestModeRef.current = isTest;
    setIsTestMode(isTest);
    if (testConfig) {
      sprintLengthRef.current = testConfig.questions;
      setSprintLength(testConfig.questions);
      testTimeLimitRef.current = testConfig.seconds;
      setTestTimeLimit(testConfig.seconds);
      sprintTimeLimitRef.current = 0;
      setSprintTimeLimit(0);
    } else if (timeBudgetSeconds) {
      sprintTimeLimitRef.current = timeBudgetSeconds;
      setSprintTimeLimit(timeBudgetSeconds);
      testTimeLimitRef.current = 0;
      setTestTimeLimit(0);
      sprintLengthRef.current = Infinity;
      setSprintLength(Infinity);
    } else {
      testTimeLimitRef.current = 0;
      setTestTimeLimit(0);
      sprintTimeLimitRef.current = 0;
      setSprintTimeLimit(0);
    }
    setTimeUp(false);
```

(Leave the rest of the existing function body — the `sprintModeRef`/`setSprintMode`, `setLoading`, fetch call, etc. — unchanged below this point.)

- [ ] **Step 3: Add the time-budget end-of-time check to the timer interval**

Modify `startTimer` (`Sprint.jsx:330-366`). Add a parallel branch to the existing test-mode check, right after the `if (isTestModeRef.current && testTimeLimitRef.current > 0) { ... }` block:

```js
        if (!isTestModeRef.current && sprintTimeLimitRef.current > 0) {
          const remaining = sprintTimeLimitRef.current - sprintElapsed;
          if (remaining <= 0) {
            setTimeUp(true);
          }
        }
```

- [ ] **Step 4: Make handleNext respect time-budget completion**

Modify `handleNext` (`Sprint.jsx:594-609`):

```js
  const handleNext = useCallback(async () => {
    const current = stats;
    const timeBudgetDone = sprintTimeLimitRef.current > 0 && timeUp;
    if (questionNum >= sprintLengthRef.current || timeBudgetDone) {
      await finishSprint(current);
    } else {
      const half = Math.floor(sprintLengthRef.current / 2);
      if (questionNum === half && !milestoneShownRef.current.has('half')) {
        milestoneShownRef.current.add('half');
        setMilestone('Halfway there -- keep it up!');
        setTimeout(() => setMilestone(null), 2800);
      }
      setQuestionNum(n => n + 1);
      await fetchNextQuestion();
    }
  }, [questionNum, sprintId, stats, finishSprint, timeUp]);
```

(The existing halfway-milestone logic uses `Math.floor(sprintLengthRef.current / 2)`, which is `Infinity` for time-budget mode — `questionNum === Infinity` is never true, so that branch simply never fires in time-budget mode, which is correct: there's no known midpoint when the length is open-ended.)

- [ ] **Step 5: Add the mode-picker toggle and duration buttons**

Modify the mode-picker block (`Sprint.jsx:775-802`, the "Length selector" section). Replace it with a toggle plus conditional button rows:

```jsx
        {/* Length selector */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setPickByTime(false)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${!pickByTime ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: !pickByTime ? 'rgba(232, 100, 60,0.08)' : 'transparent', color: !pickByTime ? 'var(--primary)' : 'var(--text-secondary)' }}>
              By Questions
            </button>
            <button onClick={() => setPickByTime(true)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${pickByTime ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: pickByTime ? 'rgba(232, 100, 60,0.08)' : 'transparent', color: pickByTime ? 'var(--primary)' : 'var(--text-secondary)' }}>
              By Time
            </button>
          </div>
          {pickByTime ? (
            <>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>Time Budget</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[5, 10, 15, 20, 30].map(min => (
                  <button key={min} onClick={() => { sprintTimeLimitRef.current = min * 60; setSprintTimeLimit(min * 60); }}
                    style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', border: `2px solid ${sprintTimeLimit === min * 60 ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: sprintTimeLimit === min * 60 ? 'rgba(232, 100, 60,0.08)' : 'transparent', color: sprintTimeLimit === min * 60 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {min}m
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>Sprint Length</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => { setSprintLength(n); sprintLengthRef.current = n; sessionStorage.setItem('preferredSprintLength', n); }}
                    style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', border: `2px solid ${sprintLength === n ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: sprintLength === n ? 'rgba(232, 100, 60,0.08)' : 'transparent', color: sprintLength === n ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {n}Q
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
```

Update the mode-button `onClick` handlers just below (`Sprint.jsx:806`, the `modes.map` button) to pass the time budget when `pickByTime` is active:

```jsx
            <button key={m.key} onClick={() => startSprint(m.key, pickByTime ? sprintTimeLimit : undefined)}
```

(If the user picked "By Time" but hasn't selected a duration yet, `sprintTimeLimit` is `0`, which `startSprint`'s `else if (timeBudgetSeconds)` branch treats as falsy, falling through to the plain `else` branch — the same no-limit behavior as today. Default `sprintTimeLimit` to a sane value to avoid this edge case: change its initial `useState(0)` from Step 1 to `useState(600)` (10 minutes), matching the pattern of `sprintLength` already defaulting to `10` elsewhere in this file.)

- [ ] **Step 6: Add the time-budget progress bar and "time's up" notice**

In the "Progress bar + timer" block (already modified in Tasks 2 and 8), change the progress-bar rendering to branch on time-budget mode:

```jsx
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {sprintTimeLimitRef.current > 0 ? (
            <div style={{ flex: 1, height: '5px', borderRadius: '3px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px', transition: 'width 1s linear, background-color 0.3s',
                width: `${Math.min(100, (sprintElapsedSec / sprintTimeLimitRef.current) * 100)}%`,
                backgroundColor: timeUp ? 'var(--error)' : sprintElapsedSec / sprintTimeLimitRef.current > 0.8 ? 'var(--xp-gold)' : 'var(--primary)',
              }} />
            </div>
          ) : (
            Array.from({ length: SPRINT_LENGTH }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: '5px', borderRadius: '3px',
                backgroundColor: i < questionNum - 1 ? 'var(--primary)' : i === questionNum - 1 ? 'rgba(232, 100, 60,0.4)' : 'var(--border)',
                transition: 'background-color 0.3s'
              }} />
            ))
          )}
        </div>
```

Add a "time's up" inline notice right below the domain header block (after `Sprint.jsx:966`, before "Question content"):

```jsx
      {timeUp && (
        <div style={{ backgroundColor: 'rgba(255,201,61,0.1)', border: '1px solid rgba(255,201,61,0.35)', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--xp-gold)', fontWeight: 600 }}>
          Time's up — finishing this one, then we'll wrap up.
        </div>
      )}
```

- [ ] **Step 7: Manual verification**

Run `npm run dev`, open the sprint mode picker, click "By Time", pick "5m", start a Math sprint. Confirm the progress bar renders as a single continuous fill (not question segments) that grows over time and changes color as it approaches the limit. Answer questions until roughly 5 minutes pass (or temporarily lower the `[5, 10, 15, 20, 30]` array to `[1]` and pick 1 minute to test faster, reverting afterward): confirm the "Time's up — finishing this one" notice appears without cutting off the current question, and after clicking Next, the sprint finishes and shows the normal summary screen rather than fetching another question. Confirm the "By Questions" mode still behaves exactly as before (segmented bar, stops after N questions, no time-based end).

- [ ] **Step 8: Commit**

```bash
git add src/pages/Sprint.jsx
git commit -m "feat: add time-budget sprint mode alongside question-count mode"
```

---

## Task 11: Pomodoro hook

**Files:**
- Create: `src/lib/usePomodoro.js`

**Interfaces:**
- Produces: `usePomodoro()` returning `{ phase, secondsLeft, running, workMinutes, breakMinutes, start, pause, reset, setWorkMinutes(n), setBreakMinutes(n), applyPreset(work, brk) }` — `phase` is `'work'` or `'break'`.

- [ ] **Step 1: Create the hook**

Write `src/lib/usePomodoro.js`:

```js
import { useState, useRef, useEffect, useCallback } from 'react';

const WORK_KEY = 'tally-pomodoro-work';
const BREAK_KEY = 'tally-pomodoro-break';

// Independent focus-session clock, separate from any in-progress sprint
// timer. Never pauses or reacts to sprint state; it's purely for the user's
// own work/break rhythm. Ticks via Date.now() deltas (like Sprint.jsx's own
// timer) so it stays accurate even if the tab is backgrounded and throttled.
export function usePomodoro() {
  const [workMinutes, setWorkMinutesState] = useState(
    () => parseInt(localStorage.getItem(WORK_KEY), 10) || 25
  );
  const [breakMinutes, setBreakMinutesState] = useState(
    () => parseInt(localStorage.getItem(BREAK_KEY), 10) || 5
  );
  const [phase, setPhase] = useState('work');
  const [secondsLeft, setSecondsLeft] = useState(() => (parseInt(localStorage.getItem(WORK_KEY), 10) || 25) * 60);
  const [running, setRunning] = useState(false);

  const intervalRef = useRef(null);
  const targetTimeRef = useRef(null);

  useEffect(() => { localStorage.setItem(WORK_KEY, String(workMinutes)); }, [workMinutes]);
  useEffect(() => { localStorage.setItem(BREAK_KEY, String(breakMinutes)); }, [breakMinutes]);

  const phaseMinutes = useCallback(
    (p) => (p === 'work' ? workMinutes : breakMinutes),
    [workMinutes, breakMinutes]
  );

  const tick = useCallback(() => {
    const remaining = Math.max(0, Math.round((targetTimeRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);
    if (remaining <= 0) {
      clearInterval(intervalRef.current);
      setPhase((prev) => {
        const next = prev === 'work' ? 'break' : 'work';
        targetTimeRef.current = Date.now() + phaseMinutes(next) * 60 * 1000;
        setSecondsLeft(phaseMinutes(next) * 60);
        intervalRef.current = setInterval(tick, 1000);
        return next;
      });
    }
  }, [phaseMinutes]);

  const start = useCallback(() => {
    if (running) return;
    targetTimeRef.current = Date.now() + secondsLeft * 1000;
    intervalRef.current = setInterval(tick, 1000);
    setRunning(true);
  }, [running, secondsLeft, tick]);

  const pause = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setPhase('work');
    setSecondsLeft(workMinutes * 60);
  }, [workMinutes]);

  const applyPreset = useCallback((work, brk) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setWorkMinutesState(work);
    setBreakMinutesState(brk);
    setPhase('work');
    setSecondsLeft(work * 60);
  }, []);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return {
    phase, secondsLeft, running,
    workMinutes, breakMinutes,
    start, pause, reset, applyPreset,
    setWorkMinutes: setWorkMinutesState,
    setBreakMinutes: setBreakMinutesState,
  };
}
```

- [ ] **Step 2: Manual verification**

Temporarily add `import { usePomodoro } from './lib/usePomodoro';` to `src/App.jsx` and call it once inside `AppInner` (`const pomo = usePomodoro();` with no other usage) to confirm it compiles with no console errors. Run `npm run dev` and confirm no errors appear. Remove the temporary line before committing (Task 12 wires it in for real).

- [ ] **Step 3: Commit**

```bash
git add src/lib/usePomodoro.js
git commit -m "feat: add usePomodoro focus-timer hook"
```

---

## Task 12: Pomodoro widget, mounted globally

**Files:**
- Create: `src/components/PomodoroWidget.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `usePomodoro()` from Task 11.

- [ ] **Step 1: Create the widget component**

Write `src/components/PomodoroWidget.jsx`:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause as PauseIcon, Settings2, Coffee, Timer } from 'lucide-react';
import { usePomodoro } from '../lib/usePomodoro';

const PRESETS = [
  { label: '25 / 5', work: 25, brk: 5 },
  { label: '15 / 5', work: 15, brk: 5 },
  { label: '50 / 10', work: 50, brk: 10 },
];

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio unavailable (e.g. autoplay policy blocked it before any user
    // gesture) - the toast notification below still shows, so this is a
    // silent-but-harmless degrade rather than a broken feature.
  }
}

// Floating focus-session widget, mounted once at the App shell level so it
// survives route changes. Hidden on /practice-test (see App.jsx's focusRoute
// check) since Practice Test has its own strict timing UX.
export default function PomodoroWidget() {
  const pomo = usePomodoro();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const prevPhaseRef = useRef(pomo.phase);

  useEffect(() => {
    if (prevPhaseRef.current !== pomo.phase) {
      beep();
      setToast(pomo.phase === 'break' ? 'Work session done — take a break' : 'Break over — back to work');
      setTimeout(() => setToast(null), 4000);
    }
    prevPhaseRef.current = pomo.phase;
  }, [pomo.phase]);

  const mm = String(Math.floor(pomo.secondsLeft / 60)).padStart(2, '0');
  const ss = String(pomo.secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{ position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom))', right: 16, zIndex: 100 }}>
      {toast && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 10, whiteSpace: 'nowrap',
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 14px', fontSize: '0.8rem', color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
      )}
      {settingsOpen && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 10, width: 220,
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Presets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => pomo.applyPreset(p.work, p.brk)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'left' }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Custom</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" min="1" max="120" value={pomo.workMinutes}
              onChange={(e) => pomo.setWorkMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 50, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>work /</span>
            <input type="number" min="1" max="60" value={pomo.breakMinutes}
              onChange={(e) => pomo.setBreakMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 50, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>break</span>
          </div>
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 999, padding: '8px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}>
        {pomo.phase === 'work' ? <Timer size={16} color="var(--primary)" /> : <Coffee size={16} color="var(--xp-gold)" />}
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{mm}:{ss}</span>
        <button onClick={pomo.running ? pomo.pause : pomo.start} title={pomo.running ? 'Pause' : 'Start'}
          style={{ display: 'flex', padding: 4, borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: 'var(--text-secondary)' }}>
          {pomo.running ? <PauseIcon size={15} /> : <Play size={15} />}
        </button>
        <button onClick={() => setSettingsOpen((v) => !v)} title="Settings"
          style={{ display: 'flex', padding: 4, borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: 'var(--text-secondary)' }}>
          <Settings2 size={15} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it in App.jsx**

Modify `src/App.jsx`. Add the import near the other component imports (after `import LevelUpToast from './components/LevelUpToast';` at line 31):

```js
import PomodoroWidget from './components/PomodoroWidget';
```

Render it right after the `{levelUpToast && ...}` block (`App.jsx:242`), gated on the same `focusRoute` logic already used for the bottom nav (line 78), but excluding only `/practice-test` per the approved design (regular Sprint, test-mode Sprint, and ReviewSprint should still show it):

```jsx
      {levelUpToast && <LevelUpToast level={levelUpToast} onDone={() => setLevelUpToast(null)} />}
      {showNav && location.pathname !== '/practice-test' && <PomodoroWidget />}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Confirm the widget floats bottom-right on the Dashboard, on a regular Sprint, and on `/review`, but is absent on `/practice-test`. Click Start: confirm the countdown ticks down every second. Open Settings, pick "15 / 5": confirm the countdown resets to 15:00 and the phase shows "work". Click Settings again, set custom work minutes to 1, confirm after clicking Start it flips to "break" after 60 seconds, a toast appears ("Work session done — take a break"), and you hear a short beep (browsers require a prior user gesture for audio — clicking Start satisfies that). Reload the page and confirm your last work/break minute settings persisted (the running countdown itself does not need to persist).

- [ ] **Step 4: Commit**

```bash
git add src/components/PomodoroWidget.jsx src/App.jsx
git commit -m "feat: add global Pomodoro widget"
```

---

## Self-Review

**Spec coverage:**
- Toolbar (highlight, strikethrough, line reader, text size, hide timer, calculator, reference sheet), shared across Sprint/PracticeTest/ReviewSprint, math-only calc+reference — Tasks 1-5. ✓
- Esc-quit for regular sprints (Resume/Quit & Save/Quit & Discard) — Task 6. ✓
- Pause for timed test-mode Sprint and Practice Test (freeze + cover, no Esc binding) — Tasks 7-9. ✓
- Time-budget sprint mode (toggle, durations, continuous progress bar, graceful end-of-time) — Task 10. ✓
- Global Pomodoro widget (presets, custom minutes, hidden only on Practice Test, phase-complete toast + beep) — Tasks 11-12. ✓
- `ReviewSprint.jsx` explicitly excluded from Esc-quit/Pause (spec's out-of-scope note) — no task adds either there. ✓

**Placeholder scan:** No TBD/TODO/"add error handling"-style steps; every step has complete code or a fully specified manual verification script.

**Type/interface consistency:** `useTestToolbarState()`'s returned shape (Task 1) is used identically across Tasks 2, 3, 4, 5, 8, 10 (`toolbar.timerHidden`, `toolbar.toggleTimerHidden`, `toolbar.struckChoices`, `toolbar.toggleStrike`, `toolbar.calculatorOpen`/`setCalculatorOpen`, `toolbar.referenceOpen`/`setReferenceOpen`, `toolbar.resetPerQuestion()`). `PauseOverlay`'s single `onResume` prop (Task 7) matches its two call sites in Tasks 8 and 9. `usePomodoro()`'s returned shape (Task 11) matches its one call site in Task 12 (`PomodoroWidget.jsx`). `applyHighlightToSelection(containerEl)` (Task 1) is called identically in Tasks 2 and 5.

---

Plan complete and saved to `docs/superpowers/plans/2026-07-05-bluebook-features.md`.
