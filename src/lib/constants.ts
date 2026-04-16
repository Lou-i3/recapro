import type { Category, PriorityLevel, StatusOption, CategoryId, ItemStatus, Item, LinkType } from '../types';

export const CATEGORIES: readonly Category[] = [
  { id: "decisions", label: "Decisions", icon: "🎯", color: "#E8B931" },
  { id: "actions", label: "Actions", icon: "🔧", color: "#4EA8DE" },
  { id: "questions", label: "Questions", icon: "💬", color: "#C77DBA" },
] as const;

export const PRIORITY_LEVELS: readonly PriorityLevel[] = [
  { id: "high", label: "High", dot: "#E25D5D", icon: "▲" },
  { id: "medium", label: "Medium", dot: "#E8B931", icon: "◆" },
  { id: "low", label: "Low", dot: "#6BC06B", icon: "▽" },
] as const;

export const STATUS_BY_CATEGORY: Record<CategoryId, readonly StatusOption[]> = {
  decisions: [
    { id: "to-discuss",  label: "To discuss",  color: "#A0A0A8" },
    { id: "to-validate", label: "To validate", color: "#E8B931" },
    { id: "validated",   label: "Validated",    color: "#6BC06B" },
    { id: "closed",      label: "Closed",       color: "#6B6B76" },
  ],
  actions: [
    { id: "todo",        label: "To do",        color: "#A0A0A8" },
    { id: "in-progress", label: "In progress",  color: "#4EA8DE" },
    { id: "to-review",   label: "To review",    color: "#E8B931" },
    { id: "done",        label: "Done",         color: "#6BC06B" },
    { id: "blocked",     label: "Blocked",      color: "#E25D5D" },
  ],
  questions: [
    { id: "to-ask",     label: "To ask",     color: "#A0A0A8" },
    { id: "to-adjust",  label: "To adjust",  color: "#E8B931" },
    { id: "answered",   label: "Answered",    color: "#6BC06B" },
    { id: "closed",     label: "Closed",      color: "#6B6B76" },
  ],
};

export const DEFAULT_STATUS: Record<CategoryId, ItemStatus> = {
  decisions: "to-discuss",
  actions: "todo",
  questions: "to-ask",
};

export const COMPLETED_STATUSES = new Set<string>([
  "validated", "done", "answered", "closed",
]);

export const HIDDEN_STATUSES = new Set<string>([
  "closed", "done",
]);

export const DEFAULT_SECTIONS = ["General", "Technical", "Budget", "Planning"];

export const CATEGORY_PREFIX: Record<CategoryId, string> = {
  decisions: 'D',
  actions: 'A',
  questions: 'Q',
};

export const LINK_LABELS: Record<LinkType, { forward: string; reverse: string }> = {
  'depends-on': { forward: 'depends on',    reverse: 'blocks' },
  'stems-from': { forward: 'stems from',   reverse: 'leads to' },
  'related':    { forward: 'related to',   reverse: 'related to' },
};

export type LinkDirection = 'forward' | 'reverse';

export interface QuickLinkConfig {
  label: string;
  targetCategory: CategoryId | null; // null = any category
  linkType: LinkType;
  direction: LinkDirection; // forward = link stored on new/selected, reverse = link stored on current
}

export const QUICK_LINK_BY_CATEGORY: Record<CategoryId, QuickLinkConfig[]> = {
  decisions: [
    { label: 'Action from this',    targetCategory: 'actions',   linkType: 'stems-from', direction: 'forward' },
    { label: 'Question about this', targetCategory: 'questions', linkType: 'related',    direction: 'forward' },
    { label: 'From question…',      targetCategory: 'questions', linkType: 'stems-from', direction: 'reverse' },
  ],
  actions: [
    { label: 'From decision…',      targetCategory: 'decisions', linkType: 'stems-from', direction: 'reverse' },
    { label: 'Blocked by…',         targetCategory: null,        linkType: 'depends-on', direction: 'forward' },
  ],
  questions: [
    { label: 'Decision from this',  targetCategory: 'decisions', linkType: 'stems-from', direction: 'forward' },
    { label: 'Action from this',    targetCategory: 'actions',   linkType: 'stems-from', direction: 'forward' },
  ],
};

export const emptyItem =(categoryId: CategoryId, section: string, parentId: string | null = null): Item => ({
  id: crypto.randomUUID(),
  text: "",
  status: DEFAULT_STATUS[categoryId] || "todo",
  category: categoryId,
  section: section,
  priority: "medium",
  owner: "",
  note: "",
  parentId,
  createdAt: Date.now(),
  shortId: "",
  links: [],
  order: 0,
});
