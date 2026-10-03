import { whenText, type Item } from '../lib/schedule';
import { TYPE_LABEL, type ISODate } from '../lib/types';

interface Props {
  item: Item;
  date?: ISODate;
  planned?: boolean;
  onTogglePlan?: () => void;
  onShowOnMap?: () => void;
}

export function hostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('tiktok')) return 'TikTok';
    if (host.includes('goo.gl') || host.includes('google')) return 'Google Maps';
    return host;
  } catch {
    return 'Link';
  }
}

export default function EntryCard({ item, date, planned, onTogglePlan, onShowOnMap }: Props) {
  const where = [item.address && item.address !== item.city ? item.address.replace(/, United States$/, '') : null, item.city]
    .filter(Boolean)
    .join(' · ');
  return (
    <article className={`card t-${item.occurrence} ${planned ? 'planned' : ''}`}>
      <div className="card-main">
        <h4>{item.name}</h4>
        <p className="when">
          <span className="type-label">{TYPE_LABEL[item.occurrence]}</span> · {whenText(item, date)}
        </p>
        {where && <p className="where">{where}</p>}
        {item.categories.length > 0 && (
          <p className="tags">
            {item.categories.map((c) => (
              <span key={c} className="tag">
                {c}
              </span>
            ))}
          </p>
        )}
        <p className="links">
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer">
              {hostLabel(item.url)} ↗
            </a>
          )}
          {onShowOnMap && item.geo && (
            <button className="linklike" onClick={onShowOnMap}>
              Map{item.geo.precision === 'city' ? ' (city)' : ''}
            </button>
          )}
        </p>
      </div>
      {onTogglePlan && (
        <button className={`going ${planned ? 'on' : ''}`} onClick={onTogglePlan} aria-pressed={planned}>
          {planned ? '★ Going' : '☆ Go'}
        </button>
      )}
    </article>
  );
}
