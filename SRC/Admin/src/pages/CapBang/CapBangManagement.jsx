import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import './CapBangManagement.css'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

const LOAI_BANG_LABEL = {
  A1:'A1', A:'A', B1:'B1', B2:'B2', C1:'C1', C:'C', C2:'C2', D:'D', E:'E', CE:'CE'
}

// Tính tổng kết quả thi của học viên trong 1 loại thi
const tongKetQua = (ketQuaList, loaiThi) => {
  const filtered = ketQuaList?.filter(kq => kq.lich_thi?.loai_thi === loaiThi) || []
  if (!filtered.length) return null
  // Nhóm theo lich_thi_id → lấy lần thi gần nhất
  const byLich = {}
  filtered.forEach(kq => {
    const id = kq.lich_thi_id
    if (!byLich[id]) byLich[id] = []
    byLich[id].push(kq)
  })
  // Tìm lần thi có kết quả tốt nhất
  const lans = Object.values(byLich)
  const datLan = lans.find(lan => lan.every(kq => kq.ket_qua === 'dat'))
  if (datLan) return 'dat'
  return 'khong_dat'
}

const CapBangManagement = () => {
  const { token, backendUrl } = useAdmin()
  const [tab, setTab]         = useState('tot_nghiep')

  // ── State chung ──
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [filterTT, setFilterTT] = useState('')
  const [page, setPage]         = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]       = useState(0)

  // ── Modal cấp bằng ──
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState({
    ngay_cap: new Date().toISOString().slice(0, 10),
    co_quan_cap: 'Trung Tâm Lái Xe Ngôi Sao',
    ngay_het_han: '',
    ghi_chu: '',
  })

  const headers = { Authorization: `Bearer ${token}` }

  const fetchList = async () => {
    setLoading(true)
    try {
      const endpoint = tab === 'tot_nghiep'
        ? `${backendUrl}/api/admin/cap-bang/tot-nghiep`
        : `${backendUrl}/api/admin/cap-bang/bang-lai`

      const res = await axios.get(endpoint, {
        headers,
        params: { search, trang_thai: filterTT, page, per_page: 15 }
      })
      if (res.data.success) {
        setList(res.data.data)
        setTotalPages(res.data.pages || 1)
        setTotal(res.data.total || 0)
      }
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    setPage(1)
    setList([])
  }, [tab, search, filterTT])

  useEffect(() => { fetchList() }, [tab, search, filterTT, page])

  const openCapBang = (hv) => {
    setSelected(hv)
    setForm({
      ngay_cap:        new Date().toISOString().slice(0, 10),
      co_quan_cap:     tab === 'tot_nghiep' ? 'Trung Tâm Lái Xe Ngôi Sao' : 'Cục Đường bộ Việt Nam',
      ngay_het_han:    '',
      nguoi_nhan:      hv.ho_ten,
      quan_he:         'ban_than',
      cccd_nguoi_nhan: hv.so_cccd,
      ghi_chu:         '',
    })
    setShowModal(true)
  }

  const handleCapBang = async e => {
    e.preventDefault()
    try {
      const endpoint = tab === 'tot_nghiep'
        ? `${backendUrl}/api/admin/cap-bang/tot-nghiep/${selected.id}`
        : `${backendUrl}/api/admin/cap-bang/bang-lai/${selected.id}`

      const payload = tab === 'tot_nghiep'
        ? {
            ngay_cap:        form.ngay_cap,
            nguoi_nhan:      form.nguoi_nhan,
            quan_he:         form.quan_he,
            cccd_nguoi_nhan: form.cccd_nguoi_nhan || null,
            ngay_nhan:       form.ngay_cap,
            ghi_chu:         form.ghi_chu,
          }
        : {
            ngay_cap:        form.ngay_cap,
            co_quan_cap:     form.co_quan_cap,
            ngay_het_han:    form.ngay_het_han || null,
            nguoi_nhan:      form.nguoi_nhan,
            quan_he:         form.quan_he,
            cccd_nguoi_nhan: form.cccd_nguoi_nhan || null,
            ngay_nhan:       form.ngay_cap,
            ghi_chu:         form.ghi_chu,
          }

      const res = await axios.post(endpoint, payload, { headers })
      if (res.data.success) {
        toast.success(res.data.message)
        setShowModal(false)
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleHuyBang = async (hv) => {
    const label = tab === 'tot_nghiep' ? 'bằng tốt nghiệp' : 'bằng lái xe'
    if (!confirm(`Thu hồi ${label} của ${hv.ho_ten}?`)) return
    try {
      const endpoint = tab === 'tot_nghiep'
        ? `${backendUrl}/api/admin/cap-bang/tot-nghiep/${hv.id}`
        : `${backendUrl}/api/admin/cap-bang/bang-lai/${hv.id}`
      const res = await axios.delete(endpoint, { headers })
      if (res.data.success) { toast.success(res.data.message); fetchList() }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }


  const isTN = tab === 'tot_nghiep'

  return (
    <div className="cap-bang-page">
      <div className="page-header">
        <div>
          <h2>🎓 Quản Lý Cấp Bằng</h2>
          <p>Xét duyệt và cấp bằng tốt nghiệp & bằng lái xe cho học viên</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="cb-tabs">
        <button className={`cb-tab ${tab === 'tot_nghiep' ? 'active' : ''}`} onClick={() => setTab('tot_nghiep')}>
          🎓 Bằng Tốt Nghiệp
        </button>
        <button className={`cb-tab ${tab === 'bang_lai' ? 'active' : ''}`} onClick={() => setTab('bang_lai')}>
          🪪 Bằng Lái Xe
        </button>
      </div>

      {/* ── Search + Filter ── */}
      <div className="search-bar">
        <input className="search-input" style={{ flex: 1 }}
          placeholder="🔍 Tìm theo tên, CCCD, số điện thoại..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="search-input" style={{ maxWidth: 180 }} value={filterTT} onChange={e => setFilterTT(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="cho_cap">⏳ Chờ cấp bằng</option>
          <option value="da_cap">✅ Đã cấp bằng</option>
        </select>
      </div>

      {/* ── Bảng danh sách ── */}
      <div className="card">
        <div className="card-header">
          <h3>
            {isTN ? '🎓 Học Viên Đã Thi Đậu Tốt Nghiệp' : '🪪 Học Viên Đã Thi Đậu Sát Hạch'}
          </h3>
          <span className="cb-total-badge">{total} học viên</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="loading-wrap"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Học viên</th>
                  <th>CCCD</th>
                  <th>Khóa học</th>
                  <th>Hạng bằng</th>
                  <th>{isTN ? 'Kết quả TN' : 'Kết quả SH'}</th>
                  <th>{isTN ? 'Bằng TN' : 'Bằng lái'}</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                    {search || filterTT ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có học viên nào'}
                  </td></tr>
                ) : list.map((hv, i) => {
                  const bang    = isTN ? hv.bang_tot_nghiep : hv.bang_lai_xe
                  const daCap   = !!bang
                  const loaiThi = isTN ? 'tot_nghiep' : 'sat_hanh'
                  const kq      = tongKetQua(hv.ket_qua_thi, loaiThi)

                  return (
                    <tr key={hv.id} className={daCap ? 'row-da-cap' : ''}>
                      <td>{(page - 1) * 15 + i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="cb-avatar">
                            {hv.anh_the
                              ? <img src={`/uploads/${hv.anh_the}`} alt={hv.ho_ten} />
                              : <span>{hv.ho_ten?.charAt(0)}</span>}
                          </div>
                          <div>
                            <strong>{hv.ho_ten}</strong>
                            <div style={{ fontSize: 11, color: '#718096' }}>{hv.so_dien_thoai || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{hv.so_cccd}</td>
                      <td style={{ fontSize: 12 }}>{hv.khoa_hoc?.ten_khoa || '—'}</td>
                      <td>
                        <span className="badge badge-blue">
                          Hạng {hv.khoa_hoc?.loai_bang || LOAI_BANG_LABEL[hv.khoa_hoc?.loai_bang] || '—'}
                        </span>
                      </td>
                      <td>
                        {kq === 'dat'
                          ? <span className="badge badge-success">✅ Đạt</span>
                          : kq === 'khong_dat'
                            ? <span className="badge badge-danger">❌ Không đạt</span>
                            : <span className="badge badge-gray">— Chưa có</span>}
                      </td>
                      <td>
                        {daCap ? (
                          <div>
                            <span className="badge badge-success" style={{ fontSize: 11 }}>✅ Đã cấp</span>
                            <div style={{ fontSize: 11, color: '#374151', marginTop: 2, fontWeight: 600 }}>
                              {isTN ? bang.so_bang : bang.so_bang_lai}
                            </div>
                            <div style={{ fontSize: 11, color: '#718096' }}>
                              📅 {fmtDate(bang.ngay_cap)}
                            </div>
                            {bang.nguoi_nhan && (
                              <div style={{ fontSize: 11, color: '#718096' }}>
                                👤 {bang.nguoi_nhan}
                                {bang.quan_he && bang.quan_he !== 'ban_than' &&
                                  <span style={{ color: '#f59e0b', marginLeft: 4 }}>
                                    ({bang.quan_he === 'cha_me' ? 'Cha/Mẹ'
                                      : bang.quan_he === 'vo_chong' ? 'Vợ/Chồng'
                                      : bang.quan_he === 'anh_chi_em' ? 'Anh/Chị/Em'
                                      : 'Ủy quyền'})
                                  </span>
                                }
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-warning">⏳ Chờ cấp</span>
                        )}
                      </td>
                      <td>
                        <div className="action-cell">
                          {!daCap ? (
                            <button className="btn btn-primary btn-sm" onClick={() => openCapBang(hv)}>
                              🎓 Cấp bằng
                            </button>
                          ) : (
                            <button className="btn btn-danger btn-sm" onClick={() => handleHuyBang(hv)}>
                              🗑️ Thu hồi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
            <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>


      {/* ── MODAL CẤP BẰNG ── */}
      {showModal && selected && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{isTN ? '🎓 Cấp Bằng Tốt Nghiệp' : '🪪 Cấp Bằng Lái Xe'}</h3>
                <p style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>
                  {selected.ho_ten} — {selected.so_cccd} — Hạng {selected.khoa_hoc?.loai_bang}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCapBang}>
              <div className="modal-body">

                {/* Thông tin học viên */}
                <div className="cb-info-box">
                  <div className="cb-info-row">
                    <div className="cb-info-item">
                      <span className="cb-info-label">👤 Họ tên</span>
                      <span className="cb-info-value">{selected.ho_ten}</span>
                    </div>
                    <div className="cb-info-item">
                      <span className="cb-info-label">🪪 CCCD</span>
                      <span className="cb-info-value" style={{ fontFamily: 'monospace' }}>{selected.so_cccd}</span>
                    </div>
                    <div className="cb-info-item">
                      <span className="cb-info-label">🎂 Ngày sinh</span>
                      <span className="cb-info-value">{fmtDate(selected.ngay_sinh)}</span>
                    </div>
                    <div className="cb-info-item">
                      <span className="cb-info-label">🏅 Hạng bằng</span>
                      <span className="cb-info-value">
                        <span className="badge badge-blue">Hạng {selected.khoa_hoc?.loai_bang}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form cấp bằng */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>

                  {/* ── Thông tin bằng ── */}
                  <div className="cb-section-title" style={{ gridColumn: '1 / -1' }}>📋 Thông Tin Bằng</div>

                  <div className="form-group" style={{ gridColumn: isTN ? '1 / -1' : undefined }}>
                    <label>📅 Ngày cấp *</label>
                    <input type="date" value={form.ngay_cap} onChange={e => setForm({ ...form, ngay_cap: e.target.value })} required />
                  </div>

                  {!isTN && (
                    <>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>🏛️ Cơ quan cấp *</label>
                        <input value={form.co_quan_cap} onChange={e => setForm({ ...form, co_quan_cap: e.target.value })}
                          placeholder="VD: Cục Đường bộ Việt Nam - Chi cục Vĩnh Long" required />
                      </div>
                      <div className="form-group">
                        <label>📅 Ngày hết hạn</label>
                        <input type="date" value={form.ngay_het_han} onChange={e => setForm({ ...form, ngay_het_han: e.target.value })}
                          placeholder="Để trống = không thời hạn" />
                      </div>
                      <div />
                    </>
                  )}

                  {/* ── Thông tin người nhận ── */}
                  <div className="cb-section-title" style={{ gridColumn: '1 / -1' }}>👤 Thông Tin Người Nhận Bằng</div>

                  <div className="form-group">
                    <label>👤 Họ tên người nhận *</label>
                    <input value={form.nguoi_nhan} onChange={e => setForm({ ...form, nguoi_nhan: e.target.value })}
                      placeholder="Nhập họ tên người nhận" required />
                  </div>

                  <div className="form-group">
                    <label>🔗 Quan hệ với học viên *</label>
                    <select value={form.quan_he} onChange={e => {
                      const qh = e.target.value
                      setForm(prev => ({
                        ...prev,
                        quan_he: qh,
                        // Nếu chọn "bản thân" → tự điền lại thông tin học viên
                        nguoi_nhan:      qh === 'ban_than' ? selected.ho_ten : prev.nguoi_nhan,
                        cccd_nguoi_nhan: qh === 'ban_than' ? selected.so_cccd : '',
                      }))
                    }} required>
                      <option value="ban_than">Bản thân học viên</option>
                      <option value="cha_me">Cha / Mẹ</option>
                      <option value="vo_chong">Vợ / Chồng</option>
                      <option value="anh_chi_em">Anh / Chị / Em</option>
                      <option value="uy_quyen">Người được ủy quyền</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>🪪 CCCD người nhận {form.quan_he !== 'ban_than' && '*'}</label>
                    <input value={form.cccd_nguoi_nhan}
                      onChange={e => setForm({ ...form, cccd_nguoi_nhan: e.target.value })}
                      placeholder={form.quan_he === 'ban_than' ? selected?.so_cccd : 'Nhập số CCCD'}
                      required={form.quan_he !== 'ban_than'}
                      maxLength={12} />
                  </div>

                  <div className="form-group">
                    <label>📝 Ghi chú</label>
                    <input value={form.ghi_chu} onChange={e => setForm({ ...form, ghi_chu: e.target.value })}
                      placeholder="Ghi chú thêm nếu có..." />
                  </div>
                </div>

                {/* Preview số bằng sẽ được tạo tự động */}
                <div className="cb-preview-note">
                  <span>💡</span>
                  <span>Số bằng sẽ được hệ thống tự động tạo sau khi xác nhận cấp.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {isTN ? '🎓 Xác nhận cấp bằng TN' : '🪪 Xác nhận cấp bằng lái'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CapBangManagement
