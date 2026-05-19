
const STORAGE_KEY = 'supplierPriceRecordsV1_onlineFallback';
let records = [];
let sortKey = '价格';
let sortDir = 'asc';
const INITIAL_UPDATE_DATE = '2026-5-19';
const RENAME_FIELDS = ['品名','口径','颜色','容量','供应商'];

const $ = id => document.getElementById(id);
const fields = {
  id: $('recordId'), product: $('productName'), diameter: $('diameter'), color: $('color'),
  capacity: $('capacity'), supplier: $('supplier'), price: $('price'), link: $('productLink'), note: $('note')
};
const filters = {
  品名: $('filterProduct'), 口径: $('filterDiameter'), 颜色: $('filterColor'),
  容量: $('filterCapacity'), 供应商: $('filterSupplier')
};
let activeFilters = emptyFilterState();
const filterWidgets = {};

const supabaseReady = !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase);
const db = supabaseReady ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;

function setDbStatus(text, ok=false){
  const el = $('dbStatus');
  if(!el) return;
  el.textContent = text;
  el.className = ok ? 'db-status ok' : 'db-status warn';
}
function dbDateToText(dateStr){
  if(!dateStr) return INITIAL_UPDATE_DATE;
  const d = new Date(dateStr + 'T00:00:00');
  if(Number.isNaN(d.getTime())) return String(dateStr);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function todayText(){
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function todaySqlDate(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function textToSqlDate(text){
  if(!text) return todaySqlDate();
  const parts = String(text).trim().split('-');
  if(parts.length === 3){
    return `${String(parts[0]).padStart(4,'0')}-${String(parts[1]).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`;
  }
  return todaySqlDate();
}
function dbRowToRecord(row){
  return normalizeRecord({
    id: row.id,
    品名: row.product_name || '',
    口径: row.diameter || '',
    颜色: row.color || '',
    容量: row.capacity || '',
    供应商: row.supplier || '',
    价格: Number(row.price || 0),
    更新时间: dbDateToText(row.update_date),
    商品链接: row.product_link || '',
    备注: row.note || '',
    历史价格: []
  });
}
function recordToDbRow(record){
  return {
    product_name: record.品名 || '',
    diameter: record.口径 || '',
    color: record.颜色 || '',
    capacity: record.容量 || '',
    supplier: record.供应商 || '',
    price: Number(record.价格 || 0),
    update_date: textToSqlDate(record.更新时间 || todayText()),
    product_link: record.商品链接 || '',
    note: record.备注 || ''
  };
}
function normalizeRecord(record){
  return {
    ...record,
    更新时间: record.更新时间 || INITIAL_UPDATE_DATE,
    商品链接: record.商品链接 || '',
    备注: record.备注 || '',
    历史价格: Array.isArray(record.历史价格) ? record.历史价格 : []
  };
}
function loadLocalRecords(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved){
    try {
      const parsed = JSON.parse(saved).map(normalizeRecord);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    } catch(e){}
  }
  const initial = window.INITIAL_DATA.map(normalizeRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}
async function loadRecords(){
  if(!db){
    records = loadLocalRecords();
    setDbStatus('未配置 Supabase，当前为本地备用模式。请填写 config.js 后再使用在线同步。', false);
    return;
  }
  const { data, error } = await db.from('supplier_records').select('*').order('id', { ascending: true });
  if(error){
    console.error(error);
    records = loadLocalRecords();
    setDbStatus('数据库连接失败，当前为本地备用模式。请检查 Supabase URL / Key / SQL 建表是否完成。', false);
    return;
  }
  records = (data || []).map(dbRowToRecord);
  setDbStatus(`已连接在线数据库，共 ${records.length} 条记录。`, true);
}
function saveLocalRecords(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function nextId(){ return records.length ? Math.max(...records.map(r => Number(r.id)||0)) + 1 : 1; }
function normalize(v){ return String(v ?? '').trim().toLowerCase(); }
function emptyFilterState(){ return { 品名: [], 口径: [], 颜色: [], 容量: [], 供应商: [] }; }
function selectedValues(select){ return Array.from(select.selectedOptions).map(o => o.value).filter(v => String(v).trim() !== ''); }
function readPendingFilters(){ return Object.fromEntries(Object.entries(filters).map(([key, input]) => [key, selectedValues(input)])); }
function clearSelect(select){ Array.from(select.options).forEach(o => o.selected = false); }
function escapeHtml(str){ return String(str ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }
function escapeAttr(str){ return escapeHtml(str).replace(/\n/g, '&#10;'); }
function formatPrice(p){ return Number(p || 0).toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:4}); }
function shortText(str, max=18){
  const text = String(str ?? '').trim();
  if(!text) return '点击添加';
  return text.length > max ? text.slice(0, max) + '…' : text;
}
function displayUrl(url){ return shortText(url, 28); }

function initFilterDropdowns(){
  Object.entries(filters).forEach(([key, select]) => {
    const label = select.closest('label');
    if(label) label.classList.add('filter-label');
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-dropdown';
    wrapper.dataset.filterKey = key;
    wrapper.innerHTML = `<button type="button" class="filter-trigger">全部</button><div class="filter-menu"></div>`;
    select.insertAdjacentElement('afterend', wrapper);
    filterWidgets[key] = wrapper;
    wrapper.querySelector('.filter-trigger').addEventListener('click', e => {
      e.stopPropagation();
      Object.values(filterWidgets).forEach(w => { if(w !== wrapper) w.classList.remove('open'); });
      wrapper.classList.toggle('open');
    });
    wrapper.querySelector('.filter-menu').addEventListener('click', e => e.stopPropagation());
  });
  document.addEventListener('click', () => Object.values(filterWidgets).forEach(w => w.classList.remove('open')));
}
function syncFilterDropdowns(){
  Object.entries(filters).forEach(([key, select]) => {
    const wrapper = filterWidgets[key];
    if(!wrapper) return;
    const menu = wrapper.querySelector('.filter-menu');
    const trigger = wrapper.querySelector('.filter-trigger');
    const options = Array.from(select.options);
    const selected = selectedValues(select);
    if(!options.length){
      menu.innerHTML = '<div class="filter-empty">暂无可选项</div>';
    } else {
      menu.innerHTML = options.map((opt, idx) => `
        <label class="filter-option" title="${escapeAttr(opt.value)}">
          <input type="checkbox" data-option-index="${idx}" ${opt.selected ? 'checked' : ''} />
          <span>${escapeHtml(opt.textContent)}</span>
        </label>`).join('');
      menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const index = Number(cb.dataset.optionIndex);
          if(select.options[index]) select.options[index].selected = cb.checked;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }
    if(selected.length === 0){
      trigger.innerHTML = '<span class="filter-summary">全部</span>';
      trigger.title = '全部';
    } else if(selected.length <= 2){
      trigger.textContent = selected.join('、');
      trigger.title = selected.join('、');
    } else {
      trigger.textContent = `已选 ${selected.length} 项`;
      trigger.title = selected.join('、');
    }
  });
}
function recordMatchesFilter(recordValue, selectedList){
  if(!selectedList || selectedList.length === 0) return true;
  const value = normalize(recordValue);
  return selectedList.some(v => normalize(v) === value);
}
function getFiltered(){
  let list = records.filter(r => Object.entries(activeFilters).every(([key, selectedList]) => recordMatchesFilter(r[key], selectedList)));
  list.sort((a,b)=>{
    let av=a[sortKey] ?? '', bv=b[sortKey] ?? '';
    if(sortKey === '价格'){ av=Number(av); bv=Number(bv); }
    else { av=String(av); bv=String(bv); }
    const res = av > bv ? 1 : av < bv ? -1 : 0;
    return sortDir === 'asc' ? res : -res;
  });
  return list;
}
function render(){
  const list = getFiltered();
  const min = list.length ? Math.min(...list.map(r => Number(r.价格))) : null;
  $('totalCount').textContent = list.length;
  $('minPrice').textContent = min === null ? '-' : `${formatPrice(min)} 元/个`;
  $('emptyState').style.display = list.length ? 'none' : 'block';
  $('tableBody').innerHTML = list.map(r => `
    <tr class="${Number(r.价格) === min ? 'lowest' : ''}">
      <td>${escapeHtml(r.品名)}</td>
      <td>${escapeHtml(r.口径 || '-')}</td>
      <td>${escapeHtml(r.颜色 || '-')}</td>
      <td>${escapeHtml(r.容量 || '-')}</td>
      <td>${escapeHtml(r.供应商)}</td>
      <td class="price">${formatPrice(r.价格)}</td>
      <td><button class="cell-btn link-cell" title="${escapeAttr(r.商品链接 || '点击添加商品链接')}" onclick="openLinkNoteModal(${r.id}, 'link')">${escapeHtml(displayUrl(r.商品链接))}</button></td>
      <td><button class="cell-btn note-cell" title="${escapeAttr(r.备注 || '点击添加备注')}" onclick="openLinkNoteModal(${r.id}, 'note')">${escapeHtml(shortText(r.备注, 20))}</button></td>
      <td>${escapeHtml(r.更新时间 || INITIAL_UPDATE_DATE)}</td>
      <td class="actions">
        <button class="btn small" onclick="editRecord(${r.id})">编辑</button>
        <button class="btn small" onclick="openHistoryModal(${r.id})">历史价格</button>
        <button class="btn danger" onclick="deleteRecord(${r.id})">删除</button>
      </td>
    </tr>`).join('');
  refreshDatalists();
  refreshRenameDatalist();
}
function recordsMatchedByOtherPendingFilters(currentKey){
  const pending = readPendingFilters();
  return records.filter(r => Object.entries(pending).every(([key, selectedList]) => {
    if(key === currentKey) return true;
    return recordMatchesFilter(r[key], selectedList);
  }));
}
function uniqueValues(key, source=records){
  return [...new Set(source.map(r => r[key]).filter(v => String(v ?? '').trim() !== ''))]
    .sort((a,b)=>String(a).localeCompare(String(b),'zh-CN'));
}
function refreshDatalists(){
  Object.entries(filters).forEach(([key, select]) => {
    const selected = selectedValues(select);
    const values = [...new Set([...uniqueValues(key, recordsMatchedByOtherPendingFilters(key)), ...selected])]
      .sort((a,b)=>String(a).localeCompare(String(b),'zh-CN'));
    select.innerHTML = values.map(v => `<option value="${escapeAttr(v)}" ${selected.some(x => normalize(x) === normalize(v)) ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
  });
  syncFilterDropdowns();
}
function refreshRenameDatalist(){
  const key = $('renameField').value || '品名';
  $('renameOldList').innerHTML = uniqueValues(key).map(v => `<option value="${escapeAttr(v)}"></option>`).join('');
}

$('priceForm').addEventListener('submit', async e => {
  e.preventDefault();
  const item = normalizeRecord({
    id: nextId(),
    品名: fields.product.value.trim(), 口径: fields.diameter.value.trim(), 颜色: fields.color.value.trim(), 容量: fields.capacity.value.trim(),
    供应商: fields.supplier.value.trim(), 价格: Number(fields.price.value), 更新时间: todayText(),
    商品链接: fields.link.value.trim(), 备注: fields.note.value.trim(), 历史价格: []
  });
  if(db){
    const { error } = await db.from('supplier_records').insert(recordToDbRow(item));
    if(error) return alert('新增失败：' + error.message);
    await loadRecords();
  } else {
    records.push(item); saveLocalRecords();
  }
  clearForm(); render();
});

$('renameForm').addEventListener('submit', async e => {
  e.preventDefault();
  const key = $('renameField').value;
  const oldValue = $('renameOldValue').value.trim();
  const newValue = $('renameNewValue').value.trim();
  if(!RENAME_FIELDS.includes(key)) return alert('请选择需要统一修改的字段。');
  if(!oldValue) return alert('请输入需要被替换的原名称。');
  if(!newValue) return alert('请输入修改后的新名称。');
  const matched = records.filter(r => String(r[key] ?? '') === oldValue);
  if(!matched.length) return alert('没有找到完全匹配的记录。请从候选项选择或检查输入。');
  if(!confirm(`确定把 ${matched.length} 条记录的【${key}】从「${oldValue}」统一修改为「${newValue}」吗？`)) return;
  if(db){
    const colMap = { 品名:'product_name', 口径:'diameter', 颜色:'color', 容量:'capacity', 供应商:'supplier' };
    const { error } = await db.from('supplier_records')
      .update({ [colMap[key]]: newValue, update_date: todaySqlDate(), updated_at: new Date().toISOString() })
      .eq(colMap[key], oldValue);
    if(error) return alert('统一修改失败：' + error.message);
    await loadRecords();
  } else {
    records = records.map(r => String(r[key] ?? '') === oldValue ? { ...r, [key]: newValue, 更新时间: todayText() } : r);
    saveLocalRecords();
  }
  $('renameOldValue').value = ''; $('renameNewValue').value = '';
  render();
  alert(`已完成：${matched.length} 条记录已统一修改。`);
});
$('renameField').addEventListener('change', refreshRenameDatalist);

function editRecord(id){
  const r = records.find(x => Number(x.id) === Number(id)); if(!r) return;
  $('editRecordId').value = r.id;
  $('editProductName').value = r.品名 || '';
  $('editDiameter').value = r.口径 || '';
  $('editColor').value = r.颜色 || '';
  $('editCapacity').value = r.容量 || '';
  $('editSupplier').value = r.供应商 || '';
  $('editPrice').value = r.价格;
  $('editProductLink').value = r.商品链接 || '';
  $('editNote').value = r.备注 || '';
  openModal('editModal');
}
$('editForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = Number($('editRecordId').value);
  const idx = records.findIndex(r => Number(r.id) === id);
  if(idx < 0) return;
  const old = normalizeRecord(records[idx]);
  const updated = normalizeRecord({
    ...old,
    品名: $('editProductName').value.trim(),
    口径: $('editDiameter').value.trim(),
    颜色: $('editColor').value.trim(),
    容量: $('editCapacity').value.trim(),
    供应商: $('editSupplier').value.trim(),
    价格: Number($('editPrice').value),
    商品链接: $('editProductLink').value.trim(),
    备注: $('editNote').value.trim(),
    更新时间: todayText(),
    历史价格: [...old.历史价格]
  });
  if(db){
    if(Number(old.价格) !== Number(updated.价格)){
      const { error: histError } = await db.from('price_history').insert({
        record_id: id,
        price: Number(old.价格),
        edit_date: textToSqlDate(old.更新时间 || INITIAL_UPDATE_DATE)
      });
      if(histError) return alert('历史价格保存失败：' + histError.message);
    }
    const { error } = await db.from('supplier_records').update({ ...recordToDbRow(updated), updated_at: new Date().toISOString() }).eq('id', id);
    if(error) return alert('修改失败：' + error.message);
    await loadRecords();
  } else {
    if(Number(old.价格) !== Number(updated.价格)){
      updated.历史价格.unshift({ price: Number(old.价格), time: old.更新时间 || INITIAL_UPDATE_DATE });
      updated.历史价格 = updated.历史价格.slice(0, 50);
    }
    records[idx] = updated; saveLocalRecords();
  }
  closeModal('editModal'); render();
});

async function deleteRecord(id){
  if(!confirm('确定删除这条价格记录吗？')) return;
  if(db){
    const { error } = await db.from('supplier_records').delete().eq('id', id);
    if(error) return alert('删除失败：' + error.message);
    await loadRecords();
  } else {
    records = records.filter(r => Number(r.id) !== Number(id)); saveLocalRecords();
  }
  render();
}
function clearForm(){
  $('priceForm').reset(); fields.id.value=''; $('formTitle').textContent = '新增价格记录';
}
$('clearFormBtn').addEventListener('click', clearForm);
Object.values(filters).forEach(input => input.addEventListener('change', refreshDatalists));
$('applyFiltersBtn').addEventListener('click', () => {
  activeFilters = readPendingFilters();
  render();
});
$('clearFiltersBtn').addEventListener('click', () => {
  Object.values(filters).forEach(clearSelect);
  activeFilters = emptyFilterState();
  render();
});
document.querySelectorAll('th[data-sort]').forEach(th => th.addEventListener('click', () => {
  const key = th.dataset.sort;
  if(sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc'; else { sortKey = key; sortDir = 'asc'; }
  render();
}));

async function syncInitialDataToDb(){
  if(!db) return alert('未连接 Supabase。请先填写 config.js 里的 Supabase URL 和 anon key。');
  if(!confirm('确定把数据库重置为初始180条数据吗？当前在线数据库里的新增/修改数据会被覆盖。')) return;
  const { error: histDel } = await db.from('price_history').delete().neq('id', -1);
  if(histDel) return alert('清空历史价格失败：' + histDel.message);
  const { error: recDel } = await db.from('supplier_records').delete().neq('id', -1);
  if(recDel) return alert('清空记录失败：' + recDel.message);
  const rows = window.INITIAL_DATA.map(r => ({
    id: r.id,
    product_name: r.品名 || '',
    diameter: r.口径 || '',
    color: r.颜色 || '',
    capacity: r.容量 || '',
    supplier: r.供应商 || '',
    price: Number(r.价格 || 0),
    update_date: textToSqlDate(r.更新时间 || INITIAL_UPDATE_DATE),
    product_link: r.商品链接 || '',
    note: r.备注 || ''
  }));
  const { error } = await db.from('supplier_records').insert(rows);
  if(error) return alert('导入初始数据失败：' + error.message);
  await loadRecords(); render();
  alert('在线数据库已初始化完成。');
}
$('initDbBtn').addEventListener('click', syncInitialDataToDb);
$('resetBtn').addEventListener('click', syncInitialDataToDb);

$('exportCsvBtn').addEventListener('click', async () => {
  const header = ['品名','口径','颜色','容量','供应商','价格（元/个）','更新时间','商品链接','备注','历史价格'];
  let historyMap = {};
  if(db){
    const { data: histories } = await db.from('price_history').select('*').order('created_at', { ascending: false });
    (histories || []).forEach(h => {
      if(!historyMap[h.record_id]) historyMap[h.record_id] = [];
      historyMap[h.record_id].push(`${dbDateToText(h.edit_date)}:${Number(h.price)}`);
    });
  }
  const rows = getFiltered().map(r => [r.品名,r.口径,r.颜色,r.容量,r.供应商,r.价格,r.更新时间 || INITIAL_UPDATE_DATE,r.商品链接 || '',r.备注 || '', db ? (historyMap[r.id] || []).join(' | ') : (r.历史价格 || []).map(h => `${h.time}:${h.price}`).join(' | ')]);
  const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '供应商价格查询结果.csv'; a.click(); URL.revokeObjectURL(a.href);
});

async function openHistoryModal(id){
  const r = records.find(x => Number(x.id) === Number(id)); if(!r) return;
  $('historyRecordId').value = id;
  $('historyTitle').textContent = `${r.品名} / ${r.口径 || '-'} / ${r.颜色 || '-'} / ${r.容量 || '-'} / ${r.供应商}`;
  if(db){
    const { data, error } = await db.from('price_history').select('*').eq('record_id', id).order('created_at', { ascending: false }).limit(5);
    if(error) return alert('读取历史价格失败：' + error.message);
    r.历史价格 = (data || []).map(h => ({ id: h.id, price: Number(h.price), time: dbDateToText(h.edit_date) }));
  }
  renderHistoryRows(r);
  openModal('historyModal');
}
function renderHistoryRows(record){
  const history = record.历史价格 || [];
  const recent = history.slice(0,5);
  $('historyEmpty').style.display = recent.length ? 'none' : 'block';
  $('historyRows').innerHTML = recent.map((h, i) => `
    <tr data-history-id="${escapeAttr(h.id || '')}">
      <td><input class="history-price" type="number" min="0" step="0.0001" value="${escapeAttr(h.price)}" /></td>
      <td><input class="history-time" value="${escapeAttr(h.time || '')}" placeholder="如：2026-5-19" /></td>
      <td class="actions"><button class="btn small" onclick="saveHistoryItem(${i})">保存</button><button class="btn danger" onclick="deleteHistoryItem(${i})">删除</button></td>
    </tr>`).join('');
}
async function saveHistoryItem(index){
  const id = Number($('historyRecordId').value);
  const r = records.find(x => Number(x.id) === id); if(!r) return;
  const rows = Array.from(document.querySelectorAll('#historyRows tr'));
  const row = rows[index]; if(!row) return;
  const price = Number(row.querySelector('.history-price').value);
  const time = row.querySelector('.history-time').value.trim();
  if(Number.isNaN(price) || price < 0) return alert('请输入正确的历史价格。');
  if(!time) return alert('请输入编辑时间。');
  if(db){
    const historyId = Number(row.dataset.historyId);
    const { error } = await db.from('price_history').update({ price, edit_date: textToSqlDate(time) }).eq('id', historyId);
    if(error) return alert('保存历史价格失败：' + error.message);
    await openHistoryModal(id);
  } else {
    r.历史价格[index] = { price, time };
    saveLocalRecords(); render(); await openHistoryModal(id);
  }
}
async function deleteHistoryItem(index){
  if(!confirm('确定删除这条历史价格吗？')) return;
  const id = Number($('historyRecordId').value);
  const r = records.find(x => Number(x.id) === id); if(!r) return;
  if(db){
    const row = Array.from(document.querySelectorAll('#historyRows tr'))[index];
    const historyId = Number(row?.dataset.historyId);
    const { error } = await db.from('price_history').delete().eq('id', historyId);
    if(error) return alert('删除历史价格失败：' + error.message);
    await openHistoryModal(id);
  } else {
    r.历史价格.splice(index,1);
    saveLocalRecords(); render(); await openHistoryModal(id);
  }
}
async function openLinkNoteModal(id, mode){
  const r = records.find(x => Number(x.id) === Number(id)); if(!r) return;
  $('linkNoteRecordId').value = id;
  $('linkNoteMode').value = mode;
  $('linkNoteTitle').textContent = mode === 'link' ? '编辑商品链接' : '编辑备注';
  $('linkInputWrap').style.display = mode === 'link' ? 'grid' : 'none';
  $('noteInputWrap').style.display = mode === 'note' ? 'grid' : 'none';
  $('modalProductInfo').textContent = `${r.品名} / ${r.口径 || '-'} / ${r.颜色 || '-'} / ${r.容量 || '-'} / ${r.供应商}`;
  $('modalProductLink').value = r.商品链接 || '';
  $('modalNote').value = r.备注 || '';
  const hasLink = !!(r.商品链接 || '').trim();
  $('openProductLinkBtn').style.display = mode === 'link' && hasLink ? 'inline-flex' : 'none';
  $('openProductLinkBtn').onclick = () => {
    const url = $('modalProductLink').value.trim();
    if(url) window.open(url, '_blank');
  };
  openModal('linkNoteModal');
}
$('linkNoteForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = Number($('linkNoteRecordId').value);
  const mode = $('linkNoteMode').value;
  const r = records.find(x => Number(x.id) === id); if(!r) return;
  if(mode === 'link') r.商品链接 = $('modalProductLink').value.trim();
  if(mode === 'note') r.备注 = $('modalNote').value.trim();
  r.更新时间 = todayText();
  if(db){
    const { error } = await db.from('supplier_records').update({
      product_link: r.商品链接,
      note: r.备注,
      update_date: todaySqlDate(),
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if(error) return alert('保存失败：' + error.message);
    await loadRecords();
  } else {
    saveLocalRecords();
  }
  closeModal('linkNoteModal'); render();
});

function openModal(id){ $(id).classList.add('show'); }
function closeModal(id){ $(id).classList.remove('show'); }
document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', e => { if(e.target === backdrop) backdrop.classList.remove('show'); }));
document.addEventListener('keydown', e => { if(e.key === 'Escape') document.querySelectorAll('.modal-backdrop.show').forEach(m => m.classList.remove('show')); });

async function start(){
  initFilterDropdowns();
  await loadRecords();
  render();
}
start();
