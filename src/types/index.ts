// ─── Domain IDs (string literal unions) ───

export type CategoryId = 'decisions' | 'actions' | 'questions';

export type PriorityId = 'high' | 'medium' | 'low';

export type DecisionStatus = 'to-discuss' | 'to-validate' | 'validated' | 'closed';
export type ActionStatus = 'todo' | 'in-progress' | 'to-review' | 'done' | 'blocked';
export type QuestionStatus = 'to-ask' | 'to-adjust' | 'answered' | 'closed';
export type ItemStatus = DecisionStatus | ActionStatus | QuestionStatus;

export type LinkType = 'depends-on' | 'stems-from' | 'related';

export interface ItemLink {
  targetId: string;
  type: LinkType;
}

// ─── Domain Entities ───

export interface Item {
  id: string;
  text: string;
  status: ItemStatus;
  category: CategoryId;
  section: string;
  priority: PriorityId;
  owner: string;
  note: string;
  parentId: string | null;
  createdAt: number;
  shortId: string;
  links: ItemLink[];
  order: number;
}

export interface ItemWithProject extends Item {
  _projectSlug: string;
  _projectName: string;
}

export interface Project {
  slug: string;
  projectName: string;
  sections: string[];
  items: Item[];
  markdown?: string;
  updatedAt?: number;
}

// ─── Configuration Types ───

import type { Icon } from '@phosphor-icons/react';

export interface Category {
  readonly id: CategoryId;
  readonly label: string;
  readonly icon: Icon;
  readonly color: string;
}

export interface PriorityLevel {
  readonly id: PriorityId;
  readonly label: string;
  readonly dot: string;
  readonly icon: string;
}

export interface StatusOption {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

// ─── Context Types ───

export interface ProjectsContextValue {
  projects: ProjectSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
  removeProject: (slug: string) => Promise<void>;
}

export interface LayoutContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

// ─── API Types ───

export interface ProjectSummary {
  slug: string;
  projectName: string;
  itemCount: number;
  doneCount: number;
  updatedAt: number | null;
}
