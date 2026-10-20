import { createFileRoute } from "@tanstack/react-router";
import { useLicensedAction } from "@/hooks/use-licensed-action";
import { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  Trash2, 
  Shield, 
  Building2, 
  GraduationCap, 
  User as UserIcon,
  Loader2,
  AlertCircle,
  Mail,
  Calendar,
  MoreVertical,
  Pencil,
  ArrowUpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashHero, GlassCard } from "@/components/dashboard-kit";
import { requireAdmin } from "@/lib/auth-guards";
import { adminListAllAccounts, adminDeleteAccount } from "@/lib/admin-delete.functions";
import { deleteAccountDirect } from "@/lib/admin-license.functions";
import { adminUpdateStudent, adminPromoteClasses } from "@/lib/admin-students.functions";
import { CLASS_YEARS } from "@/lib/class-years";
import { AdminCreateAccountPanel } from "@/components/admin-create-account-panel";
import { SchoolAdminManager } from "@/components/admin/school-admin-manager";

export const Route = createFileRoute("/admin/accounts")({
  beforeLoad: () => requireAdmin(),
  component: AdminAccountsPage,
});

function AdminAccountsPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ role: string; class_year: string; class_letter: string; hours_needed: string }>({ role: "student", class_year: "", class_letter: "", hours_needed: "" });
  const [promoting, setPromoting] = useState(false);

  const listFn = useServerFn(adminListAllAccounts);
  const updateFn = useServerFn(adminUpdateStudent);
  const promoteFn = useServerFn(adminPromoteClasses);
  const licensed = useLicensedAction();
  const deleteDirect = useServerFn(deleteAccountDirect);
  const [noLicense, setNoLicense] = useState(false);

  const openEdit = (acc: any) => {
    setEditing(acc);
    setEditForm({
      role: acc.role || "student",
      class_year: acc.class_year || "",
      class_letter: acc.class_letter || "",
      hours_needed: acc.hours_needed != null ? String(acc.hours_needed) : "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      await updateFn({ data: {
        id: editing.id,
        role: editForm.role as any,
        class_year: editForm.class_year || null,
        class_letter: (editForm.class_letter || null) as any,
        hours_needed: editForm.hours_needed === "" ? undefined : Number(editForm.hours_needed),
      } });
      toast.success("Paskyra atnaujinta");
      setEditing(null);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Nepavyko išsaugoti");
    } finally {
      setBusyId(null);
    }
  };

  const handlePromote = async () => {
    if (!window.confirm("Perkelti visas klases į kitus mokslo metus? 12 / IV gimn. klasės bus pažymėtos kaip baigusios.")) return;
    setPromoting(true);
    try {
      const res = await promoteFn();
      toast.success(`Perkelta: ${res?.promoted_count ?? 0}, baigė: ${res?.graduated_count ?? 0}`);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Nepavyko perkelti klasių");
    } finally {
      setPromoting(false);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await listFn();
      setAccounts(res.profiles || []);
    } catch (err) {
      toast.error("Nepavyko užkrauti vartotojų");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (id: string, email: string) => {
    if (!window.confirm(`Ar tikrai norite IŠTRINTI vartotoją ${email}? Šis veiksmas ištrins visas rezervacijas, žinutes ir užduotis susijusias su šiuo vartotoju.`)) return;
    
    setBusyId(id);
    try {
      if (noLicense) {
        if (!window.confirm(`DĖMESIO: trinsite BE licencijos patikros. Tikrai tęsti (${email})?`)) return;
        await deleteDirect({ data: { userId: id } });
        toast.success("Paskyra ištrinta");
        fetchAccounts();
      } else {
        await licensed("delete_account", id, `Ištrinti vartotoją ${email}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Klaida trinant");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = accounts.filter(a => 
    (a.email?.toLowerCase().includes(search.toLowerCase()) || 
     a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     a.organization_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const roleLabels: Record<string, { label: string, color: string, icon: any }> = {
    admin: { label: "Super Admin", color: "text-rose-400 bg-rose-400/10", icon: Shield },
    school_admin: { label: "Mokyklos Admin", color: "text-amber-400 bg-amber-400/10", icon: GraduationCap },
    organization: { label: "Organizacija", color: "text-emerald-400 bg-emerald-400/10", icon: Building2 },
    student: { label: "Mokinys", color: "text-blue-400 bg-blue-400/10", icon: UserIcon },
    orphan: { label: "Be profilio", color: "text-gray-400 bg-gray-400/10", icon: AlertCircle },
  };

  return (
    <div className="min-h-screen space-y-8 bg-background p-4 pb-24 sm:p-8">
      <DashHero 
        eyebrow="Valdymas"
        title="Vartotojų Paskyros" 
        subtitle="Matykite visus platformos vartotojus ir šalinkite testinius ar nebegaliojančius profilius."
        icon={Users}
        accent="#3B82F6"
      />

      <AdminCreateAccountPanel />
      <SchoolAdminManager />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input 
            type="text"
            placeholder="Ieškoti pagal el. paštą, vardą ar organizaciją..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button 
          onClick={fetchAccounts}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Atnaujinti
        </button>
        <button
          onClick={handlePromote}
          disabled={promoting}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary/20 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/30"
          title="Perkelti visas klases į kitus mokslo metus"
        >
          {promoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
          Nauji mokslo metai
        </button>
        <label className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-300" title="Leidžia trinti paskyras be nukreipimo į auth.socialinesvalandos.dev licencijos patikrą. Mažesnė apsauga – naudok tik savo įrenginyje.">
          <input type="checkbox" checked={noLicense} onChange={(e) => setNoLicense(e.target.checked)} />
          Trynimas be licencijos
        </label>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">Redaguoti: {editing.full_name || editing.email}</h3>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50">Rolė</label>
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white">
              <option value="student">Mokinys</option>
              <option value="school_admin">Mokyklos Admin</option>
              <option value="organization">Organizacija</option>
              <option value="admin">Super Admin</option>
            </select>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50">Klasė</label>
            <div className="flex gap-2">
              <select value={editForm.class_year} onChange={(e) => setEditForm({ ...editForm, class_year: e.target.value })}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white">
                <option value="">—</option>
                {CLASS_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={editForm.class_letter} onChange={(e) => setEditForm({ ...editForm, class_letter: e.target.value })}
                className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white">
                <option value="">—</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50">Privalomos valandos</label>
            <input type="number" min={0} value={editForm.hours_needed} onChange={(e) => setEditForm({ ...editForm, hours_needed: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white/60 hover:bg-white/5">Atšaukti</button>
              <button onClick={saveEdit} disabled={busyId === editing.id}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {busyId === editing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Išsaugoti
              </button>
            </div>
          </div>
        </div>
      )}

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/50">Vartotojas</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/50">Rolė</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/50">Sukurta</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-white/50">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-white/40">Kraunami vartotojai...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-sm text-white/40">
                    Vartotojų nerasta.
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => {
                  const r = roleLabels[acc.role] || roleLabels.student;
                  const Icon = r.icon;
                  return (
                    <motion.tr 
                      key={acc.id} 
                      className="group transition hover:bg-white/[0.02]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${r.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">
                              {acc.full_name || acc.organization_name || "Bevardis"}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-white/40">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{acc.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${r.color}`}>
                          {r.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          <Calendar className="h-3 w-3" />
                          {new Date(acc.created_at).toLocaleDateString("lt-LT")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEdit(acc)}
                          className="rounded-lg p-2 text-white/20 transition hover:bg-primary/20 hover:text-primary"
                          title="Redaguoti rolę ir klasę"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id, acc.email)}
                          disabled={busyId === acc.id}
                          className="rounded-lg p-2 text-white/20 transition hover:bg-rose-500/20 hover:text-rose-500 disabled:opacity-50"
                          title="Ištrinti paskyrą"
                        >
                          {busyId === acc.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
