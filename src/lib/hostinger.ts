const API_BASE = process.env.HOSTINGER_API_BASE || "https://developers.hostinger.com";
const API_TOKEN = process.env.HOSTINGER_API_TOKEN || "";

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }

  return res.json();
}

// ==================== DOMAINS ====================

export const domains = {
  listPortfolio: () => apiRequest("/api/domains/v1/portfolio"),

  getDomain: (domain: string) => apiRequest(`/api/domains/v1/portfolio/${domain}`),

  registerDomain: (data: { domain: string; whois_id: number; payment_method_id: number }) =>
    apiRequest("/api/domains/v1/portfolio", { method: "POST", body: JSON.stringify(data) }),

  setNameservers: (domain: string, ns: { ns1: string; ns2: string; ns3?: string; ns4?: string }) =>
    apiRequest(`/api/domains/v1/portfolio/${domain}/nameservers`, { method: "PUT", body: JSON.stringify(ns) }),

  enableLock: (domain: string) =>
    apiRequest(`/api/domains/v1/portfolio/${domain}/domain-lock`, { method: "PUT" }),

  disableLock: (domain: string) =>
    apiRequest(`/api/domains/v1/portfolio/${domain}/domain-lock`, { method: "DELETE" }),

  enablePrivacy: (domain: string) =>
    apiRequest(`/api/domains/v1/portfolio/${domain}/privacy-protection`, { method: "PUT" }),

  disablePrivacy: (domain: string) =>
    apiRequest(`/api/domains/v1/portfolio/${domain}/privacy-protection`, { method: "DELETE" }),

  checkAvailability: (data: { domain: string; tlds: string[] }) =>
    apiRequest("/api/domains/v1/availability", { method: "POST", body: JSON.stringify(data) }),

  // Forwarding
  createForwarding: (data: { domain: string; url: string }) =>
    apiRequest("/api/domains/v1/forwarding", { method: "POST", body: JSON.stringify(data) }),

  getForwarding: (domain: string) => apiRequest(`/api/domains/v1/forwarding/${domain}`),

  deleteForwarding: (domain: string) =>
    apiRequest(`/api/domains/v1/forwarding/${domain}`, { method: "DELETE" }),

  // WHOIS
  listWhois: () => apiRequest("/api/domains/v1/whois"),

  getWhois: (id: number) => apiRequest(`/api/domains/v1/whois/${id}`),

  createWhois: (data: Record<string, unknown>) =>
    apiRequest("/api/domains/v1/whois", { method: "POST", body: JSON.stringify(data) }),

  deleteWhois: (id: number) =>
    apiRequest(`/api/domains/v1/whois/${id}`, { method: "DELETE" }),

  getWhoisUsage: (id: number) => apiRequest(`/api/domains/v1/whois/${id}/usage`),
};

// ==================== DNS ====================

export const dns = {
  getZone: (domain: string) => apiRequest(`/api/dns/v1/zones/${domain}`),

  updateZone: (domain: string, records: Record<string, unknown>[]) =>
    apiRequest(`/api/dns/v1/zones/${domain}`, { method: "PUT", body: JSON.stringify({ records }) }),

  deleteRecords: (domain: string, records: Record<string, unknown>[]) =>
    apiRequest(`/api/dns/v1/zones/${domain}`, { method: "DELETE", body: JSON.stringify({ records }) }),

  resetZone: (domain: string) =>
    apiRequest(`/api/dns/v1/zones/${domain}/reset`, { method: "POST" }),

  validateRecords: (domain: string, records: Record<string, unknown>[]) =>
    apiRequest(`/api/dns/v1/zones/${domain}/validate`, { method: "POST", body: JSON.stringify({ records }) }),

  listSnapshots: (domain: string) => apiRequest(`/api/dns/v1/snapshots/${domain}`),

  getSnapshot: (domain: string, snapshotId: string) =>
    apiRequest(`/api/dns/v1/snapshots/${domain}/${snapshotId}`),

  restoreSnapshot: (domain: string, snapshotId: string) =>
    apiRequest(`/api/dns/v1/snapshots/${domain}/${snapshotId}/restore`, { method: "POST" }),
};

// ==================== VPS ====================

export const vps = {
  listVMs: () => apiRequest("/api/vps/v1/virtual-machines"),

  getVM: (id: number) => apiRequest(`/api/vps/v1/virtual-machines/${id}`),

  createVM: (data: Record<string, unknown>) =>
    apiRequest("/api/vps/v1/virtual-machines", { method: "POST", body: JSON.stringify(data) }),

  updateVM: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  startVM: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/start`, { method: "POST" }),

  stopVM: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/stop`, { method: "POST" }),

  rebootVM: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/reboot`, { method: "POST" }),

  getMetrics: (id: number, dateFrom: string, dateTo: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/metrics?date_from=${dateFrom}&date_to=${dateTo}`),

  getActions: (id: number) => apiRequest(`/api/vps/v1/virtual-machines/${id}/actions`),

  // Backups
  listBackups: (id: number) => apiRequest(`/api/vps/v1/virtual-machines/${id}/backups`),

  createBackup: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/backups`, { method: "POST" }),

  deleteBackup: (vmId: number, backupId: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/backups/${backupId}`, { method: "DELETE" }),

  restoreBackup: (vmId: number, backupId: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/backups/${backupId}/restore`, { method: "POST" }),

  // Firewall (per-VM legacy)
  listFirewallRules: (id: number) => apiRequest(`/api/vps/v1/virtual-machines/${id}/firewall/rules`),

  createFirewallRule: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/firewall/rules`, { method: "POST", body: JSON.stringify(data) }),

  deleteFirewallRule: (vmId: number, ruleId: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/firewall/rules/${ruleId}`, { method: "DELETE" }),

  // Firewall (standalone)
  listFirewalls: () => apiRequest("/api/vps/v1/firewall"),

  createFirewall: (data: Record<string, unknown>) =>
    apiRequest("/api/vps/v1/firewall", { method: "POST", body: JSON.stringify(data) }),

  getFirewall: (firewallId: number) => apiRequest(`/api/vps/v1/firewall/${firewallId}`),

  deleteFirewall: (firewallId: number) =>
    apiRequest(`/api/vps/v1/firewall/${firewallId}`, { method: "DELETE" }),

  activateFirewall: (firewallId: number, virtualMachineId: number) =>
    apiRequest(`/api/vps/v1/firewall/${firewallId}/activate/${virtualMachineId}`, { method: "POST" }),

  deactivateFirewall: (firewallId: number, virtualMachineId: number) =>
    apiRequest(`/api/vps/v1/firewall/${firewallId}/deactivate/${virtualMachineId}`, { method: "POST" }),

  createFirewallRuleStandalone: (firewallId: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/firewall/${firewallId}/rules`, { method: "POST", body: JSON.stringify(data) }),

  updateFirewallRule: (firewallId: number, ruleId: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/firewall/${firewallId}/rules/${ruleId}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteFirewallRuleStandalone: (firewallId: number, ruleId: number) =>
    apiRequest(`/api/vps/v1/firewall/${firewallId}/rules/${ruleId}`, { method: "DELETE" }),

  syncFirewall: (firewallId: number, virtualMachineId: number) =>
    apiRequest(`/api/vps/v1/firewall/${firewallId}/sync/${virtualMachineId}`, { method: "POST" }),

  // SSH Keys
  listSSHKeys: () => apiRequest("/api/vps/v1/public-keys"),

  createSSHKey: (data: { name: string; key: string }) =>
    apiRequest("/api/vps/v1/public-keys", { method: "POST", body: JSON.stringify(data) }),

  deleteSSHKey: (id: number) =>
    apiRequest(`/api/vps/v1/public-keys/${id}`, { method: "DELETE" }),

  // Public Keys (attach to VM)
  attachPublicKey: (virtualMachineId: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/public-keys/attach/${virtualMachineId}`, { method: "POST", body: JSON.stringify(data) }),

  listAttachedPublicKeys: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/public-keys`),

  // Recovery (legacy)
  enableRecovery: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/recovery-mode/enable`, { method: "POST" }),

  disableRecovery: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/recovery-mode/disable`, { method: "POST" }),

  // Recovery
  startRecovery: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/recovery`, { method: "POST" }),

  stopRecovery: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/recovery`, { method: "DELETE" }),

  // PTR (legacy)
  getPTR: (id: number) => apiRequest(`/api/vps/v1/virtual-machines/${id}/ptr`),

  updatePTR: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/ptr`, { method: "PUT", body: JSON.stringify(data) }),

  // PTR Records
  createPTR: (id: number, ipAddressId: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/ptr/${ipAddressId}`, { method: "POST", body: JSON.stringify(data) }),

  deletePTR: (id: number, ipAddressId: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/ptr/${ipAddressId}`, { method: "DELETE" }),

  // OS Templates
  listTemplates: () => apiRequest("/api/vps/v1/os-templates"),

  getTemplate: (templateId: number) => apiRequest(`/api/vps/v1/templates/${templateId}`),

  // Data Centers
  listDataCenters: () => apiRequest("/api/vps/v1/data-centers"),

  // Docker
  listDockerProjects: (id: number) => apiRequest(`/api/vps/v1/virtual-machines/${id}/docker`),

  createDockerProject: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/docker`, { method: "POST", body: JSON.stringify(data) }),

  getDockerProject: (vmId: number, projectName: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}`),

  getDockerContainers: (vmId: number, projectName: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/containers`),

  getDockerLogs: (vmId: number, projectName: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/logs`),

  deleteDockerProject: (vmId: number, projectName: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/down`, { method: "DELETE" }),

  restartDockerProject: (vmId: number, projectName: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/restart`, { method: "POST" }),

  startDockerProject: (vmId: number, projectName: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/start`, { method: "POST" }),

  stopDockerProject: (vmId: number, projectName: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/stop`, { method: "POST" }),

  updateDockerProject: (vmId: number, projectName: string) =>
    apiRequest(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/update`, { method: "POST" }),

  // VM Operations
  setHostname: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/hostname`, { method: "PUT", body: JSON.stringify(data) }),

  resetHostname: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/hostname`, { method: "DELETE" }),

  setRootPassword: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/root-password`, { method: "PUT", body: JSON.stringify(data) }),

  setPanelPassword: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/panel-password`, { method: "PUT", body: JSON.stringify(data) }),

  setNameservers: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/nameservers`, { method: "PUT", body: JSON.stringify(data) }),

  recreateVM: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/recreate`, { method: "POST", body: JSON.stringify(data) }),

  setupVM: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/setup`, { method: "POST", body: JSON.stringify(data) }),

  // Snapshots
  getSnapshot: (id: number) => apiRequest(`/api/vps/v1/virtual-machines/${id}/snapshot`),

  createSnapshot: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/snapshot`, { method: "POST" }),

  deleteSnapshot: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/snapshot`, { method: "DELETE" }),

  restoreSnapshot: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/snapshot/restore`, { method: "POST" }),

  // Monarx (malware scanner)
  getMonarx: (id: number) => apiRequest(`/api/vps/v1/virtual-machines/${id}/monarx`),

  installMonarx: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/monarx`, { method: "POST" }),

  uninstallMonarx: (id: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/monarx`, { method: "DELETE" }),

  // Actions
  getAction: (id: number, actionId: number) =>
    apiRequest(`/api/vps/v1/virtual-machines/${id}/actions/${actionId}`),

  // Post-install Scripts
  listPostInstallScripts: () => apiRequest("/api/vps/v1/post-install-scripts"),

  createPostInstallScript: (data: Record<string, unknown>) =>
    apiRequest("/api/vps/v1/post-install-scripts", { method: "POST", body: JSON.stringify(data) }),

  getPostInstallScript: (id: number) => apiRequest(`/api/vps/v1/post-install-scripts/${id}`),

  updatePostInstallScript: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/vps/v1/post-install-scripts/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deletePostInstallScript: (id: number) =>
    apiRequest(`/api/vps/v1/post-install-scripts/${id}`, { method: "DELETE" }),
};

// ==================== BILLING ====================

export const billing = {
  getCatalog: () => apiRequest("/api/billing/v1/catalog"),

  listSubscriptions: () => apiRequest("/api/billing/v1/subscriptions"),

  disableAutoRenewal: (subscriptionId: string) =>
    apiRequest(`/api/billing/v1/subscriptions/${subscriptionId}/auto-renewal/disable`, { method: "DELETE" }),

  enableAutoRenewal: (subscriptionId: string) =>
    apiRequest(`/api/billing/v1/subscriptions/${subscriptionId}/auto-renewal/enable`, { method: "PATCH" }),

  listPaymentMethods: () => apiRequest("/api/billing/v1/payment-methods"),

  setDefaultPayment: (paymentMethodId: number) =>
    apiRequest(`/api/billing/v1/payment-methods/${paymentMethodId}`, { method: "POST" }),

  deletePaymentMethod: (paymentMethodId: number) =>
    apiRequest(`/api/billing/v1/payment-methods/${paymentMethodId}`, { method: "DELETE" }),

  createOrder: (data: Record<string, unknown>) =>
    apiRequest("/api/billing/v1/orders", { method: "POST", body: JSON.stringify(data) }),
};

// ==================== EMAIL MARKETING (REACH) ====================

export const reach = {
  listProfiles: () => apiRequest("/api/reach/v1/profiles"),

  listContacts: (params?: { group?: string; subscription_status?: string }) => {
    const query = new URLSearchParams();
    if (params?.group) query.set("group", params.group);
    if (params?.subscription_status) query.set("subscription_status", params.subscription_status);
    return apiRequest(`/api/reach/v1/contacts?${query}`);
  },

  createContact: (profileUuid: string, data: Record<string, unknown>) =>
    apiRequest(`/api/reach/v1/profiles/${profileUuid}/contacts`, { method: "POST", body: JSON.stringify(data) }),

  deleteContact: (uuid: string) =>
    apiRequest(`/api/reach/v1/contacts/${uuid}`, { method: "DELETE" }),

  listSegments: () => apiRequest("/api/reach/v1/segmentation/segments"),

  createSegment: (data: Record<string, unknown>) =>
    apiRequest("/api/reach/v1/segmentation/segments", { method: "POST", body: JSON.stringify(data) }),

  getSegment: (uuid: string) => apiRequest(`/api/reach/v1/segmentation/segments/${uuid}`),

  getSegmentContacts: (uuid: string) =>
    apiRequest(`/api/reach/v1/segmentation/segments/${uuid}/contacts`),
};
