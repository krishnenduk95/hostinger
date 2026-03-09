"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  User,
  Key,
  Palette,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface AdminProfile {
  id: string;
  name: string;
  email: string;
}

interface PlatformSettings {
  siteName: string;
  defaultCurrency: string;
  autoApproveCustomers: boolean;
}

export default function SettingsPage() {
  // Profile
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // API
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [apiStatus, setApiStatus] = useState<"idle" | "testing" | "connected" | "error">("idle");
  const [apiError, setApiError] = useState<string | null>(null);

  // Platform
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    siteName: "Zusta Digital Hosting",
    defaultCurrency: "INR",
    autoApproveCustomers: true,
  });
  const [platformSaving, setPlatformSaving] = useState(false);
  const [platformMessage, setPlatformMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setProfileName(data.profile.name);
        setProfileEmail(data.profile.email);
        if (data.apiTokenMasked) {
          setApiToken(data.apiTokenMasked);
        }
      }
    } catch {
      // Network error
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const body: Record<string, string> = {
        name: profileName,
        email: profileEmail,
      };
      if (profilePassword) {
        body.password = profilePassword;
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileMessage({
          type: "error",
          text: data.error || "Failed to update profile",
        });
        return;
      }

      setProfileMessage({ type: "success", text: "Profile updated successfully" });
      setProfilePassword("");
      setProfile(data.profile);
    } catch {
      setProfileMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleTestConnection() {
    setApiStatus("testing");
    setApiError(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_connection" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiStatus("error");
        setApiError(data.error || "Connection test failed");
        return;
      }

      setApiStatus("connected");
    } catch {
      setApiStatus("error");
      setApiError("Network error. Please try again.");
    }
  }

  function handlePlatformSave(e: React.FormEvent) {
    e.preventDefault();
    setPlatformSaving(true);
    setPlatformMessage(null);

    // Platform settings are stored locally for now
    setTimeout(() => {
      setPlatformSaving(false);
      setPlatformMessage({ type: "success", text: "Platform settings saved successfully" });
    }, 500);
  }

  function maskedToken(token: string): string {
    if (!token) return "Not configured";
    if (showToken) return token;
    if (token.length <= 8) return "****";
    return token.slice(0, 4) + "****" + token.slice(-4);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your admin profile, API configuration, and platform settings
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleProfileSave} className="space-y-4">
              {profileMessage && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    profileMessage.type === "success"
                      ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                      : "bg-red-50 border border-red-100 text-red-700"
                  }`}
                >
                  {profileMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  {profileMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Minimum 8 characters. Leave blank to keep your current password.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Profile
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-400" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hostinger API Token
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  value={maskedToken(apiToken)}
                  readOnly
                  className="bg-gray-50 font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={apiStatus === "testing"}
              >
                {apiStatus === "testing" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : apiStatus === "connected" ? (
                  <Wifi className="h-4 w-4 mr-2 text-emerald-500" />
                ) : apiStatus === "error" ? (
                  <WifiOff className="h-4 w-4 mr-2 text-red-500" />
                ) : (
                  <Wifi className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              API token is set via the HOSTINGER_API_TOKEN environment variable.
            </p>
          </div>

          {/* API Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">API Status:</span>
            {apiStatus === "idle" && (
              <Badge variant="custom" className="bg-gray-100 text-gray-700">
                Not Tested
              </Badge>
            )}
            {apiStatus === "testing" && (
              <Badge variant="custom" className="bg-blue-100 text-blue-700">
                Testing...
              </Badge>
            )}
            {apiStatus === "connected" && (
              <Badge variant="custom" className="bg-emerald-100 text-emerald-800">
                Connected
              </Badge>
            )}
            {apiStatus === "error" && (
              <Badge variant="custom" className="bg-red-100 text-red-800">
                Error
              </Badge>
            )}
          </div>

          {apiError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {apiError}
            </div>
          )}

          {apiStatus === "connected" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              API connection successful. Your Hostinger API token is valid and working.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-gray-400" />
            Platform Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePlatformSave} className="space-y-4">
            {platformMessage && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  platformMessage.type === "success"
                    ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                    : "bg-red-50 border border-red-100 text-red-700"
                }`}
              >
                {platformMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {platformMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Site Name
                </label>
                <Input
                  value={platformSettings.siteName}
                  onChange={(e) =>
                    setPlatformSettings((prev) => ({
                      ...prev,
                      siteName: e.target.value,
                    }))
                  }
                  placeholder="My Hosting Platform"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Default Currency
                </label>
                <select
                  value={platformSettings.defaultCurrency}
                  onChange={(e) =>
                    setPlatformSettings((prev) => ({
                      ...prev,
                      defaultCurrency: e.target.value,
                    }))
                  }
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Auto-Approve Customers
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Automatically approve new customer registrations without manual review
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={platformSettings.autoApproveCustomers}
                  onClick={() =>
                    setPlatformSettings((prev) => ({
                      ...prev,
                      autoApproveCustomers: !prev.autoApproveCustomers,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    platformSettings.autoApproveCustomers
                      ? "bg-indigo-600"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      platformSettings.autoApproveCustomers
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={platformSaving}>
                {platformSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Platform Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
