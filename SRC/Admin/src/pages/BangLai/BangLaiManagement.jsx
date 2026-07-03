import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import './BangLaiManagement.css'

// Không còn dùng HANG_BANG_LIST vì loai_bang là mã do người dùng nhập tự do

const emptyForm = {
  ten_khoa: '',
  loai_bang: 'B2',
  hoc_phi: '',
  so_buoi_ly_thuyet_toi_thieu: '',
  so_km_toi_thieu: '',
  tuoi_toi_thieu: '',
  tuoi_toi_da: '',
  mo_ta: '',
  // Thông tin hiển thị trên frontend
  doi_tuong: '',
  loai_xe_mo_ta: '',
  thoi_han_bang: '',
  yeu_cau_truoc: '',
  quyen_lai_xe: '',
  quy_trinh_dao_tao: '',
  le_phi_sat_hach: '',
  is_active: true,
}

const BangLaiManagement = () => {
  const { token, backendUrl } = useAdmin()
  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [viewItem, setViewItem]   = useState(null)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [anhFile, setAnhFile]     = useState(null)   // file ảnh mới chọn
  const [anhPreview, setAnhPreview] = useState('')   // preview URL
  const [activeTab, setActiveTab] = useState('co_ban')
  const [search, setSearch]       = useState('')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/khoa-hoc`, { headers })
      if (res.data.success) setList(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi kết nối server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setAnhFile(null)
    setAnhPreview('')
    setActiveTab('co_ban')
    setShowModal(true)
  }

  const openEdit = async (k) => {
    setEditing(k)
    setActiveTab('co_ban')
    setShowModal(true)
    setAnhFile(null)
    setAnhPreview(k.anh ? `${backendUrl}/uploads/${k.anh}` : '')
    setForm({ ...emptyForm, ...k })
    try {
      const res = await axios.get(`${backendUrl}/api/admin/khoa-hoc/${k.id}`, { headers })
      if (res.data.success) {
        const d = res.data.data
        setForm({ ...emptyForm, ...d })
        setAnhPreview(d.anh ? `${backendUrl}/uploads/${d.anh}` : '')
      }
    } catch {
      // giữ nguyên data cũ nếu fetch lỗi
    }
  }

  const handleAnhChange = e => {
    const file = e.target.files[0]
    if (!file) return
    setAnhFile(file)
    setAnhPreview(URL.createObjectURL(file))
  }

  const handleSave = async e => {
    e.preventDefault()

    // Validate: không được để cả 2 đều = 0
    const buoi = Number(form.so_buoi_ly_thuyet_toi_thieu)
    const km   = Number(form.so_km_toi_thieu)
    if (buoi === 0 && km === 0) {
      toast.error('Bằng lái phải có ít nhất số buổi lý thuyết hoặc số km thực hành > 0.')
      return
    }

    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v === null || v === undefined) return
        // Boolean phải convert sang 0/1 vì FormData stringify mọi thứ
        if (typeof v === 'boolean') {
          fd.append(k, v ? '1' : '0')
        } else if (v !== '') {
          fd.append(k, v)
        }
      })
      if (anhFile) fd.append('anh', anhFile)

      const uploadHeaders = { ...headers, 'Content-Type': 'multipart/form-data' }
      const res = editing
        ? await axios.post(`${backendUrl}/api/admin/khoa-hoc/${editing.id}/update`, fd, { headers: uploadHeaders })
        : await axios.post(`${backendUrl}/api/admin/khoa-hoc`, fd, { headers: uploadHeaders })

      if (res.data.success) {
        toast.success(editing ? 'Cập nhật thành công' : 'Tạo bằng lái thành công')
        setShowModal(false)
        fetchList()
      } else {
        toast.error(res.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa loại bằng lái này? Hành động không thể hoàn tác.')) return
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/khoa-hoc/${id}`, { headers })
      if (res.data.success) { toast.success('Đã xóa'); fetchList() }
      else toast.error(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    }
  }

  const handleToggleActive = async (item) => {
    try {
      const res = await axios.put(`${backendUrl}/api/admin/khoa-hoc/${item.id}`, { ...item, is_active: !item.is_active }, { headers })
      if (res.data.success) {
        toast.success(item.is_active ? 'Đã ẩn khỏi frontend' : 'Đã hiển thị trên frontend')
        fetchList()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    }
  }

  const f = (v) => setForm(prev => ({ ...prev, ...v }))

  const filtered = list.filter(k =>
    !search ||
    k.ten_khoa?.toLowerCase().includes(search.toLowerCase()) ||
    k.loai_bang?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="banglai-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>🪪 Quản Lý Bằng Lái Xe</h2>
          <p>Quản lý thông tin các loại bằng lái và nội dung hiển thị trên website</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Thêm loại bằng lái</button>
      </div>

      {/* Stats */}
      <div className="banglai-stats">
        <div className="bl-stat-card">
          <span className="bl-stat-icon">🪪</span>
          <div>
            <p className="bl-stat-value">{list.length}</p>
            <p className="bl-stat-label">Tổng loại bằng</p>
          </div>
        </div>
        <div className="bl-stat-card green">
          <span className="bl-stat-icon">✅</span>
          <div>
            <p className="bl-stat-value">{list.filter(k => k.is_active !== false).length}</p>
            <p className="bl-stat-label">Đang hiển thị</p>
          </div>
        </div>
        <div className="bl-stat-card gray">
          <span className="bl-stat-icon">🚫</span>
          <div>
            <p className="bl-stat-value">{list.filter(k => k.is_active === false).length}</p>
            <p className="bl-stat-label">Đã ẩn</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input className="search-input" placeholder="🔍 Tìm theo tên bằng lái, hạng..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-wrap"><div className="spinner" /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tên bằng lái</th>
                  <th>Hạng</th>
                  <th>Học phí</th>
                  <th>LT tối thiểu</th>
                  <th>Km tối thiểu</th>
                  <th>Giới hạn tuổi</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={9} className="empty-row">Chưa có loại bằng lái nào</td></tr>
                ) : filtered.map((k, i) => (
                  <tr key={k.id}>
                    <td>{i + 1}</td>
                    <td><strong>{k.ten_khoa}</strong></td>
                    <td><span className="badge badge-blue">Hạng {k.loai_bang}</span></td>
                    <td>{Number(k.hoc_phi).toLocaleString('vi-VN')} VNĐ</td>
                    <td>{k.so_buoi_ly_thuyet_toi_thieu > 0 ? k.so_buoi_ly_thuyet_toi_thieu + ' buổi' : '—'}</td>
                    <td>{k.so_km_toi_thieu > 0 ? k.so_km_toi_thieu + ' km' : '—'}</td>
                    <td>
                      {k.tuoi_toi_thieu
                        ? k.tuoi_toi_da
                          ? `${k.tuoi_toi_thieu} – ${k.tuoi_toi_da} tuổi`
                          : `Từ ${k.tuoi_toi_thieu} tuổi`
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge ${k.is_active !== false ? 'badge-success' : 'badge-gray'}`}>
                        {k.is_active !== false ? '✅ Hiển thị' : '🚫 Đã ẩn'}
                      </span>
                    </td>
                    <td>
                      <div className="action-cell">
                        <button className="btn btn-info btn-sm" onClick={() => setViewItem(k)}>👁️ Xem</button>
                        <button className="btn btn-warning btn-sm" onClick={() => openEdit(k)}>✏️ Sửa</button>
                        <button
                          className={`btn btn-sm ${k.is_active !== false ? 'btn-outline' : 'btn-success'}`}
                          onClick={() => handleToggleActive(k)}
                          title={k.is_active !== false ? 'Ẩn khỏi frontend' : 'Hiển thị trên frontend'}
                        >
                          {k.is_active !== false ? '🚫 Ẩn' : '👁️ Hiện'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(k.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── MODAL THÊM / SỬA ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Cập Nhật Bằng Lái' : '🪪 Thêm Loại Bằng Lái Mới'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Tabs */}
            <div className="bl-modal-tabs">
              <button
                className={`bl-modal-tab ${activeTab === 'co_ban' ? 'active' : ''}`}
                onClick={() => setActiveTab('co_ban')}
              >
                📋 Thông tin cơ bản
              </button>
              <button
                className={`bl-modal-tab ${activeTab === 'frontend' ? 'active' : ''}`}
                onClick={() => setActiveTab('frontend')}
              >
                🌐 Nội dung frontend
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* Tab: Thông tin cơ bản */}
                {activeTab === 'co_ban' && (
                  <div>
                    <div className="bl-form-grid">
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Tên bằng lái *</label>
                        <input
                          value={form.ten_khoa}
                          onChange={e => f({ ten_khoa: e.target.value })}
                          required
                          placeholder="VD: Bằng lái xe hạng B1"
                        />
                      </div>
                      <div className="form-group">
                        <label>Mã hạng bằng * <span style={{ fontWeight: 400, color: '#6b7280' }}>(VD: A1, B2, C, D...)</span></label>
                        <input
                          value={form.loai_bang}
                          onChange={e => f({ loai_bang: e.target.value.toUpperCase() })}
                          required
                          placeholder="VD: B1, B2, C, D, E, CE"
                          maxLength={3}
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Học phí (VNĐ) *</label>
                        <input
                          type="number"
                          value={form.hoc_phi}
                          onChange={e => f({ hoc_phi: e.target.value })}
                          required
                          placeholder="VD: 15000000"
                        />
                      </div>
                      <div className="form-group">
                        <label>Buổi lý thuyết tối thiểu *</label>
                        <input
                          type="number"
                          value={form.so_buoi_ly_thuyet_toi_thieu}
                          onChange={e => f({ so_buoi_ly_thuyet_toi_thieu: e.target.value })}
                          required
                          placeholder="VD: 20 (nhập 0 nếu không có lý thuyết)"
                          min={0}
                        />
                        {form.so_buoi_ly_thuyet_toi_thieu !== '' && Number(form.so_buoi_ly_thuyet_toi_thieu) === 0 && Number(form.so_km_toi_thieu) !== 0 && (
                          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                            ⚠️ Hạng bằng này sẽ không yêu cầu học lý thuyết.
                          </p>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Km thực hành tối thiểu *</label>
                        <input
                          type="number"
                          value={form.so_km_toi_thieu}
                          onChange={e => f({ so_km_toi_thieu: e.target.value })}
                          required
                          placeholder="VD: 810 (nhập 0 nếu không có thực hành)"
                          min={0}
                        />
                        {form.so_km_toi_thieu !== '' && Number(form.so_km_toi_thieu) === 0 && Number(form.so_buoi_ly_thuyet_toi_thieu) !== 0 && (
                          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                            ⚠️ Hạng bằng này sẽ không yêu cầu thực hành km.
                          </p>
                        )}
                      </div>
                      {/* Cảnh báo khi cả 2 đều = 0 hoặc chưa nhập */}
                      {(() => {
                        const buoiVal = form.so_buoi_ly_thuyet_toi_thieu
                        const kmVal   = form.so_km_toi_thieu
                        const buoiEmpty = buoiVal === '' || buoiVal === null || buoiVal === undefined
                        const kmEmpty   = kmVal   === '' || kmVal   === null || kmVal   === undefined
                        // Cả 2 đều chưa nhập (sau khi bấm Tạo mới, form rỗng) → không hiện
                        if (buoiEmpty && kmEmpty) return null
                        // Cả 2 đều = 0 → cảnh báo lỗi
                        if (!buoiEmpty && !kmEmpty && Number(buoiVal) === 0 && Number(kmVal) === 0) {
                          return (
                            <div style={{ gridColumn: '1 / -1', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{ fontSize: 16 }}>⚠️</span>
                              <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
                                <strong>Cảnh báo:</strong> Không thể để cả hai mục <em>Buổi lý thuyết tối thiểu</em> và <em>Km thực hành tối thiểu</em> đều bằng 0. Bằng lái phải có ít nhất một trong hai yêu cầu.
                              </p>
                            </div>
                          )
                        }
                        return null
                      })()}
                      <div className="form-group">
                        <label>Tuổi tối thiểu</label>
                        <input
                          type="number"
                          value={form.tuoi_toi_thieu}
                          onChange={e => f({ tuoi_toi_thieu: e.target.value })}
                          placeholder="VD: 18"
                          min={1}
                          max={100}
                        />
                      </div>
                      <div className="form-group">
                        <label>Tuổi tối đa <span style={{ fontWeight: 400, color: '#6b7280' }}>(để trống = không giới hạn)</span></label>
                        <input
                          type="number"
                          value={form.tuoi_toi_da}
                          onChange={e => f({ tuoi_toi_da: e.target.value })}
                          placeholder="VD: 55"
                          min={1}
                          max={100}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Loại xe học viên sử dụng</label>
                      <input
                        value={form.loai_xe_mo_ta}
                        onChange={e => f({ loai_xe_mo_ta: e.target.value })}
                        placeholder="VD: Xe ô tô số tự động dưới 9 chỗ"
                      />
                    </div>
                    <div className="form-group">
                      <label>Mô tả ngắn</label>
                      <textarea
                        rows={3}
                        value={form.mo_ta}
                        onChange={e => f({ mo_ta: e.target.value })}
                        placeholder="Mô tả ngắn về loại bằng lái này..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Ảnh đại diện</label>
                      <input
                        type="file"
                        accept="image/jpg,image/jpeg,image/png,image/webp"
                        onChange={handleAnhChange}
                        style={{ display: 'block', marginBottom: 8 }}
                      />
                      {anhPreview && (
                        <div style={{ marginTop: 8 }}>
                          <img
                            src={anhPreview}
                            alt="preview"
                            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }}
                          />
                          <button
                            type="button"
                            style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => { setAnhFile(null); setAnhPreview('') }}
                          >
                            ✕ Xóa ảnh
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.is_active !== false}
                          onChange={e => f({ is_active: e.target.checked })}
                          style={{ width: 16, height: 16 }}
                        />
                        Hiển thị trên website (frontend)
                      </label>
                    </div>
                  </div>
                )}

                {/* Tab: Nội dung frontend */}
                {activeTab === 'frontend' && (
                  <div>
                    <div className="bl-frontend-notice">
                      🌐 Các thông tin này sẽ hiển thị trực tiếp trên trang bằng lái của website
                    </div>
                    <div className="bl-form-grid">
                      <div className="form-group">
                        <label>👤 Đối tượng</label>
                        <input
                          value={form.doi_tuong}
                          onChange={e => f({ doi_tuong: e.target.value })}
                          placeholder="VD: Người từ 18 tuổi trở lên"
                        />
                      </div>
                      <div className="form-group">
                        <label>📅 Thời hạn bằng</label>
                        <input
                          value={form.thoi_han_bang}
                          onChange={e => f({ thoi_han_bang: e.target.value })}
                          placeholder="VD: 10 năm, Không thời hạn"
                        />
                      </div>
                      <div className="form-group">
                        <label>📋 Yêu cầu trước</label>
                        <input
                          value={form.yeu_cau_truoc}
                          onChange={e => f({ yeu_cau_truoc: e.target.value })}
                          placeholder="VD: Có bằng B1, Không cần bằng cũ"
                        />
                      </div>
                      <div className="form-group">
                        <label>💰 Lệ phí sát hạch nhà nước (JSON)</label>
                        <input
                          value={form.le_phi_sat_hach}
                          onChange={e => f({ le_phi_sat_hach: e.target.value })}
                          placeholder='[{"noi_dung":"Lý thuyết","muc_phi":"60.000đ"}]'
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>✅ Quyền lái xe được cấp</label>
                      <textarea
                        rows={4}
                        value={form.quyen_lai_xe}
                        onChange={e => f({ quyen_lai_xe: e.target.value })}
                        placeholder="Mỗi dòng là một quyền lái xe. VD:&#10;Điều khiển xe ô tô dưới 9 chỗ&#10;Điều khiển xe tải dưới 3.5 tấn"
                      />
                    </div>
                    <div className="form-group">
                      <label>📋 Quy trình đào tạo</label>
                      <textarea
                        rows={6}
                        value={form.quy_trinh_dao_tao}
                        onChange={e => f({ quy_trinh_dao_tao: e.target.value })}
                        placeholder="Mỗi dòng là một bước. VD:&#10;Nộp hồ sơ&#10;Học lý thuyết&#10;Học thực hành&#10;Thi tốt nghiệp&#10;Thi sát hạch&#10;Nhận bằng"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                {activeTab === 'co_ban' && (
                  <button type="button" className="btn btn-outline" onClick={() => setActiveTab('frontend')}>
                    Tiếp theo →
                  </button>
                )}
                <button type="submit" className="btn btn-primary">
                  {editing ? '💾 Cập nhật' : '➕ Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL XEM CHI TIẾT ── */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🪪 Chi Tiết — {viewItem.ten_khoa}</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 20, padding: '16px', background: '#f0f4ff', borderRadius: 10 }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🪪</div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{viewItem.ten_khoa}</h2>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-blue" style={{ fontSize: 14 }}>Hạng {viewItem.loai_bang}</span>
                  <span className={`badge ${viewItem.is_active !== false ? 'badge-success' : 'badge-gray'}`}>
                    {viewItem.is_active !== false ? '✅ Đang hiển thị' : '🚫 Đã ẩn'}
                  </span>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="bl-detail-section-title">📋 Thông Tin Cơ Bản</div>
              <div className="bl-detail-grid">
                {[
                  ['💰 Học phí', Number(viewItem.hoc_phi).toLocaleString('vi-VN') + ' VNĐ'],
                  ['🏫 Số lớp đang có', (viewItem.lop_hoc_count ?? 0) + ' lớp'],
                  ['📖 Buổi LT tối thiểu', viewItem.so_buoi_ly_thuyet_toi_thieu > 0 ? viewItem.so_buoi_ly_thuyet_toi_thieu + ' buổi' : 'Không có lý thuyết'],
                  ['🛣️ Km thực hành tối thiểu', viewItem.so_km_toi_thieu > 0 ? viewItem.so_km_toi_thieu + ' km' : 'Không có thực hành'],
                  ['🚗 Loại xe', viewItem.loai_xe_mo_ta || '—'],
                  ['🎂 Tuổi tối thiểu', viewItem.tuoi_toi_thieu ? viewItem.tuoi_toi_thieu + ' tuổi' : '—'],
                  ['🎂 Tuổi tối đa', viewItem.tuoi_toi_da ? viewItem.tuoi_toi_da + ' tuổi' : 'Không giới hạn'],
                ].map(([k, v], i) => (
                  <div key={i} className="bl-detail-box">
                    <div className="bl-detail-label">{k}</div>
                    <div className="bl-detail-value">{v}</div>
                  </div>
                ))}
              </div>

              {/* Mô tả */}
              {viewItem.mo_ta && (
                <>
                  <div className="bl-detail-section-title" style={{ marginTop: 16 }}>📝 Mô Tả</div>
                  <div className="bl-detail-box" style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6 }}>
                    {viewItem.mo_ta}
                  </div>
                </>
              )}

              {/* Thông tin frontend */}
              {(viewItem.doi_tuong || viewItem.loai_xe_mo_ta || viewItem.quyen_lai_xe) && (
                <>
                  <div className="bl-detail-section-title" style={{ marginTop: 16 }}>🌐 Nội Dung Frontend</div>
                  <div className="bl-detail-grid">
                    {viewItem.doi_tuong && (
                      <div className="bl-detail-box">
                        <div className="bl-detail-label">👤 Đối tượng</div>
                        <div className="bl-detail-value" style={{ fontSize: 13 }}>{viewItem.doi_tuong}</div>
                      </div>
                    )}
                    {viewItem.loai_xe_mo_ta && (
                      <div className="bl-detail-box">
                        <div className="bl-detail-label">🚗 Loại xe</div>
                        <div className="bl-detail-value" style={{ fontSize: 13 }}>{viewItem.loai_xe_mo_ta}</div>
                      </div>
                    )}
                    {viewItem.thoi_han_bang && (
                      <div className="bl-detail-box">
                        <div className="bl-detail-label">📅 Thời hạn bằng</div>
                        <div className="bl-detail-value" style={{ fontSize: 13 }}>{viewItem.thoi_han_bang}</div>
                      </div>
                    )}
                    {viewItem.yeu_cau_truoc && (
                      <div className="bl-detail-box">
                        <div className="bl-detail-label">📋 Yêu cầu trước</div>
                        <div className="bl-detail-value" style={{ fontSize: 13 }}>{viewItem.yeu_cau_truoc}</div>
                      </div>
                    )}
                  </div>
                  {viewItem.quyen_lai_xe && (
                    <div className="bl-detail-box" style={{ marginTop: 10 }}>
                      <div className="bl-detail-label">✅ Quyền lái xe được cấp</div>
                      <div style={{ marginTop: 6 }}>
                        {viewItem.quyen_lai_xe.split('\n').filter(Boolean).map((q, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                            <span style={{ color: '#2563eb', flexShrink: 0 }}>✔</span>
                            <span style={{ fontSize: 13, color: '#374151' }}>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Ngày tạo / cập nhật */}
              <div className="bl-detail-grid" style={{ marginTop: 12 }}>
                <div className="bl-detail-box" style={{ background: '#f9fafb' }}>
                  <div className="bl-detail-label">🗓️ Ngày tạo</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
                    {viewItem.created_at ? new Date(viewItem.created_at).toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>
                <div className="bl-detail-box" style={{ background: '#f9fafb' }}>
                  <div className="bl-detail-label">🔄 Cập nhật lần cuối</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
                    {viewItem.updated_at ? new Date(viewItem.updated_at).toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewItem(null)}>Đóng</button>
              <button className="btn btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}>✏️ Chỉnh sửa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BangLaiManagement
