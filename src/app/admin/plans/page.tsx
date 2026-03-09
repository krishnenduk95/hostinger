"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  Edit3,
  Check,
  X,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Server,
  Globe,
  HardDrive,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, statusColor } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  price: number;
  features: Record<string, string | number | boolean>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { invoices: number };
}

interface PlanStats {
  total: number;
  active: number;
  inactive: number;
  byType: {
    shared: number;
    vps: number;
    domain: number;
  };
}

interface FeaturePair {
  key: string;
  value: string;
}

// ── Helpers ────────────────────────────────────────────────

function typeIcon(type: string) {
  switch (type) {
    case "shared":
      return Globe;
    case "vps":
      return Server;
    case "domain":
      return HardDrive;
    default:
      return Package;
  }
}

function typeColor(type: string) {
  switch (type) {
    case "shared":
      return "text-blue-600 bg-blue-50";
    case "vps":
      return "text-purple-600 bg-purple-50";
    case "domain":
      return "text-amber-600 bg-amber-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

function typeBadgeColor(type: string) {
  switch (type) {
    case "shared":
      return "bg-blue-100 text-blue-800";
    case "vps":
      return "bg-purple-100 text-purple-800";
    case "domain":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// ── Main component ─────────────────────────────────────────

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Plan[]>>({
    shared: [],
    vps: [],
    domain: [],
  });
  const [stats, setStats] = useState<PlanStats>({
    total: 0,
    active: 0,
    inactive: 0,
    byType: { shared: 0, vps: 0, domain: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formType, setFormType] = useState("shared");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFeatures, setFormFeatures] = useState<FeaturePair[]>([
    { key: "", value: "" },
  ]);
  const [formSortOrder, setFormSortOrder] = useState("0");

  // Inline editing
  const [inlineEdit, setInlineEdit] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState("");
  const [inlinePrice, setInlinePrice] = useState("");

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setGrouped(
          data.grouped || { shared: [], vps: [], domain: [] }
        );
        setStats(
          data.stats || {
            total: 0,
            active: 0,
            inactive: 0,
            byType: { shared: 0, vps: 0, domain: 0 },
          }
        );
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function resetForm() {
    setFormName("");
    setFormSlug("");
    setFormType("shared");
    setFormPrice("");
    setFormDescription("");
    setFormFeatures([{ key: "", value: "" }]);
    setFormSortOrder("0");
    setEditingPlan(null);
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormSlug(plan.slug);
    setFormType(plan.type);
    setFormPrice(String(plan.price));
    setFormDescription(plan.description || "");
    setFormSortOrder(String(plan.sortOrder));

    const features = plan.features || {};
    const featurePairs = Object.entries(features).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    setFormFeatures(
      featurePairs.length > 0 ? featurePairs : [{ key: "", value: "" }]
    );

    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Build features object from pairs
    const features: Record<string, string> = {};
    formFeatures.forEach((pair) => {
      if (pair.key.trim()) {
        features[pair.key.trim()] = pair.value.trim();
      }
    });

    try {
      const payload = {
        name: formName,
        slug: formSlug,
        type: formType,
        price: Number(formPrice),
        description: formDescription || undefined,
        features,
        sortOrder: Number(formSortOrder),
        ...(editingPlan ? { id: editingPlan.id } : {}),
      };

      const res = await fetch("/api/admin/plans", {
        method: editingPlan ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save plan");
        return;
      }

      setModalOpen(false);
      resetForm();
      fetchPlans();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(plan: Plan) {
    setActionLoading(`toggle-${plan.id}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to toggle plan status");
      } else {
        fetchPlans();
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeactivate(planId: string) {
    setActionLoading(`deactivate-${planId}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/plans?id=${planId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to deactivate plan");
      } else {
        fetchPlans();
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleInlineSave(plan: Plan) {
    setActionLoading(`inline-${plan.id}`);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          name: inlineName || plan.name,
          price: Number(inlinePrice) || plan.price,
        }),
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch {
      // Network error
    } finally {
      setActionLoading(null);
      setInlineEdit(null);
    }
  }

  function addFeaturePair() {
    setFormFeatures([...formFeatures, { key: "", value: "" }]);
  }

  function removeFeaturePair(index: number) {
    setFormFeatures(formFeatures.filter((_, i) => i !== index));
  }

  function updateFeaturePair(index: number, field: "key" | "value", val: string) {
    const updated = [...formFeatures];
    updated[index][field] = val;
    setFormFeatures(updated);
  }

  // Auto-generate slug from name
  function handleNameChange(name: string) {
    setFormName(name);
    if (!editingPlan) {
      setFormSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  }

  const typeGroups = [
    { key: "shared", label: "Shared Hosting", icon: Globe },
    { key: "vps", label: "VPS Hosting", icon: Server },
    { key: "domain", label: "Domain Plans", icon: HardDrive },
  ];

  const statCards = [
    {
      label: "Total Plans",
      value: stats.total,
      icon: Package,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Active",
      value: stats.active,
      icon: Check,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Inactive",
      value: stats.inactive,
      icon: X,
      color: "text-gray-600 bg-gray-50",
    },
  ];

  // ── Render plan card ─────────────────────────────────────

  function renderPlanCard(plan: Plan) {
    const Icon = typeIcon(plan.type);
    const features = plan.features || {};
    const featureEntries = Object.entries(features);
    const isEditing = inlineEdit === plan.id;
    const isToggling = actionLoading === `toggle-${plan.id}`;
    const isDeactivating = actionLoading === `deactivate-${plan.id}`;
    const isInlineSaving = actionLoading === `inline-${plan.id}`;

    return (
      <Card
        key={plan.id}
        className={`relative transition-all ${
          !plan.isActive ? "opacity-60" : ""
        }`}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${typeColor(plan.type)}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                {isEditing ? (
                  <Input
                    value={inlineName}
                    onChange={(e) => setInlineName(e.target.value)}
                    className="h-7 text-sm font-semibold px-2 w-40"
                    autoFocus
                  />
                ) : (
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                )}
                <p className="text-xs text-gray-400 font-mono">{plan.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="custom"
                className={
                  plan.isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {plan.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="custom" className={typeBadgeColor(plan.type)}>
                {plan.type}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {plan.description && (
            <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
          )}

          {/* Price */}
          <div className="mb-4">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">INR</span>
                <Input
                  type="number"
                  step="0.01"
                  value={inlinePrice}
                  onChange={(e) => setInlinePrice(e.target.value)}
                  className="h-7 text-sm w-24 px-2"
                />
                <span className="text-sm text-gray-500">/mo</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
            )}
          </div>

          {/* Features */}
          {featureEntries.length > 0 && (
            <div className="space-y-1.5 mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Features
              </p>
              <ul className="space-y-1">
                {featureEntries.map(([key, value]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="font-medium text-gray-900">
                      {typeof value === "boolean"
                        ? value
                          ? "Yes"
                          : "No"
                        : String(value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Invoice count */}
          {plan._count && plan._count.invoices > 0 && (
            <p className="text-xs text-gray-400 mb-3">
              {plan._count.invoices} invoice{plan._count.invoices !== 1 ? "s" : ""} linked
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={() => handleInlineSave(plan)}
                  disabled={isInlineSaving}
                >
                  {isInlineSaving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInlineEdit(null)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setInlineEdit(plan.id);
                    setInlineName(plan.name);
                    setInlinePrice(String(plan.price));
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1" />
                  Quick Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(plan)}
                >
                  <GripVertical className="h-3.5 w-3.5 mr-1" />
                  Full Edit
                </Button>
                <button
                  onClick={() => handleToggleActive(plan)}
                  disabled={isToggling}
                  className="ml-auto flex items-center gap-1 text-sm"
                  title={plan.isActive ? "Deactivate" : "Activate"}
                >
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : plan.isActive ? (
                    <ToggleRight className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {!plan.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeactivate(plan.id)}
                    disabled={isDeactivating}
                    title="Permanently deactivate"
                  >
                    {isDeactivating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Main render ──────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Plans & Pricing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage hosting plans and pricing tiers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPlans} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? (
                      <span className="inline-block h-7 w-12 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search plans by name, slug, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Plans grouped by type */}
      {loading ? (
        <div className="space-y-8">
          {typeGroups.map((group) => (
            <div key={group.key}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <group.icon className="h-5 w-5 text-gray-400" />
                {group.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <div className="animate-pulse space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                          <div className="space-y-1">
                            <div className="h-4 bg-gray-200 rounded w-32" />
                            <div className="h-3 bg-gray-200 rounded w-20" />
                          </div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-24" />
                        <div className="space-y-1">
                          <div className="h-3 bg-gray-200 rounded" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {typeGroups.map((group) => {
            const typePlans = (grouped[group.key] || []).filter(
              (plan) =>
                !search ||
                plan.name.toLowerCase().includes(search.toLowerCase()) ||
                plan.slug.toLowerCase().includes(search.toLowerCase()) ||
                plan.type.toLowerCase().includes(search.toLowerCase())
            );

            if (typePlans.length === 0 && search) return null;

            return (
              <div key={group.key}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <group.icon className="h-5 w-5 text-gray-400" />
                  {group.label}
                  <Badge variant="default" className="ml-2 text-xs">
                    {typePlans.length}
                  </Badge>
                </h2>

                {typePlans.length === 0 ? (
                  <Card>
                    <CardContent className="p-8">
                      <div className="text-center">
                        <group.icon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-900">
                          No {group.label.toLowerCase()} yet
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Create your first {group.key} plan
                        </p>
                        <Button
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            resetForm();
                            setFormType(group.key);
                            setModalOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {typePlans.map((plan) => renderPlanCard(plan))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
          setError(null);
        }}
        title={editingPlan ? "Edit Plan" : "Create Plan"}
        description={
          editingPlan
            ? "Update the plan details below"
            : "Set up a new hosting plan"
        }
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Starter Plan"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Slug <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="starter-plan"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                required
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                required
              >
                <option value="shared">Shared Hosting</option>
                <option value="vps">VPS Hosting</option>
                <option value="domain">Domain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Price (INR/month) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="99.00"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <Input
              placeholder="Brief plan description..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Sort Order
            </label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Lower numbers appear first
            </p>
          </div>

          {/* Features (dynamic key-value) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Features
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeaturePair}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Feature
              </Button>
            </div>

            <div className="space-y-2">
              {formFeatures.map((pair, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Key (e.g. storage)"
                    value={pair.key}
                    onChange={(e) =>
                      updateFeaturePair(index, "key", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value (e.g. 10GB)"
                    value={pair.value}
                    onChange={(e) =>
                      updateFeaturePair(index, "value", e.target.value)
                    }
                    className="flex-1"
                  />
                  {formFeatures.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFeaturePair(index)}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Define plan features as key-value pairs (e.g., websites: 1, storage: 10GB)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                resetForm();
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
