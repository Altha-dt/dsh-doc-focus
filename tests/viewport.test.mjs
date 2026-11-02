import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
const bundle=await readFile(new URL('../lib/client.js',import.meta.url),'utf8');

test('short windows toggle compact/expanded both ways; soft keyboard preserves dock and input',async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  for(const height of [400,440,480]) {
   const page=await browser.newPage({viewport:{width:1000,height}});
   await page.setContent(`<div data-rightbar-fullscreen><div data-conversation-content data-conversation-session="one"><div data-conversation-scroll><div data-composer-seat><textarea>draft</textarea></div></div></div><div data-sidebar-right-panel="fullscreen" data-sidebar-right-open data-sidebar-right-session="one" style="position:absolute;inset:0"></div></div>`);
   await page.evaluate(()=>{window.__ModuleLoader__={load({factory}){window.plugin=factory(()=>{});}};});
   await page.addScriptTag({content:bundle});
   await page.evaluate(()=>window.plugin.apply({effect(fn){window.cleanup=fn();}}));
   await page.waitForSelector('[data-doc-focus-toolbar]');
   await page.getByRole('button',{name:'收起对话',exact:true}).click();
   const compact=await page.locator('[data-doc-focus-chat]').boundingBox();
   await page.getByRole('button',{name:'展开对话',exact:true}).click();
   const expanded=await page.locator('[data-doc-focus-chat]').boundingBox();
   assert.ok(expanded.height>compact.height);
   await page.getByRole('button',{name:'收起对话',exact:true}).click();
   assert.equal((await page.locator('[data-doc-focus-chat]').boundingBox()).height,compact.height);
   await page.evaluate(()=>{
    const vv=new EventTarget();Object.assign(vv,{height:310,offsetTop:0});
    Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});
    window.dispatchEvent(new Event('resize'));
   });
   await page.evaluate(()=>new Promise(requestAnimationFrame));
   assert.equal(await page.locator('[data-doc-focus-toolbar]').count(),1);
   await page.locator('textarea').fill('keyboard draft');
   assert.equal(await page.locator('textarea').inputValue(),'keyboard draft');
   await page.close();
  }
 } finally {await browser.close();}
});
