import { Fragment } from 'react';

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) =>
    part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> :
      part.startsWith('`') ? <code key={index} className="break-all rounded bg-black/5 px-1 dark:bg-white/10">{part.slice(1, -1)}</code> :
        <Fragment key={index}>{part}</Fragment>,
  );
}

/** Small safe Markdown subset: React escapes text; no HTML or executable links. */
export function AgentReply({ content }: { content: string }) {
  return <div className="space-y-2 break-words">{content.split('\n').map((line, index) => {
    if (/^#{1,4}\s/.test(line)) return <h3 key={index} className="pt-2 font-semibold">{inline(line.replace(/^#{1,4}\s+/, ''))}</h3>;
    if (/^[-*]\s/.test(line)) return <p key={index} className="pl-3"><span aria-hidden="true">• </span>{inline(line.slice(2))}</p>;
    return line.trim() ? <p key={index} className="whitespace-pre-wrap">{inline(line)}</p> : null;
  })}</div>;
}
