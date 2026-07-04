import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import './GiangVienManagement.css'
import '../KhoaHocDaoTao/KhoaHocDaoTao.css'

const CM_MAP = {
  ly_thuyet: { text: '📖 Lý thuyết', cls: 'badge-info' },
  thuc_hanh: { text: '🚗 Thực hành', cls: 'badge-warning' },
  ca_hai:    { text: '📖🚗 Cả hai',  cls: 'badge-purple' },
}

const TT_GV_MAP = {
  san_sang:  { label: '✅ Sẵn sàng',   cls: 'badge-success' },
  nghi_phep: { label: '🏖️ Nghỉ phép', cls: 'badge-warning' },
  dinh_chi:  { label: '🚫 Đình chỉ',  cls: 'badge-danger' },
}

const emptyForm = {
  ho_ten: '', email: '', password: '', so_dien_thoai: '',
  chuyen_mon: 'ca_hai', bang_cap: '', nam_kinh_nghiem: '', ghi_chu: ''
}

const emptyEditForm = {
  ho_ten: '', email: '', password: '',
  so_dien_thoai: '', chuyen_mon: 'ca_hai',
  bang_cap: '', nam_kinh_nghiem: 0, ghi_chu: ''
}

const GiangVienManagement = () => {
  const { token, backendUrl } = useAdmin()
  const [list, setList]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [showDetail, setShowDetail] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGV, setEditingGV]   = useState(null)
  const [search, setSearch]         = useState('')
  const [filterCM, setFilterCM]     = useState('')

  // Form thêm mới
  const [form, setForm]         = useState(emptyForm)
  const [addAnh, setAddAnh]     = useState(null)   // File
  const [addPreview, setAddPreview] = useState(null)
  const addFileRef = useRef()

  // Form sửa
  const [editForm, setEditForm]     = useState(emptyEditForm)
  const [editAnh, setEditAnh]       = useState(null)
  const [editPreview, setEditPreview] = useState(null)
  const editFileRef = useRef()

  const headers = { Authorization: `Bearer ${token}` }

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/giang-vien`, { headers })
      if (res.data.success) setList(res.data.data)
      else toast.error(res.data.message || 'Lỗi tải dữ liệu')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi kết nối server')
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchList() }, [])

  // ── Xử lý ảnh ──
  const handleAnhChange = (file, setFile, setPreview) => {
    if (!file) return
    setFile(file)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  // ── Validation ──
  const validatePhone = (phone) => {
    if (!phone) return true // không bắt buộc
    return /^0\d{9}$/.test(phone)
  }

  const validateEmail = (email) => {
    return /^[^\s@]+@gmail\.com$/.test(email)
  }

  // ── Thêm giảng viên ──
  const openAdd = () => {
    setForm(emptyForm)
    setAddAnh(null); setAddPreview(null)
    setShowAddModal(true)
  }

  const handleSave = async e => {
    e.preventDefault()
    if (!validateEmail(form.email)) {
      toast.error('Email phải có định dạng @gmail.com')
      return
    }
    if (form.so_dien_thoai && !validatePhone(form.so_dien_thoai)) {
      toast.error('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0')
      return
    }
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v) })
      if (addAnh) fd.append('anh_dai_dien', addAnh)
      const res = await axios.post(`${backendUrl}/api/admin/giang-vien`, fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      })
      if (res.data.success) {
        toast.success('Tạo tài khoản giảng viên thành công!')
        setShowAddModal(false)
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // ── Sửa giảng viên ──
  const openEditGV = gv => {
    setEditingGV(gv)
    setEditForm({
      ho_ten:          gv.ho_ten || '',
      email:           gv.email || '',
      password:        '',
      so_dien_thoai:   gv.so_dien_thoai || '',
      chuyen_mon:      gv.chuyen_mon || 'ca_hai',
      bang_cap:        gv.bang_cap || '',
      nam_kinh_nghiem: gv.nam_kinh_nghiem || 0,
      ghi_chu:         gv.ghi_chu || '',
    })
    setEditAnh(null)
    setEditPreview(gv.anh_dai_dien ? `/uploads/${gv.anh_dai_dien}` : null)
  }

  const handleSuaGV = async e => {
    e.preventDefault()
    if (!editForm.ho_ten.trim()) { toast.error('Vui lòng nhập họ và tên'); return }
    if (!editForm.email.trim()) { toast.error('Vui lòng nhập email'); return }
    if (!validateEmail(editForm.email)) {
      toast.error('Email phải có định dạng @gmail.com')
      return
    }
    if (!editForm.so_dien_thoai.trim()) { toast.error('Vui lòng nhập số điện thoại'); return }
    if (!validatePhone(editForm.so_dien_thoai)) {
      toast.error('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0')
      return
    }
    if (!editForm.password.trim()) { toast.error('Vui lòng nhập mật khẩu'); return }
    if (editForm.password.length < 8) { toast.error('Mật khẩu tối thiểu 8 ký tự'); return }
    try {
      const fd = new FormData()
      Object.entries(editForm).forEach(([k, v]) => fd.append(k, v ?? ''))
      if (editAnh) fd.append('anh_dai_dien', editAnh)
      const res = await axios.post(
        `${backendUrl}/api/admin/giang-vien/${editingGV.id}?_method=PUT`, fd,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
      )
      if (res.data.success) {
        toast.success('Cập nhật giảng viên thành công!')
        setEditingGV(null)
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // ── Xóa ──
  const handleXoaGV = async gv => {
    if (!confirm(`Xóa tài khoản giảng viên "${gv.ho_ten}"?\nHành động này không thể hoàn tác.`)) return
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/giang-vien/${gv.id}`, { headers })
      if (res.data.success) { toast.success('Đã xóa giảng viên'); fetchList() }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // ── Toggle ──
  const handleToggle = async (userId, closeDetail = false) => {
    try {
      const res = await axios.patch(`${backendUrl}/api/admin/users/${userId}/toggle`, {}, { headers })
      if (res.data.success) {
        toast.success(res.data.message)
        if (closeDetail) setShowDetail(null)
        fetchList()
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // ── Đổi trạng thái giảng viên (san_sang / nghi_phep / dinh_chi) ──
  const handleTrangThaiGV = async (gvId, tt) => {
    try {
      const res = await axios.patch(
        `${backendUrl}/api/admin/giang-vien/${gvId}/trang-thai`,
        { trang_thai: tt },
        { headers }
      )
      if (res.data.success) {
        toast.success('Cập nhật trạng thái thành công')
        setList(prev => prev.map(gv => gv.id === gvId ? { ...gv, trang_thai: tt } : gv))
        if (showDetail?.id === gvId) setShowDetail(prev => ({ ...prev, trang_thai: tt }))
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const filtered = list.filter(gv => {
    const matchSearch = !search ||
      gv.ho_ten?.toLowerCase().includes(search.toLowerCase()) ||
      gv.email?.toLowerCase().includes(search.toLowerCase()) ||
      gv.so_dien_thoai?.includes(search)
    const matchCM = !filterCM || gv.chuyen_mon === filterCM
    return matchSearch && matchCM
  })

  // ── Component upload ảnh ──
  const AnhUpload = ({ preview, onClear, onPick, fileRef, label = '📷 Ảnh đại diện' }) => (
    <div className="gv-anh-col">
      <p className="gv-anh-label">{label}</p>
      <div className={`gv-anh-upload ${preview ? 'has-image' : ''}`} onClick={onPick}>
        {preview ? (
          <img src={preview} alt="Ảnh" className="gv-anh-preview" />
        ) : (
          <div className="gv-anh-placeholder">
            <span>📷</span>
            <p>Nhấn để chọn ảnh</p>
            <small>JPG, PNG — tối đa 5MB</small>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => handleAnhChange(e.target.files[0], ...onClear)} />
      {preview && (
        <button type="button" className="btn btn-outline btn-sm"
          style={{ marginTop: 6, width: '100%' }}
          onClick={() => { onClear[0](null); onClear[1](null) }}>
          🗑️ Xóa ảnh
        </button>
      )}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div><h2>👨‍🏫 Giảng Viên</h2><p>Quản lý tài khoản giảng viên</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Thêm giảng viên</button>
      </div>

      {/* ── THẺ THỐNG KÊ ── */}
      <div className="khdt-stats" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className="khdt-stat-card">
          <span className="khdt-stat-icon">👨‍🏫</span>
          <div>
            <p className="khdt-stat-value">{list.length}</p>
            <p className="khdt-stat-label">Tổng giảng viên</p>
          </div>
        </div>
        <div className="khdt-stat-card green">
          <span className="khdt-stat-icon">✅</span>
          <div>
            <p className="khdt-stat-value">{list.filter(g => (g.trang_thai ?? 'san_sang') === 'san_sang').length}</p>
            <p className="khdt-stat-label">Sẵn sàng</p>
          </div>
        </div>
        <div className="khdt-stat-card" style={{borderLeft:'4px solid #f59e0b'}}>
          <span className="khdt-stat-icon">🏖️</span>
          <div>
            <p className="khdt-stat-value">{list.filter(g => g.trang_thai === 'nghi_phep').length}</p>
            <p className="khdt-stat-label">Nghỉ phép</p>
          </div>
        </div>
        <div className="khdt-stat-card gray">
          <span className="khdt-stat-icon">🚫</span>
          <div>
            <p className="khdt-stat-value">{list.filter(g => g.trang_thai === 'dinh_chi').length}</p>
            <p className="khdt-stat-label">Đình chỉ</p>
          </div>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="search-bar">
        <input className="search-input" placeholder="🔍 Tìm theo tên, email, số điện thoại..."          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="search-input" style={{maxWidth:200}} value={filterCM} onChange={e => setFilterCM(e.target.value)}>
          <option value="">Tất cả chuyên môn</option>
          <option value="ly_thuyet">📖 Lý thuyết</option>
          <option value="thuc_hanh">🚗 Thực hành</option>
          <option value="ca_hai">📖🚗 Cả hai</option>
        </select>
      </div>

      {/* ── BẢNG ── */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="loading-wrap"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Giảng viên</th><th>Email</th><th>SĐT</th>
                  <th>Chuyên môn</th><th>Kinh nghiệm</th><th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                    {search || filterCM ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có giảng viên nào'}
                  </td></tr>
                ) : filtered.map((gv, i) => {
                  return (
                  <tr key={gv.id}>
                    <td>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="gv-avatar-sm">
                          {gv.anh_dai_dien
                            ? <img src={`/uploads/${gv.anh_dai_dien}`} alt={gv.ho_ten} className="gv-avatar-img" />
                            : <span>{gv.ho_ten?.charAt(0).toUpperCase()}</span>}
                        </div>
                        <strong>{gv.ho_ten}</strong>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{gv.email}</td>
                    <td>{gv.so_dien_thoai || '—'}</td>
                    <td><span className={`badge ${CM_MAP[gv.chuyen_mon]?.cls || 'badge-gray'}`}>{CM_MAP[gv.chuyen_mon]?.text || gv.chuyen_mon}</span></td>
                    <td>{gv.nam_kinh_nghiem} năm</td>
                    <td>
                      {/* Tài khoản bị khóa → badge đỏ, không cho đổi trạng thái công việc */}
                      {!gv.is_active ? (
                        <span className="badge badge-danger">🔒 Bị khóa</span>
                      ) : (
                        <select
                          className={`gv-tt-select gv-tt-${gv.trang_thai || 'san_sang'}`}
                          value={gv.trang_thai || 'san_sang'}
                          onChange={e => handleTrangThaiGV(gv.id, e.target.value)}
                        >
                          {Object.entries(TT_GV_MAP).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <div className="action-cell">
                        <button className="btn btn-info btn-sm" onClick={() => setShowDetail(gv)}>👁️ Xem</button>
                        <button className={`btn btn-sm ${gv.is_active ? 'btn-secondary' : 'btn-success'}`}
                          onClick={() => handleToggle(gv.user_id)}>
                          {gv.is_active ? '🔒 Khóa' : '🔓 Mở'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleXoaGV(gv)}>🗑️ Xóa</button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── MODAL CHI TIẾT ── */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-lg gv-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👨‍🏫 Chi Tiết Giảng Viên</h3>
              <button className="modal-close" onClick={() => setShowDetail(null)}>✕</button>
            </div>
            <div className="modal-body gv-detail-body">
              <div className="gv-detail-layout">

                {/* Cột trái: ảnh + tên */}
                <div className="gv-detail-left">
                  <div className="gv-detail-anh-wrap">
                    {showDetail.anh_dai_dien ? (
                      <img src={`/uploads/${showDetail.anh_dai_dien}`}
                        alt={showDetail.ho_ten} className="gv-detail-anh"
                        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
                    ) : null}
                    <div className="gv-detail-anh-fallback"
                      style={{ display: showDetail.anh_dai_dien ? 'none' : 'flex' }}>
                      {showDetail.ho_ten?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <h3 className="gv-detail-name">{showDetail.ho_ten}</h3>
                  {/* Trạng thái: bị khóa → badge đỏ duy nhất, không bị khóa → badge trạng thái công việc */}
                  {!showDetail.is_active ? (
                    <span className="badge badge-danger" style={{ fontSize: 13 }}>🔒 Bị khóa</span>
                  ) : (
                    <span className={`badge ${TT_GV_MAP[showDetail.trang_thai || 'san_sang']?.cls}`} style={{ fontSize: 13 }}>
                      {TT_GV_MAP[showDetail.trang_thai || 'san_sang']?.label}
                    </span>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <span className={`badge ${CM_MAP[showDetail.chuyen_mon]?.cls || 'badge-gray'}`} style={{ fontSize: 13 }}>
                      {CM_MAP[showDetail.chuyen_mon]?.text || showDetail.chuyen_mon}
                    </span>
                  </div>
                  <div className="gv-detail-exp">
                    <span className="gv-detail-exp-num">{showDetail.nam_kinh_nghiem}</span>
                    <span className="gv-detail-exp-label">năm kinh nghiệm</span>
                  </div>
                </div>

                {/* Cột phải: thông tin chi tiết */}
                <div className="gv-detail-right">
                  <div className="gv-section-title">📋 Thông Tin Liên Hệ</div>
                  <div className="gv-detail-grid">
                    <div className="gv-detail-box">
                      <div className="gv-detail-label">📧 Email</div>
                      <div className="gv-detail-value">{showDetail.email}</div>
                    </div>
                    <div className="gv-detail-box">
                      <div className="gv-detail-label">📞 Số điện thoại</div>
                      <div className="gv-detail-value">{showDetail.so_dien_thoai || '—'}</div>
                    </div>
                  </div>

                  <div className="gv-section-title" style={{ marginTop: 16 }}>🎓 Chuyên Môn & Bằng Cấp</div>
                  <div className="gv-detail-grid">
                    <div className="gv-detail-box">
                      <div className="gv-detail-label">🏫 Chuyên môn</div>
                      <div className="gv-detail-value">{CM_MAP[showDetail.chuyen_mon]?.text || showDetail.chuyen_mon}</div>
                    </div>
                    <div className="gv-detail-box">
                      <div className="gv-detail-label">📜 Bằng cấp</div>
                      <div className="gv-detail-value">{showDetail.bang_cap || '—'}</div>
                    </div>
                    <div className="gv-detail-box" style={{ gridColumn: '1 / -1' }}>
                      <div className="gv-detail-label">📝 Ghi chú</div>
                      <div className="gv-detail-value" style={{ fontWeight: 400, color: '#4b5563' }}>
                        {showDetail.ghi_chu || <em style={{ color: '#9ca3af' }}>Không có ghi chú</em>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>Đóng</button>
              <button className="btn btn-warning" onClick={() => { setShowDetail(null); openEditGV(showDetail) }}>✏️ Sửa</button>
              {/* Dropdown đổi trạng thái chỉ hiện khi tài khoản đang hoạt động */}
              {showDetail.is_active && (
                <select
                  className={`gv-tt-select gv-tt-${showDetail.trang_thai || 'san_sang'}`}
                  value={showDetail.trang_thai || 'san_sang'}
                  onChange={e => handleTrangThaiGV(showDetail.id, e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer' }}
                >
                  {Object.entries(TT_GV_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              )}
              <button className={`btn ${showDetail.is_active ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleToggle(showDetail.user_id, true)}>
                {showDetail.is_active ? '🔒 Khóa tài khoản' : '🔓 Mở tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM GIẢNG VIÊN ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👨‍🏫 Thêm Giảng Viên Mới</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="gv-form-layout">
                  {/* Cột ảnh */}
                  <div className="gv-anh-col">
                    <p className="gv-anh-label">📷 Ảnh đại diện</p>
                    <div className={`gv-anh-upload ${addPreview ? 'has-image' : ''}`}
                      onClick={() => addFileRef.current?.click()}>
                      {addPreview
                        ? <img src={addPreview} alt="preview" className="gv-anh-preview" />
                        : <div className="gv-anh-placeholder">
                            <span>📷</span><p>Nhấn để chọn ảnh</p><small>JPG, PNG — tối đa 5MB</small>
                          </div>}
                    </div>
                    <input ref={addFileRef} type="file" accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={e => handleAnhChange(e.target.files[0], setAddAnh, setAddPreview)} />
                    {addPreview && (
                      <button type="button" className="btn btn-outline btn-sm"
                        style={{ marginTop: 6, width: '100%' }}
                        onClick={() => { setAddAnh(null); setAddPreview(null) }}>
                        🗑️ Xóa ảnh
                      </button>
                    )}
                    <p className="gv-anh-hint">Ảnh đại diện hiển thị trong hệ thống</p>
                  </div>

                  {/* Cột thông tin */}
                  <div className="gv-info-col">
                    <div className="gv-section-title">👤 Thông Tin Tài Khoản</div>
                    <div className="form-row-2">
                      <div className="form-group"><label>Họ và tên *</label>
                        <input value={form.ho_ten} onChange={e => setForm({ ...form, ho_ten: e.target.value })} required placeholder="VD: Nguyễn Văn A" />
                      </div>
                      <div className="form-group"><label>Email *</label>
                        <input type="email" value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          required placeholder="gv@gmail.com"
                          style={form.email && !validateEmail(form.email) ? { borderColor: '#e53e3e' } : {}} />
                        {form.email && !validateEmail(form.email) && (
                          <small style={{ color: '#e53e3e' }}>Email phải có định dạng @gmail.com</small>
                        )}
                      </div>
                      <div className="form-group"><label>Mật khẩu *</label>
                        <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} placeholder="Tối thiểu 8 ký tự" />
                      </div>
                      <div className="form-group"><label>Số điện thoại</label>
                        <input value={form.so_dien_thoai}
                          onChange={e => setForm({ ...form, so_dien_thoai: e.target.value })}
                          placeholder="0901234567" maxLength={10}
                          style={form.so_dien_thoai && !validatePhone(form.so_dien_thoai) ? { borderColor: '#e53e3e' } : {}} />
                        {form.so_dien_thoai && !validatePhone(form.so_dien_thoai) && (
                          <small style={{ color: '#e53e3e' }}>Phải gồm đúng 10 chữ số và bắt đầu bằng số 0</small>
                        )}
                      </div>
                    </div>

                    <div className="gv-section-title" style={{ marginTop: 8 }}>🎓 Chuyên Môn</div>
                    <div className="form-row-2">
                      <div className="form-group"><label>Chuyên môn *</label>
                        <select value={form.chuyen_mon} onChange={e => setForm({ ...form, chuyen_mon: e.target.value })}>
                          <option value="ly_thuyet">📖 Lý thuyết</option>
                          <option value="thuc_hanh">🚗 Thực hành</option>
                          <option value="ca_hai">📖🚗 Cả hai</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Năm kinh nghiệm</label>
                        <input type="number" min={0} value={form.nam_kinh_nghiem} onChange={e => setForm({ ...form, nam_kinh_nghiem: e.target.value })} placeholder="VD: 5" />
                      </div>
                    </div>
                    <div className="form-group"><label>Bằng cấp</label>
                      <input value={form.bang_cap} onChange={e => setForm({ ...form, bang_cap: e.target.value })} placeholder="VD: Bằng lái hạng C, Cử nhân Luật GT" />
                    </div>
                    <div className="form-group"><label>Ghi chú</label>
                      <textarea rows={2} value={form.ghi_chu} onChange={e => setForm({ ...form, ghi_chu: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">➕ Tạo tài khoản</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL SỬA GIẢNG VIÊN ── */}
      {editingGV && (
        <div className="modal-overlay" onClick={() => setEditingGV(null)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Sửa Thông Tin — {editingGV.ho_ten}</h3>
              <button className="modal-close" onClick={() => setEditingGV(null)}>✕</button>
            </div>
            <form onSubmit={handleSuaGV}>
              <div className="modal-body">
                <div className="gv-form-layout">
                  {/* Cột ảnh */}
                  <div className="gv-anh-col">
                    <p className="gv-anh-label">📷 Ảnh đại diện</p>
                    <div className={`gv-anh-upload ${editPreview ? 'has-image' : ''}`}
                      onClick={() => editFileRef.current?.click()}>
                      {editPreview
                        ? <img src={editPreview} alt="preview" className="gv-anh-preview" />
                        : <div className="gv-anh-placeholder">
                            <span>📷</span><p>Nhấn để chọn ảnh</p><small>JPG, PNG — tối đa 5MB</small>
                          </div>}
                    </div>
                    <input ref={editFileRef} type="file" accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={e => handleAnhChange(e.target.files[0], setEditAnh, setEditPreview)} />
                    {editPreview && (
                      <button type="button" className="btn btn-outline btn-sm"
                        style={{ marginTop: 6, width: '100%' }}
                        onClick={() => { setEditAnh(null); setEditPreview(null) }}>
                        🗑️ Xóa ảnh
                      </button>
                    )}
                    <p className="gv-anh-hint">Chọn ảnh mới để thay thế ảnh hiện tại</p>
                  </div>

                  {/* Cột thông tin */}
                  <div className="gv-info-col">
                    <div className="gv-section-title">👤 Thông Tin Tài Khoản</div>
                    <div className="form-row-2">
                      <div className="form-group"><label>Họ và tên *</label>
                        <input value={editForm.ho_ten}
                          onChange={e => setEditForm({ ...editForm, ho_ten: e.target.value })}
                          required placeholder="Nguyễn Văn A" />
                      </div>
                      <div className="form-group"><label>Email *</label>
                        <input type="text" value={editForm.email}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          required placeholder="gv@gmail.com"
                          style={editForm.email && !validateEmail(editForm.email) ? { borderColor: '#e53e3e' } : {}} />
                        {editForm.email && !validateEmail(editForm.email) && (
                          <small style={{ color: '#e53e3e' }}>Email phải có định dạng @gmail.com</small>
                        )}
                      </div>
                      <div className="form-group"><label>Mật khẩu *</label>
                        <input type="text" value={editForm.password}
                          onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                          required placeholder="Tối thiểu 8 ký tự" />
                      </div>
                      <div className="form-group"><label>Số điện thoại *</label>
                        <input value={editForm.so_dien_thoai}
                          onChange={e => setEditForm({ ...editForm, so_dien_thoai: e.target.value })}
                          required placeholder="0901234567" maxLength={10}
                          style={editForm.so_dien_thoai && !validatePhone(editForm.so_dien_thoai) ? { borderColor: '#e53e3e' } : {}} />
                        {editForm.so_dien_thoai && !validatePhone(editForm.so_dien_thoai) && (
                          <small style={{ color: '#e53e3e' }}>Phải gồm đúng 10 chữ số và bắt đầu bằng số 0</small>
                        )}
                      </div>
                    </div>

                    <div className="gv-section-title" style={{ marginTop: 8 }}>🎓 Chuyên Môn</div>
                    <div className="form-row-2">
                      <div className="form-group"><label>Chuyên môn *</label>
                        <select value={editForm.chuyen_mon} onChange={e => setEditForm({ ...editForm, chuyen_mon: e.target.value })}>
                          <option value="ly_thuyet">📖 Lý thuyết</option>
                          <option value="thuc_hanh">🚗 Thực hành</option>
                          <option value="ca_hai">📖🚗 Cả hai</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Năm kinh nghiệm</label>
                        <input type="number" min={0} value={editForm.nam_kinh_nghiem} onChange={e => setEditForm({ ...editForm, nam_kinh_nghiem: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group"><label>Bằng cấp</label>
                      <input value={editForm.bang_cap} onChange={e => setEditForm({ ...editForm, bang_cap: e.target.value })} placeholder="VD: Bằng lái hạng C" />
                    </div>
                    <div className="form-group"><label>Ghi chú</label>
                      <textarea rows={3} value={editForm.ghi_chu} onChange={e => setEditForm({ ...editForm, ghi_chu: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditingGV(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">💾 Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default GiangVienManagement
