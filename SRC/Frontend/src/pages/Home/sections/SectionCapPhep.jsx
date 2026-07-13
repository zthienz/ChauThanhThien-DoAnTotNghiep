import './SectionCapPhep.css'

const SectionCapPhep = () => (
  <section className="section-cp">
    <div className="container">
      <h3 className="cp-license-title">
        Được Cấp Phép Đào Tạo Chính Quy, Cam Kết Uy Tín &amp; Minh Bạch
      </h3>
      <div className="cp-license-grid">
        {['/chungnhan1.jpg', '/chungnhan2.jpg', '/chungnhan3.jpg'].map((src, i) => (
          <div key={i} className="cp-license-card">
            <img src={src} alt={`Giấy phép ${i + 1}`} />
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default SectionCapPhep
