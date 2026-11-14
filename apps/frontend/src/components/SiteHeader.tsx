import { Link, useNavigate } from 'react-router-dom'

function SiteHeader() {
  const navigate = useNavigate()

  return (
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="Hilt home">
        <span className="brand-mark">H</span><span>hilt</span>
      </Link>
      <div className="header-actions">
        <button className="button button-secondary" onClick={() => navigate('/login')}>Log in / Register</button>
        <button
          className="button button-primary"
          onClick={() => navigate(sessionStorage.getItem('authToken') ? '/application' : '/login', { state: { from: '/application' } })}
        >
          Create new application <span aria-hidden="true">↗</span>
        </button>
      </div>
    </header>
  )
}

export default SiteHeader
