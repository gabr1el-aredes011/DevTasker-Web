import { parseInlineMarkdown, parseTaskMarkdown } from './task-markdown.parser';

describe('task markdown parser', () => {
  it('should parse headings, lists, checklist, quote and code blocks', () => {
    const blocks = parseTaskMarkdown(`# Entrega

- item comum
- [x] item concluído

> decisão importante

\`\`\`ts
const ready = true;
\`\`\``);

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'list',
      'quote',
      'code-block',
    ]);
    expect(blocks[1]).toMatchObject({
      type: 'list',
      items: [{ checked: null }, { checked: true }],
    });
  });

  it('should only create links for safe protocols', () => {
    expect(parseInlineMarkdown('[Docs](https://example.com)')).toEqual([
      { type: 'link', content: 'Docs', href: 'https://example.com/' },
    ]);
    expect(parseInlineMarkdown('[Ataque](javascript:alert)')).toEqual([
      { type: 'text', content: '[Ataque](javascript:alert)' },
    ]);
  });

  it('should keep raw html as inert text', () => {
    expect(parseTaskMarkdown('<img src=x onerror=alert(1)>')).toEqual([
      {
        type: 'paragraph',
        segments: [{ type: 'text', content: '<img src=x onerror=alert(1)>' }],
      },
    ]);
  });
});
