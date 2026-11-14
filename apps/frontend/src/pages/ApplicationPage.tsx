import { useNavigate } from 'react-router-dom'

function ApplicationPage() {
  const navigate = useNavigate()

  return (
    <main className="placeholder-page">
      <button className="back-link" onClick={() => navigate('/')}>← Back to organizations</button>
      <section className="placeholder-card">
        <div className="brand-mark">H</div>
        <p className="eyebrow">HILT APPLICATIONS</p>
        <h1>New application</h1>
        <p className="intro">Your application form will be available here soon.</p>
      </section>
    </main>
  )
}

export default ApplicationPage
