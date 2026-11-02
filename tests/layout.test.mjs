import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { clampHeight } from '../src/client.js';
let browser;
const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
before(async () => { browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true }); });
after(async () => { await browser?.close(); });
const fixture = `<!doctype html><style>
html,body{margin:0;height:100%;background:#eee} [data-rightbar-fullscreen]{height:100%;display:grid;grid-template-columns:240px 600px 1fr;overflow:hidden;position:relative}
.center{overflow:hidden;display:flex;background:#eee;flex-direction:column}.root{height:100%;display:flex;flex-direction:column;position:relative;background:#eee}
[data-conversation-content]{min-height:0;flex:1;display:flex;flex-direction:column;position:relative}
[data-conversation-scroll]{overflow:auto;min-height:0;flex:1;display:flex;flex-direction:column}
.transcript{min-height:900px;flex:1 0 auto}[data-composer-seat]{position:sticky;bottom:0;flex:none;height:120px;background:white}
[contenteditable]{min-height:50px;border:1px solid #ccc}.right{position:relative;overflow:visible}
[data-sidebar-right-panel]{position:absolute;top:0;right:0;bottom:0;width:100vw;display:flex;flex-direction:column;pointer-events:none}
[data-sidebar-right-open]>.pane{pointer-events:auto}.pane{position:relative;z-index:40;height:100%;background:#ddd;display:flex;flex-direction:column}
iframe{flex:1;min-height:0;width:100%;border:0}.tabstrip{height:32px;flex:none} [hidden]{display:none!important}
</style><div data-rightbar-fullscreen><div>Sidebar</div><div class="center"><div class="root"><header>Conversation</header><div data-conversation-content data-conversation-session="one"><div data-conversation-scroll><div class="transcript">Last answer<p>Live reply</p></div><div data-composer-seat><div contenteditable="true" data-composer-input>unfinished draft</div><button id="send">发送</button></div></div></div></div></div><div class="right"><div data-sidebar-right-panel="fullscreen" data-sidebar-right-session="one" data-sidebar-right-open><div class="pane"><div class="tabstrip"><button data-sidebar-right-mode="push">退出原生全屏</button></div><iframe srcdoc="<input id='browserInput' value='browser state'><a href='#section'>Navigate</a>"></iframe></div></div></div></div>`;
async function pageFor(width=1280,height=900) {
 const page=await browser.newPage({viewport:{width,height}});
 await page.setContent(fixture);
 await page.evaluate(() => {
  window.__ModuleLoader__={load({factory}){window.plugin=factory(()=>{});}};
  window.cleanup=null; window.releases=[];
  document.querySelector('[data-sidebar-right-mode]').onclick=()=>{
   document.querySelector('[data-sidebar-right-panel]').dataset.sidebarRightPanel='push';
   document.querySelector('[data-sidebar-right-mode]').dataset.sidebarRightMode='fullscreen';
  };
  window.originalInput=document.querySelector('[data-composer-input]');
  window.originalFrame=document.querySelector('iframe');
  window.frameLoads=0;window.originalFrame.addEventListener('load',()=>window.frameLoads++);
  window.sent=[];document.querySelector('#send').onclick=()=>window.sent.push(window.originalInput.textContent);
 });
 await page.addScriptTag({content:bundle});
 await page.evaluate(()=>window.plugin.apply({effect(fn){window.cleanup=fn();}}));
 return page;
}

test('height stays bounded even on short screens and invalid stored values',()=>{
 assert.equal(clampHeight(NaN,900),260);
 assert.equal(clampHeight(99999,900),585);
 assert.equal(clampHeight(-100,900),180);
 assert.ok(clampHeight(500,440)+32<440);
});

test('fullscreen browser stays mounted and usable alongside the original live composer',async()=>{
 const page=await pageFor();
 try {
  await page.waitForSelector('[data-doc-focus-toolbar]');
  const panel=await page.locator('[data-sidebar-right-panel]').boundingBox();
  const chat=await page.locator('[data-doc-focus-chat]').boundingBox();
  assert.ok(panel.y+panel.height<=chat.y-31);
  assert.equal(chat.x,0);assert.equal(chat.width,1280);
  const edit=page.locator('[data-composer-input]');
  await edit.fill('draft kept while reading browser');
  await page.getByRole('button',{name:'发送',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.sent),['draft kept while reading browser']);
  await page.frameLocator('iframe').locator('#browserInput').fill('browser still interactive');
  const loads=await page.evaluate(()=>window.frameLoads);
  await page.getByRole('button',{name:'展开对话',exact:true}).click();
  assert.ok((await page.locator('[data-doc-focus-chat]').boundingBox()).height>500);
  assert.equal(await page.frameLocator('iframe').locator('#browserInput').inputValue(),'browser still interactive');
  assert.equal(await page.evaluate(()=>window.frameLoads),loads);
  assert.ok(await page.evaluate(()=>window.originalInput===document.querySelector('[data-composer-input]')&&window.originalFrame===document.querySelector('iframe')));
  await page.getByRole('button',{name:'退出全屏',exact:true}).click();
  await page.waitForSelector('[data-doc-focus-toolbar]',{state:'detached'});
  assert.equal(await edit.textContent(),'draft kept while reading browser');
  assert.equal(await page.locator('[data-doc-focus-ancestor]').count(),0);
 } finally { await page.close(); }
});

test('resize keyboard/drag, modal Escape, and cleanup restore layout without losing document state',async()=>{
 const page=await pageFor();
 try {
  await page.waitForSelector('[data-doc-focus-toolbar]');
  const grip=page.getByRole('separator');
  await grip.focus();await page.keyboard.press('ArrowUp');
  assert.equal((await page.locator('[data-doc-focus-chat]').boundingBox()).height,284);
  const box=await grip.boundingBox();
  await page.mouse.move(box.x+50,box.y+15);await page.mouse.down();
  await page.mouse.move(box.x+50,box.y-65,{steps:5});await page.mouse.up();
  assert.ok((await page.locator('[data-doc-focus-chat]').boundingBox()).height>=350);
  await page.evaluate(()=>{const d=document.createElement('div');d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');document.body.append(d);});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-doc-focus-toolbar]').count(),1);
  await page.evaluate(()=>{document.querySelector('[role=dialog]').remove();window.cleanup();});
  assert.equal(await page.locator('[data-doc-focus-toolbar]').count(),0);
  assert.equal(await page.locator('[data-doc-focus-chat]').count(),0);
  assert.equal(await page.locator('[data-doc-focus-ancestor]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--doc-focus-height')),'');
  assert.equal(await page.locator('[data-composer-input]').textContent(),'unfinished draft');
 } finally { await page.close(); }
});

test('matches session identity and supports native automatic fullscreen on narrow windows',async()=>{
 const page=await pageFor(500,800);
 try {
  await page.waitForSelector('[data-doc-focus-toolbar]');
  assert.equal((await page.locator('[data-doc-focus-chat]').boundingBox()).width,500);
  await page.setViewportSize({width:1280,height:900});
  await page.waitForSelector('[data-doc-focus-toolbar]');
  await page.evaluate(()=>{document.querySelector('[data-sidebar-right-panel]').dataset.sidebarRightSession='other';});
  await page.waitForSelector('[data-doc-focus-toolbar]',{state:'detached'});
  assert.equal(await page.locator('[data-doc-focus-chat]').count(),0);
 } finally {await page.close();}
});
