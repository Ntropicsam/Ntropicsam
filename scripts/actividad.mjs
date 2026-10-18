// Genera assets/actividad.svg: el calendario isométrico de contribuciones.
// Lee el calendario de GitHub (GraphQL) y lo dibuja con los colores de la marca.
// Los repos privados cuentan solo con un token con permiso read:user y con
// «Private contributions» activado en el perfil.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const usuario = process.env.GH_USUARIO || 'Ntropicsam';
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Falta GH_TOKEN');
  process.exit(1);
}

const NUBE = '#F4EFE4', ONIX = '#0E0E0E', L80 = '#536179';
const NIVELES = ['#EAEBEF', '#4BB7FB', '#003DF8', '#091E54', '#E76D2E'];
const ALTOS = [3, 8, 16, 26, 38];
const SORA = "'Sora','Segoe UI',system-ui,sans-serif";
const ATK = "'Atkinson Hyperlegible Next','Segoe UI',system-ui,sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,Consolas,monospace";

const consulta = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount weekday}}}}}}`;
const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'perfil-actividad' },
  body: JSON.stringify({ query: consulta, variables: { login: usuario } }),
});
if (!res.ok) {
  console.error('GitHub respondió', res.status);
  process.exit(1);
}
const json = await res.json();
const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
if (!cal) {
  console.error('Respuesta sin calendario', JSON.stringify(json.errors ?? json).slice(0, 300));
  process.exit(1);
}

const semanas = cal.weeks;
const noCeros = semanas.flatMap((s) => s.contributionDays.map((d) => d.contributionCount)).filter((n) => n > 0).sort((a, b) => a - b);
const corte = (p) => noCeros[Math.min(noCeros.length - 1, Math.floor(noCeros.length * p))] ?? 0;
const [q1, q2, q3] = [corte(0.25), corte(0.5), corte(0.75)];
const nivel = (n) => (n === 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);

const sombra = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.round(v * (1 - f)).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
};
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const dx = 8, dy = 4, X0 = 340, Y0 = 62;
const celdas = [];
semanas.forEach((sem, c) => {
  sem.contributionDays.forEach((d) => {
    const r = d.weekday;
    const lv = nivel(d.contributionCount);
    const h = ALTOS[lv];
    const cx = X0 + (c - r) * dx;
    const cy = Y0 + (c + r) * dy;
    const pts = (a) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    celdas.push({
      orden: c + r,
      lv,
      top: pts([[cx, cy - h], [cx + dx, cy - h + dy], [cx, cy - h + 2 * dy], [cx - dx, cy - h + dy]]),
      izq: pts([[cx - dx, cy - h + dy], [cx, cy - h + 2 * dy], [cx, cy + 2 * dy], [cx - dx, cy + dy]]),
      der: pts([[cx, cy - h + 2 * dy], [cx + dx, cy - h + dy], [cx + dx, cy + dy], [cx, cy + 2 * dy]]),
    });
  });
});
celdas.sort((a, b) => a.orden - b.orden);

const columnas = celdas
  .map((k) => {
    const col = NIVELES[k.lv];
    return `<polygon points="${k.top}" fill="${col}"/><polygon points="${k.izq}" fill="${sombra(col, 0.16)}"/><polygon points="${k.der}" fill="${sombra(col, 0.3)}"/>`;
  })
  .join('');

const pulgar = readFileSync(join(aqui, 'pulgar-arriba.svg'), 'utf8');
const vb = pulgar.match(/viewBox="([\d.\- ]+)"/)[1];
const [, , vw, vh] = vb.split(' ').map(Number);
const pw = 64;
const interior = pulgar.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const fuentes = readFileSync(join(aqui, 'fuentes.css'), 'utf8');

const total = miles(cal.totalContributions);
const leyenda = NIVELES.map((c, i) => `<rect x="${86 + 16 * i}" y="298" width="12" height="12" rx="3" fill="${c}"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 340" width="800" height="340" role="img" aria-labelledby="t d"><title id="t">Actividad</title><desc id="d">${total} contribuciones en el último año, dibujadas como columnas isométricas.</desc><style>${fuentes}</style><rect width="800" height="340" rx="16" fill="${NUBE}"/><text x="40" y="58" font-family="${SORA}" font-size="26" font-weight="600" fill="${ONIX}">Actividad</text><text x="40" y="132" font-family="${MONO}" font-size="40" font-weight="500" fill="#003DF8">${total}</text><text x="40" y="160" font-family="${ATK}" font-size="14" fill="${L80}">contribuciones en</text><text x="40" y="179" font-family="${ATK}" font-size="14" fill="${L80}">el último año</text><svg x="40" y="206" width="${pw}" height="${((pw * vh) / vw).toFixed(1)}" viewBox="${vb}" fill="${ONIX}" aria-hidden="true">${interior}</svg>${leyenda}<text x="40" y="308" font-family="${ATK}" font-size="12" fill="${L80}">menos</text><text x="172" y="308" font-family="${ATK}" font-size="12" fill="${L80}">más</text>${columnas}</svg>`;

writeFileSync(join(aqui, '..', 'assets', 'actividad.svg'), svg + '\n', 'utf8');
console.log('actividad.svg listo:', total, 'contribuciones,', celdas.length, 'días');
