import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const css=readFileSync('src/app/workspace/workspace.css','utf8');
const light=css.slice(css.indexOf('.ws-shell {'),css.indexOf(".ws-shell[data-theme='dark']"));
const dark=css.slice(css.indexOf(".ws-shell[data-theme='dark']"),css.indexOf('.ws-utility'));
function palette(text){return Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/g)].map(([,name,value])=>[name,value]));}
function lum(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [theme,tokens] of [['light',palette(light)],['dark',{...palette(light),...palette(dark)}]]){
 test(`${theme}: body, secondary and placeholder contrast`,()=>{for(const ink of ['ink','ink-2','ink-3'])for(const paper of ['paper','paper-raised','paper-well'])assert.ok(contrast(tokens[ink],tokens[paper])>=4.5,`${ink} / ${paper}: ${contrast(tokens[ink],tokens[paper]).toFixed(2)}`);});
 test(`${theme}: control boundaries and focus`,()=>{for(const paper of ['paper','paper-raised'])assert.ok(contrast(tokens['rule-strong'],tokens[paper])>=3);assert.ok(contrast(tokens.ink,tokens['paper-raised'])>=7);});
}
