// Custom registration questions — a host-defined question set attached to a
// webinar (webinars.custom_questions), answered by registrants on the register
// form (registrations.custom_answers). Kept deliberately simple: three input
// types, optional/required, and options for the dropdown. Stored as JSON so no
// per-question schema is needed.

export type CustomQuestionType = "text" | "textarea" | "select";

export interface CustomQuestion {
  /** Stable id used as the answers key — survives label edits + reordering. */
  id: string;
  label: string;
  type: CustomQuestionType;
  required: boolean;
  /** Choices for `select`; ignored for text/textarea. */
  options?: string[];
}

/** Answers keyed by question id → the registrant's answer string. */
export type CustomAnswers = Record<string, string>;

export const MAX_QUESTIONS = 10;
export const MAX_LABEL_LEN = 120;
export const MAX_ANSWER_LEN = 500;

export function newQuestion(): CustomQuestion {
  return {
    // crypto.randomUUID is available in every browser the app targets.
    id: crypto.randomUUID(),
    label: "",
    type: "text",
    required: false,
    options: [],
  };
}

/**
 * Coerce arbitrary JSON (from the DB or an untrusted payload) into a clean
 * CustomQuestion[]. Drops anything malformed so a bad row can never crash the
 * register form.
 */
export function parseQuestions(raw: unknown): CustomQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const id = typeof q.id === "string" ? q.id : "";
    const label = typeof q.label === "string" ? q.label.trim() : "";
    const type = q.type === "textarea" || q.type === "select" ? q.type : "text";
    if (!id || !label) continue;
    const options = Array.isArray(q.options)
      ? q.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0).map((o) => o.trim())
      : [];
    // A select with no options is meaningless — skip it rather than render a
    // dropdown the registrant can't answer.
    if (type === "select" && options.length === 0) continue;
    out.push({ id, label: label.slice(0, MAX_LABEL_LEN), type, required: q.required === true, options });
  }
  return out.slice(0, MAX_QUESTIONS);
}

/**
 * Validate a registrant's answers against the question set. Returns a map of
 * questionId → error message for any required question left blank (trimmed).
 */
export function validateAnswers(questions: CustomQuestion[], answers: CustomAnswers): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const q of questions) {
    if (q.required && !(answers[q.id] ?? "").trim()) {
      errors[q.id] = "This answer is required.";
    }
  }
  return errors;
}

/** Trim + length-cap answers to only the current questions before saving. */
export function cleanAnswers(questions: CustomQuestion[], answers: CustomAnswers): CustomAnswers {
  const out: CustomAnswers = {};
  for (const q of questions) {
    const v = (answers[q.id] ?? "").trim();
    if (v) out[q.id] = v.slice(0, MAX_ANSWER_LEN);
  }
  return out;
}
