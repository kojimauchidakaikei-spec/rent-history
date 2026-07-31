(() => {
  "use strict";

  const D = window.APP_DATA;
  const $ = id => document.getElementById(id);
  const money = n => Number(n || 0).toLocaleString("ja-JP");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uuid = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let records = [];
  let selectedId = null;
  let areaMode = "spinner";
  let photoData = "";

  function loadRecords() {
    try {
      const raw = localStorage.getItem(D.STORAGE_KEY);
      records = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(records)) records = [];
    } catch {
      records = [];
    }
  }

  function saveRecords() {
    localStorage.setItem(D.STORAGE_KEY, JSON.stringify(records));
  }

  function optionList(values, first = "選択") {
    return `<option value="">${first}</option>` + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  }

  function fillStaticOptions() {
    $("line").innerHTML = optionList(Object.keys(D.LINES));
    $("fLine").innerHTML = optionList(Object.keys(D.LINES), "すべて");
    $("layout").innerHTML = optionList(D.LAYOUTS);
    $("fLayout").innerHTML = optionList(D.LAYOUTS, "すべて");
    $("structure").innerHTML = optionList(D.STRUCTURES);
    $("fStructure").innerHTML = optionList(D.STRUCTURES, "すべて");

    $("sqmWhole").innerHTML = Array.from({length:191},(_,i)=>i+10).map(n=>`<option>${n}</option>`).join("");
    $("sqmDecimal").innerHTML = Array.from({length:100},(_,i)=>String(i).padStart(2,"0")).map(n=>`<option>${n}</option>`).join("");

    const years = [`<option value="">選択</option>`,`<option value="before1964">昭和39年以前</option>`];
    for(let y=1965; y<=new Date().getFullYear(); y++){
      const label = y<=1988 ? `昭和${y-1925}年` : y===1989 ? "平成元年" : y<=2018 ? `平成${y-1988}年` : y===2019 ? "令和元年" : `令和${y-2018}年`;
      years.push(`<option value="${y}">${label}</option>`);
    }
    $("builtYear").innerHTML = years.join("");

    $("featureChecks").innerHTML = D.FEATURES.map(f=>`<label class="check"><input type="checkbox" name="feature" value="${f}">${f}</label>`).join("");
    $("filterFeatures").innerHTML = D.FEATURES.map(f=>`<label class="check"><input type="checkbox" name="filterFeature" value="${f}">${f}</label>`).join("");

    setStations($("line"), $("station"));
    setStations($("fLine"), $("fStation"), "", "すべて");
  }

  function setStations(lineEl, stationEl, current = "", first = "選択") {
    const stations = D.LINES[lineEl.value] || [];
    stationEl.innerHTML = optionList([...stations, "その他"], first);
    if (current && [...stationEl.options].some(o => o.value === current)) stationEl.value = current;
  }

  function switchPanel(panelId) {
    document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.panel === panelId));
    document.querySelectorAll(".panel").forEach(panel => panel.classList.toggle("active", panel.id === panelId));
    $("fab").style.display = panelId === "listPanel" ? "block" : "none";
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function updateAge() {
    const value = $("builtYear").value;
    const current = new Date().getFullYear();
    $("ageDisplay").value = value === "before1964" ? `築${current - 1964}年以上` : value ? `築${current - Number(value)}年` : "";
  }

  function syncArea() {
    const sqm = areaMode === "manual"
      ? Number($("sqmManual").value || 0)
      : Number(`${$("sqmWhole").value}.${$("sqmDecimal").value}`);
    $("sqm").value = sqm ? sqm.toFixed(2) : "";
    $("tsubo").value = sqm ? (sqm / 3.305785).toFixed(2) : "";
    calculateHistoryRows();
  }

  function addHistoryRow(data = {}) {
    const row = document.createElement("div");
    row.className = "history-row";
    row.dataset.id = data.id || uuid();
    row.innerHTML = `
      <div class="history-head">
        <strong>家賃改定</strong>
        <button type="button" class="danger remove-history">削除</button>
      </div>
      <div class="grid">
        <div><label>改定年月</label><input class="hMonth" type="month" value="${esc(data.revisionMonth || "")}"></div>
        <div><label>改定前家賃（円）</label><input class="hOld" type="number" min="0" value="${data.oldRent || ""}"></div>
        <div><label>改定後家賃（円）*</label><input class="hNew" type="number" min="0" value="${data.newRent || ""}"></div>
        <div><label>値上げ額</label><input class="hRaise readonly" readonly></div>
        <div><label>坪単価</label><input class="hTsubo readonly" readonly></div>
        <div><label>坪当たり値上げ</label><input class="hRaiseTsubo readonly" readonly></div>
      </div>`;
    $("rentHistoryRows").appendChild(row);
    row.querySelector(".remove-history").addEventListener("click", () => {
      const rows = document.querySelectorAll(".history-row");
      if (rows.length <= 1) return alert("家賃履歴は1件以上必要です");
      row.remove();
    });
    row.querySelectorAll(".hOld,.hNew").forEach(el => el.addEventListener("input", calculateHistoryRows));
    calculateHistoryRows();
  }

  function calculateHistoryRows() {
    const tsubo = Number($("tsubo").value || 0);
    document.querySelectorAll(".history-row").forEach(row => {
      const oldRent = Number(row.querySelector(".hOld").value || 0);
      const newRent = Number(row.querySelector(".hNew").value || 0);
      const raise = newRent - oldRent;
      row.querySelector(".hRaise").value = oldRent && newRent ? raise : "";
      row.querySelector(".hTsubo").value = tsubo && newRent ? Math.round(newRent / tsubo) : "";
      row.querySelector(".hRaiseTsubo").value = tsubo && oldRent && newRent ? Math.round(raise / tsubo) : "";
    });
  }

  function resetForm() {
    $("propertyForm").reset();
    $("recordId").value = "";
    $("otherLineWrap").classList.add("hidden");
    $("otherStationWrap").classList.add("hidden");
    $("otherLayoutWrap").classList.add("hidden");
    $("ageDisplay").value = "";
    areaMode = "spinner";
    $("spinnerArea").classList.remove("hidden");
    $("manualArea").classList.add("hidden");
    $("toggleAreaModeBtn").textContent = "手入力に切替";
    $("sqmWhole").value = "50";
    $("sqmDecimal").value = "50";
    $("rentHistoryRows").innerHTML = "";
    addHistoryRow({revisionMonth:new Date().toISOString().slice(0,7)});
    photoData = "";
    $("photoPreview").src = "";
    $("photoPreview").style.display = "none";
    $("photoInput").value = "";
    syncArea();
    setStations($("line"), $("station"));
  }

  function getHistoryFromForm() {
    return [...document.querySelectorAll(".history-row")].map(row => ({
      id: row.dataset.id,
      revisionMonth: row.querySelector(".hMonth").value,
      oldRent: Number(row.querySelector(".hOld").value || 0),
      newRent: Number(row.querySelector(".hNew").value || 0)
    })).filter(h => h.newRent);
  }

  function latestHistory(record) {
    return [...(record.rentHistory || [])].sort((a,b)=>(b.revisionMonth || "").localeCompare(a.revisionMonth || ""))[0] || {oldRent:0,newRent:0,revisionMonth:""};
  }

  function metrics(record) {
    const latest = latestHistory(record);
    const tsubo = Number(record.tsubo || 0);
    const raise = latest.newRent - latest.oldRent;
    return {
      rent: latest.newRent,
      raise,
      perTsubo: tsubo && latest.newRent ? Math.round(latest.newRent / tsubo) : 0
    };
  }

  function buildRecordFromForm() {
    const builtValue = $("builtYear").value;
    const current = new Date().getFullYear();
    const lineChoice = $("line").value;
    const stationChoice = $("station").value;
    const layoutChoice = $("layout").value;

    return {
      id: $("recordId").value || uuid(),
      owner: $("owner").value.trim(),
      building: $("building").value.trim(),
      patternName: $("patternName").value.trim(),
      walk: Number($("walk").value || 0),
      lineChoice,
      line: lineChoice === "その他" ? $("otherLine").value.trim() : lineChoice,
      stationChoice,
      station: stationChoice === "その他" ? $("otherStation").value.trim() : stationChoice,
      builtYearValue: builtValue,
      builtYearLabel: $("builtYear").selectedOptions[0]?.text || "",
      ageExact: builtValue === "before1964" ? current - 1964 : builtValue ? current - Number(builtValue) : 0,
      ageAtLeast: builtValue === "before1964",
      structure: $("structure").value,
      layoutChoice,
      layout: layoutChoice === "その他" ? $("otherLayout").value.trim() : layoutChoice,
      sqm: Number($("sqm").value || 0),
      tsubo: Number($("tsubo").value || 0),
      rentHistory: getHistoryFromForm(),
      features: [...document.querySelectorAll('input[name="feature"]:checked')].map(x=>x.value),
      photo: photoData,
      memo: $("memo").value.trim(),
      updatedAt: new Date().toISOString()
    };
  }

  function loadRecordIntoForm(record, clone = false) {
    resetForm();
    $("recordId").value = clone ? "" : record.id;
    $("owner").value = record.owner || "";
    $("building").value = record.building || "";
    $("patternName").value = clone ? "" : (record.patternName || "");
    $("walk").value = record.walk || "";

    $("line").value = D.LINES[record.lineChoice] ? record.lineChoice : (D.LINES[record.line] ? record.line : "その他");
    $("line").dispatchEvent(new Event("change"));
    if ($("line").value === "その他") $("otherLine").value = record.line || "";

    setStations($("line"), $("station"), record.stationChoice || record.station);
    if (![...$("station").options].some(o => o.value === (record.stationChoice || record.station))) $("station").value = "その他";
    $("station").dispatchEvent(new Event("change"));
    if ($("station").value === "その他") $("otherStation").value = record.station || "";

    $("builtYear").value = record.builtYearValue || "";
    updateAge();
    $("structure").value = record.structure || "";

    if (!clone) {
      $("layout").value = D.LAYOUTS.includes(record.layoutChoice) ? record.layoutChoice : (D.LAYOUTS.includes(record.layout) ? record.layout : "その他");
      $("layout").dispatchEvent(new Event("change"));
      if ($("layout").value === "その他") $("otherLayout").value = record.layout || "";

      const [whole, decimal] = Number(record.sqm || 50.5).toFixed(2).split(".");
      $("sqmWhole").value = whole;
      $("sqmDecimal").value = decimal;
      syncArea();

      $("rentHistoryRows").innerHTML = "";
      (record.rentHistory || []).forEach(addHistoryRow);
      if (!(record.rentHistory || []).length) addHistoryRow();
    }

    document.querySelectorAll('input[name="feature"]').forEach(x => x.checked = (record.features || []).includes(x.value));
    photoData = record.photo || "";
    if (photoData) {
      $("photoPreview").src = photoData;
      $("photoPreview").style.display = "block";
    }
    $("memo").value = record.memo || "";
  }

  function renderCard(record) {
    const m = metrics(record);
    const age = record.ageAtLeast ? `築${record.ageExact}年以上` : record.ageExact ? `築${record.ageExact}年` : "";
    return `<article class="item" data-id="${record.id}">
      <div class="item-top">
        <div>
          <div class="owner">${esc(record.owner)}</div>
          <div class="building">${esc(record.building || "建物名未入力")}${record.patternName ? `<br><span class="small">${esc(record.patternName)}</span>` : ""}</div>
        </div>
        <div class="rent">${money(m.rent)}円</div>
      </div>
      <div class="meta">
        ${record.line || record.station ? `<span class="badge">${esc([record.line,record.station].filter(Boolean).join(" "))}${record.walk ? ` 徒歩${record.walk}分` : ""}</span>` : ""}
        ${record.structure ? `<span class="badge">${esc(record.structure)}</span>` : ""}
        ${record.layout ? `<span class="badge">${esc(record.layout)}</span>` : ""}
        ${age ? `<span class="badge">${age}</span>` : ""}
        <br>${record.sqm ? `${Number(record.sqm).toFixed(2)}㎡（${Number(record.tsubo).toFixed(2)}坪）` : ""}
        ${m.perTsubo ? `・坪単価 ${money(m.perTsubo)}円` : ""}
        ${m.raise ? `・直近値上げ ${m.raise > 0 ? "+" : ""}${money(m.raise)}円` : ""}
      </div>
      ${(record.features || []).map(f=>`<span class="badge">${esc(f)}</span>`).join("")}
      ${record.memo ? `<div class="memo">${esc(record.memo)}</div>` : ""}
    </article>`;
  }

  function renderList() {
    const sorted = [...records].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
    $("listCount").textContent = `全${sorted.length}件`;
    $("propertyList").innerHTML = sorted.length ? sorted.map(renderCard).join("") : `<div class="empty">まだ物件が登録されていません</div>`;
  }

  function filteredRecords() {
    const q = $("q").value.trim().toLowerCase();
    const line = $("fLine").value;
    const station = $("fStation").value;
    const structure = $("fStructure").value;
    const layout = $("fLayout").value;
    const walk = Number($("fWalkMax").value || 0);
    const ageMin = Number($("fAgeMin").value || 0);
    const ageMax = Number($("fAgeMax").value || 0);
    const rentMin = Number($("fRentMin").value || 0);
    const rentMax = Number($("fRentMax").value || 0);
    const tsuboMin = Number($("fTsuboMin").value || 0);
    const raiseRaw = $("fRaiseMin").value;
    const raiseMin = raiseRaw === "" ? null : Number(raiseRaw);
    const featureFilters = [...document.querySelectorAll('input[name="filterFeature"]:checked')].map(x=>x.value);

    const result = records.filter(record => {
      const m = metrics(record);
      const text = [record.owner,record.building,record.patternName,record.line,record.station,record.structure,record.layout,record.memo].join(" ").toLowerCase();
      return (!q || text.includes(q))
        && (!line || record.lineChoice === line || record.line === line)
        && (!station || record.stationChoice === station || record.station === station)
        && (!structure || record.structure === structure)
        && (!layout || record.layoutChoice === layout || record.layout === layout)
        && (!walk || record.walk <= walk)
        && (!ageMin || record.ageExact >= ageMin)
        && (!ageMax || (!record.ageAtLeast && record.ageExact <= ageMax))
        && (!rentMin || m.rent >= rentMin)
        && (!rentMax || m.rent <= rentMax)
        && (!tsuboMin || m.perTsubo >= tsuboMin)
        && (raiseMin === null || m.raise >= raiseMin)
        && featureFilters.every(f => (record.features || []).includes(f));
    });

    const sort = $("sortBy").value;
    return result.sort((a,b) => {
      if (sort === "rentDesc") return metrics(b).rent - metrics(a).rent;
      if (sort === "tsuboDesc") return metrics(b).perTsubo - metrics(a).perTsubo;
      if (sort === "raiseDesc") return metrics(b).raise - metrics(a).raise;
      if (sort === "walkAsc") return a.walk - b.walk;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }

  function renderSearch() {
    const result = filteredRecords();
    $("searchCount").textContent = `${result.length}件表示 / 全${records.length}件`;
    $("searchList").innerHTML = result.length ? result.map(renderCard).join("") : `<div class="empty">該当する物件がありません</div>`;
  }

  function openDetail(id) {
    selectedId = id;
    const record = records.find(r => r.id === id);
    if (!record) return;
    const m = metrics(record);
    const age = record.ageAtLeast ? `築${record.ageExact}年以上` : record.ageExact ? `築${record.ageExact}年` : "未入力";
    const histories = [...(record.rentHistory || [])]
      .sort((a,b)=>(b.revisionMonth || "").localeCompare(a.revisionMonth || ""))
      .map(h => {
        const raise = h.newRent - h.oldRent;
        return `<div class="history-row">
          <strong>${esc(h.revisionMonth || "年月未入力")}</strong>
          <div class="meta">改定前 ${h.oldRent ? money(h.oldRent)+"円" : "未入力"} → 改定後 ${money(h.newRent)}円<br>値上げ ${raise > 0 ? "+" : ""}${money(raise)}円</div>
        </div>`;
      }).join("");

    $("detailBody").innerHTML = `
      ${record.photo ? `<img class="detail-photo" src="${record.photo}">` : ""}
      <div class="owner">${esc(record.owner)}　${esc(record.building || "")}</div>
      ${record.patternName ? `<div class="building top-gap">${esc(record.patternName)}</div>` : ""}
      <div class="meta top-gap">
        路線・駅：${esc([record.line,record.station].filter(Boolean).join(" ") || "未入力")} ${record.walk ? `（徒歩${record.walk}分）` : ""}<br>
        建築年次：${esc(record.builtYearLabel || "未入力")}（${age}）<br>
        構造：${esc(record.structure || "未入力")}<br>
        間取り：${esc(record.layout || "未入力")}<br>
        面積：${record.sqm ? `${Number(record.sqm).toFixed(2)}㎡（${Number(record.tsubo).toFixed(2)}坪）` : "未入力"}<br>
        現在家賃：${money(m.rent)}円<br>
        現在坪単価：${money(m.perTsubo)}円
      </div>
      ${(record.features || []).length ? `<h3>賃貸条件</h3>${record.features.map(f=>`<span class="badge">${esc(f)}</span>`).join("")}` : ""}
      <h3>家賃履歴</h3>${histories || '<div class="empty">履歴なし</div>'}
      ${record.memo ? `<h3>メモ</h3><div class="memo">${esc(record.memo)}</div>` : ""}`;
    $("detailDialog").showModal();
  }

  function bindEvents() {
    document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => switchPanel(btn.dataset.panel)));

    $("fab").addEventListener("click", () => { resetForm(); switchPanel("formPanel"); });
    $("versionBtn").addEventListener("click", () => $("versionDialog").showModal());
    $("openDataBtn").addEventListener("click", () => $("dataDialog").showModal());
    document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => $(btn.dataset.close).close()));

    $("line").addEventListener("change", () => {
      setStations($("line"), $("station"));
      $("otherLineWrap").classList.toggle("hidden", $("line").value !== "その他");
    });
    $("station").addEventListener("change", () => $("otherStationWrap").classList.toggle("hidden", $("station").value !== "その他"));
    $("layout").addEventListener("change", () => {
      $("otherLayoutWrap").classList.toggle("hidden", $("layout").value !== "その他");
      const d = D.AREA_DEFAULTS[$("layout").value];
      if (d) { $("sqmWhole").value = d; $("sqmDecimal").value = "50"; syncArea(); }
    });
    $("builtYear").addEventListener("change", updateAge);
    $("sqmWhole").addEventListener("change", syncArea);
    $("sqmDecimal").addEventListener("change", syncArea);
    $("sqmManual").addEventListener("input", syncArea);

    $("toggleAreaModeBtn").addEventListener("click", () => {
      areaMode = areaMode === "spinner" ? "manual" : "spinner";
      $("spinnerArea").classList.toggle("hidden", areaMode !== "spinner");
      $("manualArea").classList.toggle("hidden", areaMode !== "manual");
      $("toggleAreaModeBtn").textContent = areaMode === "spinner" ? "手入力に切替" : "コロコロ入力に戻す";
      if (areaMode === "manual") $("sqmManual").value = $("sqm").value;
      syncArea();
    });

    $("addHistoryBtn").addEventListener("click", () => addHistoryRow({revisionMonth:new Date().toISOString().slice(0,7)}));
    $("resetFormBtn").addEventListener("click", resetForm);

    $("propertyForm").addEventListener("submit", event => {
      event.preventDefault();
      syncArea();
      const record = buildRecordFromForm();
      if (!record.rentHistory.length) return alert("改定後家賃を入力してください");
      const index = records.findIndex(r => r.id === record.id);
      if (index >= 0) records[index] = record; else records.unshift(record);
      saveRecords();
      renderList();
      renderSearch();
      resetForm();
      switchPanel("listPanel");
      alert("保存しました");
    });

    document.addEventListener("click", event => {
      const card = event.target.closest(".item[data-id]");
      if (card) openDetail(card.dataset.id);
    });

    $("editBtn").addEventListener("click", () => {
      const record = records.find(r => r.id === selectedId);
      if (!record) return;
      $("detailDialog").close();
      loadRecordIntoForm(record, false);
      switchPanel("formPanel");
    });

    $("cloneBtn").addEventListener("click", () => {
      const record = records.find(r => r.id === selectedId);
      if (!record) return;
      $("detailDialog").close();
      loadRecordIntoForm(record, true);
      switchPanel("formPanel");
      setTimeout(() => $("patternName").focus(), 100);
    });

    $("deleteBtn").addEventListener("click", () => {
      if (!confirm("この物件を削除しますか？")) return;
      records = records.filter(r => r.id !== selectedId);
      saveRecords();
      renderList();
      renderSearch();
      $("detailDialog").close();
    });

    $("fLine").addEventListener("change", () => { setStations($("fLine"), $("fStation"), "", "すべて"); renderSearch(); });
    ["q","fStation","fStructure","fLayout","fWalkMax","fAgeMin","fAgeMax","fRentMin","fRentMax","fTsuboMin","fRaiseMin","sortBy"].forEach(id => {
      $(id).addEventListener("input", renderSearch);
      $(id).addEventListener("change", renderSearch);
    });
    document.querySelectorAll('input[name="filterFeature"]').forEach(x => x.addEventListener("change", renderSearch));

    $("clearFiltersBtn").addEventListener("click", () => {
      ["q","fLine","fStation","fStructure","fLayout","fWalkMax","fAgeMin","fAgeMax","fRentMin","fRentMax","fTsuboMin","fRaiseMin"].forEach(id => $(id).value = "");
      $("sortBy").value = "new";
      document.querySelectorAll('input[name="filterFeature"]').forEach(x => x.checked = false);
      renderSearch();
    });

    $("photoInput").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, 900 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        photoData = canvas.toDataURL("image/jpeg", .72);
        $("photoPreview").src = photoData;
        $("photoPreview").style.display = "block";
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

    $("removePhotoBtn").addEventListener("click", () => {
      photoData = "";
      $("photoPreview").src = "";
      $("photoPreview").style.display = "none";
      $("photoInput").value = "";
    });

    $("exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify({version:D.VERSION, exportedAt:new Date().toISOString(), records}, null, 2)], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `賃料履歴バックアップ_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $("importBtn").addEventListener("click", () => $("importFile").click());
    $("importFile").addEventListener("change", async event => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const obj = JSON.parse(await file.text());
        const incoming = Array.isArray(obj) ? obj : obj.records;
        if (!Array.isArray(incoming)) throw new Error();
        if (confirm(`${incoming.length}件のデータで置き換えますか？`)) {
          records = incoming;
          saveRecords();
          renderList();
          renderSearch();
          $("dataDialog").close();
        }
      } catch {
        alert("読み込めないファイルです");
      }
      event.target.value = "";
    });

    $("deleteAllBtn").addEventListener("click", () => {
      if (!confirm("全データを削除します。元に戻せません。")) return;
      records = [];
      saveRecords();
      renderList();
      renderSearch();
      $("dataDialog").close();
    });
  }

  function init() {
    loadRecords();
    fillStaticOptions();
    bindEvents();
    resetForm();
    renderList();
    renderSearch();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  }

  document.addEventListener("DOMContentLoaded", init);
})();