import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import './DangKy.css'

const API = 'http://localhost:8000/api'

// Tính tuổi chính xác theo ngày sinh
const tinhTuoi = (ngaySinh) => {
  if (!ngaySinh) return null
  const today = new Date()
  const birth = new Date(ngaySinh)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const DangKy = () => {
  const [searchParams] = useSearchParams()
  const [khoaList, setKhoaList] = useState([])
  const [form, setForm] = useState({
    ho_ten: '', so_dien_thoai: '', so_cccd: '', ngay_sinh: '',
    email: '', dia_chi: '', khoa_hoc_id: '', ghi_chu: '',
  })
  const [anhFile, setAnhFile]     = useState(null)
  const [anhPreview, setAnhPreview] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [errors, setErrors]       = useState({})
  const fileRef = useRef()

  // Tải danh sách loại bằng lái
  useEffect(() => {
    axios.get(`${API}/khoa-hoc`)
      .then(res => {
        if (res.data.success) setKhoaList(res.data.data)
      })
      .catch(() => {})
  }, [])

  // Nếu có query ?hang=b2 thì tự chọn khóa học
  useEffect(() => {
    const hang = searchParams.get('hang')?.toUpperCase()
    if (hang && khoaList.length > 0) {
      const found = khoaList.find(k => k.loai_bang === hang)
      if (found) setForm(f => ({ ...f, khoa_hoc_id: String(found.id) }))
    }
  }, [searchParams, khoaList])

  const handleChange = e => {
    const { name, value } = e.target

    // Ô CCCD: chỉ cho phép nhập số 0-9
    if (name === 'so_cccd') {
      const digitsOnly = value.replace(/\D/g, '')
      setForm(f => ({ ...f, [name]: digitsOnly }))
      setErrors(er => ({ ...er, [name]: '' }))
      return
    }

    // Ô số điện thoại: chỉ cho nhập số
    if (name === 'so_dien_thoai') {
      const digitsOnly = value.replace(/\D/g, '')
      setForm(f => ({ ...f, [name]: digitsOnly }))
      // Validate realtime ngay khi nhập
      if (digitsOnly.length > 0 && !/^0/.test(digitsOnly)) {
        setErrors(er => ({ ...er, so_dien_thoai: 'SĐT phải bắt đầu bằng số 0' }))
      } else if (digitsOnly.length > 0 && digitsOnly.length < 10) {
        setErrors(er => ({ ...er, so_dien_thoai: `SĐT chưa đủ 10 số (đã nhập ${digitsOnly.length} số)` }))
      } else if (digitsOnly.length === 10 && /^0\d{9}$/.test(digitsOnly)) {
        setErrors(er => ({ ...er, so_dien_thoai: '' }))
      } else {
        setErrors(er => ({ ...er, so_dien_thoai: '' }))
      }
      return
    }

    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => ({ ...er, [name]: '' }))
  }

  // Validate realtime khi rời khỏi ô (blur)
  const handleBlur = e => {
    const { name, value } = e.target

    if (name === 'so_dien_thoai') {
      if (!value) return
      if (!/^0/.test(value)) {
        setErrors(er => ({ ...er, so_dien_thoai: 'SĐT phải bắt đầu bằng số 0' }))
      } else if (value.length < 10) {
        setErrors(er => ({ ...er, so_dien_thoai: `SĐT chưa đủ 10 số (đã nhập ${value.length} số)` }))
      } else {
        setErrors(er => ({ ...er, so_dien_thoai: '' }))
      }
    }

    if (name === 'email') {
      if (!value) return
      if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value)) {
        setErrors(er => ({ ...er, email: 'Email không đúng định dạng (vd: abc@gmail.com)' }))
      } else {
        setErrors(er => ({ ...er, email: '' }))
      }
    }

    if (name === 'so_cccd') {
      if (!value) return
      if (value.length < 12) {
        setErrors(er => ({ ...er, so_cccd: `CCCD chưa đủ 12 số (đã nhập ${value.length} số)` }))
      } else {
        setErrors(er => ({ ...er, so_cccd: '' }))
      }
    }
  }

  const handleAnhChange = file => {
    if (!file) return
    setAnhFile(file)
    const reader = new FileReader()
    reader.onload = e => setAnhPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const errs = {}
    if (!form.ho_ten.trim())        errs.ho_ten = 'Vui lòng nhập họ tên'
    if (!/^0\d{9}$/.test(form.so_dien_thoai)) errs.so_dien_thoai = 'SĐT phải 10 số, bắt đầu bằng 0'
    if (!/^\d{12}$/.test(form.so_cccd))       errs.so_cccd = 'CCCD phải đủ 12 chữ số'
    if (!form.ngay_sinh)            errs.ngay_sinh = 'Vui lòng chọn ngày sinh'
    if (!form.khoa_hoc_id)          errs.khoa_hoc_id = 'Vui lòng chọn loại bằng lái'
    if (form.email && !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email))
      errs.email = 'Email không đúng định dạng (vd: abc@gmail.com)'

    // Kiểm tra tuổi tối thiểu theo hạng bằng (lấy từ DB)
    if (form.ngay_sinh && form.khoa_hoc_id) {
      const khoa = khoaList.find(k => String(k.id) === String(form.khoa_hoc_id))
      if (khoa) {
        const tuoiMin = khoa.tuoi_toi_thieu
        if (tuoiMin) {
          const tuoi = tinhTuoi(form.ngay_sinh)
          if (tuoi !== null && tuoi < tuoiMin) {
            errs.ngay_sinh = `Chưa đủ tuổi — Bằng hạng ${khoa.loai_bang} yêu cầu tối thiểu ${tuoiMin} tuổi (hiện tại: ${tuoi} tuổi)`
          }
        }
      }
    }

    return errs
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (anhFile) fd.append('anh_the', anhFile)

      await axios.post(`${API}/dang-ky-tu-van`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setDone(true)
      toast.success('Đăng ký thành công!')
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.toLowerCase().includes('cccd') || msg.toLowerCase().includes('so_cccd')) {
        setErrors({ so_cccd: 'Số CCCD này đã được đăng ký trước đó' })
      } else {
        toast.error(msg || 'Có lỗi xảy ra, vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Tính cảnh báo tuổi realtime (dùng tuoi_toi_thieu từ DB)
  const selectedKhoa = khoaList.find(k => String(k.id) === String(form.khoa_hoc_id))
  const tuoiMin      = selectedKhoa?.tuoi_toi_thieu ?? null
  const tuoiHienTai  = form.ngay_sinh ? tinhTuoi(form.ngay_sinh) : null
  const chuaDuTuoi   = tuoiMin && tuoiHienTai !== null && tuoiHienTai < tuoiMin

  return (
    <div className="dangky-page">
      <div className="dangky-hero">
        <div className="container">
          <h1>Đăng Ký Học Lái Xe</h1>
          <p>Điền đầy đủ thông tin để hoàn tất đăng ký — Trung tâm sẽ liên hệ xác nhận trong 24h</p>
        </div>
      </div>

      <div className="container dangky-content">
        {done ? (
          <div className="dangky-success">
            <div className="success-icon">✓</div>
            <h2>Đăng ký thành công!</h2>
            <p>Cảm ơn bạn đã đăng ký học lái xe tại Trung Tâm Sao Việt.<br />
              Chúng tôi sẽ liên hệ xác nhận và hướng dẫn đóng học phí trong <strong>24h</strong>.</p>
            <button onClick={() => { setDone(false); setForm({ ho_ten:'', so_dien_thoai:'', so_cccd:'', ngay_sinh:'', email:'', dia_chi:'', khoa_hoc_id:'', ghi_chu:'' }); setAnhFile(null); setAnhPreview(null) }}
              className="btn-back">Đăng ký thêm</button>
          </div>
        ) : (
          <div className="dangky-grid">

            {/* Cột trái: thông tin */}
            <div className="dangky-uudai">
              <h3>📋 Thông Tin Đăng Ký</h3>
              <ul>
                {[
                  '📚 Tặng bộ sách, tài liệu thi trị giá 300.000đ',
                  '⚡ Hỗ trợ ghi danh Online nhanh gọn',
                  '🎯 Tư vấn 1-1 với chuyên viên',
                  '🏫 Khai giảng liên tục hàng tháng',
                  '✅ Học phí trọn gói, không phát sinh',
                ].map((item, i) => (
                  <li key={i}><span className="ud-check">✓</span><span>{item}</span></li>
                ))}
              </ul>
              <div className="dangky-contact">
                <p>📞 Hotline: <strong>0934 057 333</strong></p>
                <p>✉️ daotolaixesaoviet@gmail.com</p>
              </div>
            </div>

            {/* Cột phải: form */}
            <div className="dangky-form-box">
              <h3>Điền thông tin đăng ký</h3>
              <form onSubmit={handleSubmit} className="dangky-form">

                {/* Layout 2 cột: ảnh + thông tin */}
                <div className="dangky-form-layout">

                  {/* Ảnh 3x4 */}
                  <div className="dangky-anh-col">
                    <label className="dangky-anh-label">📷 Ảnh thẻ 3×4 <span className="req">*</span></label>
                    <div className={`dangky-anh-upload ${anhPreview ? 'has-image' : ''}`}
                      onClick={() => fileRef.current?.click()}>
                      {anhPreview
                        ? <img src={anhPreview} alt="Ảnh thẻ" className="dangky-anh-preview" />
                        : <div className="dangky-anh-placeholder">
                            <span>📷</span>
                            <p>Nhấn để chọn ảnh</p>
                            <small>JPG, PNG — tối đa 5MB</small>
                          </div>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={e => handleAnhChange(e.target.files[0])} />
                    {anhPreview && (
                      <button type="button" className="btn-xoa-anh"
                        onClick={() => { setAnhFile(null); setAnhPreview(null) }}>
                        🗑️ Xóa ảnh
                      </button>
                    )}

                  </div>

                  {/* Thông tin cá nhân */}
                  <div className="dangky-info-col">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Họ và tên <span className="req">*</span></label>
                        <input name="ho_ten" value={form.ho_ten} onChange={handleChange}
                          placeholder="Nguyễn Văn A" />
                        {errors.ho_ten && <span className="field-err">{errors.ho_ten}</span>}
                      </div>
                      <div className="form-group">
                        <label>Số điện thoại <span className="req">*</span></label>
                        <input name="so_dien_thoai" value={form.so_dien_thoai} onChange={handleChange}
                          onBlur={handleBlur} placeholder="0912 345 678" maxLength={10} inputMode="numeric" />
                        {errors.so_dien_thoai && <span className="field-err">{errors.so_dien_thoai}</span>}
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Số CCCD <span className="req">*</span></label>
                        <input name="so_cccd" value={form.so_cccd} onChange={handleChange}
                          onBlur={handleBlur} placeholder="012345678901" maxLength={12} inputMode="numeric" />
                        {errors.so_cccd && <span className="field-err">{errors.so_cccd}</span>}
                      </div>
                      <div className="form-group">
                        <label>Ngày sinh <span className="req">*</span></label>
                        <input name="ngay_sinh" type="date" value={form.ngay_sinh} onChange={handleChange}
                          style={chuaDuTuoi ? { borderColor: '#e53935' } : {}} />
                        {/* Cảnh báo tuổi realtime */}
                        {chuaDuTuoi && (
                          <span className="field-err">
                            ❌ Chưa đủ tuổi — Bằng hạng {selectedKhoa.loai_bang} yêu cầu tối thiểu {tuoiMin} tuổi<br/>
                            <span style={{ color: '#718096' }}>(hiện tại: {tuoiHienTai} tuổi)</span>
                          </span>
                        )}
                        {!chuaDuTuoi && tuoiMin && tuoiHienTai !== null && (
                          <span style={{ fontSize: 11, color: '#16a34a', marginTop: 3, display: 'block' }}>
                            ✅ Đủ tuổi đăng ký
                          </span>
                        )}
                        {errors.ngay_sinh && !chuaDuTuoi && <span className="field-err">{errors.ngay_sinh}</span>}
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email</label>
                        <input name="email" type="text" value={form.email} onChange={handleChange}
                          onBlur={handleBlur} placeholder="email@gmail.com" />
                        {errors.email && <span className="field-err">{errors.email}</span>}
                      </div>
                      <div className="form-group">
                        <label>Địa chỉ</label>
                        <input name="dia_chi" value={form.dia_chi} onChange={handleChange}
                          placeholder="Quận / Huyện, Tỉnh / TP" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chọn loại bằng lái */}
                <div className="form-group">
                  <label>Loại bằng lái đăng ký <span className="req">*</span></label>
                  {/* Gợi ý tuổi tối thiểu */}
                  {selectedKhoa && tuoiMin && (
                    <p style={{ fontSize: 12, color: '#0066cc', margin: '2px 0 6px', fontWeight: 600 }}>
                      ℹ️ Bằng hạng <strong>{selectedKhoa.loai_bang}</strong> yêu cầu tối thiểu <strong>{tuoiMin} tuổi</strong>
                    </p>
                  )}
                  <div className="radio-grid">
                    {khoaList.length > 0
                      ? khoaList.map(kh => {
                          const tm = kh.tuoi_toi_thieu
                          const chuaDu = tm && tuoiHienTai !== null && tuoiHienTai < tm
                          return (
                            <label key={kh.id}
                              className={`radio-item ${form.khoa_hoc_id === String(kh.id) ? 'selected' : ''} ${chuaDu ? 'radio-disabled' : ''}`}
                              title={chuaDu ? `Cần tối thiểu ${tm} tuổi` : ''}>
                              <input type="radio" name="khoa_hoc_id" value={String(kh.id)}
                                checked={form.khoa_hoc_id === String(kh.id)} onChange={handleChange} />
                              <span>
                                <strong>Hạng {kh.loai_bang}</strong>
                                <small>{Number(kh.hoc_phi).toLocaleString('vi-VN')} đ</small>
                                {tm && <small style={{ color: chuaDu ? '#e53935' : '#718096' }}>≥ {tm} tuổi</small>}
                              </span>
                            </label>
                          )
                        })
                      : ['A1','A','B1','B2','C1','C'].map(h => (
                          <label key={h} className="radio-item">
                            <input type="radio" name="khoa_hoc_id" value={h}
                              checked={form.khoa_hoc_id === h} onChange={handleChange} />
                            <span>Hạng {h}</span>
                          </label>
                        ))
                    }
                  </div>
                  {errors.khoa_hoc_id && <span className="field-err">{errors.khoa_hoc_id}</span>}
                </div>

                {/* Ghi chú */}
                <div className="form-group">
                  <label>Ghi chú thêm</label>
                  <textarea name="ghi_chu" value={form.ghi_chu} onChange={handleChange}
                    placeholder="Thời gian rảnh, câu hỏi, yêu cầu đặc biệt..." rows={3} />
                </div>

                <button type="submit" className="btn-submit" disabled={loading || chuaDuTuoi}>
                  {loading ? 'Đang gửi...' : chuaDuTuoi ? '⚠️ Chưa đủ tuổi đăng ký' : '📝 Đăng Ký Học Lái Xe'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DangKy
