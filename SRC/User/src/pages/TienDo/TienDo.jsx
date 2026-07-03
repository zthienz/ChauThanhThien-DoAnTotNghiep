import { useEffect, useState } from 'react'
import axios from 'axios'
import { useUser } from '../../context/UserContext'
import './TienDo.css'

const ProgressBar = ({ label, value, max, unit, color }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="progress-item">
      <div className="pi-header">
        <span className="pi-label">{label}</span>
        <span className="pi-value" style={{ color }}>{value} / {max} {unit}</span>
      </div>
      <div className="pi-bar-bg">
        <div className="pi-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="pi-footer">
        <span className="pi-pct">{pct}%</span>
        {pct >= 100
          ? <span className="pi-done">✅ Đạt yêu cầu</span>
          : <span className="pi-remain" style={{ color }}>Còn {max - value} {unit} nữa</span>
        }
      </div>
    </div>
  )
}

const TienDo = () => {
  const { token, hoSo, backendUrl } = useUser()
  const [tienDo, setTienDo]         = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!token) return
    axios.get(`${backendUrl}/api/hoc-vien/tien-do`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => { if (res.data.success) setTienDo(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  // Dữ liệu từ hoSo nếu API chưa có
  const hvLop = hoSo?.hoc_vien_lop
  const khoa  = hoSo?.khoa_hoc

  const data = tienDo || {
    so_buoi_ly_thuyet_da_hoc:  hvLop?.so_buoi_ly_thuyet_da_hoc  || 0,
    so_buoi_thuc_hanh_da_hoc:  hvLop?.so_buoi_thuc_hanh_da_hoc  || 0,
    so_km_da_chay:             hvLop?.so_km_da_chay              || 0,
    so_buoi_ly_thuyet_toi_thieu: khoa?.so_buoi_ly_thuyet_toi_thieu || 20,
    so_km_toi_thieu:           khoa?.so_km_toi_thieu             || 810,
    du_buoi_ly_thuyet:         hvLop?.du_buoi_ly_thuyet          || false,
    du_km_thuc_hanh:           hvLop?.du_km_thuc_hanh            || false,
    du_dieu_kien_thi_tn:       hvLop?.du_dieu_kien_thi_tn        || false,
  }

  const dieuKienList = [
    // Chỉ hiển thị điều kiện lý thuyết nếu hạng bằng có yêu cầu lý thuyết
    ...(data.co_ly_thuyet !== false
      ? [{ label: 'Đủ buổi học lý thuyết', ok: data.du_buoi_ly_thuyet }]
      : []
    ),
    // Chỉ hiển thị điều kiện km nếu hạng bằng cần thực hành
    ...(data.co_thuc_hanh !== false
      ? [{ label: 'Đủ km thực hành', ok: data.du_km_thuc_hanh }]
      : []
    ),
    { label: 'Đủ điều kiện dự thi TN', ok: data.du_dieu_kien_thi_tn },
  ]

  return (
    <div className="tiendo-page">
      <div className="page-header">
        <div>
          <h2>📊 Tiến Độ Học Tập</h2>
          <p>Theo dõi quá trình học lý thuyết, thực hành và điều kiện dự thi</p>
        </div>
      </div>

      {loading ? (
        <div className="td-loading"><div className="spinner" /></div>
      ) : (
        <>
          {/* Điều kiện thi */}
          <div className="td-condition-card">
            <h3>🎯 Điều Kiện Dự Thi Tốt Nghiệp</h3>
            <div className="td-condition-grid">
              {dieuKienList.map((dk, i) => (
                <div key={i} className={`td-condition-item ${dk.ok ? 'ok' : 'not-ok'}`}>
                  <span className="tdc-icon">{dk.ok ? '✅' : '⏳'}</span>
                  <span className="tdc-label">{dk.label}</span>
                  <span className={`badge ${dk.ok ? 'badge-success' : 'badge-warning'}`}>
                    {dk.ok ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              ))}
            </div>
            {data.du_dieu_kien_thi_tn && (
              <div className="td-congrats">
                🎉 Chúc mừng! Bạn đã đủ điều kiện dự thi tốt nghiệp. Hãy chờ admin lên lịch thi.
              </div>
            )}
          </div>

          {/* Progress bars */}
          <div className="td-progress-card">
            <h3>📈 Chi Tiết Tiến Độ</h3>
            <div className="td-progress-list">
              {/* Chỉ hiển thị lý thuyết với bằng có yêu cầu lý thuyết */}
              {data.co_ly_thuyet !== false && (
                <ProgressBar
                  label="📖 Buổi học lý thuyết"
                  value={data.so_buoi_ly_thuyet_da_hoc}
                  max={data.so_buoi_ly_thuyet_toi_thieu}
                  unit="buổi"
                  color="#3b82f6"
                />
              )}
              {/* Chỉ hiển thị km với bằng cần thực hành (B1, B2, C...) */}
              {data.co_thuc_hanh !== false && (
                <ProgressBar
                  label="🚗 Km thực hành đã chạy"
                  value={Number(data.so_km_da_chay)}
                  max={data.so_km_toi_thieu}
                  unit="km"
                  color="#10b981"
                />
              )}
            </div>
          </div>

          {/* Thống kê tổng quan */}
          <div className="td-stats-grid">
            <div className="td-stat-card blue">
              <span className="tds-icon">📖</span>
              <div>
                <p>Buổi lý thuyết đã học</p>
                <h3>{data.so_buoi_ly_thuyet_da_hoc} <small>/ {data.so_buoi_ly_thuyet_toi_thieu > 0 ? data.so_buoi_ly_thuyet_toi_thieu + ' buổi' : '—'}</small></h3>
              </div>
            </div>
            {/* Chỉ hiển thị km với bằng cần thực hành */}
            {data.co_thuc_hanh !== false && (
              <div className="td-stat-card green">
                <span className="tds-icon">🚗</span>
                <div>
                  <p>Km thực hành đã chạy</p>
                  <h3>{Number(data.so_km_da_chay).toFixed(1)} <small>/ {data.so_km_toi_thieu} km</small></h3>
                </div>
              </div>
            )}
            <div className="td-stat-card purple">
              <span className="tds-icon">📚</span>
              <div>
                <p>Buổi thực hành đã học</p>
                <h3>{data.so_buoi_thuc_hanh_da_hoc} <small>buổi</small></h3>
              </div>
            </div>
            <div className="td-stat-card orange">
              <span className="tds-icon">🎯</span>
              <div>
                <p>Trạng thái điều kiện thi</p>
                <h3 style={{ fontSize:'15px' }}>
                  {data.du_dieu_kien_thi_tn ? '✅ Đủ điều kiện' : '⏳ Chưa đủ'}
                </h3>
              </div>
            </div>
          </div>

          {/* Thông tin khóa học */}
          {khoa && (
            <div className="td-khoa-card">
              <h3>📋 Thông Tin Khóa Học</h3>
              <div className="td-khoa-grid">
                <div className="td-khoa-item">
                  <span>🏷️ Khóa học</span>
                  <strong>{khoa.ten_khoa}</strong>
                </div>
                <div className="td-khoa-item">
                  <span>🚗 Loại bằng</span>
                  <strong>{khoa.loai_bang}</strong>
                </div>
                <div className="td-khoa-item">
                  <span>📖 Yêu cầu lý thuyết</span>
                  <strong>{khoa.so_buoi_ly_thuyet_toi_thieu > 0 ? khoa.so_buoi_ly_thuyet_toi_thieu + ' buổi' : 'Không yêu cầu'}</strong>
                </div>
                {data.co_thuc_hanh !== false && (
                  <div className="td-khoa-item">
                    <span>🚗 Yêu cầu km</span>
                    <strong>{khoa.so_km_toi_thieu} km</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TienDo
