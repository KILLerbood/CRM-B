import { useEffect, useRef, useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { useBoot } from '../../app/boot';
import { useActions } from '../../app/actions';
import { useI18n } from '../../i18n';
import { STAGES, PATH } from '../../api/schemas';
import type { Lead } from '../../api/schemas';
import { leadMatches, money, rel, sep } from '../../lib/format';
import { useIsMobile } from '../../lib/hooks';
import { heatColor, leadName } from '../../lib/rules';
import { dealAmount, daysInStage, nextStage, pathProgress, pulse, stageTotal } from '../../lib/flow';
import { dayKey, todayKey } from '../../lib/time';
import { Avatar, Tip } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useLeadOps } from '../lead/mutations';
import { useOpenLead } from '../lead/useOpenLead';

/** Avatar wrapped in a progress ring: how far along the path (8 steps) the deal is. */
function Ring({ lead }: { lead: Lead }) {
  const p = pathProgress(lead.stage);
  const R = 21, C = 2 * Math.PI * R;
  return (
    <span className="ring" aria-hidden="true" style={{ color: heatColor(lead.stage) }}>
      <svg viewBox="0 0 48 48"><circle className="ring__bg" cx="24" cy="24" r={R} /><circle className="ring__fg" cx="24" cy="24" r={R} strokeDasharray={`${C * p} ${C}`} /></svg>
      <Avatar name={leadName(lead)} size="sm" />
    </span>
  );
}

type CardProps = {
  lead: Lead; picked?: boolean; landed?: boolean; always?: boolean;
  onMove: (l: Lead, stage: string) => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
};

/** A deal card: ring + name + value, next step, days in stage, a heat bar, and quick actions (hover, focus or always on phones). */
export function DealCard({ lead: l, picked, landed, always, onMove, dragProps }: CardProps) {
  const { t, v, lang } = useI18n();
  const openLead = useOpenLead();
  const actions = useActions();
  const next = nextStage(l.stage);
  const days = daysInStage(l);
  const pl = pulse(l);
  const amount = dealAmount(l);
  const late = !!l.nextFollowUp && dayKey(l.nextFollowUp) < todayKey();
  const sub = [l.name !== leadName(l) ? l.name : '', l.city].filter(Boolean).join(sep(lang));
  const step = l.nextFollowUp
    ? (late ? t('متابعة متأخرة · ', 'Follow-up overdue · ') : t('متابعة · ', 'Follow-up · ')) + rel(l.nextFollowUp, lang)
    : t('مفيش خطوة جاية', 'No next step');
  return (
    <div className={'kcard pulse--' + pl + (picked ? ' is-picked' : '') + (landed ? ' is-landed' : '') + (always ? ' kcard--always' : '')} tabIndex={0} aria-label={leadName(l) + ', ' + v(l.stage)}
      onClick={() => openLead(l.id)} {...dragProps}>
      <div className="kcard__top">
        <Ring lead={l} />
        <div className="kcard__who"><b className="ellipsis">{leadName(l)}</b><small className="ellipsis">{sub || v(l.service) || ' '}</small></div>
        {amount ? <span className="kcard__v num">{money(amount)}</span> : null}
      </div>
      <div className={'kcard__step' + (late ? ' is-late' : l.nextFollowUp ? '' : ' is-none')}><Icon name={late ? 'alert' : 'calendar'} />{step}</div>
      <div className="kcard__foot">
        <Tip label={t('بقاله في المرحلة دي ', 'Time in this stage: ') + days + t(' يوم', ' d')}><span className={'kcard__days num' + (days >= 14 ? ' is-old' : '')}>{days}{t(' يوم', 'd')}</span></Tip>
        <span className="heatbar" title={pl === 'fresh' ? t('تواصل حديث', 'Recently touched') : pl === 'warm' ? t('محتاج تواصل قريب', 'Needs contact soon') : pl === 'cold' ? t('بارد: من فترة ماتواصلناش', 'Cold: no recent contact') : ''}><i /><i /><i /></span>
        {l.priority === 'عالية' ? <span className="kcard__hot" title={v(l.priority)}><Icon name="fire" /></span> : null}
        <span className="grow" />
        {l.owner ? <Tip label={t('المسؤول: ', 'Owner: ') + l.owner}><span><Avatar name={l.owner} size="xs" /></span></Tip> : null}
      </div>
      <div className="kcard__acts" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
        {next ? <button className="kbtn kbtn--go" onClick={() => onMove(l, next)} aria-label={t('انقل إلى ', 'Move to ') + v(next)}><Icon name="stage" className="flip" /><span>{v(next)}</span></button> : null}
        {l.phone ? <a className="kbtn kbtn--i" href={'tel:' + l.phone} aria-label={t('اتصل', 'Call')}><Icon name="phone" /></a> : null}
        {l.phone ? <button className="kbtn kbtn--i" onClick={() => actions.compose(l, 'واتساب')} aria-label={t('واتساب', 'WhatsApp')}><Icon name="wa" /></button> : null}
        <Menu.Root>
          <Menu.Trigger asChild><button className="kbtn kbtn--i" aria-label={t('انقل لمرحلة…', 'Move to stage…')}><Icon name="more" /></button></Menu.Trigger>
          <Menu.Portal><Menu.Content className="menu" align="end" sideOffset={6}>
            <div className="menu__label">{t('انقل لمرحلة', 'Move to stage')}</div>
            {STAGES.map((st) => <Menu.Item key={st} className="menu__item" disabled={st === l.stage} onSelect={() => onMove(l, st)}><i className="dot" style={{ background: heatColor(st) }} />{v(st)}{st === l.stage ? <Icon name="check" className="faint" /> : null}</Menu.Item>)}
          </Menu.Content></Menu.Portal>
        </Menu.Root>
      </div>
    </div>
  );
}

/** The flow: a river of stages on top, then big fluid columns. Drag with a mouse or finger, tap «next», use the ⋯ menu, or Space/arrows/Enter on a focused card. */
export function FlowBoard({ embedded = false }: { embedded?: boolean }) {
  const { t, v, dir } = useI18n();
  const boot = useBoot();
  const ops = useLeadOps();
  const [showProspects, setShowProspects] = useState(false);
  const [q, setQ] = useState('');
  const [over, setOver] = useState('');
  const [landed, setLanded] = useState('');
  const [picked, setPicked] = useState<{ id: string; stage: string } | null>(null);
  const [live, setLive] = useState('');
  const board = useRef<HTMLDivElement>(null);
  const touch = useRef<{ id: string; ghost: HTMLElement } | null>(null);
  const mobile = useIsMobile();
  const [stageTab, setStageTab] = useState('');
  const leads = boot.leads.filter((l) => (showProspects || !(l.type === 'محتمل' && l.stage === 'جديد')) && leadMatches(l, q));

  const drop = (id: string, stage: string) => {
    const l = boot.leads.find((x) => x.id === id);
    if (!l || l.stage === stage) return;
    setLive(leadName(l) + ': ' + v(stage));
    void ops.changeStage(l, stage, { delayed: true });
    setLanded(id);
    window.setTimeout(() => setLanded((x) => (x === id ? '' : x)), 1100);
  };

  useEffect(() => {
    if (!picked) return;
    const on = (e: KeyboardEvent) => {
      const i = (STAGES as readonly string[]).indexOf(picked.stage);
      const fwd = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight', back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd && i < STAGES.length - 1) { e.preventDefault(); setPicked({ ...picked, stage: STAGES[i + 1] }); scrollTo(STAGES[i + 1]); }
      else if (e.key === back && i > 0) { e.preventDefault(); setPicked({ ...picked, stage: STAGES[i - 1] }); scrollTo(STAGES[i - 1]); }
      else if (e.key === 'Enter') { e.preventDefault(); drop(picked.id, picked.stage); setPicked(null); }
      else if (e.key === 'Escape') setPicked(null);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, dir]);

  const scrollTo = (st: string) => {
    const el = board.current?.querySelector<HTMLElement>('[data-stage="' + st + '"]');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };
  const edge = (x: number) => { const el = board.current; if (!el) return; const r = el.getBoundingClientRect(); if (x < r.left + 80) el.scrollLeft -= 20; else if (x > r.right - 80) el.scrollLeft += 20; };

  // Touch drag on tablets (long-press, then move).
  const onTouchStart = (e: React.TouchEvent, l: Lead) => {
    const el = e.currentTarget as HTMLElement;
    const timer = window.setTimeout(() => {
      const ghost = el.cloneNode(true) as HTMLElement;
      Object.assign(ghost.style, { position: 'fixed', zIndex: '90', width: el.offsetWidth + 'px', pointerEvents: 'none', opacity: '.95', transform: 'rotate(-3deg) scale(1.03)', boxShadow: 'var(--shadow-2)' });
      document.body.append(ghost);
      touch.current = { id: l.id, ghost };
      navigator.vibrate?.(15);
    }, 280);
    const cancel = () => clearTimeout(timer);
    el.addEventListener('touchend', cancel, { once: true });
    el.addEventListener('touchmove', cancel, { once: true });
  };
  useEffect(() => {
    const move = (e: TouchEvent) => {
      if (!touch.current) return;
      e.preventDefault();
      const p = e.touches[0];
      Object.assign(touch.current.ghost.style, { left: p.clientX - 80 + 'px', top: p.clientY - 40 + 'px' });
      const col = document.elementFromPoint(p.clientX, p.clientY)?.closest('[data-stage]') as HTMLElement | null;
      setOver(col?.dataset.stage || '');
      edge(p.clientX);
    };
    const end = (e: TouchEvent) => {
      if (!touch.current) return;
      const p = e.changedTouches[0];
      const col = document.elementFromPoint(p.clientX, p.clientY)?.closest('[data-stage]') as HTMLElement | null;
      touch.current.ghost.remove();
      if (col?.dataset.stage) drop(touch.current.id, col.dataset.stage);
      touch.current = null; setOver('');
    };
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    return () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = (st: string) => leads.filter((l) => l.stage === st).length;
  const cur = stageTab || STAGES.find((st) => count(st) > 0) || STAGES[0];
  const unit = (st: string) => (st === 'عميل نشط' ? t(' / شهر', ' /mo') : '');
  const totalOpen = leads.filter((l) => PATH.includes(l.stage) && l.stage !== 'عميل نشط').reduce((a, l) => a + (l.dealValue || 0), 0);

  return (
    <section className={'flow' + (embedded ? ' flow--embedded' : '')} aria-label={t('المسار', 'Pipeline')}>
      <div className="flow__bar">
        <div className="flow__sum"><b className="num">{money(totalOpen)}</b><span>{t('قيمة الصفقات المفتوحة (ر.س)', 'open deal value (SAR)')}</span></div>
        <span className="grow" />
        <label className="check hide-sm"><input type="checkbox" checked={showProspects} onChange={(e) => setShowProspects(e.target.checked)} />{t('اعرض المحتملين', 'Show prospects')}</label>
        <div className="search flow__search"><Icon name="search" /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('دوّر في المسار', 'Search the pipeline')} aria-label={t('بحث', 'Search')} /></div>
      </div>

      <div className="river" role={mobile ? 'tablist' : undefined} aria-label={t('المراحل', 'Stages')}>
        {STAGES.map((st) => {
          const n = count(st);
          const on = mobile ? st === cur : over === st || picked?.stage === st;
          return (
            <button key={st} role={mobile ? 'tab' : undefined} aria-selected={mobile ? st === cur : undefined} className={'river__n' + (on ? ' is-on' : '') + (n === 0 ? ' is-empty' : '') + (PATH.includes(st) ? '' : ' is-exit')}
              style={{ ['--c' as string]: heatColor(st) }} onClick={() => (mobile ? setStageTab(st) : scrollTo(st))}>
              <i aria-hidden="true" /><span className="river__l">{v(st)}</span><b className="num">{n}</b>
            </button>
          );
        })}
      </div>

      <p className="flow__hint hide-sm" aria-live="polite">{picked ? t('حرّك بالأسهم ← → واضغط Enter عشان تنزّله، أو Esc للإلغاء.', 'Move with ← → and press Enter to drop, Esc to cancel.') : t('اسحب الكارت لمرحلة تانية، أو دوس «التالي» على الكارت، أو ركّز عليه واضغط Space.', 'Drag a card to another stage, tap “next” on it, or focus it and press Space.')}</p>
      <div className="sr-only" role="status" aria-live="polite">{live}</div>

      {mobile ? (
        <div className="mboard">
          <div className="mboard__sum"><b>{v(cur)}</b><span className="faint">{count(cur)} {t('عميل', 'clients')}{stageTotal(leads, cur) ? ' · ' + money(stageTotal(leads, cur)) + unit(cur) : ''}</span></div>
          {count(cur) === 0 ? <ColEmpty /> : (
            <div className="stack">
              {leads.filter((l) => l.stage === cur).sort((a, b) => (b.score || 0) - (a.score || 0)).map((l) => <DealCard key={l.id} lead={l} always landed={landed === l.id} onMove={(x, s) => drop(x.id, s)} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="board" ref={board} onDragOver={(e) => edge(e.clientX)}>
          {STAGES.map((st) => {
            const items = leads.filter((l) => l.stage === st).sort((a, b) => (b.score || 0) - (a.score || 0));
            const total = stageTotal(leads, st);
            const isTarget = over === st || picked?.stage === st;
            return (
              <section key={st} className={'col' + (PATH.includes(st) ? '' : ' col--exit') + (isTarget ? ' is-over' : '')} data-stage={st} aria-label={v(st)} style={{ ['--c' as string]: heatColor(st) }}
                onDragOver={(e) => { e.preventDefault(); setOver(st); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(''); }}
                onDrop={(e) => { e.preventDefault(); setOver(''); const id = e.dataTransfer.getData('text/plain'); if (id) drop(id, st); }}>
                <header><i /><h3>{v(st)}</h3><span className="col__n num">{items.length}</span><small className="num">{total ? money(total) + unit(st) : ''}</small></header>
                <div className="col__stack">
                  {items.map((l) => (
                    <DealCard key={l.id} lead={l} picked={picked?.id === l.id} landed={landed === l.id} onMove={(x, s) => drop(x.id, s)}
                      dragProps={{
                        draggable: true,
                        onDragStart: (e) => { e.dataTransfer.setData('text/plain', l.id); e.dataTransfer.effectAllowed = 'move'; (e.currentTarget as HTMLElement).classList.add('is-dragging'); },
                        onDragEnd: (e) => (e.currentTarget as HTMLElement).classList.remove('is-dragging'),
                        onTouchStart: (e) => onTouchStart(e, l),
                        onKeyDown: (e) => { if (e.target !== e.currentTarget) return; if (e.key === ' ' && !picked) { e.preventDefault(); setPicked({ id: l.id, stage: l.stage }); } else if (e.key === 'Enter' && !picked) { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }
                      }} />
                  ))}
                  {items.length === 0 ? <ColEmpty /> : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ColEmpty() {
  const { t } = useI18n();
  return <div className="col__empty"><Icon name="stage" className="flip" /><span>{t('سيب صفقة هنا', 'Drop a deal here')}</span></div>;
}
