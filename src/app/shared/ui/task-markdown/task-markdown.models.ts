export type TaskMarkdownSegment =
  | { readonly type: 'text'; readonly content: string }
  | { readonly type: 'bold'; readonly content: string }
  | { readonly type: 'italic'; readonly content: string }
  | { readonly type: 'code'; readonly content: string }
  | { readonly type: 'link'; readonly content: string; readonly href: string };

export interface TaskMarkdownListItem {
  readonly segments: readonly TaskMarkdownSegment[];
  readonly checked: boolean | null;
}

export type TaskMarkdownBlock =
  | {
      readonly type: 'heading';
      readonly level: 1 | 2 | 3;
      readonly segments: readonly TaskMarkdownSegment[];
    }
  | { readonly type: 'paragraph'; readonly segments: readonly TaskMarkdownSegment[] }
  | { readonly type: 'quote'; readonly segments: readonly TaskMarkdownSegment[] }
  | {
      readonly type: 'list';
      readonly ordered: boolean;
      readonly items: readonly TaskMarkdownListItem[];
    }
  | { readonly type: 'code-block'; readonly content: string; readonly language: string | null };
