export const CATEGORIES = [
  { id: "decisions", label: "Décisions", icon: "⚖️", color: "#E8B931" },
  { id: "actions", label: "Actions", icon: "⚡", color: "#4EA8DE" },
  { id: "questions", label: "Questions", icon: "❓", color: "#C77DBA" },
];

export const PRIORITY_LEVELS = [
  { id: "high", label: "Haute", dot: "#E25D5D" },
  { id: "medium", label: "Moyenne", dot: "#E8B931" },
  { id: "low", label: "Basse", dot: "#6BC06B" },
];

export const DEFAULT_SECTIONS = ["Général", "Technique", "Budget", "Planning"];

export const emptyItem = (categoryId, section) => ({
  id: crypto.randomUUID(),
  text: "",
  done: false,
  category: categoryId,
  section: section,
  priority: "medium",
  owner: "",
  note: "",
  createdAt: Date.now(),
});
