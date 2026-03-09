import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data (order matters for foreign keys)
  await prisma.ticketReply.deleteMany().catch(() => null);
  await prisma.ticket.deleteMany().catch(() => null);
  await prisma.invoice.deleteMany().catch(() => null);
  await prisma.hostingAccount.deleteMany().catch(() => null);
  await prisma.website.deleteMany().catch(() => null);
  await prisma.domain.deleteMany().catch(() => null);
  await prisma.vPS.deleteMany().catch(() => null);
  await prisma.plan.deleteMany().catch(() => null);
  await prisma.user.deleteMany().catch(() => null);

  console.log("Cleaned existing data.");

  // Hash passwords
  const adminPassword = await bcrypt.hash("admin123", 12);
  const customerPassword = await bcrypt.hash("customer123", 12);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: "admin@zustadigital.com",
      password: adminPassword,
      name: "Krishnendu Karmakar",
      role: "ADMIN",
      company: "Zusta Digital",
      phone: "+91 98765 43210",
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create sample customers
  const customer1 = await prisma.user.create({
    data: {
      email: "rahul@techstartup.in",
      password: customerPassword,
      name: "Rahul Sharma",
      role: "CUSTOMER",
      company: "TechStartup India",
      phone: "+91 99887 76655",
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: "priya@designstudio.com",
      password: customerPassword,
      name: "Priya Patel",
      role: "CUSTOMER",
      company: "Design Studio Co.",
      phone: "+91 88776 65544",
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: "amit@ecommshop.in",
      password: customerPassword,
      name: "Amit Kumar",
      role: "CUSTOMER",
      company: "E-Comm Shop",
      phone: "+91 77665 54433",
    },
  });

  console.log("Created 3 sample customers.");

  // Create plans
  const starterShared = await prisma.plan.create({
    data: {
      name: "Starter Shared",
      slug: "starter-shared",
      description: "Perfect for personal websites and blogs",
      type: "shared",
      price: 99,
      sortOrder: 1,
      features: {
        websites: 1,
        storage: "10GB",
        bandwidth: "100GB",
        email_accounts: 1,
        ssl: true,
        backup: "weekly",
      },
    },
  });

  const businessShared = await prisma.plan.create({
    data: {
      name: "Business Shared",
      slug: "business-shared",
      description: "Ideal for growing businesses and online stores",
      type: "shared",
      price: 249,
      sortOrder: 2,
      features: {
        websites: 10,
        storage: "50GB",
        bandwidth: "unlimited",
        email_accounts: 10,
        ssl: true,
        backup: "daily",
        cdn: true,
      },
    },
  });

  const enterpriseShared = await prisma.plan.create({
    data: {
      name: "Enterprise Shared",
      slug: "enterprise-shared",
      description: "Maximum performance for high-traffic sites",
      type: "shared",
      price: 499,
      sortOrder: 3,
      features: {
        websites: 100,
        storage: "200GB",
        bandwidth: "unlimited",
        email_accounts: 100,
        ssl: true,
        backup: "daily",
        cdn: true,
        priority_support: true,
      },
    },
  });

  const vpsStarter = await prisma.plan.create({
    data: {
      name: "VPS Starter",
      slug: "vps-starter",
      description: "Entry-level VPS for developers and small apps",
      type: "vps",
      price: 1499,
      sortOrder: 4,
      features: {
        vcpu: 2,
        ram: "4GB",
        storage: "50GB NVMe",
        bandwidth: "2TB",
        dedicated_ip: true,
        root_access: true,
      },
    },
  });

  const vpsPro = await prisma.plan.create({
    data: {
      name: "VPS Pro",
      slug: "vps-pro",
      description: "High-performance VPS for demanding applications",
      type: "vps",
      price: 2499,
      sortOrder: 5,
      features: {
        vcpu: 4,
        ram: "8GB",
        storage: "100GB NVMe",
        bandwidth: "4TB",
        dedicated_ip: true,
        root_access: true,
        ddos_protection: true,
      },
    },
  });

  const domainCom = await prisma.plan.create({
    data: {
      name: "Domain .COM",
      slug: "domain-com",
      description: ".COM domain registration",
      type: "domain",
      price: 999,
      sortOrder: 6,
      features: {
        tld: ".com",
        period: "yearly",
        whois_privacy: true,
        dns_management: true,
        auto_renewal: true,
      },
    },
  });

  const domainIn = await prisma.plan.create({
    data: {
      name: "Domain .IN",
      slug: "domain-in",
      description: ".IN domain registration",
      type: "domain",
      price: 699,
      sortOrder: 7,
      features: {
        tld: ".in",
        period: "yearly",
        whois_privacy: true,
        dns_management: true,
        auto_renewal: true,
      },
    },
  });

  console.log("Created 7 plans.");

  // Create sample invoices
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.invoice.createMany({
    data: [
      {
        userId: customer1.id,
        planId: businessShared.id,
        amount: 249,
        currency: "INR",
        status: "PAID",
        description: "Business Shared Hosting - Monthly",
        dueDate: thirtyDaysAgo,
        paidAt: thirtyDaysAgo,
        period: "monthly",
      },
      {
        userId: customer1.id,
        planId: domainCom.id,
        amount: 999,
        currency: "INR",
        status: "PAID",
        description: "Domain .COM Registration - techstartup.in",
        dueDate: fifteenDaysAgo,
        paidAt: fifteenDaysAgo,
        period: "yearly",
      },
      {
        userId: customer2.id,
        planId: starterShared.id,
        amount: 99,
        currency: "INR",
        status: "PAID",
        description: "Starter Shared Hosting - Monthly",
        dueDate: sevenDaysAgo,
        paidAt: sevenDaysAgo,
        period: "monthly",
      },
      {
        userId: customer2.id,
        planId: domainIn.id,
        amount: 699,
        currency: "INR",
        status: "PENDING",
        description: "Domain .IN Registration - designstudio.in",
        dueDate: thirtyDaysFromNow,
        period: "yearly",
      },
      {
        userId: customer3.id,
        planId: enterpriseShared.id,
        amount: 499,
        currency: "INR",
        status: "PAID",
        description: "Enterprise Shared Hosting - Monthly",
        dueDate: thirtyDaysAgo,
        paidAt: thirtyDaysAgo,
        period: "monthly",
      },
      {
        userId: customer3.id,
        planId: vpsStarter.id,
        amount: 1499,
        currency: "INR",
        status: "OVERDUE",
        description: "VPS Starter - Monthly",
        dueDate: sevenDaysAgo,
        period: "monthly",
      },
      {
        userId: customer3.id,
        planId: vpsPro.id,
        amount: 2499,
        currency: "INR",
        status: "PENDING",
        description: "VPS Pro - Monthly (Upgrade)",
        dueDate: thirtyDaysFromNow,
        period: "monthly",
      },
    ],
  });

  console.log("Created 7 sample invoices.");

  // Create sample tickets
  await prisma.ticket.create({
    data: {
      userId: customer1.id,
      subject: "Website loading slowly",
      message:
        "My website techstartup.in has been loading very slowly for the past 2 days. Can you please look into this? I have tried clearing the cache but the issue persists.",
      status: "OPEN",
      priority: "high",
      replies: {
        create: [
          {
            userId: admin.id,
            message:
              "Hi Rahul, thank you for reporting this. I am looking into your hosting account now. Could you let me know if you have recently installed any new plugins or made changes to your site?",
          },
          {
            userId: customer1.id,
            message:
              "Yes, I installed a new caching plugin yesterday. Could that be causing the issue?",
          },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      userId: customer2.id,
      subject: "Cannot access email accounts",
      message:
        "I am unable to access my email accounts via webmail. Getting a 500 error when trying to log in. My domain is designstudio.com.",
      status: "IN_PROGRESS",
      priority: "medium",
      replies: {
        create: [
          {
            userId: admin.id,
            message:
              "Hi Priya, I have checked and found a configuration issue with your email service. I am working on fixing it now. Should be resolved within the hour.",
          },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      userId: customer3.id,
      subject: "Need help with SSL certificate",
      message:
        "I need to install an SSL certificate for my e-commerce store. Can you guide me through the process or install it for me?",
      status: "RESOLVED",
      priority: "low",
      replies: {
        create: [
          {
            userId: admin.id,
            message:
              "Hi Amit, I have enabled the free Let's Encrypt SSL certificate for your domain. It should be active within a few minutes. Your site will automatically redirect to HTTPS.",
          },
          {
            userId: customer3.id,
            message:
              "That was quick! I can see the SSL is active now. Thank you so much for the help!",
          },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      userId: customer1.id,
      subject: "Request for domain transfer",
      message:
        "I want to transfer my domain techstartup.com from my old registrar to this platform. Can you help me with the transfer process?",
      status: "OPEN",
      priority: "medium",
    },
  });

  console.log("Created 4 sample tickets with replies.");

  // Create sample websites assigned to customers
  await prisma.website.createMany({
    data: [
      {
        userId: customer1.id,
        domain: "zusta.uk",
        hostingerDomain: "zusta.uk",
        orderId: 1005560611,
        rootDirectory: "/home/u589588358/domains/zusta.uk/public_html",
        isActive: true,
      },
      {
        userId: customer1.id,
        domain: "real.zusta.uk",
        subdomain: "real",
        hostingerDomain: "zusta.uk",
        orderId: 1005560611,
        rootDirectory: "/home/u589588358/domains/zusta.uk/public_html/real",
        isActive: true,
      },
      {
        userId: customer2.id,
        domain: "sobeit.zusta.uk",
        subdomain: "sobeit",
        hostingerDomain: "zusta.uk",
        orderId: 1005560611,
        rootDirectory: "/home/u589588358/domains/zusta.uk/public_html/sobeit",
        isActive: true,
      },
    ],
  });

  console.log("Created 3 website assignments.");

  // Create sample domains assigned to customers
  await prisma.domain.createMany({
    data: [
      {
        userId: customer1.id,
        domain: "dumbsmart.in",
        type: "domain",
        status: "active",
        autoRenew: true,
        privacyEnabled: false,
        lockEnabled: true,
        registeredAt: new Date("2024-06-15"),
        expiresAt: new Date("2026-06-15"),
      },
      {
        userId: customer1.id,
        domain: "zusta.uk",
        type: "domain",
        status: "active",
        autoRenew: true,
        privacyEnabled: true,
        lockEnabled: true,
        registeredAt: new Date("2024-01-10"),
        expiresAt: new Date("2026-01-10"),
      },
      {
        userId: customer2.id,
        domain: "sobeit.in",
        type: "domain",
        status: "active",
        autoRenew: true,
        registeredAt: new Date("2024-09-01"),
        expiresAt: new Date("2025-09-01"),
      },
      {
        userId: customer3.id,
        domain: "ecommshop.in",
        type: "domain",
        status: "active",
        autoRenew: true,
        registeredAt: new Date("2024-03-20"),
        expiresAt: new Date("2026-03-20"),
      },
    ],
  });

  console.log("Created 4 domain assignments.");

  // Create hosting accounts (CyberPanel website assignments)
  await prisma.hostingAccount.createMany({
    data: [
      {
        userId: customer1.id,
        domain: "zusta.uk",
        package: "Business",
        status: "active",
      },
      {
        userId: customer2.id,
        domain: "sobeit.zusta.uk",
        package: "Starter",
        status: "active",
      },
      {
        userId: customer3.id,
        domain: "motel.zusta.uk",
        package: "Business",
        status: "active",
      },
    ],
  });

  console.log("Created 3 hosting accounts.");

  console.log("Database seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
