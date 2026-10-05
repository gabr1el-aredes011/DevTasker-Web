import {
  TaskMarkdownBlock,
  TaskMarkdownListItem,
  TaskMarkdownSegment,
} from './task-markdown.models';

const SPECIAL_LINE = /^(?:#{1,3}\s+|>|[-*]\s+|\d+\.\s+|```)/;
const INLINE_TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;

export function parseTaskMarkdown(source: string): readonly TaskMarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: TaskMarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || null;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({ type: 'code-block', content: codeLines.join('\n'), language });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        segments: parseInlineMarkdown(heading[2]),
      });
      index += 1;
      continue;
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', segments: parseInlineMarkdown(quoteLines.join(' ')) });
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.+)$/.exec(line);
    if (unorderedMatch) {
      const items: TaskMarkdownListItem[] = [];
      while (index < lines.length) {
        const match = /^[-*]\s+(.+)$/.exec(lines[index]);
        if (!match) {
          break;
        }
        items.push(parseListItem(match[1]));
        index += 1;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(line);
    if (orderedMatch) {
      const items: TaskMarkdownListItem[] = [];
      while (index < lines.length) {
        const match = /^\d+\.\s+(.+)$/.exec(lines[index]);
        if (!match) {
          break;
        }
        items.push({ segments: parseInlineMarkdown(match[1]), checked: null });
        index += 1;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !SPECIAL_LINE.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({
      type: 'paragraph',
      segments: parseInlineMarkdown(paragraphLines.join(' ')),
    });
  }

  return blocks;
}

export function parseInlineMarkdown(source: string): readonly TaskMarkdownSegment[] {
  const segments: TaskMarkdownSegment[] = [];
  let cursor = 0;

  for (const match of source.matchAll(INLINE_TOKEN)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      segments.push({ type: 'text', content: source.slice(cursor, matchIndex) });
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      const safeUrl = normalizeSafeUrl(match[2]);
      segments.push(
        safeUrl
          ? { type: 'link', content: match[1], href: safeUrl }
          : { type: 'text', content: match[0] },
      );
    } else if (match[3] !== undefined) {
      segments.push({ type: 'bold', content: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'code', content: match[4] });
    } else if (match[5] !== undefined) {
      segments.push({ type: 'italic', content: match[5] });
    }

    cursor = matchIndex + match[0].length;
  }

  if (cursor < source.length) {
    segments.push({ type: 'text', content: source.slice(cursor) });
  }

  return segments;
}

function parseListItem(content: string): TaskMarkdownListItem {
  const checklist = /^\[([ xX])\]\s+(.+)$/.exec(content);
  if (!checklist) {
    return { segments: parseInlineMarkdown(content), checked: null };
  }

  return {
    segments: parseInlineMarkdown(checklist[2]),
    checked: checklist[1].toLowerCase() === 'x',
  };
}

function normalizeSafeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
