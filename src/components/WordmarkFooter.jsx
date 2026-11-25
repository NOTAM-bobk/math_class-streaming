/*
 * The site footer: a short description, link columns that fold on phones, and
 * the network name set large and fading into the background.
 */
export default function WordmarkFooter({
  name,
  legalName,
  year,
  description,
  email,
  status,
  navLabel = "Footer",
  columns,
  credit,
}) {
  return (
    <footer className="wordmark-footer">
      <div className="wf-grid">
        <div className="wf-brand">
          <span className="wf-wordmark">{name}</span>
          {description && <p className="wf-description">{description}</p>}
          {status && (
            <p className="wf-status">
              <span className="wf-dot" aria-hidden="true" />
              {status}
            </p>
          )}
        </div>

        <nav aria-label={navLabel} className="wf-nav">
          {columns.map((col) => (
            <div key={col.title} className="wf-col">
              <p className="wf-col-title">{col.title}</p>
              <ul className="wf-links">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* phones: each column folds away; tap a heading to open it */}
        <nav aria-label={navLabel} className="wf-fold">
          {columns.map((col) => (
            <details key={col.title} className="wf-details">
              <summary>
                <span className="wf-col-title">{col.title}</span>
                <svg className="wf-plus" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </summary>
              <ul className="wf-links">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>
      </div>

      <div className="wf-bottom">
        <p className="wf-legal">
          © {year} {legalName ?? name}
        </p>
        {email && <a href={"mailto:" + email}>{email}</a>}
        {credit && (
          <a className="wf-credit" href={credit.href}>
            {credit.label}
          </a>
        )}
      </div>

      {/* the name, set large and fading into the background */}
      <p className="wf-giant" aria-hidden="true">
        {name}
      </p>
    </footer>
  );
}
