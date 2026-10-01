import BlueprintsPage from './pages/BlueprintsPage.jsx'

export default function AppP4() {
  return (
    <div>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>BluePrints en tiempo real</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Selecciona la tecnología RT en la barra inferior y abre el mismo plano en dos pestañas: cada
          punto que dibuje una se replica en la otra por el tópico{' '}
          <code>/topic/blueprints.&#123;author&#125;.&#123;name&#125;</code>.
        </p>
      </section>
      <BlueprintsPage />
    </div>
  )
}