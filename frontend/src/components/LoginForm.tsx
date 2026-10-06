"use client";

import { useRef, useState, type FormEvent } from "react";
import { checkCredentials } from "@/lib/auth";
import { Logo } from "@/components/Logo";

type LoginFormProps = {
  onLogin: () => void;
};

const MINI_BOARD = [
  { color: "var(--color-stage-1)", cards: [false, false, true] },
  { color: "var(--color-stage-2)", cards: [false] },
  { color: "var(--color-primary)", cards: [false] },
  { color: "var(--color-secondary-on-ink)", cards: [true, false] },
  { color: "var(--color-accent)", cards: [false, false] },
];

const fieldClass =
  "min-h-11 rounded-[10px] border border-field bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/20 aria-invalid:border-danger";

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [failed, setFailed] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checkCredentials(username.trim(), password)) {
      onLogin();
    } else {
      setFailed(true);
      usernameRef.current?.focus();
    }
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-white">
      <section className="flex min-w-0 flex-[1_1_560px] flex-col gap-10 bg-ink px-12 py-10 text-white max-sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo dark />
          <span className="text-base font-semibold">Kanban Studio</span>
        </div>

        <div className="flex max-w-[520px] flex-col gap-4">
          <h1 className="text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] max-sm:text-[34px]">
            Seu projeto em um quadro.
            <br />
            <span className="text-accent">Um copiloto ao lado.</span>
          </h1>
          <p className="text-base leading-relaxed text-on-ink-muted">
            Descreva o que precisa mudar. A IA cria, edita e move cartões, e mostra
            cada passo que deu para chegar lá.
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-3.5" aria-hidden="true">
          <div className="grid max-w-[560px] grid-cols-5 gap-2">
            {MINI_BOARD.map((col, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-[10px] bg-white/5 p-2">
                <span className="h-1 w-2/5 rounded-sm" style={{ background: col.color }} />
                {col.cards.map((hot, j) => (
                  <span
                    key={j}
                    className={
                      hot
                        ? "h-[34px] rounded-md border border-primary bg-primary/20"
                        : "h-[34px] rounded-md bg-white/12"
                    }
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="max-w-[560px] rounded-[10px] border border-white/10 px-3.5 py-3 font-mono text-xs leading-[1.7] text-on-ink-muted">
            <p><span className="text-accent">$</span> &ldquo;mova o layout do cartão para Revisão&rdquo;</p>
            <p>ler quadro · montar pedido · <span className="text-accent">modelo</span> · validar</p>
            <p className="text-on-ink-ok">plano pronto · 1 alteração · aplicar?</p>
          </div>
        </div>
      </section>

      <section className="flex min-w-0 flex-[1_1_440px] items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="flex w-full max-w-[380px] flex-col gap-5">
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight">Entrar</h2>
            <p className="mt-1.5 text-sm text-muted">Acesse o quadro do seu projeto.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-semibold text-ink-2">Usuário</label>
            <input
              id="username"
              ref={usernameRef}
              aria-invalid={failed}
              aria-describedby={failed ? "login-error" : undefined}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-ink-2">Senha</label>
            <input
              id="password"
              aria-invalid={failed}
              aria-describedby={failed ? "login-error" : undefined}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className={fieldClass}
            />
          </div>

          {failed ? (
            <p id="login-error" role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
              Credenciais inválidas. Use user / password.
            </p>
          ) : null}

          <button
            type="submit"
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-[10px] bg-secondary text-sm font-semibold text-white transition hover:bg-secondary-hover"
          >
            Entrar no quadro
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>

          <p className="flex items-center gap-2.5 rounded-[10px] bg-accent-soft p-3 text-sm text-accent-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <path d="M12 8h.01" />
            </svg>
            <span>
              Demo: <span className="font-mono font-semibold">user</span> /{" "}
              <span className="font-mono font-semibold">password</span>
            </span>
          </p>
        </form>
      </section>
    </div>
  );
};
