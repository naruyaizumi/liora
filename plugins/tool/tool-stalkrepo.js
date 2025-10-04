let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text)
    return m.reply(
      `🍱 *Contoh penggunaan: ${usedPrefix + command} naruyaizumi liora atau ${usedPrefix + command} naruyaizumi/liora*`,
    );
  await global.loading(m, conn);
  try {
    let repoQuery = text.includes("/") ? text : text.replace(/\s+/, "/");
    let res = await fetch(
      global.API("btz", "/api/stalk/repo", { repo: repoQuery }, "apikey"),
    );
    if (!res.ok) throw `🍜 *Gagal mengakses API!*`;
    let json = await res.json();
    if (json.code !== 200 || !json.result?.items?.length)
      throw `🍡 *Repositori tidak ditemukan!*`;
    let repo = json.result.items[0];
    let author = repo.author;
    let caption = `
🍱 *GITHUB REPOSITORY STALK* 🍱
━━━━━━━━━━━━━━━━━━━
👤 *Author*
🥢 *Username: ${author.username}*
🧩 *ID User: ${author.id_user}*
🍜 *URL: ${author.user_github_url}*
🍙 *Type: ${author.type}*
🍡 *Site Admin: ${author.isSiteAdmin ? "Ya" : "Tidak"}*

📂 *Repository*
🍣 *ID: ${repo.id}*
🍛 *Node ID: ${repo.nodeId}*
🥟 *Nama Repo: ${repo.nameRepo}*
🍤 *Full Name: ${repo.fullNameRepo}*
🍱 *Deskripsi: ${repo.description || "-"}*

⭐ *Stars: ${repo.stargazers}*
👀 *Watchers: ${repo.watchers}*
🍴 *Forks: ${repo.forks}*

📦 *Branch: ${repo.defaultBranch}*
🔐 *Privat: ${repo.isPrivate ? "Ya" : "Tidak"}*
🥠 *Fork: ${repo.isFork ? "Ya" : "Tidak"}*

🌐 *URL: ${repo.url_repo}*
🔗 *Git URL: ${repo.git_url}*
🔑 *SSH URL: ${repo.ssh_url}*
📎 *Clone URL: ${repo.clone_url}*
🥡 *SVN URL: ${repo.svn_url}*
🏠 *Homepage: ${repo.homepage || "-"}*

📅 *Dibuat: ${new Date(repo.createdAt).toLocaleDateString("id-ID")}*
🛠️ *Diupdate: ${new Date(repo.updatedAt).toLocaleDateString("id-ID")}*
🚀 *Push Terakhir: ${new Date(repo.pushedAt).toLocaleDateString("id-ID")}*
━━━━━━━━━━━━━━━━━━━
`.trim();
    await conn.sendFile(m.chat, author.avatar_url, "author.jpg", caption, m);
  } catch (e) {
    console.error(e);
    m.reply(
      typeof e === "string"
        ? e
        : "🍩 *Terjadi kesalahan saat stalk repositori.*",
    );
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["stalkrepo"];
handler.tags = ["tools"];
handler.command = /^(stalkrepo|repostalk)$/i;

export default handler;
