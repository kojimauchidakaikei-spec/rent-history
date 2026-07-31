(function(){
'use strict';
const A=window.RENT_APP,$=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function optionList(values,first){return '<option value="">'+first+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');}
function latest(r){if(Array.isArray(r.rentHistory)&&r.rentHistory.length)return r.rentHistory.slice().sort((a,b)=>String(b.revisionMonth||'').localeCompare(String(a.revisionMonth||'')))[0];return{newRent:r.rent||0,revisionMonth:r.revisionMonth||''};}
function setupFilters(){
 $('fLine').innerHTML=optionList(Object.keys(A.lines),'すべて');
 $('fStructure').innerHTML=optionList(A.structures,'すべて');
 $('fLayout').innerHTML=optionList(A.layouts,'すべて');
 updateStations();
 $('fLine').addEventListener('change',()=>{updateStations();render();});
 ['q','fStation','fStructure','fLayout','fWalkMax','fRentMin','fRentMax','sortBy'].forEach(id=>$(id).addEventListener(id==='q'||id.startsWith('fRent')||id==='fWalkMax'?'input':'change',render));
 $('searchToggle').addEventListener('click',()=>{const p=$('searchPanel');p.classList.toggle('hidden');$('searchToggle').textContent=p.classList.contains('hidden')?'検索条件を開く':'検索条件を閉じる';});
 $('clearFilters').addEventListener('click',()=>{['q','fWalkMax','fRentMin','fRentMax'].forEach(id=>$(id).value='');['fLine','fStructure','fLayout'].forEach(id=>$(id).value='');updateStations();$('sortBy').value='new';render();});
}
function updateStations(){const line=$('fLine').value;$('fStation').innerHTML=optionList(A.lines[line]||[],'すべて');}
function render(){
 const q=$('q').value.trim().toLowerCase(),line=$('fLine').value,station=$('fStation').value,structure=$('fStructure').value,layout=$('fLayout').value;
 const walkMax=Number($('fWalkMax').value||0),rentMin=Number($('fRentMin').value||0),rentMax=Number($('fRentMax').value||0);
 let rows=window.RentStore.read().filter(r=>{
   const h=latest(r),hay=[r.owner,r.building,r.line,r.station,r.structure,r.layout,r.memo,r.builtYearLabel].join(' ').toLowerCase();
   return (!q||hay.includes(q))&&(!line||r.line===line||r.lineChoice===line)&&(!station||r.station===station)&&(!structure||r.structure===structure)&&(!layout||r.layout===layout||r.layoutChoice===layout)&&(!walkMax||Number(r.walk||0)<=walkMax)&&(!rentMin||Number(h.newRent||0)>=rentMin)&&(!rentMax||Number(h.newRent||0)<=rentMax);
 });
 const sort=$('sortBy').value;
 rows.sort((a,b)=>{const ah=latest(a),bh=latest(b);if(sort==='rentDesc')return Number(bh.newRent||0)-Number(ah.newRent||0);if(sort==='rentAsc')return Number(ah.newRent||0)-Number(bh.newRent||0);if(sort==='walkAsc')return Number(a.walk||999)-Number(b.walk||999);if(sort==='ownerAsc')return String(a.owner||'').localeCompare(String(b.owner||''),'ja');return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));});
 $('count').textContent=rows.length+'件';
 $('list').innerHTML=rows.length?rows.map(r=>{const h=latest(r);return '<article class="card"><a class="card-main" href="detail.html?id='+encodeURIComponent(r.id)+'"><div class="owner">'+esc(r.owner||'顧問先名未入力')+'</div><h2>'+esc(r.building||'マンション名未入力')+'</h2><div class="meta">'+esc(r.line||'')+(r.station?' '+esc(r.station)+'駅':'')+(r.walk?' 徒歩'+r.walk+'分':'')+'</div><div class="meta">'+esc(r.layout||'')+(r.sqm?'・'+Number(r.sqm).toFixed(2)+'㎡':'')+'</div><div class="rent">'+(h.newRent?Number(h.newRent).toLocaleString('ja-JP')+'円':'家賃未入力')+'</div></a><div class="actions"><a class="btn secondary" href="edit.html?id='+encodeURIComponent(r.id)+'">編集</a><button class="btn danger delete" data-id="'+esc(r.id)+'">削除</button></div></article>';}).join(''):'<div class="empty">条件に合う登録がありません</div>';
}
function init(){$('version').textContent='v'+A.version;setupFilters();$('list').addEventListener('click',e=>{const b=e.target.closest('.delete');if(!b)return;if(confirm('このデータを削除しますか？')){window.RentStore.remove(b.dataset.id);render();}});render();}
document.addEventListener('DOMContentLoaded',init);
})();
