import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vps } from "@/lib/hostinger";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const vmId = searchParams.get("vm_id");
    const action = searchParams.get("action");

    // ── Specific action endpoints ────────────────────────────

    // Fetch metrics for a VM with date range
    if (action === "metrics" && vmId) {
      const id = Number(vmId);
      const dateFrom =
        searchParams.get("date_from") ||
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const dateTo =
        searchParams.get("date_to") || new Date().toISOString();
      const metrics = await vps
        .getMetrics(id, dateFrom, dateTo)
        .catch(() => null);
      return NextResponse.json({ metrics });
    }

    // Fetch action history for a VM
    if (action === "actions" && vmId) {
      const id = Number(vmId);
      const actions = await vps.getActions(id).catch(() => ({ data: [] }));
      return NextResponse.json({
        actions: actions?.data || actions || [],
      });
    }

    // Fetch OS templates
    if (action === "templates") {
      const templates = await vps.listTemplates().catch(() => []);
      return NextResponse.json({ templates: Array.isArray(templates) ? templates : [] });
    }

    // Fetch data centers
    if (action === "datacenters") {
      const datacenters = await vps.listDataCenters().catch(() => []);
      return NextResponse.json({ datacenters: Array.isArray(datacenters) ? datacenters : [] });
    }

    // List all firewalls
    if (action === "firewalls") {
      const firewalls = await vps.listFirewalls().catch(() => []);
      return NextResponse.json({ firewalls: Array.isArray(firewalls) ? firewalls : [] });
    }

    // Get firewall detail
    if (action === "firewall_detail") {
      const firewallId = searchParams.get("firewall_id");
      if (!firewallId) {
        return NextResponse.json({ error: "firewall_id is required" }, { status: 400 });
      }
      const firewall = await vps.getFirewall(Number(firewallId)).catch(() => null);
      return NextResponse.json({ firewall });
    }

    // List post-install scripts
    if (action === "scripts") {
      const scripts = await vps.listPostInstallScripts().catch(() => []);
      return NextResponse.json({ scripts: Array.isArray(scripts) ? scripts : [] });
    }

    // Get script detail
    if (action === "script_detail") {
      const scriptId = searchParams.get("script_id");
      if (!scriptId) {
        return NextResponse.json({ error: "script_id is required" }, { status: 400 });
      }
      const script = await vps.getPostInstallScript(Number(scriptId)).catch(() => null);
      return NextResponse.json({ script });
    }

    // Get VM snapshot
    if (action === "snapshot" && vmId) {
      const id = Number(vmId);
      const snapshot = await vps.getSnapshot(id).catch(() => null);
      return NextResponse.json({ snapshot });
    }

    // Get monarx metrics
    if (action === "monarx" && vmId) {
      const id = Number(vmId);
      const monarx = await vps.getMonarx(id).catch(() => null);
      return NextResponse.json({ monarx });
    }

    // Get attached SSH keys for a VM
    if (action === "attached_keys" && vmId) {
      const id = Number(vmId);
      const keys = await vps.listAttachedPublicKeys(id).catch(() => []);
      return NextResponse.json({ keys: Array.isArray(keys) ? keys : [] });
    }

    // Get action detail
    if (action === "action_detail" && vmId) {
      const actionId = searchParams.get("action_id");
      if (!actionId) {
        return NextResponse.json({ error: "action_id is required" }, { status: 400 });
      }
      const id = Number(vmId);
      const actionDetail = await vps.getAction(id, Number(actionId)).catch(() => null);
      return NextResponse.json({ action: actionDetail });
    }

    // Get template detail
    if (action === "template_detail") {
      const templateId = searchParams.get("template_id");
      if (!templateId) {
        return NextResponse.json({ error: "template_id is required" }, { status: 400 });
      }
      const template = await vps.getTemplate(Number(templateId)).catch(() => null);
      return NextResponse.json({ template });
    }

    // If a specific VM ID is requested, fetch detailed info
    if (vmId) {
      const id = Number(vmId);
      const [vm, backupsRes, sshKeysRes] = await Promise.all([
        vps.getVM(id).catch(() => null),
        vps.listBackups(id).catch(() => ({ data: [] })),
        vps.listSSHKeys().catch(() => ({ data: [] })),
      ]);

      // Fetch metrics for the last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const metrics = await vps
        .getMetrics(id, yesterday.toISOString(), now.toISOString())
        .catch(() => null);

      // Fetch actions
      const actionsRes = await vps.getActions(id).catch(() => ({ data: [] }));

      // Handle both {data: [...]} and plain array responses for backups and SSH keys
      const backups = Array.isArray(backupsRes)
        ? backupsRes
        : Array.isArray(backupsRes?.data)
          ? backupsRes.data
          : [];
      const sshKeys = Array.isArray(sshKeysRes)
        ? sshKeysRes
        : Array.isArray(sshKeysRes?.data)
          ? sshKeysRes.data
          : [];
      const actions = Array.isArray(actionsRes)
        ? actionsRes
        : Array.isArray(actionsRes?.data)
          ? actionsRes.data
          : [];

      return NextResponse.json({
        vm,
        backups,
        sshKeys,
        metrics,
        actions,
      });
    }

    // ── List all VMs ──────────────────────────────────────────

    // Fetch from both Hostinger API and local DB in parallel
    const [hostingerVMs, localVMs] = await Promise.all([
      vps.listVMs().catch(() => []),
      prisma.vPS.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const hVMs = Array.isArray(hostingerVMs) ? hostingerVMs : [];

    // Build a map of local VMs keyed by hostingerId
    let localMap = new Map(
      localVMs.map((v) => [v.hostingerId, v])
    );

    // Auto-sync: create local records for Hostinger VMs not yet in DB
    const newVMs: { hostingerId: number; hostname: string; plan: string; state: string; ipv4?: string; cpus: number; memory: number; disk: number; bandwidth: number; os?: string; dataCenter?: string }[] = [];
    for (const hvm of hVMs) {
      const h = hvm as Record<string, unknown>;
      const hId = h.id as number;
      if (hId && !localMap.has(hId)) {
        const ipv4Raw = h.ipv4;
        let ipStr: string | undefined;
        if (typeof ipv4Raw === "string") ipStr = ipv4Raw;
        else if (Array.isArray(ipv4Raw) && ipv4Raw.length > 0) ipStr = ipv4Raw[0]?.address;
        newVMs.push({
          hostingerId: hId,
          hostname: (h.hostname as string) || `vps-${hId}`,
          plan: (h.plan as string) || "VPS",
          state: (h.state as string) || "running",
          ipv4: ipStr,
          cpus: (h.cpus as number) || 1,
          memory: (h.memory as number) || 1024,
          disk: (h.disk as number) || 20480,
          bandwidth: (h.bandwidth as number) || 1024,
          os: (h.os as string) || (h.os_name as string) || undefined,
          dataCenter: (h.data_center as string) || (h.datacenter as string) || undefined,
        });
      }
    }
    if (newVMs.length > 0) {
      await Promise.all(
        newVMs.map((nv) =>
          prisma.vPS.create({ data: nv }).catch(() => null)
        )
      );
      // Re-fetch local VMs
      const refreshed = await prisma.vPS.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
      localMap = new Map(refreshed.map((v) => [v.hostingerId, v]));
    }

    // Merge: enrich Hostinger data with local DB owner info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged: any[] = hVMs.map((hvm: Record<string, unknown>) => {
      const hostingerId = (hvm.id as number) || 0;
      const localMatch = localMap.get(hostingerId);
      return {
        ...hvm,
        localId: localMatch?.id || null,
        owner: localMatch?.user || null,
        userId: localMatch?.userId || null,
        localHostname: localMatch?.hostname || null,
        localPlan: localMatch?.plan || null,
      };
    });

    // Include any local-only VMs not found in Hostinger response
    for (const [, lv] of localMap) {
      const exists = hVMs.some(
        (hvm: Record<string, unknown>) => (hvm.id as number) === lv.hostingerId
      );
      if (!exists) {
        merged.push({
          id: lv.hostingerId,
          hostname: lv.hostname,
          state: lv.state,
          plan: lv.plan,
          ipv4: lv.ipv4,
          ipv6: lv.ipv6,
          cpus: lv.cpus,
          memory: lv.memory,
          disk: lv.disk,
          bandwidth: lv.bandwidth,
          os: lv.os,
          data_center: lv.dataCenter,
          localId: lv.id,
          owner: lv.user,
          userId: lv.userId,
          localHostname: lv.hostname,
          localPlan: lv.plan,
        });
      }
    }

    // Compute stats
    const stats = {
      total: merged.length,
      running: merged.filter(
        (v: Record<string, unknown>) =>
          ((v.state as string) || "").toLowerCase() === "running"
      ).length,
      stopped: merged.filter(
        (v: Record<string, unknown>) =>
          ((v.state as string) || "").toLowerCase() === "stopped"
      ).length,
    };

    return NextResponse.json({ servers: merged, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action, vm_id } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    // SSH key actions don't require vm_id
    if (action === "add_ssh_key") {
      const { name, key } = body;
      if (!name || !key) {
        return NextResponse.json(
          { error: "name and key are required" },
          { status: 400 }
        );
      }
      const result = await vps.createSSHKey({ name, key });
      return NextResponse.json({ success: true, result });
    }

    if (action === "delete_ssh_key") {
      const { key_id } = body;
      if (!key_id) {
        return NextResponse.json(
          { error: "key_id is required" },
          { status: 400 }
        );
      }
      const result = await vps.deleteSSHKey(Number(key_id));
      return NextResponse.json({ success: true, result });
    }

    // Create firewall (no vm_id required)
    if (action === "create_firewall") {
      const { name } = body;
      if (!name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400 }
        );
      }
      const result = await vps.createFirewall({ name });
      return NextResponse.json({ success: true, result });
    }

    // Delete firewall (no vm_id required)
    if (action === "delete_firewall") {
      const { firewall_id } = body;
      if (!firewall_id) {
        return NextResponse.json(
          { error: "firewall_id is required" },
          { status: 400 }
        );
      }
      const result = await vps.deleteFirewall(Number(firewall_id));
      return NextResponse.json({ success: true, result });
    }

    // Create firewall rule (no vm_id required)
    if (action === "create_firewall_rule") {
      const { firewall_id, ...data } = body;
      if (!firewall_id) {
        return NextResponse.json(
          { error: "firewall_id is required" },
          { status: 400 }
        );
      }
      // Remove action from data passed to the API
      const { action: _action, ...ruleData } = data;
      const result = await vps.createFirewallRuleStandalone(Number(firewall_id), ruleData);
      return NextResponse.json({ success: true, result });
    }

    // Update firewall rule (no vm_id required)
    if (action === "update_firewall_rule") {
      const { firewall_id, rule_id, ...data } = body;
      if (!firewall_id || !rule_id) {
        return NextResponse.json(
          { error: "firewall_id and rule_id are required" },
          { status: 400 }
        );
      }
      const { action: _action, ...ruleData } = data;
      const result = await vps.updateFirewallRule(Number(firewall_id), Number(rule_id), ruleData);
      return NextResponse.json({ success: true, result });
    }

    // Delete firewall rule (no vm_id required)
    if (action === "delete_firewall_rule") {
      const { firewall_id, rule_id } = body;
      if (!firewall_id || !rule_id) {
        return NextResponse.json(
          { error: "firewall_id and rule_id are required" },
          { status: 400 }
        );
      }
      const result = await vps.deleteFirewallRuleStandalone(Number(firewall_id), Number(rule_id));
      return NextResponse.json({ success: true, result });
    }

    // Create post-install script (no vm_id required)
    if (action === "create_script") {
      const { name, content } = body;
      if (!name || !content) {
        return NextResponse.json(
          { error: "name and content are required" },
          { status: 400 }
        );
      }
      const result = await vps.createPostInstallScript({ name, content });
      return NextResponse.json({ success: true, result });
    }

    // Update post-install script (no vm_id required)
    if (action === "update_script") {
      const { script_id, name, content } = body;
      if (!script_id || !name || !content) {
        return NextResponse.json(
          { error: "script_id, name, and content are required" },
          { status: 400 }
        );
      }
      const result = await vps.updatePostInstallScript(Number(script_id), { name, content });
      return NextResponse.json({ success: true, result });
    }

    // Delete post-install script (no vm_id required)
    if (action === "delete_script") {
      const { script_id } = body;
      if (!script_id) {
        return NextResponse.json(
          { error: "script_id is required" },
          { status: 400 }
        );
      }
      const result = await vps.deletePostInstallScript(Number(script_id));
      return NextResponse.json({ success: true, result });
    }

    // Assign VPS to customer
    if (action === "assign") {
      const { vm_id: assignVmId, userId, hostname, plan, ipv4, cpus, memory, disk, bandwidth, os, dataCenter } = body;
      if (!assignVmId) {
        return NextResponse.json(
          { error: "vm_id is required" },
          { status: 400 }
        );
      }
      const hId = Number(assignVmId);

      // Find or create local VPS record
      const existing = await prisma.vPS.findFirst({
        where: { hostingerId: hId },
      });

      if (existing) {
        const updated = await prisma.vPS.update({
          where: { id: existing.id },
          data: { userId: userId || null },
        });
        return NextResponse.json({ success: true, vps: updated });
      }

      // Create new local record
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required when creating a new assignment" },
          { status: 400 }
        );
      }
      const created = await prisma.vPS.create({
        data: {
          hostingerId: hId,
          userId,
          hostname: hostname || `vps-${hId}`,
          plan: plan || "Unknown",
          state: "running",
          ipv4: ipv4 || null,
          cpus: cpus || 1,
          memory: memory || 1024,
          disk: disk || 20480,
          bandwidth: bandwidth || 1024,
          os: os || null,
          dataCenter: dataCenter || null,
        },
      });
      return NextResponse.json({ success: true, vps: created });
    }

    // All other actions require vm_id
    if (!vm_id) {
      return NextResponse.json(
        { error: "vm_id is required for this action" },
        { status: 400 }
      );
    }

    const id = Number(vm_id);

    switch (action) {
      case "start": {
        const result = await vps.startVM(id);
        // Update local state
        await prisma.vPS
          .updateMany({
            where: { hostingerId: id },
            data: { state: "running" },
          })
          .catch(() => null);
        return NextResponse.json({ success: true, result });
      }

      case "stop": {
        const result = await vps.stopVM(id);
        await prisma.vPS
          .updateMany({
            where: { hostingerId: id },
            data: { state: "stopped" },
          })
          .catch(() => null);
        return NextResponse.json({ success: true, result });
      }

      case "reboot": {
        const result = await vps.rebootVM(id);
        return NextResponse.json({ success: true, result });
      }

      case "create_backup": {
        const result = await vps.createBackup(id);
        return NextResponse.json({ success: true, result });
      }

      case "restore_backup": {
        const { backup_id } = body;
        if (!backup_id) {
          return NextResponse.json(
            { error: "backup_id is required for restore" },
            { status: 400 }
          );
        }
        const result = await vps.restoreBackup(id, Number(backup_id));
        return NextResponse.json({ success: true, result });
      }

      case "delete_backup": {
        const { backup_id } = body;
        if (!backup_id) {
          return NextResponse.json(
            { error: "backup_id is required for delete" },
            { status: 400 }
          );
        }
        const result = await vps.deleteBackup(id, Number(backup_id));
        return NextResponse.json({ success: true, result });
      }

      case "set_hostname": {
        const { hostname } = body;
        if (!hostname) {
          return NextResponse.json(
            { error: "hostname is required" },
            { status: 400 }
          );
        }
        const result = await vps.setHostname(id, { hostname });
        return NextResponse.json({ success: true, result });
      }

      case "reset_hostname": {
        const result = await vps.resetHostname(id);
        return NextResponse.json({ success: true, result });
      }

      case "set_root_password": {
        const { password } = body;
        if (!password) {
          return NextResponse.json(
            { error: "password is required" },
            { status: 400 }
          );
        }
        const result = await vps.setRootPassword(id, { password });
        return NextResponse.json({ success: true, result });
      }

      case "set_panel_password": {
        const { password } = body;
        if (!password) {
          return NextResponse.json(
            { error: "password is required" },
            { status: 400 }
          );
        }
        const result = await vps.setPanelPassword(id, { password });
        return NextResponse.json({ success: true, result });
      }

      case "set_nameservers": {
        const { ns1, ns2 } = body;
        if (!ns1 || !ns2) {
          return NextResponse.json(
            { error: "ns1 and ns2 are required" },
            { status: 400 }
          );
        }
        const result = await vps.setNameservers(id, { ns1, ns2 });
        return NextResponse.json({ success: true, result });
      }

      case "recreate": {
        const result = await vps.recreateVM(id, {});
        return NextResponse.json({ success: true, result });
      }

      case "setup": {
        const { template_id } = body;
        if (!template_id) {
          return NextResponse.json(
            { error: "template_id is required" },
            { status: 400 }
          );
        }
        const result = await vps.setupVM(id, { template_id });
        return NextResponse.json({ success: true, result });
      }

      case "create_snapshot": {
        const result = await vps.createSnapshot(id);
        return NextResponse.json({ success: true, result });
      }

      case "delete_snapshot": {
        const result = await vps.deleteSnapshot(id);
        return NextResponse.json({ success: true, result });
      }

      case "restore_snapshot": {
        const result = await vps.restoreSnapshot(id);
        return NextResponse.json({ success: true, result });
      }

      case "install_monarx": {
        const result = await vps.installMonarx(id);
        return NextResponse.json({ success: true, result });
      }

      case "uninstall_monarx": {
        const result = await vps.uninstallMonarx(id);
        return NextResponse.json({ success: true, result });
      }

      case "create_ptr": {
        const { ip_address_id } = body;
        if (!ip_address_id) {
          return NextResponse.json(
            { error: "ip_address_id is required" },
            { status: 400 }
          );
        }
        const result = await vps.createPTR(id, Number(ip_address_id), {});
        return NextResponse.json({ success: true, result });
      }

      case "delete_ptr": {
        const { ip_address_id } = body;
        if (!ip_address_id) {
          return NextResponse.json(
            { error: "ip_address_id is required" },
            { status: 400 }
          );
        }
        const result = await vps.deletePTR(id, Number(ip_address_id));
        return NextResponse.json({ success: true, result });
      }

      case "enable_recovery": {
        const result = await vps.enableRecovery(id);
        return NextResponse.json({ success: true, result });
      }

      case "disable_recovery": {
        const result = await vps.disableRecovery(id);
        return NextResponse.json({ success: true, result });
      }

      case "activate_firewall": {
        const { firewall_id } = body;
        if (!firewall_id) {
          return NextResponse.json(
            { error: "firewall_id is required" },
            { status: 400 }
          );
        }
        const result = await vps.activateFirewall(Number(firewall_id), id);
        return NextResponse.json({ success: true, result });
      }

      case "deactivate_firewall": {
        const { firewall_id } = body;
        if (!firewall_id) {
          return NextResponse.json(
            { error: "firewall_id is required" },
            { status: 400 }
          );
        }
        const result = await vps.deactivateFirewall(Number(firewall_id), id);
        return NextResponse.json({ success: true, result });
      }

      case "sync_firewall": {
        const { firewall_id } = body;
        if (!firewall_id) {
          return NextResponse.json(
            { error: "firewall_id is required" },
            { status: 400 }
          );
        }
        const result = await vps.syncFirewall(Number(firewall_id), id);
        return NextResponse.json({ success: true, result });
      }

      case "attach_key": {
        const { key_id } = body;
        if (!key_id) {
          return NextResponse.json(
            { error: "key_id is required" },
            { status: 400 }
          );
        }
        const result = await vps.attachPublicKey(id, { public_key_id: Number(key_id) });
        return NextResponse.json({ success: true, result });
      }

      case "docker_start": {
        const { project_name } = body;
        if (!project_name) {
          return NextResponse.json(
            { error: "project_name is required" },
            { status: 400 }
          );
        }
        const result = await vps.startDockerProject(id, project_name);
        return NextResponse.json({ success: true, result });
      }

      case "docker_stop": {
        const { project_name } = body;
        if (!project_name) {
          return NextResponse.json(
            { error: "project_name is required" },
            { status: 400 }
          );
        }
        const result = await vps.stopDockerProject(id, project_name);
        return NextResponse.json({ success: true, result });
      }

      case "docker_restart": {
        const { project_name } = body;
        if (!project_name) {
          return NextResponse.json(
            { error: "project_name is required" },
            { status: 400 }
          );
        }
        const result = await vps.restartDockerProject(id, project_name);
        return NextResponse.json({ success: true, result });
      }

      case "docker_update": {
        const { project_name } = body;
        if (!project_name) {
          return NextResponse.json(
            { error: "project_name is required" },
            { status: 400 }
          );
        }
        const result = await vps.updateDockerProject(id, project_name);
        return NextResponse.json({ success: true, result });
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
