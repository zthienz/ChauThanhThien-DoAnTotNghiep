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

// Tính ngày thi đậu gần nhất theo loại thi
const getNgayThiDau = (ketQuaList, loaiThi) => {
  const filtered = (ketQuaList || []).filter(kq => kq.lich_thi?.loai_thi === loaiThi)
  if (!filtered.length) return null
  // Nhóm theo lich_thi_id
  const byLich = {}
  filtered.forEach(kq => {
    const id = kq.lich_thi_id
    if (!byLich[id]) byLich[id] = { ngay: kq.lich_thi?.ngay_thi, items: [] }
    byLich[id].items.push(kq)
  })
  // Tìm buổi thi mà tất cả kết quả đều "dat"
  const danhSachDau = Object.values(byLich)
    .filter(l => l.items.every(kq => kq.ket_qua === 'dat') && l.ngay)
    .map(l => l.ngay)
  if (!danhSachDau.length) return null
  // Lấy ngày đậu gần nhất (nhỏ nhất trong các buổi đậu)
  return danhSachDau.sort()[0]
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
  const [dateWarning, setDateWarning] = useState('')

  // ── Modal xem thông tin học viên ──
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [infoHV, setInfoHV]               = useState(null)
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

  const openInfoModal = (hv) => {
    setInfoHV(hv)
    setShowInfoModal(true)
  }

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
    setDateWarning('')
  }

  const handleCapBang = async e => {
    e.preventDefault()
    // Validate ngày cấp phải sau ngày thi đậu
    const loaiThi = tab === 'tot_nghiep' ? 'tot_nghiep' : 'sat_hanh'
    const ngayThiDau = getNgayThiDau(selected.ket_qua_thi, loaiThi)
    if (ngayThiDau && form.ngay_cap <= ngayThiDau) {
      const loaiLabel = tab === 'tot_nghiep' ? 'tốt nghiệp' : 'sát hạch'
      setDateWarning(`⚠️ Ngày cấp bằng phải sau ngày thi ${loaiLabel} (${fmtDate(ngayThiDau)}). Vui lòng chọn từ ngày ${fmtDate(new Date(new Date(ngayThiDau).getTime() + 86400000))} trở về sau.`)
      return
    }
    setDateWarning('')
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

  const handleXoaBang = async (hv) => {
    const label = tab === 'tot_nghiep' ? 'bằng tốt nghiệp' : 'bằng lái xe'
    if (!confirm(`⚠️ XÓA TOÀN BỘ DỮ LIỆU HỌC VIÊN\n\nHọc viên: ${hv.ho_ten}\nCCCD: ${hv.so_cccd}\n\nThao tác này sẽ xóa vĩnh viễn:\n• Hồ sơ đăng ký\n• ${label} đã cấp\n• Toàn bộ kết quả thi\n• Lịch sử thanh toán\n• Tài khoản đăng nhập\n\nKHÔNG THỂ HOÀN TÁC! Bạn có chắc chắn?`)) return
    try {
      const endpoint = tab === 'tot_nghiep'
        ? `${backendUrl}/api/admin/cap-bang/tot-nghiep/${hv.id}/xoa`
        : `${backendUrl}/api/admin/cap-bang/bang-lai/${hv.id}/xoa`
      const res = await axios.delete(endpoint, { headers })
      if (res.data.success) { 
        toast.success(`Đã xóa ${label}`)
        fetchList() 
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa bằng') }
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
                          <button className="btn btn-info btn-sm" onClick={() => openInfoModal(hv)} title="Xem thông tin học viên">
                            👁️ Xem
                          </button>
                          {!daCap ? (
                            <button className="btn btn-primary btn-sm" onClick={() => openCapBang(hv)}>
                              🎓 Cấp bằng
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-warning btn-sm" onClick={() => handleHuyBang(hv)} 
                                title="Thu hồi bằng (khôi phục về trạng thái chờ cấp)">
                                ↩️ Thu hồi
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleXoaBang(hv)}
                                title="Xóa hoàn toàn bản ghi cấp bằng">
                                🗑️ Xóa
                              </button>
                            </div>
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


      {/* ── MODAL XEM THÔNG TIN HỌC VIÊN ── */}
      {showInfoModal && infoHV && (
        <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>👤 Thông Tin Học Viên</h3>
                <p style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>Chi tiết hồ sơ và kết quả thi</p>
              </div>
              <button className="modal-close" onClick={() => setShowInfoModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Avatar + tên */}
              <div className="hv-info-header">
                <div className="hv-info-avatar">
                  {infoHV.anh_the
                    ? <img src={`/uploads/${infoHV.anh_the}`} alt={infoHV.ho_ten} />
                    : <span>{infoHV.ho_ten?.charAt(0)}</span>}
                </div>
                <div>
                  <div className="hv-info-name">{infoHV.ho_ten}</div>
                  <div style={{ fontSize: 13, color: '#718096' }}>{infoHV.so_dien_thoai || '—'}</div>
                  <div style={{ fontSize: 13, color: '#718096' }}>{infoHV.email || '—'}</div>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="cb-section-title" style={{ marginTop: 16 }}>📋 Thông Tin Cá Nhân</div>
              <div className="hv-info-grid">
                <div className="hv-info-item">
                  <span className="cb-info-label">🪪 Số CCCD</span>
                  <span className="cb-info-value" style={{ fontFamily: 'monospace' }}>{infoHV.so_cccd || '—'}</span>
                </div>
                <div className="hv-info-item">
                  <span className="cb-info-label">🎂 Ngày sinh</span>
                  <span className="cb-info-value">{fmtDate(infoHV.ngay_sinh)}</span>
                </div>
              </div>

              {/* Thông tin khóa học */}
              <div className="cb-section-title" style={{ marginTop: 16 }}>🎓 Thông Tin Khóa Học</div>
              <div className="hv-info-grid">
                <div className="hv-info-item">
                  <span className="cb-info-label">📚 Khóa học</span>
                  <span className="cb-info-value">{infoHV.khoa_hoc?.ten_khoa || '—'}</span>
                </div>
                <div className="hv-info-item">
                  <span className="cb-info-label">🏅 Hạng bằng</span>
                  <span className="cb-info-value">
                    <span className="badge badge-blue">Hạng {infoHV.khoa_hoc?.loai_bang || '—'}</span>
                  </span>
                </div>
                <div className="hv-info-item">
                  <span className="cb-info-label">📅 Ngày đăng ký</span>
                  <span className="cb-info-value">{fmtDate(infoHV.ngay_dang_ky || infoHV.created_at)}</span>
                </div>
              </div>

              {/* Kết quả thi */}
              <div className="cb-section-title" style={{ marginTop: 16 }}>📊 Kết Quả Thi</div>
              {infoHV.ket_qua_thi && infoHV.ket_qua_thi.length > 0 ? (
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Loại thi</th>
                      <th>Lần thi</th>
                      <th>Ngày thi</th>
                      <th>Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {infoHV.ket_qua_thi.map((kq, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          {kq.lich_thi?.loai_thi === 'tot_nghiep' ? '🎓 Tốt nghiệp'
                            : kq.lich_thi?.loai_thi === 'sat_hanh' ? '🚗 Sát hạch'
                            : kq.lich_thi?.loai_thi || '—'}
                        </td>
                        <td>{kq.lan_thi || '—'}</td>
                        <td>{fmtDate(kq.lich_thi?.ngay_thi)}</td>
                        <td>
                          {kq.ket_qua === 'dat'
                            ? <span className="badge badge-success">✅ Đạt</span>
                            : <span className="badge badge-danger">❌ Không đạt</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: '#a0aec0', fontSize: 13 }}>
                  Chưa có kết quả thi
                </div>
              )}

              {/* Thông tin bằng đã cấp */}
              {(() => {
                const bang = isTN ? infoHV.bang_tot_nghiep : infoHV.bang_lai_xe
                if (!bang) return null
                return (
                  <>
                    <div className="cb-section-title" style={{ marginTop: 16 }}>
                      {isTN ? '🎓 Bằng Tốt Nghiệp Đã Cấp' : '🪪 Bằng Lái Đã Cấp'}
                    </div>
                    <div className="hv-info-grid" style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 16px', border: '1px solid #d1fae5' }}>
                      <div className="hv-info-item">
                        <span className="cb-info-label">🔖 Số bằng</span>
                        <span className="cb-info-value" style={{ fontFamily: 'monospace', color: '#065f46' }}>
                          {isTN ? bang.so_bang : bang.so_bang_lai}
                        </span>
                      </div>
                      <div className="hv-info-item">
                        <span className="cb-info-label">📅 Ngày cấp</span>
                        <span className="cb-info-value">{fmtDate(bang.ngay_cap)}</span>
                      </div>
                      {!isTN && (
                        <>
                          <div className="hv-info-item">
                            <span className="cb-info-label">🏛️ Cơ quan cấp</span>
                            <span className="cb-info-value">{bang.co_quan_cap || '—'}</span>
                          </div>
                          <div className="hv-info-item">
                            <span className="cb-info-label">⏰ Ngày hết hạn</span>
                            <span className="cb-info-value">{bang.ngay_het_han ? fmtDate(bang.ngay_het_han) : 'Không thời hạn'}</span>
                          </div>
                        </>
                      )}
                      <div className="hv-info-item">
                        <span className="cb-info-label">👤 Người nhận</span>
                        <span className="cb-info-value">{bang.nguoi_nhan || '—'}</span>
                      </div>
                      {bang.ghi_chu && (
                        <div className="hv-info-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="cb-info-label">📝 Ghi chú</span>
                          <span className="cb-info-value">{bang.ghi_chu}</span>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}

            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowInfoModal(false)}>Đóng</button>
              {!(isTN ? infoHV.bang_tot_nghiep : infoHV.bang_lai_xe) && (
                <button type="button" className="btn btn-primary" onClick={() => { setShowInfoModal(false); openCapBang(infoHV) }}>
                  🎓 Cấp bằng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

                  {(() => {
                    const loaiThi = isTN ? 'tot_nghiep' : 'sat_hanh'
                    const ngayThiDau = getNgayThiDau(selected.ket_qua_thi, loaiThi)
                    // Tính ngày tối thiểu cho phép cấp bằng = ngày sau ngày thi đậu
                    const minDate = ngayThiDau
                      ? new Date(new Date(ngayThiDau).getTime() + 86400000).toISOString().slice(0, 10)
                      : null
                    return (
                      <div className="form-group" style={{ gridColumn: isTN ? '1 / -1' : undefined }}>
                        <label>📅 Ngày cấp *</label>
                        {ngayThiDau && (
                          <div style={{ fontSize: 12, color: '#0066cc', marginBottom: 6, fontWeight: 500 }}>
                            ℹ️ Học viên thi đậu {isTN ? 'tốt nghiệp' : 'sát hạch'} ngày <strong>{fmtDate(ngayThiDau)}</strong> — ngày cấp bằng phải từ <strong>{fmtDate(minDate)}</strong> trở về sau
                          </div>
                        )}
                        <input
                          type="date"
                          value={form.ngay_cap}
                          min={minDate || undefined}
                          onChange={e => {
                            const val = e.target.value
                            setForm({ ...form, ngay_cap: val })
                            if (ngayThiDau && val <= ngayThiDau) {
                              const loaiLabel = isTN ? 'tốt nghiệp' : 'sát hạch'
                              setDateWarning(`⚠️ Ngày cấp bằng phải sau ngày thi ${loaiLabel} (${fmtDate(ngayThiDau)}). Vui lòng chọn từ ngày ${fmtDate(minDate)} trở về sau.`)
                            } else {
                              setDateWarning('')
                            }
                          }}
                          required
                          style={dateWarning ? { borderColor: '#e53935' } : {}}
                        />
                        {dateWarning && (
                          <div style={{ marginTop: 6, padding: '8px 12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, fontSize: 13, color: '#856404' }}>
                            {dateWarning}
                          </div>
                        )}
                      </div>
                    )
                  })()}

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
                <button type="submit" className="btn btn-primary" disabled={!!dateWarning}>
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
