(function(){
  'use strict';
  const A = window.RENT_APP;
  function read(){
    try {
      const v = JSON.parse(localStorage.getItem(A.storageKey) || '[]');
      return Array.isArray(v) ? v : [];
    } catch(e){ return []; }
  }
  function write(records){ localStorage.setItem(A.storageKey, JSON.stringify(records)); }
  function id(){ return 'r-' + Date.now() + '-' + Math.random().toString(36).slice(2,9); }
  function get(recordId){ return read().find(r => String(r.id) === String(recordId)) || null; }
  function save(record){
    const records = read();
    const i = records.findIndex(r => String(r.id) === String(record.id));
    if(i >= 0) records[i] = record; else records.unshift(record);
    write(records);
  }
  function remove(recordId){ write(read().filter(r => String(r.id) !== String(recordId))); }
  window.RentStore = { read, write, get, save, remove, id };
})();
