import {escapeHtml} from "~/server/utils/string";

// Gemeinsame Vorlage für alle Mails von psi-pulse: HTML (Tabellenlayout, Inline-Styles, ohne externe Ressourcen)
// und ein daraus erzeugter Nur-Text-Teil. Inhalte werden als Blöcke mit Klartext beschrieben; escapt wird nur hier.

export type MailLang = "de" | "en"

export type MailBlock =
    | { type: "p", text: string }
    | { type: "code", code: string }
    | { type: "button", href: string, label: string }
    | { type: "link", before: string, href: string, label: string }
    | { type: "fallback", text: string, href: string }
    | { type: "items", items: { meta: string, title: string, href?: string, label?: string }[] }

export interface MailFooter {
    sender: string,
    links: { href: string, label: string }[],
}

export interface MailContent {
    lang: MailLang,
    subject: string,
    preheader: string,
    blocks: MailBlock[],
    footer: MailFooter,
}

const BLUE = "#00457D" // rgb(0,69,125), Uni-Blau
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"

const e = escapeHtml
// Fließtext: escapen und „psi-pulse“ nicht am Bindestrich umbrechen
const t = (s: string) => escapeHtml(s).replace(/psi-pulse/g, '<span style="white-space:nowrap">psi-pulse</span>')
const a = (href: string, label: string) =>
    `<a href="${e(href)}" class="pp-link" style="color:${BLUE};text-decoration:underline">${t(label)}</a>`

const htmlBlock = (b: MailBlock): string => {
    switch (b.type) {
        case "p":
            return `<p style="margin:0 0 16px">${t(b.text)}</p>`
        case "code":
            return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:4px 0 20px"><tr>`
                + `<td class="pp-code" style="padding:12px 20px;background-color:#eef3f8;border:1px solid #c5d3e0;border-radius:6px;`
                + `font-family:${MONO};font-size:30px;line-height:1.2;font-weight:bold;letter-spacing:6px;color:#1a1a1a">${e(b.code)}</td>`
                + `</tr></table>`
        case "button":
            // Bulletproof Button: Hintergrund an der Zelle (auch Outlook), Polsterung per mso-padding-alt.
            return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:8px 0 24px"><tr>`
                + `<td align="center" bgcolor="${BLUE}" style="background-color:${BLUE};border-radius:6px;mso-padding-alt:12px 24px">`
                + `<a href="${e(b.href)}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:16px;line-height:24px;`
                + `font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;background-color:${BLUE}">${t(b.label)}</a>`
                + `</td></tr></table>`
        case "link":
            return `<p style="margin:0 0 16px">${b.before ? t(b.before) + " " : ""}${a(b.href, b.label)}</p>`
        case "fallback":
            return `<p class="pp-muted" style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#595959">${e(b.text)}<br>`
                + `<a href="${e(b.href)}" class="pp-link" style="color:${BLUE};text-decoration:underline;word-break:break-all">${e(b.href)}</a></p>`
        case "items":
            return `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:8px 0 16px">`
                + b.items.map((it) => `<tr><td class="pp-rule" style="padding:14px 0;border-top:1px solid #d9dfe6;font-family:${FONT};font-size:16px;line-height:1.5">`
                    + (it.meta ? `<div class="pp-muted" style="font-size:14px;line-height:1.4;color:#595959;margin:0 0 4px">${e(it.meta)}</div>` : "")
                    + `<div style="font-weight:bold;margin:0 0 6px">${e(it.title)}</div>`
                    + (it.href ? `<div>${a(it.href, it.label ?? it.href)}</div>` : "") + `</td></tr>`).join("")
                + `</table>`
    }
}

const textBlock = (b: MailBlock): string => {
    switch (b.type) {
        case "p":
            return b.text
        case "code":
            return `    ${b.code}`
        case "button":
            return `${b.label}:\n${b.href}`
        case "link":
            return `${b.before ? b.before + " " : ""}${b.label}:\n${b.href}`
        case "fallback":
            return "" // der Text-Teil nennt die Adresse ohnehin beim Button
        case "items":
            return b.items.map((it, i) => `${i + 1}. ${it.title}`
                + (it.meta ? `\n   ${it.meta}` : "")
                + (it.href ? `\n   ${it.label ?? ""}: ${it.href}` : "")).join("\n\n")
    }
}

export const renderMailText = (m: MailContent): string =>
    m.blocks.map(textBlock).filter((s) => s !== "").join("\n\n")
    + "\n\n-- \n" + m.footer.sender + "\n\n"
    + m.footer.links.map((l) => `${l.label}: ${l.href}`).join("\n")
    + "\n"

export const renderMailHtml = (m: MailContent): string => {
    const header = m.lang === "de" ? "psi-pulse · Universität Bamberg" : "psi-pulse · University of Bamberg"
    // Füllzeichen, damit die Vorschau im Postfach nicht mit Text aus der Mail aufgefüllt wird
    const filler = "&#847;&zwnj;&nbsp;".repeat(40)
    const footerLinks = m.footer.links.map((l) => a(l.href, l.label)).join(`<span class="pp-muted" style="color:#595959"> · </span>`)
    return `<!doctype html>
<html lang="${m.lang}" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${e(m.subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,div,p,a,span{font-family:Arial,sans-serif !important}</style><![endif]-->
<style>
body{margin:0;padding:0;width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse}
a{color:${BLUE}}
@media (max-width:620px){
  .pp-pad{padding-left:20px !important;padding-right:20px !important}
  .pp-code{font-size:26px !important;letter-spacing:4px !important}
}
@media (prefers-color-scheme:dark){
  .pp-outer{background-color:#161a1e !important}
  .pp-card{background-color:#22272d !important;color:#e8eaed !important}
  .pp-foot{color:#c4c9cf !important}
  .pp-muted{color:#b4bac1 !important}
  .pp-link{color:#9cc8ff !important}
  .pp-code{background-color:#2c3440 !important;border-color:#4a5663 !important;color:#ffffff !important}
  .pp-rule{border-top-color:#3a424b !important}
}
</style>
</head>
<body class="pp-outer" style="margin:0;padding:0;background-color:#f2f4f6">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;opacity:0">${e(m.preheader)}${filler}</div>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="pp-outer" style="background-color:#f2f4f6">
<tr><td align="center" style="padding:24px 8px">
<!--[if mso]><table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px">
<tr><td class="pp-pad" bgcolor="${BLUE}" style="background-color:${BLUE};padding:14px 32px;border-radius:6px 6px 0 0;font-family:${FONT};font-size:15px;line-height:1.4;font-weight:bold;color:#ffffff">${e(header)}</td></tr>
<tr><td class="pp-card pp-pad" bgcolor="#ffffff" style="background-color:#ffffff;padding:28px 32px 12px;border-radius:0 0 6px 6px;font-family:${FONT};font-size:16px;line-height:1.5;color:#1a1a1a">
${m.blocks.map(htmlBlock).join("\n")}
</td></tr>
<tr><td class="pp-pad pp-foot" style="padding:20px 32px 8px;font-family:${FONT};font-size:14px;line-height:1.5;color:#4a4f55">
<p style="margin:0 0 8px">${t(m.footer.sender)}</p>
<p style="margin:0">${footerLinks}</p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
`
}
