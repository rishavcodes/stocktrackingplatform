"use client";

// Master-only "Team" page. Non Individual SPs land here to manage their
// sub profiles — create / edit permissions / remove — entirely self-serve
// (no Tradebox admin in the loop after the master is approved). Seat-capped
// at 2 admin + 10 user; over-cap → email Tradebox CTA.

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Users, Plus, Trash2, Mail, Shield, UserCog, X } from "lucide-react";
import {
  PERMISSION_MODULES,
  SEAT_LIMITS,
  type PermissionKey,
  type Permissions,
} from "@/lib/subProfilePermissions";

type SubProfile = {
  _id: string;
  RegName?: string;
  name?: string;
  email?: string;
  number?: string | number;
  createdAt?: string;
  addedby?: {
    isSubProfile?: boolean;
    id?: string;
    companyName?: string;
    subProfileRole?: "admin" | "user";
    permissions?: Partial<Permissions>;
  };
};

type Seats = {
  admin: { used: number; max: number };
  user: { used: number; max: number };
};

function emptyPerms(): Permissions {
  return PERMISSION_MODULES.reduce(
    (acc, m) => ({ ...acc, [m.key]: false }),
    {} as Permissions,
  );
}

export default function TeamPage() {
  const session = useSession();
  const token =
    session.data?.user?.backendToken || (session.data as any)?.backendToken;
  const isMaster =
    session.data?.user?.type === "Non Individual" &&
    !(session.data?.user as any)?.addedby?.isSubProfile;

  const [subs, setSubs] = useState<SubProfile[]>([]);
  const [seats, setSeats] = useState<Seats>({
    admin: { used: 0, max: SEAT_LIMITS.admin },
    user: { used: 0, max: SEAT_LIMITS.user },
  });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<SubProfile | null>(null);

  const refetch = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sp/subprofiles`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json?.success) {
        setSubs(json.data.subs || []);
        setSeats(json.data.seats || seats);
      }
    } catch {
      /* network errors fall through to empty state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isMaster) refetch();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isMaster]);

  if (session.status === "loading") {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isMaster) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-900 mb-1">
            Not available for your account
          </h2>
          <p className="text-xs text-amber-800/80">
            Only Non Individual service providers can manage a team. If you
            think this is a mistake, please contact Tradebox.
          </p>
        </div>
      </div>
    );
  }

  const adminFull = seats.admin.used >= seats.admin.max;
  const userFull = seats.user.used >= seats.user.max;
  const allFull = adminFull && userFull;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Team
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage admin &amp; user sub profiles for your firm
          </p>
        </div>
        <button
          type="button"
          disabled={allFull}
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
          title={allFull ? "All seats used" : undefined}
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Seat usage */}
      <div className="grid grid-cols-2 gap-4">
        <SeatCard
          label="Admin sub profiles"
          icon={<Shield className="w-4 h-4 text-indigo-600" />}
          used={seats.admin.used}
          max={seats.admin.max}
        />
        <SeatCard
          label="User sub profiles"
          icon={<UserCog className="w-4 h-4 text-emerald-600" />}
          used={seats.user.used}
          max={seats.user.max}
        />
      </div>

      {allFull && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">
              Need more seats?
            </h3>
            <p className="text-xs text-amber-800/80 mt-0.5">
              You&apos;ve used all {seats.admin.max} admin and {seats.user.max} user
              seats. Email{" "}
              <a
                href="mailto:info@tradeboxlive.com"
                className="font-semibold underline"
              >
                info@tradeboxlive.com
              </a>{" "}
              to request more.
            </p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">
            Existing members
          </h3>
          <p className="text-xs text-gray-400">
            {subs.length} of {seats.admin.max + seats.user.max} total seats used
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : subs.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No team members yet</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Click <span className="font-semibold">Add Member</span> to invite
              your first one.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {subs.map((s) => (
              <SubProfileRow
                key={s._id}
                sub={s}
                onEdit={() => setEditing(s)}
                token={token}
                onChange={refetch}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddSubProfileModal
          token={token}
          seats={seats}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}

      {editing && (
        <EditPermissionsModal
          token={token}
          sub={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function SeatCard({
  label,
  icon,
  used,
  max,
}: {
  label: string;
  icon: React.ReactNode;
  used: number;
  max: number;
}) {
  const pct = (used / max) * 100;
  const isFull = used >= max;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
          {icon}
        </span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {used}
        <span className="text-base font-medium text-gray-400"> / {max}</span>
      </p>
      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isFull ? "bg-rose-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SubProfileRow({
  sub,
  onEdit,
  token,
  onChange,
}: {
  sub: SubProfile;
  onEdit: () => void;
  token?: string;
  onChange: () => void;
}) {
  const role = sub.addedby?.subProfileRole;
  const isAdmin = role === "admin";
  const grantedKeys: PermissionKey[] = PERMISSION_MODULES.map((m) => m.key).filter(
    (k) => sub.addedby?.permissions?.[k] === true,
  ) as PermissionKey[];

  const initials =
    (sub.RegName || sub.name || "?")
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${sub.RegName || sub.name}?`)) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sp/subprofiles/${sub._id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json().catch(() => ({}));
      if (json?.success) onChange();
      else alert(json?.message || "Failed to remove");
    } catch {
      alert("Network error");
    }
  };

  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-indigo-700">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {sub.RegName || sub.name || "Unnamed"}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {sub.email || "—"}
            {sub.number ? ` · ${sub.number}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            isAdmin
              ? "bg-indigo-100 text-indigo-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {role || "—"}
        </span>
        <span className="text-xs text-gray-400 hidden sm:inline">
          {grantedKeys.length}/{PERMISSION_MODULES.length} modules
        </span>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AddSubProfileModal({
  token,
  seats,
  onClose,
  onCreated,
}: {
  token?: string;
  seats: Seats;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [role, setRole] = useState<"admin" | "user">(
    seats.admin.used < seats.admin.max ? "admin" : "user",
  );
  const [perms, setPerms] = useState<Permissions>(emptyPerms());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const adminFull = seats.admin.used >= seats.admin.max;
  const userFull = seats.user.used >= seats.user.max;

  const handleSubmit = async () => {
    setErr(null);
    if (!name.trim() || !email.trim() || !number.trim()) {
      setErr("Name, email, and phone are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sp/subprofiles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            number: number.trim(),
            subProfileRole: role,
            permissions: perms,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setErr(json?.message || "Failed to create sub profile.");
        return;
      }
      onCreated();
    } catch {
      setErr("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Add Team Member" onClose={onClose}>
      <div className="space-y-4">
        <FieldRow label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </FieldRow>
        <FieldRow label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </FieldRow>
        <FieldRow label="Phone">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </FieldRow>

        <FieldRow label="Role">
          <div className="flex gap-2">
            <RoleOption
              label={`Admin (${seats.admin.used}/${seats.admin.max})`}
              hint="View-only · can't create or edit"
              selected={role === "admin"}
              disabled={adminFull}
              onClick={() => setRole("admin")}
            />
            <RoleOption
              label={`User (${seats.user.used}/${seats.user.max})`}
              hint="Can create & edit in ticked modules"
              selected={role === "user"}
              disabled={userFull}
              onClick={() => setRole("user")}
            />
          </div>
        </FieldRow>

        <FieldRow label="Modules">
          <p className="text-xs text-gray-400 mb-2">
            Tick the modules this member can see.
          </p>
          <PermissionGrid value={perms} onChange={setPerms} />
        </FieldRow>

        {err && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors"
          >
            {submitting ? "Adding…" : "Add Member"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function EditPermissionsModal({
  token,
  sub,
  onClose,
  onSaved,
}: {
  token?: string;
  sub: SubProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<"admin" | "user">(
    sub.addedby?.subProfileRole || "user",
  );
  const [perms, setPerms] = useState<Permissions>(() => {
    const base = emptyPerms();
    if (sub.addedby?.permissions) {
      for (const k of Object.keys(base) as PermissionKey[]) {
        if (sub.addedby.permissions[k] === true) base[k] = true;
      }
    }
    return base;
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sp/subprofiles/${sub._id}/permissions`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subProfileRole: role,
            permissions: perms,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setErr(json?.message || "Failed to update.");
        return;
      }
      onSaved();
    } catch {
      setErr("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={`Edit ${sub.RegName || sub.name || "member"}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <FieldRow label="Role">
          <div className="flex gap-2">
            <RoleOption
              label="Admin"
              hint="View-only · can't create or edit"
              selected={role === "admin"}
              onClick={() => setRole("admin")}
            />
            <RoleOption
              label="User"
              hint="Can create & edit in ticked modules"
              selected={role === "user"}
              onClick={() => setRole("user")}
            />
          </div>
        </FieldRow>
        <FieldRow label="Modules">
          <p className="text-xs text-gray-400 mb-2">
            Tick the modules this member can see.
          </p>
          <PermissionGrid value={perms} onChange={setPerms} />
        </FieldRow>
        {err && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function RoleOption({
  label,
  hint,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 text-left rounded-xl border transition-all ${
        selected
          ? "bg-indigo-600 text-white border-indigo-600"
          : disabled
            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
            : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p
        className={`text-[11px] mt-0.5 ${
          selected ? "text-white/80" : "text-gray-400"
        }`}
      >
        {hint}
      </p>
    </button>
  );
}

function PermissionGrid({
  value,
  onChange,
  disabled,
}: {
  value: Permissions;
  onChange: (next: Permissions) => void;
  disabled?: boolean;
}) {
  const toggle = (k: PermissionKey) => {
    if (disabled) return;
    onChange({ ...value, [k]: !value[k] });
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {PERMISSION_MODULES.map((m) => {
        const checked = disabled ? true : value[m.key];
        return (
          <label
            key={m.key}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
              disabled
                ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                : checked
                  ? "bg-indigo-50 border-indigo-200 text-indigo-800 cursor-pointer"
                  : "bg-white border-gray-200 text-gray-700 hover:border-indigo-200 cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(m.key)}
              className="w-4 h-4 accent-indigo-600"
            />
            {m.label}
          </label>
        );
      })}
    </div>
  );
}

// Memoise PERMISSION_KEYS so the grid renders identical lists deterministically.
// Side-effect of having the import included.
void useMemo;
