// Assert the Nuxt 4 inline-script allowlist against real HTML and injection attempts.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createInlineScriptAllowList} from '../server/utils/cspInlineScripts.ts';
const B = process.env.PULSE_TEST_URL || 'http://localhost:3000';
const hash = code => 'sha256-' + createHash('sha256').update(code).digest('base64');
const html = async path => (await fetch(B + path, {headers: {accept: "text/html"}})).text();
const login = await html('/login');
const color = /<script>("use strict";[\s\S]*?nuxt-color-mode[\s\S]*?)<\/script>/.exec(login)[1];
const config = /<script>(window\.__NUXT__=\{\};window\.__NUXT__\.config=[\s\S]*?)<\/script>/.exec(login)[1];
const map = /<script type="importmap">([\s\S]*?)<\/script>/.exec(login)[1];
const allow = createInlineScriptAllowList(() => {});
const real = [color, map, config].map(hash);
assert.deepEqual(new Set(allow(login)), new Set(real));
assert.equal(allow(await html('/gibt-es-nicht-csp')).length, 3);
const inject = (page, code) => page.replace(/<div id="__nuxt"[^>]*>/, match => `${match}<script>${code}</script>`);
for (const evil of [
  'window.__NUXT__={};window.__NUXT__.config={};fetch("/api/account/export")',
  'window.__NUXT__=1;alert(document.domain)',
  '"use strict";/*nuxt-color-mode*/alert(document.domain)',
]) {
  const injected = inject(login, evil);
  assert.notEqual(injected, login, 'fixture must actually inject');
  assert.deepEqual(new Set(allow(injected)), new Set(real));
  assert(!allow(injected).includes(hash(evil)));
}
const evilColor = '"use strict";/*nuxt-color-mode*/alert(document.domain)';
const extraHead = allow(login.replace('</head>', `<script>${evilColor}</script></head>`));
assert(!extraHead.includes(hash(color)));
assert(!extraHead.includes(hash(evilColor)));
const changed = config + ';alert(1)';
assert(!allow(login.replace(config, changed)).includes(hash(changed)));
const changedMap = map.replace('/_nuxt/', '/other/');
assert(!allow(login.replace(map, changedMap)).includes(hash(changedMap)));
const open = login.replace(/<div id="__nuxt"[^>]*>/, match => match + '<script>alert(1)//');
assert.deepEqual(new Set(allow(open)), new Set([hash(color), hash(map)]));
console.log('PASS CSP: real pages, importmap, injected script prefixes, extra head script, changed config, unclosed script');
