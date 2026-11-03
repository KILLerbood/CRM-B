import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { store } from '../lib/storage';
import { QuickPrefs } from '../components/Prefs';
import { AuthArt } from '../components/AuthArt';

const SLIDES: { title: [string, string]; body: [string, string] }[] = [
  { title: ['كل صفقة في مكانها', 'Every deal, in its place'], body: ['من أول حجز على الموقع لحد ما يبقى عميل بيدفع: اسحب الكارت من مرحلة للتانية وخلاص.', 'From the first website booking to a paying client: drag a card from one stage to the next.'] },
  { title: ['يومك واضح من أول نظرة', 'Your day at a glance'], body: ['اجتماعاتك، مهامك، واللي محتاج انتباهك النهارده، تحت المسار على نفس الشاشة.', 'Your meetings, your tasks and what needs attention today, right under the board.'] },
  { title: ['الفريق كله على نفس الصفحة', 'The whole team, in sync'], body: ['إعلانات الإدارة، محادثات الفريق، وكل تعديل متسجل في الشيت.', 'Admin announcements, team chat, and every change recorded in the sheet.'] }
];

export function Welcome() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const done = () => { store.set('mg-crm-welcomed', '1'); nav('/login', { replace: true }); };
  return (
    <div className="onb">
      <div className="auth__top"><QuickPrefs /></div>
      <AuthArt step={i} />
      <div className="onb__panel">
        <div key={i} className="page-enter stack" style={{ gap: 14 }}>
          <h1 className="display">{t(s.title[0], s.title[1])}</h1>
          <p>{t(s.body[0], s.body[1])}</p>
        </div>
        <div className="row" style={{ gap: 14, marginTop: 8 }}>
          <div className="onb__dots" aria-label={t('الشاشة ', 'Screen ') + (i + 1) + '/3'}>{SLIDES.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
          <span className="grow" />
          <button className="btn btn--ghost" onClick={done}>{t('تخطّي', 'Skip')}</button>
          <button className="btn btn--hl" onClick={() => (i < 2 ? setI(i + 1) : done())}>{i < 2 ? t('التالي', 'Next') : t('يلا نبدأ', 'Get started')}</button>
        </div>
      </div>
    </div>
  );
}
