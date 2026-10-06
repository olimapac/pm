import type { Card } from "@/lib/kanban";
import { GripIcon } from "@/components/KanbanCard";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="flex rotate-2 flex-col gap-1.5 rounded-[10px] border border-primary bg-white p-3 shadow-[0_18px_32px_rgba(3,33,71,0.18)]">
    <span className="flex items-center">
      <span className="font-mono text-[11px] text-muted">#{card.id}</span>
      <span className="flex-1" />
      <GripIcon />
    </span>
    <h4 className="text-sm font-semibold leading-snug">{card.title}</h4>
    {card.details ? (
      <p className="text-[13px] leading-normal text-muted">{card.details}</p>
    ) : null}
  </article>
);
