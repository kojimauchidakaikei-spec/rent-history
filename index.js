(function(){
'use strict';
const $=id=>document.getElementById(id); const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function latest(r){ if(Array.isArray(r.rentHistory)&&r.rentHistory.length)return r.rentHistory.slice().sort((a,b)=>String(b.revisionMonth||'').localeCompare(String(a.revisionMonth||'')))[0]; return {newRent:r.rent||0,revisionMonth:r.revisionMonth||''}; }
function render(){ const q=$('search').value.trim().toLowerCase(); const rows=window.RentStore.read().filter(r=>[r.owner,r.building,r.line,r.station,r.layout,r.memo].join(' ').toLowerCase().includes(q)); $('count').textContent=rows.length+'件';
$('list').innerHTML=rows.length?rows.map(r=>{const h=latest(r);return '<article class="card"><a class="card-main" href="detail.html?id='+encodeURIComponent(r.id)+'"><div class="owner">'+esc(r.owner||'顧問先名未入力')+'</div><h2>'+esc(r.building||'マンション名未入力')+'</h2><div class="meta">'+esc(r.line||'')+(r.station?' '+esc(r.station)+'駅':'')+(r.walk?' 徒歩'+r.walk+'分':'')+'</div><div class="meta">'+esc(r.layout||'')+(r.sqm?'・'+Number(r.sqm).toFixed(2)+'㎡':'')+'</div><div class="rent">'+(h.newRent?Number(h.newRent).toLocaleString('ja-JP')+'円':'家賃未入力')+'</div></a><div class="actions"><a class="btn secondary" href="edit.html?id='+encodeURIComponent(r.id)+'">編集</a><button class="btn danger delete" data-id="'+esc(r.id)+'">削除</button></div></article>';}).join(''):'<div class="empty">まだ登録がありません</div>';
}
function init(){ $('version').textContent='v'+window.RENT_APP.version; $('search').addEventListener('input',render); $('list').addEventListener('click',e=>{const b=e.target.closest('.delete'); if(!b)return; if(confirm('このデータを削除しますか？')){window.RentStore.remove(b.dataset.id);render();}}); render(); }
document.addEventListener('DOMContentLoaded',init);
})();
