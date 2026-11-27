/* Optional compare panel. Opens only from a card button; the main gallery formulas stay unchanged. */
'use strict';
window.LFPlusUI = {
  mount(api) {
    const P = window.LFPlus, root = document.getElementById('lf-plus');
    if (!P || !root || root.dataset.ready) return null;
    root.dataset.ready = '1';
    const esc = api.esc, won = n => n == null ? '미산정' : Math.trunc(n).toLocaleString('ko-KR') + '원';
    const range = r => Array.isArray(r) && r.every(x => x != null) ? r.map(won).join(' / ') : '미산정';
    const TABS = [['legacy', '기존 방식'], ['measured', '실측 기반'], ['assumed', '가정 기반'], ['child', '아동 보수 시나리오'], ['mixed', '국가 혼합 시나리오']];
    let video = null, tab = 'legacy', form = { fx: '1400', country: '', KR: '50', JP: '0', US: '50', subs: '' };
    root.innerHTML = '<summary>계산 방식 비교 (기존 계산식 유지 · 선택형 보조)</summary><div data-body><p class="lf-hint">카드의 “계산 비교” 버튼으로 영상을 고르세요. 이 패널은 기존 M1~M5와 business-fit 값을 바꾸지 않습니다.</p></div>';
    const body = root.querySelector('[data-body]');
    const badge = m => `<span class="lf-gray" title="${esc(m.note)}">${esc(m.label)}</span>`;
    const model = (m, id, cal) => { const r = cal?.[id]; const d = P.countryDisclosure(id, form.country || r?.country_assumption || ''); return `<div class="lf-card-mini"><strong>${esc(P.APPLICABILITY[id].name)}</strong> ${badge(d)}<br>${r?.range ? esc(range(r.range)) : r?.amount != null ? esc(won(r.amount)) : `미산정 · ${esc(r?.reason || '근거 없음')}`}<br><small>${esc(d.note)}</small></div>`; };
    function views() { return Number.isFinite(video?.v) ? video.v : null; }
    function render() {
      if (!video) return;
      const info = api.metrics(video), baseCal = info.cal || {}, subs = Number(form.subs) > 0 ? Number(form.subs) : null;
      const cal = form.country ? { ...baseCal, m3: window.LFMetrics.models({ views: views(), sector: info.sector, country: form.country, fx: Number(form.fx) }).m3 } : baseCal, recent = api.recentViews(video.ch) || [], aux = P.subscriberAux({ views: views(), subscribers: subs, recentViews: recent });
      const countryOptions = ['', 'KR', 'JP', 'US', 'IN'].map(c => `<option value="${c}" ${form.country === c ? 'selected' : ''}>${c === 'IN' ? 'IN · 계수 없음' : c || '자동/미지정'}</option>`).join('');
      const header = `<h3>${esc(video.t)}</h3><p>${esc(video.ch)} · 공개 누적 ${Number(video.v).toLocaleString('ko-KR')}회 · <a href="https://www.youtube.com/watch?v=${esc(video.id)}" target="_blank" rel="noopener noreferrer">원본</a></p><div class="lf-row" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${tab === k}" aria-pressed="${tab === k}">${t}</button>`).join('')}</div>`;
      const sections = {
        legacy: () => `<p class="lf-hint">기존 메인 계산입니다. 단가 1,000 / 2,000 / 4,000원은 고정 가정입니다.</p>${model(cal.legacy, 'legacy', cal)}${model(cal.m4, 'm4', cal)}${model(cal.m5, 'm5', cal)}`,
        measured: () => `<p class="lf-hint">검증 출처가 있는 값만 실측 기반으로 표시합니다. 없으면 입력을 삭제하지 않고 “근거 부족”으로 남깁니다.</p>${model(cal.m1, 'm1', cal)}${model(cal.m2, 'm2', cal)}<div class="lf-card-mini"><strong>business-fit 근거</strong><br>${info.scoreEvidence?.status === 'evidence_insufficient' ? '근거 부족 · 점수 반영 보류 (원 점수는 별도 보존)' : info.scoreEvidence?.status === 'evidence_checked' ? '출처 확인됨' : '입력 미완료'}${info.scoreEvidence?.missing?.length ? `<br><small>${esc(info.scoreEvidence.missing.join(', '))}</small>` : ''}</div><div class="lf-card-mini"><strong>구독자 보조지표</strong> <small>주 계산식에는 사용하지 않음</small><br>구독자 대비 조회 ${aux.viewsPerSubscriber == null ? '미확인' : 'X' + (Math.trunc(aux.viewsPerSubscriber * 100) / 100)} · 최근 업로드 중앙값 ${aux.recentMedianViews == null ? '미확인' : Math.trunc(aux.recentMedianViews).toLocaleString('ko-KR') + '회'} · 최고작 집중률 ${aux.topShare == null ? '미확인' : (Math.trunc(aux.topShare * 1000) / 10) + '%'} · 표본 ${aux.recentSample}${aux.smallSample ? ' (소표본)' : ''}<br><label>공개 구독자 수 <input data-field="subs" type="number" min="1" value="${esc(form.subs)}"></label><br><small>${esc(aux.note)}</small></div>`,
        assumed: () => `<p class="lf-hint">가정 기반입니다. 국가계수는 M3에서만 곱해집니다.</p><label>국가 <select data-field="country">${countryOptions}</select></label> <label>환율 <input data-field="fx" type="number" min="1" value="${esc(form.fx)}"></label>${model(cal.m3, 'm3', cal)}<table><caption>국가계수 적용 현황</caption><thead><tr><th>방식</th><th>국가계수</th></tr></thead><tbody>${P.allCountryDisclosures(form.country).map(d => `<tr><th>${esc(d.name)}</th><td>${esc(d.label)}</td></tr>`).join('')}</tbody></table><p class="lf-hint">인도(IN) 계수는 현재 없습니다. 임의로 만들지 않습니다.</p>`,
        child: () => { const c = P.childConservative((cal.legacy || {}).range); return `<p class="lf-hint">${esc(c.notice)}</p>${c.scenarios.length ? c.scenarios.map(s => `<div class="lf-card-mini"><strong>${Math.round(s.retention * 100)}% 유지</strong><br>${esc(range(s.range))}</div>`).join('') : '<p>조회수가 없어 미산정입니다.</p>'}`; },
        mixed: () => { const m = P.mixCountries({ views: views(), sector: info.sector, fx: Number(form.fx), weights: { KR: Number(form.KR), JP: Number(form.JP), US: Number(form.US) } }); return `<p class="lf-hint">M3를 대체하지 않는 M3+ 선택형 계산입니다. 합계가 100이 아니어도 입력 비율로 정규화합니다.</p><label>KR % <input data-field="KR" type="number" min="0" value="${esc(form.KR)}"></label> <label>JP % <input data-field="JP" type="number" min="0" value="${esc(form.JP)}"></label> <label>US % <input data-field="US" type="number" min="0" value="${esc(form.US)}"></label> <label>환율 <input data-field="fx" type="number" min="1" value="${esc(form.fx)}"></label><div class="lf-card-mini">${m.available ? `<strong>${esc(range(m.range))}</strong><br>혼합 계수 ${Math.trunc(m.mixed_country_coefficient * 1000) / 1000}<br><small>${esc(m.notice)}</small>` : `미산정 · ${esc(m.reason)}${m.country ? ' · ' + esc(m.country) : ''}`}</div>`; }
      };
      const focus = document.activeElement?.dataset?.field, pos = document.activeElement?.selectionStart;
      body.innerHTML = header + sections[tab]();
      if (focus) { const el = body.querySelector(`[data-field="${focus}"]`); el?.focus(); try { if (pos != null) el.setSelectionRange(pos, pos); } catch { /* number inputs have no range */ } }
    }
    root.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } });
    root.addEventListener('input', e => { const f = e.target.dataset?.field; if (!f) return; form[f] = e.target.value; render(); });
    root.addEventListener('change', e => { const f = e.target.dataset?.field; if (!f) return; form[f] = e.target.value; render(); });
    return { open(v) { video = v; tab = 'legacy'; form.country = ''; root.open = true; render(); root.scrollIntoView({ block: 'nearest' }); } };
  }
};
