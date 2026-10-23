import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRIDE_PASSWORD, STAFF_ACCOUNT, useBridalStore } from "@/store/useBridalStore";

export function LoginScreen() {
  const login = useBridalStore((s) => s.login);
  const brides = useBridalStore((s) => s.brides);
  const accounts = [
    { key: "staff", label: "Clinic staff", email: STAFF_ACCOUNT.email, password: STAFF_ACCOUNT.password },
    ...brides.map((b) => ({ key: b.id, label: `${b.name} (bride)`, email: b.email, password: b.password })),
  ];
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e?: string, p?: string) => {
    const role = login(e ?? email, p ?? password);
    if (!role) { setError("That email and password don't match a demo account."); return; }
    toast.success(role === "clinic" ? "Welcome back to the clinic desk." : "Welcome, beautiful bride.");
    navigate({ to: role === "clinic" ? "/clinic" : "/timeline" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <p className="font-display text-4xl font-bold text-primary">ORRO</p>
          <p className="text-xs uppercase tracking-[0.25em] text-gold">Bridal Countdown</p>
        </div>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            submit();
          }}
          className="space-y-4 rounded-3xl border bg-card p-6 shadow-soft"
        >
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-full">Sign in</Button>
        </form>
        <div className="space-y-2 rounded-2xl border bg-card p-4 text-sm">
          <p className="font-semibold">Demo accounts</p>
          <p className="text-xs text-muted-foreground">Every bride the clinic adds gets her own login (password {BRIDE_PASSWORD}).</p>
          {accounts.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => submit(a.email, a.password)}
              className="flex w-full items-center justify-between rounded-xl bg-muted px-3 py-2 text-left hover:bg-blush-soft"
            >
              <span>
                <b>{a.label}</b>
                <br />
                <span className="text-xs text-muted-foreground">{a.email} · {a.password}</span>
              </span>
              <span className="text-xs font-semibold text-primary">Use →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
