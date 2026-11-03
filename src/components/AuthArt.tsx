import { useI18n } from '../i18n';
import { Wordmark } from './Logo';

const COLS: { c: string; ar: string; en: string }[] = [
  { c: 'var(--heat-0)', ar: 'جديد', en: 'New' },
  { c: 'var(--heat-2)', ar: 'اجتماع', en: 'Meeting' },
  { c: 'var(--heat-4)', ar: 'عرض', en: 'Offer' },
  { c: 'var(--heat-7)', ar: 'عميل', en: 'Client' }
];

/** Decorative mini-board for the sign-in and welcome screens: one deal keeps travelling to «Client». Purely visual. */
export function AuthArt({ step, tagline }: { step?: number; tagline?: boolean }) {
  const { t } = useI18n();
  const demo = [t('معرض النور', 'Nour Showroom'), t('مطعم الشام', 'Sham Grill'), t('ستوديو لمسة', 'Lamsa Studio'), t('متجر ريحانة', 'Rayhana Shop'), t('شركة أفق', 'Ofoq Co.')];
  return (
    <div className={'art' + (step != null ? ' art--step art--s' + step : '')} aria-hidden="true">
      <div className="art__brand"><Wordmark size={46} suffix="CRM" /></div>
      {tagline ? <p className="art__tag">{t('كل صفقة في مكانها. وكل خطوة بتتحرك.', 'Every deal in its place. Every step moving.')}</p> : null}
      <div className="art__board">
        {COLS.map((col, i) => (
          <div className="art__col" key={i} style={{ ['--c' as string]: col.c }}>
            <div className="art__head"><i />{t(col.ar, col.en)}</div>
            <div className="art__card"><span className="art__av" />{<b>{demo[(i * 2) % 5]}</b>}<span className="art__bar" /></div>
            {i % 2 === 0 ? <div className="art__card art__card--b"><span className="art__av" /><b>{demo[(i * 2 + 1) % 5]}</b><span className="art__bar" /></div> : null}
            {i === 0 ? <div className="art__card art__card--travel"><span className="art__av" /><b>{demo[4]}</b><span className="art__bar" /><em className="art__won">✓</em></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
