export async function all() {
    let user = global.db.data.users;
    let chat = global.db.data.chats;
    if (!chat) return true;
    let dataUser = Object.keys(user).filter(
        (v) => new Date() - user[v].bannedTime > 0 && user[v].bannedTime != 999 && user[v].banned
    );
    for (let id of dataUser) {
        user[id].banned = false;
        user[id].bannedTime = 0;
    }
    let dataChat = Object.keys(chat).filter(
        (v) =>
            new Date() - chat[v].isBannedTime > 0 && chat[v].isBannedTime != 999 && chat[v].isBanned
    );
    for (let id of dataChat) {
        chat[id].isBanned = false;
        chat[id].isBannedTime = 0;
    }
}
