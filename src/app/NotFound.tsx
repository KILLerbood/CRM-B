import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { useWorld } from '../three/WorldProvider';

export function NotFound() {
  const { t } = useI18n();
  const { burst } = useWorld();
  useEffect(() => { const id = setTimeout(burst, 400); return () => clearTimeout(id); }, [burst]);
  return (
    <div className="empty" style={{ paddingTop: '18vh' }}>
      <h1 className="display" style={{ fontSize: 72, margin: 0 }}>404</h1>
      <b>{t('الصفحة دي مش موجودة', 'This page doesn’t exist')}</b>
      <Link className="btn btn--primary btn--plain" to="/" style={{ marginTop: 18 }}>{t('رجوع لمساحة العمل', 'Back to the workspace')}</Link>
    </div>
  );
}
