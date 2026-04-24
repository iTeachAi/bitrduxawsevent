import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [capacity, setCapacity] = useState(50);
  const [sold, setSold] = useState(0);
  const [rowId, setRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) checkAdmin(s.user.id);
      else { setIsAdmin(false); setChecking(false); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) checkAdmin(data.session.user.id);
      else setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    setChecking(true);
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
    setChecking(false);
    if (data) loadStats();
  };

  const loadStats = async () => {
    const { data } = await supabase
      .from("event_stats")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      setRowId(data.id);
      setCapacity(data.capacity);
      setSold(data.tickets_sold);
    }
  };

  const handleAuth = async (mode: "signin" | "signup") => {
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) return toast.error(error.message);
      toast.success("Account created. You can now sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return toast.error(error.message);
      toast.success("Signed in");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  const handleSave = async () => {
    if (!rowId) return;
    setSaving(true);
    const { error } = await supabase
      .from("event_stats")
      .update({ capacity, tickets_sold: sold, updated_at: new Date().toISOString() })
      .eq("id", rowId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Updated — landing page will refresh live");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", padding: 32, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 480, margin: "60px auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 8, fontWeight: 700 }}>Admin</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 32, fontSize: 14 }}>
          Update tickets sold for the live landing page counter.
        </p>

        {checking ? (
          <Card style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
            Loading…
          </Card>
        ) : !session ? (
          <Card style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={() => handleAuth("signin")} style={{ flex: 1 }}>Sign in</Button>
                <Button variant="outline" onClick={() => handleAuth("signup")} style={{ flex: 1 }}>Sign up</Button>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
                After signing up, an existing admin must grant you the <code>admin</code> role in the database. The first admin can be assigned via Lovable Cloud → Database → user_roles.
              </p>
            </div>
          </Card>
        ) : !isAdmin ? (
          <Card style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ marginBottom: 8 }}>Signed in as {session.user.email}</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 16 }}>
              This account is not an admin. Add a row to <code>user_roles</code> with your user id and role <code>admin</code>.
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
              Your user id: <code>{session.user.id}</code>
            </p>
            <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
          </Card>
        ) : (
          <Card style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>
                  Total capacity
                </label>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>
                  Tickets sold
                </label>
                <Input type="number" value={sold} onChange={(e) => setSold(parseInt(e.target.value) || 0)} />
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                {Math.max(capacity - sold, 0)} seats remaining
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
