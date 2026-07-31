(function(){
  'use strict';
  const A = window.RENT_APP;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function options(list, first){ return '<option value="">'+first+'</option>'+list.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join(''); }
  function yearLabel(y){ if(y==='before1964') return '昭和39年以前'; const n=Number(y); if(!n)return ''; if(n<=1988)return '昭和'+(n-1925)+'年'; if(n===1989)return '平成元年'; if(n<=2018)return '平成'+(n-1988)+'年'; if(n===2019)return '令和元年'; return '令和'+(n-2018)+'年'; }
  function latest(record){
    if(Array.isArray(record.rentHistory) && record.rentHistory.length){
      return record.rentHistory.slice().sort((a,b)=>String(b.revisionMonth||'').localeCompare(String(a.revisionMonth||'')))[0];
    }
    return {revisionMonth:record.revisionMonth||'', newRent:record.rent||record.newRent||0};
  }
  function init(){
    $('lineChoice').innerHTML = options(Object.keys(A.lines),'選択');
    $('structure').innerHTML = options(A.structures,'選択');
    $('layoutChoice').innerHTML = options(A.layouts,'選択');
    const ys=['<option value="">選択</option>','<option value="before1964">昭和39年以前</option>'];
    for(let y=1965;y<=new Date().getFullYear();y++) ys.push('<option value="'+y+'">'+yearLabel(y)+'</option>');
    $('builtYearValue').innerHTML=ys.join('');
    $('lineChoice').addEventListener('change', updateStations);
    $('stationChoice').addEventListener('change', toggleOtherStation);
    $('layoutChoice').addEventListener('change', toggleOtherLayout);
    $('lineChoice').addEventListener('change', toggleOtherLine);
    $('sqm').addEventListener('input', updateTsubo);
    $('rent').addEventListener('input', updatePerTsubo);
    $('builtYearValue').addEventListener('change', updateAge);
    $('recordForm').addEventListener('submit', submit);
    const p=new URLSearchParams(location.search); const recordId=p.get('id');
    if(recordId) load(recordId);
    else { updateStations(); updateTsubo(); updateAge(); }
  }
  function updateStations(selected){
    const line=$('lineChoice').value; const stations=(A.lines[line]||[]).concat(['その他']);
    $('stationChoice').innerHTML=options(stations,'選択');
    if(typeof selected==='string' && stations.includes(selected)) $('stationChoice').value=selected;
    toggleOtherLine(); toggleOtherStation();
  }
  function toggleOtherLine(){ $('otherLineWrap').hidden=$('lineChoice').value!=='その他'; }
  function toggleOtherStation(){ $('otherStationWrap').hidden=$('stationChoice').value!=='その他'; }
  function toggleOtherLayout(){ $('otherLayoutWrap').hidden=$('layoutChoice').value!=='その他'; }
  function updateTsubo(){ const sqm=Number($('sqm').value||0); $('tsubo').value=sqm?(sqm/3.305785).toFixed(2):''; updatePerTsubo(); }
  function updatePerTsubo(){ const t=Number($('tsubo').value||0),r=Number($('rent').value||0); $('rentPerTsubo').value=t&&r?Math.round(r/t).toLocaleString('ja-JP'):''; }
  function updateAge(){ const y=$('builtYearValue').value, now=new Date().getFullYear(); $('age').value=y==='before1964'?'築'+(now-1964)+'年以上':y?'築'+(now-Number(y))+'年':''; }
  function load(recordId){
    const r=window.RentStore.get(recordId); if(!r){ alert('データが見つかりません'); location.href='index.html'; return; }
    $('recordId').value=r.id||''; $('owner').value=r.owner||''; $('building').value=r.building||''; $('walk').value=r.walk||'';
    const lc=A.lines[r.lineChoice]?r.lineChoice:(A.lines[r.line]?r.line:'その他'); $('lineChoice').value=lc; updateStations(r.stationChoice||r.station||'');
    if(lc==='その他') $('otherLine').value=r.line||'';
    if($('stationChoice').value==='その他' || !(A.lines[lc]||[]).includes(r.station||'')){ $('stationChoice').value='その他'; $('otherStation').value=r.station||''; }
    $('builtYearValue').value=r.builtYearValue||''; updateAge(); $('structure').value=r.structure||'';
    const layout=A.layouts.includes(r.layoutChoice)?r.layoutChoice:(A.layouts.includes(r.layout)?r.layout:'その他'); $('layoutChoice').value=layout; toggleOtherLayout(); if(layout==='その他')$('otherLayout').value=r.layout||'';
    $('sqm').value=r.sqm||''; updateTsubo(); const h=latest(r); $('revisionMonth').value=h.revisionMonth||''; $('rent').value=h.newRent||''; updatePerTsubo(); $('memo').value=r.memo||'';
  }
  function submit(e){
    e.preventDefault();
    const old=$('recordId').value?window.RentStore.get($('recordId').value):null;
    const lineChoice=$('lineChoice').value, stationChoice=$('stationChoice').value, layoutChoice=$('layoutChoice').value;
    const id=$('recordId').value||window.RentStore.id(); const rent=Number($('rent').value||0); const month=$('revisionMonth').value;
    const history=old&&Array.isArray(old.rentHistory)?old.rentHistory.slice():[];
    if(rent){ const hit=history.findIndex(h=>h.revisionMonth===month); const item={id:'h-'+Date.now(),revisionMonth:month,oldRent:hit>=0?Number(history[hit].oldRent||0):0,newRent:rent}; if(hit>=0)history[hit]=item; else history.push(item); }
    const record=Object.assign({},old||{}, {
      id, owner:$('owner').value.trim(), building:$('building').value.trim(), walk:Number($('walk').value||0),
      lineChoice, line:lineChoice==='その他'?$('otherLine').value.trim():lineChoice,
      stationChoice, station:stationChoice==='その他'?$('otherStation').value.trim():stationChoice,
      builtYearValue:$('builtYearValue').value, builtYearLabel:yearLabel($('builtYearValue').value),
      ageExact:$('builtYearValue').value==='before1964'?new Date().getFullYear()-1964:($('builtYearValue').value?new Date().getFullYear()-Number($('builtYearValue').value):0),
      ageAtLeast:$('builtYearValue').value==='before1964', structure:$('structure').value,
      layoutChoice, layout:layoutChoice==='その他'?$('otherLayout').value.trim():layoutChoice,
      sqm:Number($('sqm').value||0), tsubo:Number($('tsubo').value||0), rentHistory:history,
      revisionMonth:month, rent, memo:$('memo').value.trim(), updatedAt:new Date().toISOString()
    });
    window.RentStore.save(record); location.href='index.html?saved=1';
  }
  document.addEventListener('DOMContentLoaded',init);
})();
