import { useI18n } from '../../i18n';
import { FlowBoard } from './FlowBoard';

/** The full-screen pipeline page. The same board also lives on the home screen. */
export function Pipeline() {
  const { t } = useI18n();
  return (
    <div>
      <div className="page-head"><h1 className="page-title display">{t('المسار', 'Pipeline')}</h1></div>
      <FlowBoard />
    </div>
  );
}
