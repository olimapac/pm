import type { Card } from "@/lib/kanban";
import { GripIcon } from "@/components/KanbanCard";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <div className="flex cursor-grabbing flex-col gap-1 rounded-[10px] border border-primary bg-white px-3 pb-3 pt-2 shadow-[0_18px_32px_rgba(3,33,71,0.18)]">
    <span className="flex items-center text-stage-2">
      <span className="tabular text-xs text-muted">#{card.id}</span>
      <span className="flex-1" />
      <GripIcon />
    </span>
    <p className="text-sm font-semibold leading-snug">{card.title}</p>
    {card.details ? (
      <p className="text-sm leading-normal text-muted">{card.details}</p>
    ) : null}
  </div>
);
