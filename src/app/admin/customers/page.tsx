"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Globe,
  Link2,
  Server,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatDate, statusColor } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  _count: {
    websites: number;
    domains: number;
    vps: number;
  };
}

interface FormData {
  name: string;
  email: string;
  password: string;
  company: string;
  phone: string;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  password: "",
  company: "",
  phone: "",
};

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(9)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[120px]" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create customer");
        return;
      }

      setModalOpen(false);
      setFormData(initialFormData);
      fetchCustomers();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(customerId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      }
    } catch {
      // Network error
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  }

  function updateForm(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your customer accounts
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">
                  <Globe className="h-3.5 w-3.5 inline mr-1" />
                  Sites
                </TableHead>
                <TableHead className="text-center">
                  <Link2 className="h-3.5 w-3.5 inline mr-1" />
                  Domains
                </TableHead>
                <TableHead className="text-center">
                  <Server className="h-3.5 w-3.5 inline mr-1" />
                  VPS
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        {debouncedSearch
                          ? "No customers found"
                          : "No customers yet"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {debouncedSearch
                          ? "Try adjusting your search terms"
                          : "Add your first customer to get started"}
                      </p>
                      {!debouncedSearch && (
                        <Button
                          size="sm"
                          className="mt-4"
                          onClick={() => setModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Customer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-indigo-700">
                            {customer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {customer.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {customer.email}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {customer.company || (
                        <span className="text-gray-300">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      {customer._count.websites}
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      {customer._count.domains}
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      {customer._count.vps}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="custom"
                        className={statusColor(customer.status || "active")}
                      >
                        {customer.status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {formatDate(customer.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <a href={`/admin/customers/${customer.id}`}>
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                        </a>
                        <a href={`/admin/customers/${customer.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setDeleteConfirm(customer.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Customer Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setFormData(initialFormData);
          setError(null);
        }}
        title="Add Customer"
        description="Create a new customer account"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => updateForm("name", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => updateForm("email", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) => updateForm("password", e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Company
              </label>
              <Input
                placeholder="Acme Inc."
                value={formData.company}
                onChange={(e) => updateForm("company", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone
              </label>
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setFormData(initialFormData);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Customer"
        description="This action cannot be undone."
        className="max-w-sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete this customer? All associated data
          including websites, domains, and VPS servers will be permanently
          removed.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
