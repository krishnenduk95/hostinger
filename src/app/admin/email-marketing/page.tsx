"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Users,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Send,
  Tag,
  Globe,
  Image,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatDate } from "@/lib/utils";

interface Profile {
  uuid: string;
  brand_name: string;
  domain: string;
  logo_url?: string;
  subscriber_limit?: number;
  email_limit?: number;
  created_at?: string;
}

interface Contact {
  uuid: string;
  email: string;
  first_name?: string;
  last_name?: string;
  subscription_status?: string;
  created_at?: string;
}

interface Segment {
  uuid: string;
  name: string;
  description?: string;
  contacts_count?: number;
  created_at?: string;
}

interface EmailMarketingData {
  profiles: Profile[];
  contacts: Contact[];
  segments: Segment[];
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
          <div className="h-6 bg-gray-200 rounded animate-pulse w-2/3" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(5)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[120px]" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function EmailMarketingPage() {
  const [data, setData] = useState<EmailMarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add contact
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Delete contact
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create segment
  const [createSegmentOpen, setCreateSegmentOpen] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/email-marketing");
      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "Failed to fetch email marketing data");
        return;
      }
      const result = await res.json();
      setData(result);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setAddingContact(true);
    setContactError(null);

    try {
      const res = await fetch("/api/admin/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_contact",
          email: contactEmail,
          first_name: contactFirstName,
          last_name: contactLastName,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setContactError(result.error || "Failed to add contact");
        return;
      }

      setAddContactOpen(false);
      setContactEmail("");
      setContactFirstName("");
      setContactLastName("");
      fetchData();
    } catch {
      setContactError("Network error. Please try again.");
    } finally {
      setAddingContact(false);
    }
  }

  async function handleDeleteContact(uuid: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_contact",
          contact_uuid: uuid,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch {
      // Network error
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  }

  async function handleCreateSegment(e: React.FormEvent) {
    e.preventDefault();
    setCreatingSegment(true);
    setSegmentError(null);

    try {
      const res = await fetch("/api/admin/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_segment",
          name: segmentName,
          description: segmentDescription,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setSegmentError(result.error || "Failed to create segment");
        return;
      }

      setCreateSegmentOpen(false);
      setSegmentName("");
      setSegmentDescription("");
      fetchData();
    } catch {
      setSegmentError("Network error. Please try again.");
    } finally {
      setCreatingSegment(false);
    }
  }

  const profile = data?.profiles?.[0] || null;
  const contacts = data?.contacts || [];
  const segments = data?.segments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your Hostinger Reach email marketing profiles, contacts, and segments
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button
            className="ml-auto text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Contacts</p>
                  <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Send className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Limit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile?.email_limit?.toLocaleString() ?? "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subscriber Limit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile?.subscriber_limit?.toLocaleString() ?? "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Card */}
      {!loading && profile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.brand_name}
                  className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                  <Image className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand Name
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {profile.brand_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900">
                      {profile.domain}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscriber Limit
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {profile.subscriber_limit?.toLocaleString() ?? "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Limit
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {profile.email_limit?.toLocaleString() ?? "Unlimited"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              Contacts
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="custom" className="bg-gray-100 text-gray-700">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              </Badge>
              <Button size="sm" onClick={() => setAddContactOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Contact
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        No contacts yet
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Add your first contact to start building your mailing list
                      </p>
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => setAddContactOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.uuid}>
                    <TableCell>
                      <span className="font-medium text-gray-900">
                        {contact.email}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {contact.first_name || <span className="text-gray-300">--</span>}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {contact.last_name || <span className="text-gray-300">--</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="custom"
                        className={
                          contact.subscription_status === "subscribed"
                            ? "bg-emerald-100 text-emerald-800"
                            : contact.subscription_status === "unsubscribed"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }
                      >
                        {contact.subscription_status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {contact.created_at ? formatDate(contact.created_at) : "--"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Contact"
                          onClick={() => setDeleteConfirm(contact.uuid)}
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

      {/* Segments Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400" />
              Segments
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="custom" className="bg-gray-100 text-gray-700">
                {segments.length} segment{segments.length !== 1 ? "s" : ""}
              </Badge>
              <Button size="sm" onClick={() => setCreateSegmentOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Segment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(4)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[120px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : segments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="text-center py-12">
                      <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        No segments yet
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Create segments to organize your contacts
                      </p>
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => setCreateSegmentOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Segment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                segments.map((segment) => (
                  <TableRow key={segment.uuid}>
                    <TableCell>
                      <span className="font-medium text-gray-900">
                        {segment.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {segment.description || <span className="text-gray-300">--</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="custom" className="bg-indigo-100 text-indigo-800">
                        {segment.contacts_count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {segment.created_at ? formatDate(segment.created_at) : "--"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Contact Modal */}
      <Modal
        open={addContactOpen}
        onClose={() => {
          setAddContactOpen(false);
          setContactEmail("");
          setContactFirstName("");
          setContactLastName("");
          setContactError(null);
        }}
        title="Add Contact"
        description="Add a new contact to your mailing list"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          {contactError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {contactError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                First Name
              </label>
              <Input
                placeholder="John"
                value={contactFirstName}
                onChange={(e) => setContactFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Last Name
              </label>
              <Input
                placeholder="Doe"
                value={contactLastName}
                onChange={(e) => setContactLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddContactOpen(false);
                setContactError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addingContact}>
              {addingContact && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Contact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Contact Confirmation Modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Contact"
        description="This action cannot be undone."
        className="max-w-sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete this contact? They will be permanently
          removed from your mailing list.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={() => deleteConfirm && handleDeleteContact(deleteConfirm)}
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </div>
      </Modal>

      {/* Create Segment Modal */}
      <Modal
        open={createSegmentOpen}
        onClose={() => {
          setCreateSegmentOpen(false);
          setSegmentName("");
          setSegmentDescription("");
          setSegmentError(null);
        }}
        title="Create Segment"
        description="Create a new segment to organize your contacts"
      >
        <form onSubmit={handleCreateSegment} className="space-y-4">
          {segmentError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {segmentError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Segment Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Newsletter Subscribers"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <Input
              placeholder="Optional description for this segment"
              value={segmentDescription}
              onChange={(e) => setSegmentDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateSegmentOpen(false);
                setSegmentError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creatingSegment}>
              {creatingSegment && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Segment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
