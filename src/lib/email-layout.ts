/**
 * The look every email shares: the night-teal header with the script title and
 * the record, a white card, the tagline footer. Design mock:
 * `.scratch/sign-in-email/design.html`.
 *
 * A message is `renderEmail` around a run of blocks — `heading`, `paragraph`,
 * `codePanel`, `button`, `linkLine`, `note`. Each block is one table row of
 * the card plus its plain-text line, so the HTML and the text version are
 * written once and can't drift apart. Blocks take plain text and escape it, so
 * whatever a Curator or Contributor typed (a Calendar name, say) can be passed
 * straight in.
 *
 * Written for mail apps, not browsers: one 560px column of tables, styles
 * inline, no web fonts (the script title is an image). The `<style>` block is
 * only the phone-width tweaks; apps that drop it still get a working email.
 *
 * ponytail: images and the header link always point at the production site,
 * even when sent from localhost or a preview (a mail app can't reach those).
 * So a new image shows only once deployed, and a preview's email shows
 * production's images. Derive the base from the request if that ever bites.
 */
import { SITE_URL } from '@/lib/site';

const SANS = "Avenir,'Avenir Next',Helvetica,Arial,sans-serif";
const INK = '#10292d';

type Block = { html: string; text: string };

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** One row of the card, with what the plain-text version says in its place. */
function row(inner: string, padTop: number, text: string): Block {
  return {
    html: `<tr><td class="em-pad" style="padding:${padTop}px 40px 0;font-family:${SANS};color:#18181b">${inner}</td></tr>`,
    text,
  };
}

export function heading(text: string) {
  return row(`<h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:400">${escapeHtml(text)}</h1>`, 40, text);
}

export function paragraph(text: string) {
  return row(`<p style="margin:0;font-size:15px;line-height:1.55;color:#52525b">${escapeHtml(text)}</p>`, 12, text);
}

/** Small print under the rest, set apart: "didn't ask for this?" and the like. */
export function note(text: string) {
  return row(`<p style="margin:0;font-size:14px;line-height:1.55;color:#71717a">${escapeHtml(text)}</p>`, 28, text);
}

/** A one-time code, as one run of text so a long-press copies it whole. */
export function codePanel(code: string, caption: string) {
  return row(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6f3ec"
       style="background:#f6f3ec;border:1px solid #ebe3d2;border-radius:14px">
      <tr><td align="center" style="padding:26px 12px 22px">
        <div class="em-code" style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:46px;line-height:1;font-weight:500;letter-spacing:14px;padding-left:14px;color:${INK}">${escapeHtml(code)}</div>
        <div style="width:56px;height:3px;line-height:3px;font-size:0;border-radius:3px;margin:18px auto 0;background:#c9a55b;background-image:linear-gradient(90deg,#b8914a,#e2c27e,#b8914a)">&nbsp;</div>
        <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;color:#8a7a5a">${escapeHtml(caption)}</p>
      </td></tr>
    </table>`,
    24,
    `${code}\n${caption}`,
  );
}

/** A pill button, built from a table cell so Outlook draws it too. */
export function button(href: string, label: string, kind: 'primary' | 'secondary' = 'primary') {
  const [bg, fg, border] = kind === 'primary' ? [INK, '#ffffff', INK] : ['#ffffff', INK, '#d4d4d8'];
  return row(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td bgcolor="${bg}" style="background:${bg};border:1px solid ${border};border-radius:999px">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:600;line-height:1;color:${fg};text-decoration:none;border-radius:999px">${escapeHtml(label)}</a>
      </td></tr>
    </table>`,
    24,
    `${label}:\n${href}`,
  );
}

/** The bare address under a button, for apps that mangle buttons and for copying. */
export function linkLine(href: string) {
  return row(
    `<a href="${escapeHtml(href)}" style="font-size:12px;line-height:1.5;color:#a1a1aa;word-break:break-all">${escapeHtml(href)}</a>`,
    10,
    '', // The button above already spelled the address out in text.
  );
}

/** Both bodies of one message, ready to spread into `sendEmail`. */
export function renderEmail({ title, preheader, blocks }: { title: string; preheader: string; blocks: Block[] }) {
  const text = blocks
    .map((block) => block.text)
    .filter(Boolean)
    .join('\n\n');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(title)}</title>
<style>
  @media (max-width: 600px) {
    .em-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .em-code { font-size: 40px !important; letter-spacing: 10px !important; padding-left: 10px !important; }
    .em-disk { width: 120px !important; height: 120px !important; margin-right: -44px !important; }
    .em-disk-cell { width: 76px !important; }
    .em-title { width: 190px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#bcd3ec">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#dfe9f3"
       style="background:#dfe9f3;background-image:linear-gradient(180deg,#cfe3f2 0%,#f4eef2 45%,#bcd3ec 100%)">
  <tr>
    <td align="center" style="padding:32px 12px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
             style="width:100%;max-width:560px;border-radius:20px;overflow:hidden;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,.04),0 16px 48px rgba(30,60,90,.16)">
        <tr>
          <td bgcolor="${INK}" style="background:${INK};background-image:radial-gradient(120% 140% at 0% 0%,#0b1f22 0%,#143438 55%,#3c6a66 100%);padding:0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="em-pad" valign="middle" style="padding:36px 0 32px 40px">
                  <a href="${SITE_URL}" style="text-decoration:none">
                    <img class="em-title" src="${SITE_URL}/title.png" width="240" alt="Advent Delights"
                         style="display:block;width:240px;max-width:100%;height:auto;border:0;color:#ffffff;font-family:${SANS};font-size:24px">
                  </a>
                  <p style="margin:10px 0 0 4px;white-space:nowrap;font-family:${SANS};font-size:13px;letter-spacing:.04em;color:#c9dcd9">musical calendar</p>
                </td>
                <td class="em-disk-cell" valign="middle" align="right" style="padding:0;width:120px">
                  <img class="em-disk" src="${SITE_URL}/email/disk.png" width="190" height="190" alt=""
                       style="display:block;width:190px;height:190px;margin-right:-70px;border:0">
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${blocks.map((block) => block.html).join('\n        ')}
        <tr><td style="padding:36px 0 0;font-size:0;line-height:0">&nbsp;</td></tr>
        <tr>
          <td class="em-pad" style="padding:20px 40px 24px;border-top:1px solid #f0f0f2;font-family:${SANS};font-size:12px;line-height:1.5;color:#a1a1aa">
            <a href="${SITE_URL}" style="color:#52525b;text-decoration:none;font-weight:600">Advent Delights</a>
            &nbsp;&middot;&nbsp; 25 days, 25 selectors, and 2 moods
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
  return { html, text };
}
