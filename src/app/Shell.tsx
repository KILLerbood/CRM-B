import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { useBootstrap, usePulse } from '../api/queries';
import { BootCtx } from './boot';
import { ActionsProvider, useActions } from './actions';
import { useI18n } from '../i18n';
import { useTheme } from './theme';
import { useAuth } from '../auth/AuthProvider';
import { Logo } from '../components/Logo';
import { Icon } from '../components/Icon';
import { Avatar, IconButton, Tip, Skel } from '../components/ui';
import { ScheduleBar } from '../components/ScheduleBar';
import { NotificationsBell } from '../components/NotificationsPanel';
import { CommandPalette } from '../components/CommandPalette';
import { Shortcuts, Tour, markTourSeen, tourSeen } from '../components/Tour';
import { AnnouncementBanner, UrgentModal } from '../components/Announcements';
import { errorText } from '../api/errors';
import { LostReasonProvider } from '../features/lead/mutations';
import { isLate } from '../lib/rules';
import { useOnline } from '../lib/hooks';
import type { Bootstrap } from '../api/schemas';
import { api } from '../api/endpoints';
import { refreshDevice } from '../lib/push';

const LeadDrawer = lazy(() => import('../features/lead/LeadView').then((m) => ({ default: m.LeadDrawer })));

export function Shell() {
  const { t, lang } = useI18n();
  const boot = useBootstrap();
  if (boot.isLoading || (!boot.data && !boot.isError)) return <BootSkeleton />;
  if (!boot.data) {
    return (
      <div className="auth" style={{ gridTemplateColumns: '1fr' }}>
        <div className="auth__box" style={{ maxWidth: 480 }}>
          <h1 className="display">{t('الـ CRM مافتحش', 'The CRM didn’t load')}</h1>
          <p>{errorText(boot.error, lang)}</p>
          <button className="btn btn--primary btn--plain" onClick={() => boot.refetch()}>{t('حمّل تاني', 'Reload')}</button>
        </div>
      </div>
    );
  }
  return (
    <BootCtx.Provider value={boot.data}>
      <LostReasonProvider reasons={boot.data.lists['سبب الخسارة'] || []}>
        <ActionsProvider>
          <ShellFrame boot={boot.data} refreshing={boot.isFetching} onRefresh={() => boot.refetch()} />
        </ActionsProvider>
      </LostReasonProvider>
    </BootCtx.Provider>
  );
}

function ShellFrame({ boot, refreshing, onRefresh }: { boot: Bootstrap; refreshing: boolean; onRefresh: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { pref, setPref } = useTheme();
  const { signOut, authed } = useAuth();
  const actions = useActions();
  const nav = useNavigate();
  const loc = useLocation();
  const [params, setParams] = useSearchParams();
  const pulse = usePulse(authed);
  const online = useOnline();
  // A new version of the site is downloaded and waiting (see main.tsx).
  const [update, setUpdate] = useState(false);
  // Keep this device's push subscription known to the server (once a day).
  const pushKey = boot.settings.pushKey;
  useEffect(() => { if (pushKey) void refreshDevice(api, pushKey); }, [pushKey]);
  useEffect(() => { const on = () => setUpdate(true); window.addEventListener('mg-update', on); return () => window.removeEventListener('mg-update', on); }, []);
  const [cmdk, setCmdk] = useState(false);
  const [tour, setTour] = useState(false);
  const [keys, setKeys] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const me = boot.me;
  const lateTasks = boot.tasks.filter(isLate).length;
  const unreadMsgs = pulse.data?.unread.messages ?? boot.inbox?.unread ?? 0;
  const unreadAnns = pulse.data?.unread.announcements ?? boot.announcements.filter((a) => !a.seenAt).length;
  const unreadNotifs = pulse.data?.unread.notifications ?? 0;
  const leadId = params.get('lead');

  // First run: a short tour, once per person per device. It waits until no dialog (e.g. an urgent announcement) is open.
  const myEmail = boot.me.email;
  useEffect(() => {
    if (tourSeen(myEmail)) return;
    let tries = 0;
    const id = window.setInterval(() => {
      tries++;
      if (!document.querySelector('[role="dialog"]')) { window.clearInterval(id); setTour(true); }
      else if (tries > 20) window.clearInterval(id);
    }, 1500);
    return () => window.clearInterval(id);
  }, [myEmail]);
  const closeTour = () => { markTourSeen(myEmail); setTour(false); };
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);
  // Keyboard shortcuts: Ctrl/⌘+K, «/», N, T, M.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdk(true); return; }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[role="dialog"]')) return;
      if (e.key === '/') { e.preventDefault(); setCmdk(true); }
      else if (e.key === 'n' || e.key === 'ى') { e.preventDefault(); actions.newLead(); }
      else if (e.key === 't' || e.key === 'ف') { e.preventDefault(); actions.newTask(); }
      else if (e.key === 'm' || e.key === 'ة') { e.preventDefault(); actions.newThread(); }
      else if (e.key === '?' || e.key === '؟') { e.preventDefault(); setKeys(true); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [actions]);

  const NAV: [string, string, string, number?, boolean?][] = [
    ['/', 'board', t('المسار', 'Flow')],
    ['/contacts', 'contacts', t('العملاء', 'Clients')],
    ['/companies', 'building', t('الشركات', 'Companies'), 0, true],
    ['/tasks', 'tasks', t('المهام', 'Tasks'), lateTasks],
    ['/sales-tools', 'tools', t('أدوات البيع', 'Sales'), 0, true],
    ['/inbox', 'inbox', t('المحادثات', 'Chat'), unreadMsgs],
    ['/announcements', 'megaphone', t('الإعلانات', 'News'), unreadAnns, true]
  ];
  const active = (p: string) => (p === '/' ? loc.pathname === '/' : loc.pathname.startsWith(p));
  const moreActive = ['/more', '/settings', '/profile', '/schedule', '/companies', '/sales-tools', '/announcements'].some((p) => loc.pathname.startsWith(p));
  const quickAdd = (
    <Menu.Root>
      <Menu.Trigger asChild><button className="dock__add" aria-label={t('إضافة سريعة', 'Quick add')}><Icon name="plus" size={24} /></button></Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="menu menu--dock" side="top" align="center" sideOffset={14}>
          <Menu.Item className="menu__item" onSelect={actions.newLead}><Icon name="userplus" />{t('عميل جديد', 'New client')}<kbd style={{ marginInlineStart: 'auto' }}>N</kbd></Menu.Item>
          <Menu.Item className="menu__item" onSelect={() => actions.newTask()}><Icon name="tasks" />{t('مهمة جديدة', 'New task')}<kbd style={{ marginInlineStart: 'auto' }}>T</kbd></Menu.Item>
          <Menu.Item className="menu__item" onSelect={() => actions.book()}><Icon name="calendar" />{t('احجز اجتماع', 'Book a meeting')}</Menu.Item>
          <Menu.Item className="menu__item" onSelect={actions.newThread}><Icon name="inbox" />{t('رسالة جديدة', 'New message')}<kbd style={{ marginInlineStart: 'auto' }}>M</kbd></Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );

  return (
    <>
      <div className="shell">
        <header className={'shell__hdr' + (scrolled ? ' is-scrolled' : '')}>
          <NavLink to="/" className="brand" aria-label="Magmafy CRM"><Logo size={40} /><span className="brand__t hide-sm">Magma<span>fy</span></span></NavLink>
          <ScheduleBar boot={boot} />
          <IconButton icon="search" label={t('بحث (Ctrl+K)', 'Search (Ctrl+K)')} onClick={() => setCmdk(true)} />
          <NotificationsBell unread={unreadNotifs} />
          <Menu.Root>
            <Menu.Trigger asChild>
              <button className="ibtn ibtn--me" aria-label={t('قايمة الحساب', 'Account menu')}><Avatar name={me.name} /></button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content className="menu" align="end" sideOffset={8}>
                <div style={{ padding: '10px 12px 8px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar name={me.name} size="sm" />
                  <div style={{ minWidth: 0 }}><b style={{ display: 'block', fontWeight: 600 }}>{me.name}</b><small className="faint ltr">{me.email}</small></div>
                </div>
                <Menu.Separator className="menu__sep" />
                <Menu.Item className="menu__item" onSelect={() => nav('/profile')}><Icon name="user" />{t('حسابي', 'Profile')}</Menu.Item>
                <Menu.Item className="menu__item" onSelect={() => nav('/schedule')}><Icon name="calendar" />{t('الجدول', 'Schedule')}</Menu.Item>
                <Menu.Item className="menu__item" onSelect={() => nav('/settings')}><Icon name="settings" />{t('الإعدادات', 'Settings')}</Menu.Item>
                <Menu.Item className="menu__item" onSelect={() => setTour(true)}><Icon name="sparkle" />{t('جولة سريعة', 'Quick tour')}</Menu.Item>
                <Menu.Item className="menu__item" onSelect={() => setKeys(true)}><Icon name="edit" />{t('اختصارات الكيبورد', 'Keyboard shortcuts')}<kbd style={{ marginInlineStart: 'auto' }}>?</kbd></Menu.Item>
                <Menu.Item className="menu__item" onSelect={onRefresh}><Icon name="refresh" />{refreshing ? t('بيتحدّث…', 'Refreshing…') : t('تحديث البيانات', 'Refresh data')}</Menu.Item>
                <Menu.Separator className="menu__sep" />
                <div className="menu__label">{t('المظهر', 'Appearance')}</div>
                {([['light', 'sun', t('فاتح', 'Light')], ['dark', 'moon', t('غامق', 'Dark')], ['auto', 'monitor', t('حسب الجهاز', 'System')]] as const).map(([k, ic, l]) => (
                  <Menu.Item key={k} className="menu__item" onSelect={() => setPref(k)}><Icon name={ic} />{l}{pref === k ? <Icon name="check" className="faint" /> : null}</Menu.Item>
                ))}
                <Menu.Item className="menu__item" onSelect={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Icon name="globe" />{lang === 'ar' ? 'English' : 'العربية'}</Menu.Item>
                {boot.settings.sheetUrl ? <Menu.Item className="menu__item" onSelect={() => window.open(boot.settings.sheetUrl, '_blank', 'noopener')}><Icon name="template" />{t('افتح الشيت', 'Open the sheet')}</Menu.Item> : null}
                <Menu.Separator className="menu__sep" />
                <Menu.Item className="menu__item" onSelect={() => signOut()}><Icon name="logout" />{t('خروج', 'Sign out')}</Menu.Item>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        </header>

        <div className="shell__banner">
          {!online ? <div className="banner banner--عاجل" role="alert"><span className="pulse-dot" />{t('مفيش نت دلوقتي. البيانات اللي قدامك للقراية بس لحد ما النت يرجع.', 'You’re offline. What you see is read-only until you’re back online.')}</div> : null}
          {update ? (
            <div className="banner" role="status"><Icon name="sparkle" size={16} /><span className="grow">{t('فيه نسخة جديدة من الموقع.', 'A new version is available.')}</span>
              <button className="btn btn--sm btn--primary btn--plain" onClick={() => { navigator.serviceWorker?.getRegistration().then((r) => (r?.waiting ? r.waiting.postMessage('skip') : location.reload())); }}>{t('حدّث', 'Update')}</button></div>
          ) : null}
          <AnnouncementBanner boot={boot} />
        </div>

        <main className="shell__main" id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <nav className="dock" aria-label={t('القائمة الرئيسية', 'Main menu')}>
        {NAV.slice(0, 2).map(([p, ic, label, n]) => <DockItem key={p} to={p} icon={ic} label={label} n={n} on={active(p)} />)}
        <span className="dock__mid show-sm">{quickAdd}</span>
        {NAV.slice(2).map(([p, ic, label, n, extra]) => <DockItem key={p} to={p} icon={ic} label={label} n={n} on={active(p)} extra={!!extra} bad={p === '/tasks'} />)}
        <NavLink to="/more" className={'dock__it show-sm' + (moreActive ? ' is-on' : '')} aria-current={moreActive ? 'page' : undefined}><span className="dock__ic"><Icon name="more" /></span><span className="dock__lbl">{t('المزيد', 'More')}</span></NavLink>
        <span className="dock__sep hide-sm" aria-hidden="true" />
        <span className="hide-sm">{quickAdd}</span>
      </nav>

      <Suspense fallback={null}>{leadId ? <LeadDrawer id={leadId} onClose={() => setParams((p) => { const n = new URLSearchParams(p); n.delete('lead'); n.delete('ltab'); return n; })} /> : null}</Suspense>
      <CommandPalette boot={boot} open={cmdk} onOpenChange={setCmdk} onAction={(a) => (a === 'lead' ? actions.newLead() : a === 'task' ? actions.newTask() : a === 'message' ? actions.newThread() : a === 'tour' ? setTour(true) : a === 'keys' ? setKeys(true) : actions.editAnnouncement())} />
      <Tour open={tour} onClose={closeTour} />
      <Shortcuts open={keys} onClose={() => setKeys(false)} />
      <UrgentModal pulse={pulse.data} boot={boot} />
    </>
  );
}

function BootSkeleton() {
  return (
    <div className="shell">
      <header className="shell__hdr"><Skel h={56} w="100%" r={999} /></header>
      <main className="shell__main" aria-busy="true">
        <div className="stack" style={{ gap: 22 }}>
          <Skel h={64} w="46%" r={20} />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>{[0, 1, 2, 3].map((i) => <Skel key={i} h={180} />)}</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>{[0, 1, 2].map((i) => <Skel key={i} h={230} />)}</div>
        </div>
      </main>
    </div>
  );
}

function DockItem({ to, icon, label, n, on, extra, bad }: { to: string; icon: string; label: string; n?: number; on: boolean; extra?: boolean; bad?: boolean }) {
  return (
    <Tip label={on ? null : label} side="top">
      <NavLink to={to} end={to === '/'} className={'dock__it' + (on ? ' is-on' : '') + (extra ? ' hide-sm' : '')} aria-label={label + (n ? ' (' + n + ')' : '')} aria-current={on ? 'page' : undefined}>
        <span className="dock__ic"><Icon name={icon} />{n ? <span className={'cnt' + (bad ? ' cnt--bad' : '')} aria-hidden="true">{n > 9 ? '9+' : n}</span> : null}</span>
        <span className="dock__lbl">{label}</span>
      </NavLink>
    </Tip>
  );
}
