
const generate = (x, y, bombs) => {
const field = Array.from(
{
length: x,
},
() => Array(y).fill(0),
);

for (let i = 0; i < bombs; i++) {
let xBomb, yBomb;
do {
xBomb = Math.floor(Math.random() * x);
yBomb = Math.floor(Math.random() * y);
} while (field[xBomb][yBomb] === "x");

field[xBomb][yBomb] = "x";
}

for (let i = 0; i < x; i++) {
for (let j = 0; j < y; j++) {
if (field[i][j] !== "x") {
for (let k = -1; k <= 1; k++) {
for (let l = -1; l <= 1; l++) {
const ni = i + k;
const nj = j + l;
if (
ni >= 0 &&
ni < x &&
nj >= 0 &&
nj < y &&
field[ni][nj] === "x"
) {
field[i][j]++;
}
}
}
}
}
}

return field;
};

const generateEmpty = (x, y) =>
Array.from(
{
length: x,
},
() => Array(y).fill(0),
);

const translate = (value) => {
switch (value) {
case 0:
return "⬜";
case 1:
return "1️⃣";
case 2:
return "2️⃣";
case 3:
return "3️⃣";
case 4:
return "4️⃣";
case 5:
return "5️⃣";
case 6:
return "6️⃣";
case 7:
return "7️⃣";
case 8:
return "8️⃣";
case "x":
return "💣";
case "e":
return "⏹️";
case "f":
return "🚩";
}
};

const generateString = (map) =>
map.map((row) => row.map((cell) => translate(cell)).join("")).join("\n");

const detectZero = (map, x, y) => {
const queue = [[x, y]];
const result = [];
const visited = new Set();

while (queue.length > 0) {
const [cx, cy] = queue.shift();
if (!visited.has(`${cx},${cy}`)) {
visited.add(`${cx},${cy}`);
result.push([cx, cy]);

if (map[cx][cy] === 0) {
for (let i = -1; i <= 1; i++) {
for (let j = -1; j <= 1; j++) {
const ni = cx + i;
const nj = cy + j;
if (ni >= 0 && ni < map.length && nj >= 0 && nj < map[0].length) {
queue.push([ni, nj]);
}
}
}
}
}
}

return result;
};

const handler = async (m, { conn, args, usedPrefix, command }) => {
conn.minessweeper = conn.minessweeper || {};
const orgs = args[0];
const oX = args[1];
const oY = args[2];
const F = args[3];
const x = 10;
const y = 10;
const bombs = 15;

if (!orgs) {
return conn.reply(
m.chat,
`🕹️ *Minesweeper Game* 🕹️\n*▶️ ${usedPrefix + command} go* - Start the Game\n*🔓 ${usedPrefix + command} open* - Open a cell\n*🔽 ${usedPrefix + command} surrender* - Surrender\n\n*Example:* ${usedPrefix + command} go`,
m,
);
}

switch (orgs.toLowerCase()) {
case "go":
case "start":
const map = generate(x, y, bombs);
const empty = generateEmpty(x, y);
const { key } = await conn.reply(
m.chat,
"🕹️ *Minesweeper Game* 🕹️\n\n*Board*\n" + generateString(empty),
m,
);
conn.minessweeper[m.chat] = {
map: map,
current: empty,
key: key,
};
return;

case "surrender":
case "stop":
case "end":
if (!conn.minessweeper[m.chat]) {
return conn.reply(m.chat, "🚨 *No active game session.*", m);
}
delete conn.minessweeper[m.chat];
return conn.reply(m.chat, "🏳️ *You surrendered.*", m);

case "open":
case "o":
case "buka":
if (!conn.minessweeper[m.chat]) {
return conn.reply(m.chat, "🚨 *No active game session.*", m);
}
if (oX > 10 || !oX || !oY) {
return conn.reply(
m.chat,
`🚨 *Invalid parameters. Example:*
> *${usedPrefix + command} open 2 5*`,
m,
);
}

const g = conn.minessweeper[m.chat];

if (F === "f") {
g.current[oY - 1][oX - 1] = "🚩";
} else {
const openedCell = g.map[oX - 1][oY - 1];

if (openedCell === 0) {
const zero = detectZero(g.map, oX - 1, oY - 1);
for (const coords of zero) {
g.current[coords[0]][coords[1]] = g.map[coords[0]][coords[1]];
}
} else if (openedCell === "x") {
delete conn.minessweeper[m.chat];
global.db.data.users[m.sender].exp -= 5000;
const { key: loseKey } = await conn.reply(
m.chat,
"💥 *BOOM!* 💣 *You opened a bomb.*\n*Exp Points Deducted: -5000* 💔\n*Exp Points:* " +
global.db.data.users[m.sender].exp,
m,
);
conn.minessweeper[m.chat] = {
key: loseKey,
};
return;
} else {
g.current[oY - 1][oX - 1] = openedCell;
global.db.data.users[m.sender].exp += 5000;
}
}

await conn.sendMessage(m.chat, {
delete: g.key,
});

const { key: newKey } = await conn.reply(
m.chat,
"🕹️ *Minesweeper Game* 🕹️\n\n*Board*\n" +
generateString(g.current) +
"\n\n*Exp Points: +5000*",
m,
);
conn.minessweeper[m.chat].key = newKey;
return;
}
};

handler.help = ["minesweeper"].map((v) => v + " <command> <x> <y>");
handler.tags = ["game"];
handler.register = true;
handler.group = true;
handler.command = /^(minesweeper|mw)$/i;

export default handler;
