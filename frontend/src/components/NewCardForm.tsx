import { useState, type FormEvent } from "react";

const initialFormState = { title: "", details: "" };

type NewCardFormProps = {
  onAdd: (title: string, details: string) => void;
};

export const NewCardForm = ({ onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      return;
    }
    onAdd(formState.title.trim(), formState.details.trim());
    setFormState(initialFormState);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-muted transition hover:bg-white/70 hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Adicionar cartão
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-[10px] border border-line bg-white p-3">
      <input
        value={formState.title}
        onChange={(event) =>
          setFormState((prev) => ({ ...prev, title: event.target.value }))
        }
        placeholder="Título do cartão"
        aria-label="Título do cartão"
        className="rounded-lg border border-[#d5dbe4] px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-primary"
        autoFocus
        required
      />
      <textarea
        value={formState.details}
        onChange={(event) =>
          setFormState((prev) => ({ ...prev, details: event.target.value }))
        }
        placeholder="Detalhes"
        aria-label="Detalhes"
        rows={3}
        className="resize-none rounded-lg border border-[#d5dbe4] px-2.5 py-1.5 text-[13px] text-ink-3 outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="min-h-8 rounded-lg bg-secondary px-3 text-xs font-semibold text-white transition hover:bg-secondary-hover"
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setFormState(initialFormState);
          }}
          className="min-h-8 rounded-lg px-3 text-xs font-medium text-muted transition hover:bg-[#e9ecf2] hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
