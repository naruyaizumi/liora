async function createSubDomain(host, ip, tldnya) {
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${global.config.Subdo[tldnya].zone}/dns_records`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${global.config.Subdo[tldnya].apitoken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: "A",
                name: `${host}.${tldnya}`,
                content: ip,
                ttl: 3600,
                priority: 10,
                proxied: false,
            }),
        }
    );
    const res = await response.json();
    if (res.success) {
        return {
            success: true,
            zone: res.result?.zone_name,
            name: res.result?.name,
            ip: res.result?.content,
        };
    } else {
        return {
            success: false,
            error: res.errors?.[0]?.message || "🍬 Terjadi kesalahan saat membuat subdomain!",
        };
    }
}

function instalPanel(ress, { domainpanel, domainnode, ramserver, passwordPanel, conn, m }) {
    const commandPanel = `bash <(curl -s https://pterodactyl-installer.se)`;
    ress.exec(commandPanel, (_, stream) => {
        if (!stream) return;
        stream
            .on("close", async () => {
                await instalWings(ress, {
                    domainpanel,
                    domainnode,
                    ramserver,
                    passwordPanel,
                    conn,
                    m,
                });
            })
            .on("data", (data) => {
                const msg = data.toString();
                if (msg.includes("Input 0-6")) stream.write("0\n");
                if (msg.includes("(y/N)")) stream.write("y\n");
                if (msg.includes("Database name (panel)")) stream.write("\n");
                if (msg.includes("Database username")) stream.write("admin\n");
                if (msg.includes("Password (press enter")) stream.write("admin\n");
                if (msg.includes("Select timezone")) stream.write("Asia/Jakarta\n");
                if (msg.includes("Provide the email")) stream.write("admin@gmail.com\n");
                if (msg.includes("Email address for the initial admin account"))
                    stream.write("admin@gmail.com\n");
                if (msg.includes("Username for the initial admin account")) stream.write("admin\n");
                if (msg.includes("First name for the initial admin account"))
                    stream.write("admin\n");
                if (msg.includes("Last name for the initial admin account"))
                    stream.write("© Naruya Izumi\n");
                if (msg.includes("Password for the initial admin account"))
                    stream.write(`${passwordPanel}\n`);
                if (msg.includes("Set the FQDN of this panel")) stream.write(`${domainpanel}\n`);
                if (msg.includes("Do you want to automatically configure UFW")) stream.write("y\n");
                if (msg.includes("Do you want to automatically configure HTTPS"))
                    stream.write("y\n");
                if (msg.includes("Select the appropriate number")) stream.write("1\n");
                if (msg.includes("I agree that this HTTPS request")) stream.write("y\n");
                if (msg.includes("Proceed anyways")) stream.write("y\n");
                if (msg.includes("(yes/no)")) stream.write("y\n");
                if (msg.includes("Initial configuration completed")) stream.write("y\n");
                if (msg.includes("Still assume SSL?")) stream.write("y\n");
                if (msg.includes("Please read the Terms of Service")) stream.write("y\n");
                if (msg.includes("(A)gree/(C)ancel:")) stream.write("A\n");
                console.log("Logger:", msg);
            })
            .stderr.on("data", (data) => console.error("STDERR:", data.toString()));
    });
}

function instalWings(ress, { domainpanel, domainnode, ramserver, passwordPanel, conn, m }) {
    const commandPanel = `bash <(curl -s https://pterodactyl-installer.se)`;
    ress.exec(commandPanel, (_, stream) => {
        if (!stream) return;
        stream
            .on("close", async () => {
                ress.exec(
                    "bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/createnode.sh)",
                    (_, stream2) => {
                        if (!stream2) return;
                        stream2
                            .on("close", async () => {
                                const caption = `
*Berikut Detail Akun Panel Kamu 🍩*
━━━━━━━━━━━━━━━━━━━
👤 *Username : admin*
🔐 *Password : ${passwordPanel}*
🌐 *${domainpanel}*
━━━━━━━━━━━━━━━━━━━
🌍 *Silahkan Buat Allocation & Ambil Token Wings Di Node Yang Sudah Dibuat Bot Untuk Menjalankan Wings Dengan .startwings*
`;
                                await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
                            })
                            .on("data", (data) => {
                                const msg = data.toString();
                                if (msg.includes("Masukkan nama lokasi: "))
                                    stream2.write("IZUMI\n");
                                if (msg.includes("Masukkan deskripsi lokasi: "))
                                    stream2.write("Copyright © 2024 Naruya Izumi\n");
                                if (msg.includes("Masukkan domain: "))
                                    stream2.write(`${domainnode}\n`);
                                if (msg.includes("Masukkan nama node: ")) stream2.write("IZUMI\n");
                                if (msg.includes("Masukkan RAM (dalam MB): "))
                                    stream2.write(`${ramserver}\n`);
                                if (
                                    msg.includes("Masukkan jumlah maksimum disk space (dalam MB): ")
                                )
                                    stream2.write(`${ramserver}\n`);
                                if (msg.includes("Masukkan Locid: ")) stream2.write("1\n");
                                console.log(msg);
                            })
                            .stderr.on("data", (data) => console.error("STDERR:", data.toString()));
                    }
                );
            })
            .on("data", (data) => {
                const msg = data.toString();
                if (msg.includes("Input 0-6")) stream.write("1\n");
                if (msg.includes("(y/N)")) stream.write("y\n");
                if (msg.includes("Enter the panel address")) stream.write(`${domainpanel}\n`);
                if (msg.includes("Database host username")) stream.write("admin\n");
                if (msg.includes("Database host password")) stream.write("admin\n");
                if (msg.includes("Set the FQDN")) stream.write(`${domainnode}\n`);
                if (msg.includes("Enter email address")) stream.write("admin@gmail.com\n");
                console.log("Logger:", msg);
            })
            .stderr.on("data", (data) => console.error("STDERR:", data.toString()));
    });
}

async function getDropletInfo(token) {
    const headers = { Authorization: `Bearer ${token}` };
    const accountResponse = await fetch("https://api.digitalocean.com/v2/account", { headers });
    if (!accountResponse.ok) throw new Error("Gagal mengambil data akun DigitalOcean!");
    const accountData = await accountResponse.json();
    const dropletsResponse = await fetch("https://api.digitalocean.com/v2/droplets", { headers });
    if (!dropletsResponse.ok) throw new Error("Gagal mengambil data droplets!");
    const dropletData = await dropletsResponse.json();
    const dropletLimit = accountData.account.droplet_limit;
    const totalDroplets = dropletData.droplets.length;
    const remainingDroplets = dropletLimit - totalDroplets;
    let dropletList;
    if (totalDroplets === 0) {
        dropletList = "🍩 *Tidak ada droplet aktif saat ini!*";
    } else {
        dropletList = dropletData.droplets
            .map((droplet, i) => {
                const os = `${droplet.image.distribution} ${droplet.image.name}`;
                const createdAt = new Date(droplet.created_at).toLocaleString("id-ID");
                const vcpus = droplet.vcpus;
                const memory = droplet.memory;
                const disk = droplet.disk;
                const backupEnabled = droplet.features.includes("backups")
                    ? "🍰 Aktif"
                    : "🍬 Tidak";
                const monitoringEnabled = droplet.features.includes("monitoring")
                    ? "🍰 Aktif"
                    : "🍬 Tidak";
                return `🍪 *${i + 1}. ${droplet.name}*
🍫 *ID: ${droplet.id}*
🧁 *Status: ${droplet.status === "active" ? "🍰 Aktif" : droplet.status === "off" ? "🍓 Mati" : "🍬 Error"}*
🍧 *Region: ${droplet.region.slug}*
🍮 *OS: ${os}*
🍡 *Spesifikasi: ${vcpus} vCPU, ${memory}MB RAM, ${disk}GB Disk*
🍭 *Backup: ${backupEnabled}*
🍬 *Monitoring: ${monitoringEnabled}*
🍨 *Dibuat: ${createdAt}*`;
            })
            .join("\n━━━━━━━━━━━━━━━━━━━\n");
    }

    return { totalDroplets, dropletLimit, remainingDroplets, dropletList };
}

async function deletePanelUser(userId) {
    try {
        const domain = global.config.domain;
        const apikey = global.config.apikey;
        const userResponse = await fetch(`${domain}/api/application/users/${userId}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });
        if (!userResponse.ok) {
            return {
                success: false,
                error: "🍪 User tidak ditemukan atau sudah dihapus sebelumnya!",
            };
        }
        let serversToDelete = [];
        let currentPage = 1;
        let totalPages;
        do {
            const response = await fetch(`${domain}/api/application/servers?page=${currentPage}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apikey}`,
                },
            });
            const data = await response.json();
            if (data.errors) throw new Error(data.errors[0].detail || "🍩 Error fetching servers");
            if (data.data && data.data.length > 0) {
                const userServers = data.data.filter(
                    (server) => server.attributes.user === parseInt(userId)
                );
                serversToDelete.push(...userServers);
            }
            currentPage++;
            totalPages = data.meta.pagination.total_pages;
        } while (currentPage <= totalPages);
        for (let server of serversToDelete) {
            await fetch(`${domain}/api/application/servers/${server.attributes.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apikey}`,
                },
            });
        }
        const deleteUserResponse = await fetch(`${domain}/api/application/users/${userId}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });
        if (!deleteUserResponse.ok) {
            return { success: false, error: `🍰 Gagal menghapus User ID: ${userId}!` };
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function createDroplet(name, region, size, image, password, token) {
    const headers = { Authorization: `Bearer ${token}` };
    const userData = `#!/bin/bash
echo -e "${password}\\n${password}" | passwd root
sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
systemctl restart ssh`;
    const createRes = await fetch("https://api.digitalocean.com/v2/droplets", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name, region, size, image, user_data: userData }),
    });
    if (!createRes.ok) throw new Error("🍩 Gagal membuat droplet!");
    const result = await createRes.json();
    const dropletId = result.droplet.id;
    let ipAddress = null;
    let attempts = 0;
    while (attempts < 60 && !ipAddress) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        const dropletRes = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
            headers,
        });
        if (!dropletRes.ok) throw new Error("🍰 Gagal mengambil detail droplet!");
        const dropletData = await dropletRes.json();
        ipAddress =
            dropletData.droplet.networks.v4.find((net) => net.type === "public")?.ip_address ||
            null;
        attempts++;
    }
    return { id: dropletId, ip: ipAddress };
}

import crypto from "crypto";

function formatRamDisk(value) {
    return value === "0"
        ? "Unlimited"
        : value.length > 4
          ? value.slice(0, 2) + "GB"
          : value.charAt(0) + "GB";
}

function formatCpu(value) {
    return value === "0" ? "Unlimited" : value + "%";
}

const plans = {
    "1gb": { ram: "1024", disk: "2048", cpu: "30", days: 30 },
    "2gb": { ram: "2048", disk: "4096", cpu: "50", days: 30 },
    "3gb": { ram: "3072", disk: "6144", cpu: "70", days: 30 },
    "4gb": { ram: "4096", disk: "8192", cpu: "100", days: 30 },
    "5gb": { ram: "5120", disk: "10240", cpu: "120", days: 30 },
    "6gb": { ram: "6144", disk: "12288", cpu: "150", days: 30 },
    "7gb": { ram: "7168", disk: "14336", cpu: "170", days: 30 },
    "8gb": { ram: "8192", disk: "16384", cpu: "200", days: 30 },
    "10gb": { ram: "10240", disk: "20480", cpu: "250", days: 30 },
    unlimited: { ram: "0", disk: "0", cpu: "0", days: 30 },
};

async function createPanelAccount(username, numberRaw, planKey) {
    const number = numberRaw.replace(/[^\d+]/g, "") + "@s.whatsapp.net";
    const plan = plans[planKey];
    if (!plan) throw new Error("🍬 Paket tidak valid!");
    const expiresAt = Date.now() + plan.days * 86400000;
    const email = `${username}@naruyaizumi.com`;
    const password = crypto.randomBytes(3).toString("hex");
    const userResponse = await fetch(`${global.config.domain}/api/application/users`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${global.config.apikey}`,
        },
        body: JSON.stringify({
            email,
            username,
            first_name: username,
            last_name: "© IZUMI",
            language: "en",
            password,
        }),
    });
    const userData = await userResponse.json();
    if (!userResponse.ok || userData.errors) {
        const errorMessage = userData.errors
            ? userData.errors[0].detail
            : "🍓 Gagal membuat pengguna di panel.";
        throw new Error(errorMessage);
    }
    const eggData = await fetch(
        `${global.config.domain}/api/application/nests/${global.config.nestid}/eggs/${global.config.egg}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${global.config.apikey}`,
            },
        }
    );
    const eggInfo = await eggData.json();
    if (!eggData.ok || !eggInfo.attributes || !eggInfo.attributes.startup) {
        throw new Error("🍰 Gagal membaca konfigurasi startup dari Egg!");
    }
    const startup_cmd = eggInfo.attributes.startup;
    const serverResponse = await fetch(`${global.config.domain}/api/application/servers`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${global.config.apikey}`,
        },
        body: JSON.stringify({
            name: username,
            description: "COPYRIGHT © 2025 NARUYA IZUMI.",
            user: userData.attributes.id,
            egg: parseInt(global.config.egg),
            docker_image: "docker.io/bionicc/nodejs-wabot:22",
            startup: startup_cmd,
            environment: {
                INST: "npm",
                USER_UPLOAD: "0",
                AUTO_UPDATE: "0",
                CMD_RUN: "npm start",
            },
            limits: {
                memory: plan.ram,
                swap: 0,
                disk: plan.disk,
                io: 500,
                cpu: plan.cpu,
            },
            feature_limits: { databases: 3, backups: 3, allocations: 3 },
            deploy: {
                locations: [parseInt(global.config.loc)],
                dedicated_ip: false,
                port_range: [],
            },
        }),
    });
    const serverData = await serverResponse.json();
    if (!serverResponse.ok || serverData.errors) {
        throw new Error(
            serverData.errors ? serverData.errors[0].detail : "🍩 Gagal membuat server di panel."
        );
    }
    return {
        server: serverData.attributes,
        user: userData.attributes,
        email,
        password,
        expiresAt,
        plan,
        number,
    };
}

async function listPanelUsers(domain, apikey, capikey, page = 1, itemsPerPage = 20) {
    const usersResponse = await fetch(`${domain}/api/application/users`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    const usersRes = await usersResponse.json();
    if (!usersResponse.ok || usersRes.errors)
        throw new Error(usersRes.errors?.[0]?.detail || "Gagal mengambil data user.");
    const totalItems = usersRes.data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (page > totalPages || page < 1)
        throw new Error(`Halaman tidak tersedia! Total halaman: ${totalPages}`);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = usersRes.data.slice(startIndex, endIndex);
    const serversResponse = await fetch(`${domain}/api/application/servers`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    const serversRes = await serversResponse.json();
    if (!serversResponse.ok || serversRes.errors)
        throw new Error(serversRes.errors?.[0]?.detail || "Gagal mengambil data server.");
    const serversByUser = {};
    for (const server of serversRes.data) {
        const s = server.attributes;
        const userId = s.user;
        if (!serversByUser[userId]) serversByUser[userId] = [];
        const resourceResponse = await fetch(
            `${domain}/api/client/servers/${s.identifier}/resources`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${capikey}`,
                },
            }
        );
        const resourceData = await resourceResponse.json();
        let status = "SUSPENDED";
        if (resourceData?.attributes?.resources) {
            status = resourceData.attributes.current_state.toUpperCase() || "SUSPENDED";
        }
        serversByUser[userId].push({
            id: s.id,
            name: s.name,
            identifier: s.identifier,
            suspended: s.suspended ? "🍩 YES" : "🍪 NO",
            status,
        });
    }

    return { users: paginatedData, serversByUser, totalItems, totalPages, page };
}

async function unsuspendServer(domain, apikey, serverId) {
    const serverResponse = await fetch(`${domain}/api/application/servers/${serverId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    const serverData = await serverResponse.json();
    if (!serverResponse.ok || serverData.errors)
        throw new Error(serverData.errors?.[0]?.detail || "🍩 Server tidak ditemukan!");

    const serverName = serverData.attributes.name || "-";
    if (!serverData.attributes.suspended) {
        return { success: true, alreadyActive: true, name: serverName, id: serverId };
    }

    const unsuspendResponse = await fetch(
        `${domain}/api/application/servers/${serverId}/unsuspend`,
        {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        }
    );

    return {
        success: unsuspendResponse.ok,
        name: serverName,
        id: serverId,
    };
}

async function unsuspendAllServers(domain, apikey) {
    const serversResponse = await fetch(`${domain}/api/application/servers`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    const serversRes = await serversResponse.json();
    if (!serversResponse.ok || serversRes.errors)
        throw new Error(serversRes.errors?.[0]?.detail || "🍩 Gagal mengambil daftar server!");

    const suspendedServers = serversRes.data.filter((s) => s.attributes.suspended);
    if (suspendedServers.length === 0) return [];

    const results = [];
    for (const server of suspendedServers) {
        const unsuspendResponse = await fetch(
            `${domain}/api/application/servers/${server.attributes.id}/unsuspend`,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apikey}`,
                },
            }
        );
        results.push({
            id: server.attributes.id,
            name: server.attributes.name,
            success: unsuspendResponse.ok,
        });
    }
    return results;
}

async function suspendServer(domain, apikey, serverId) {
    const serverResponse = await fetch(`${domain}/api/application/servers/${serverId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    const serverData = await serverResponse.json();
    if (!serverResponse.ok || serverData.errors)
        throw new Error(serverData.errors?.[0]?.detail || "🍩 Server tidak ditemukan!");
    const serverName = serverData.attributes.name || "-";
    if (serverData.attributes.suspended) {
        return { success: true, alreadySuspended: true, name: serverName, id: serverId };
    }
    const suspendResponse = await fetch(`${domain}/api/application/servers/${serverId}/suspend`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    return {
        success: suspendResponse.ok,
        name: serverName,
        id: serverId,
    };
}

async function suspendAllServers(domain, apikey, nonAdminUsers) {
    const serversResponse = await fetch(`${domain}/api/application/servers`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    const serversRes = await serversResponse.json();
    if (!serversResponse.ok || serversRes.errors)
        throw new Error(serversRes.errors?.[0]?.detail || "🍩 Gagal mengambil daftar server!");
    const serversToSuspend = serversRes.data.filter((server) =>
        nonAdminUsers.some((user) => user.attributes.id === server.attributes.user)
    );
    if (serversToSuspend.length === 0) return [];
    const results = [];
    for (const server of serversToSuspend) {
        const suspendResponse = await fetch(
            `${domain}/api/application/servers/${server.attributes.id}/suspend`,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apikey}`,
                },
            }
        );
        results.push({
            id: server.attributes.id,
            name: server.attributes.name,
            success: suspendResponse.ok,
        });
    }
    return results;
}

async function listFiles(domain, apikey, capikey, serverId, directory = "/") {
    const serversResponse = await fetch(`${domain}/api/application/servers`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    const serversData = await serversResponse.json();
    if (!serversResponse.ok || !serversData.data)
        throw new Error("🍩 Gagal mengambil daftar server!");

    const server = serversData.data.find((s) => s.attributes.id === parseInt(serverId));
    if (!server) throw new Error(`🍰 Server dengan ID ${serverId} tidak ditemukan!`);

    const identifier = server.attributes.identifier;
    const response = await fetch(
        `${domain}/api/client/servers/${identifier}/files/list?directory=${encodeURIComponent(directory)}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${capikey}`,
            },
        }
    );
    const data = await response.json();
    if (!response.ok || !data.data)
        throw new Error("🧁 Gagal mengambil daftar file atau folder kosong!");

    const formatBytes = (bytes) => {
        if (bytes === 0) return "0 B";
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    let messageText = `🍓 *Daftar File dalam Direktori:* \`${directory}\`\n\n`;
    if (data.data.length === 0) {
        messageText += "🍩 *Tidak ada file atau folder dalam direktori ini!*";
    } else {
        messageText += `*╭━━━━━━━━━━━━━━━━━━━━━━━╮*\n`;
        for (let file of data.data) {
            const attributes = file.attributes;
            const fileType = attributes.is_file ? "🍫 File" : "🍪 Folder";
            const modifiedAt = attributes.modified_at
                ? new Date(attributes.modified_at).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                  })
                : "Unknown";
            messageText += `*│ ${fileType}: ${attributes.name}*\n`;
            messageText += `*│ Ukuran: ${attributes.is_file ? formatBytes(attributes.size) : "-"}*\n`;
            messageText += `*│ Diubah: ${modifiedAt}*\n`;
            messageText += `*├───────────────────────*\n`;
        }
        messageText += `*│ Pterodactyl® © 2015 - 2025*
*╰━━━━━━━━━━━━━━━━━━━━━━━╯*`;
    }
    return messageText;
}

export {
    createSubDomain,
    instalPanel,
    instalWings,
    getDropletInfo,
    deletePanelUser,
    createDroplet,
    createPanelAccount,
    formatRamDisk,
    formatCpu,
    plans,
    listPanelUsers,
    unsuspendServer,
    unsuspendAllServers,
    suspendServer,
    suspendAllServers,
    listFiles,
};
