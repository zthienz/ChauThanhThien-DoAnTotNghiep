import { useState, useRef, useEffect, useCallback } from 'react'
import { GoogleGenAI } from '@google/genai'
import { useAdmin } from '../../context/AdminContext'
import axios from 'axios'
import './AIAssistant.css'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: API_KEY })

// ════════════════════════════════════════════════════════════════
// ĐỊNH NGHĨA TOOLS (Function Declarations) cho Gemini
// AI sẽ tự quyết định gọi tool nào khi cần
// ════════════════════════════════════════════════════════════════
const TOOL_DECLARATIONS = [
  {
    name: 'get_dashboard',
    description: 'Lấy thống kê tổng quan hệ thống: tổng hồ sơ, trạng thái học viên (chờ đóng HP, chờ mở lớp, đang học, đủ ĐK thi...), số lịch học hôm nay, doanh thu tháng này.',
  },
  {
    name: 'get_dashboard_extra',
    description: 'Lấy dữ liệu bổ sung dashboard: học viên chờ mở lớp theo hạng bằng, thống kê xe, lịch thi sắp tới, học phí còn nợ.',
  },
  {
    name: 'get_ho_so',
    description: 'Lấy danh sách hồ sơ học viên. Có thể lọc theo trang_thai (cho_dong_hoc_phi, cho_mo_lop, chuan_bi_hoc, dang_hoc, du_dieu_kien_thi_tn, hoan_thanh_tn...) hoặc tìm kiếm theo tên/CCCD.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        trang_thai: {
          type: 'string',
          description: 'Lọc theo trạng thái hồ sơ. Các giá trị hợp lệ: cho_dong_hoc_phi, cho_mo_lop, chuan_bi_hoc, dang_hoc, du_dieu_kien_thi_tn, chuan_bi_thi, dang_thi_tn, hoan_thanh_tn, da_cap_bang',
        },
        search: {
          type: 'string',
          description: 'Tìm kiếm theo tên học viên hoặc số CCCD',
        },
        per_page: {
          type: 'number',
          description: 'Số bản ghi mỗi trang, mặc định 20',
        },
      },
    },
  },
  {
    name: 'get_lop_hoc',
    description: 'Lấy danh sách lớp học với thông tin giảng viên, sĩ số, trạng thái (dang_hoc, sap_khai_giang, da_ket_thuc).',
  },
  {
    name: 'get_lich_hoc',
    description: 'Lấy lịch học của các lớp. Hiển thị buổi học theo ngày, giờ, giảng viên, xe, địa điểm.',
  },
  {
    name: 'get_giang_vien',
    description: 'Lấy danh sách giảng viên với chuyên môn (ly_thuyet, thuc_hanh, ca_hai), trạng thái (san_sang, nghi_phep, dinh_chi), kinh nghiệm.',
  },
  {
    name: 'get_xe',
    description: 'Lấy danh sách xe tập lái với biển số, trạng thái (san_sang, bao_tri, hong), số km đã chạy.',
  },
  {
    name: 'get_bao_loi_xe',
    description: 'Lấy danh sách báo lỗi xe từ giảng viên: tiêu đề, mô tả, mức độ (nhe, trung_binh, nghiem_trong), trạng thái xử lý.',
  },
  {
    name: 'get_hoc_phi',
    description: 'Lấy danh sách thanh toán học phí với khả năng TÌM KIẾM theo tên học viên hoặc số CCCD. Dùng khi admin hỏi: "học viên X đã đóng bao nhiêu học phí", "trạng thái học phí của học viên Y", "học viên Z còn nợ học phí không", "danh sách học phí chưa đóng". Trả về: thông tin học viên (qua hoSo), loai_phi (hoc_phi hoặc phi_thi_lai), so_tien, trang_thai thanh toán, phuong_thuc (tien_mat, chuyen_khoan), ngay_thanh_toan, khóa học đăng ký.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Tìm kiếm theo tên học viên hoặc số CCCD. Dùng khi admin hỏi về học phí của học viên cụ thể.',
        },
        phuong_thuc: {
          type: 'string',
          description: 'Lọc theo phương thức thanh toán: tien_mat, chuyen_khoan',
        },
      },
    },
  },
  {
    name: 'get_lich_thi',
    description: 'Lấy danh sách lịch thi: ngày thi, loại thi (sat_hanh, tot_nghiep), địa điểm, số học viên đăng ký.',
  },
  {
    name: 'get_khoa_hoc',
    description: 'Lấy danh sách khóa học đào tạo theo tháng/năm với thông tin loại bằng (A1, B1, B2, C...), học phí, thời lượng.',
  },
  {
    name: 'get_cap_bang',
    description: 'Lấy danh sách học viên chờ cấp bằng tốt nghiệp và bằng lái xe.',
  },
  {
    name: 'get_bai_thi',
    description: 'Lấy cấu hình bài thi: điểm đạt, điểm tối đa, phí thi lại theo từng loại bằng.',
  },
  {
    name: 'get_lien_he',
    description: 'Lấy danh sách tin nhắn liên hệ từ trang quảng bá: tên, SĐT, nội dung, trạng thái xử lý.',
  },
  {
    name: 'get_hoat_dong_gan_day',
    description: 'Lấy 15 hoạt động gần đây nhất: hồ sơ mới, thanh toán học phí, báo lỗi xe, vắng mặt có lý do.',
  },
  {
    name: 'get_chart_doanh_thu',
    description: 'Lấy dữ liệu biểu đồ doanh thu theo kỳ.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        ky: {
          type: 'string',
          description: 'Kỳ thống kê: thang_nay (tất cả ngày trong tháng này), thang (12 tháng gần nhất), quy (8 quý gần nhất), nam (5 năm gần nhất)',
          enum: ['thang_nay', 'thang', 'quy', 'nam'],
        },
      },
    },
  },
  {
    name: 'get_chart_hoc_vien',
    description: 'Lấy dữ liệu biểu đồ học viên đăng ký mới vs hoàn thành trong 6 tháng gần nhất.',
  },
  {
    name: 'get_chart_ket_qua_thi',
    description: 'Lấy dữ liệu biểu đồ tỉ lệ đậu/rớt thi theo thời gian.',
  },
  {
    name: 'get_phi_thi_lai',
    description: 'Lấy danh sách phí thi lại chưa thu của học viên.',
  },
  // ── AI Analytics: thống kê linh hoạt ────────────────────────────────────
  {
    name: 'ai_doanh_thu_theo_khoang',
    description: 'Thống kê doanh thu chi tiết theo khoảng thời gian TÙY CHỈNH do admin chỉ định. Trả về: tổng doanh thu, phân loại theo loại phí (học phí/phí thi lại), phương thức thanh toán, và dữ liệu theo từng ngày/tuần/tháng trong khoảng đó. QUAN TRỌNG: Hệ thống đã cung cấp ngày thực tế trong system prompt — khi admin nói "tháng này/tuần này/năm nay", hãy tự điền tu_ngay/den_ngay từ đó, KHÔNG hỏi lại admin.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        tu_ngay: {
          type: 'string',
          description: 'Ngày bắt đầu định dạng YYYY-MM-DD',
        },
        den_ngay: {
          type: 'string',
          description: 'Ngày kết thúc định dạng YYYY-MM-DD',
        },
        nhom_theo: {
          type: 'string',
          description: 'Nhóm dữ liệu theo: ngay, tuan, hoặc thang',
          enum: ['ngay', 'tuan', 'thang'],
        },
      },
      required: ['tu_ngay', 'den_ngay'],
    },
  },
  {
    name: 'ai_hoc_vien_theo_khoang',
    description: 'Thống kê CHI TIẾT số lượng HỌC VIÊN NỘP HỒ SƠ MỚI (đăng ký) trong khoảng thời gian TÙY CHỈNH. Dùng tool này khi admin hỏi: "có bao nhiêu học viên đăng ký", "bao nhiêu học viên nộp hồ sơ", "học viên mới trong tháng X", "số lượng đăng ký tuần này/tháng này/năm nay". Trả về: tong_dang_ky (tổng hồ sơ nộp mới), phân loại theo nguồn (online/offline), theo hạng bằng (A1/B1/B2/C...), theo trạng thái hồ sơ, tong_hoan_thanh (số đã nhận bằng), và chi tiết từng ngày/tuần/tháng. QUAN TRỌNG: Hệ thống đã cung cấp ngày thực tế trong system prompt — khi admin nói "tháng 7" hoặc "tháng 7 này" hãy tính tu_ngay=năm_hiện_tại-07-01 và den_ngay=năm_hiện_tại-07-31; khi nói "tháng này/tuần này/năm nay", hãy tự điền tu_ngay/den_ngay từ các mốc đã biết, KHÔNG hỏi lại admin.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        tu_ngay: {
          type: 'string',
          description: 'Ngày bắt đầu định dạng YYYY-MM-DD',
        },
        den_ngay: {
          type: 'string',
          description: 'Ngày kết thúc định dạng YYYY-MM-DD',
        },
        nhom_theo: {
          type: 'string',
          description: 'Nhóm dữ liệu theo: ngay, tuan, hoặc thang',
          enum: ['ngay', 'tuan', 'thang'],
        },
      },
      required: ['tu_ngay', 'den_ngay'],
    },
  },
  {
    name: 'ai_lich_day_giang_vien',
    description: 'Lấy toàn bộ lịch dạy của một giảng viên trong khoảng thời gian. Trả về: danh sách buổi dạy theo ngày, vai trò (lý thuyết/thực hành), và DANH SÁCH CÁC NGÀY RẢNH (không có lịch dạy) trong khoảng đó. Dùng để phân tích lịch dạy và gợi ý xếp lịch. QUAN TRỌNG: Hệ thống đã cung cấp ngày thực tế trong system prompt — hãy tự điền tu_ngay/den_ngay từ đó, KHÔNG hỏi lại admin.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        giang_vien_id: {
          type: 'number',
          description: 'ID của giảng viên cần xem lịch',
        },
        tu_ngay: {
          type: 'string',
          description: 'Ngày bắt đầu YYYY-MM-DD. Mặc định là hôm nay nếu không truyền.',
        },
        den_ngay: {
          type: 'string',
          description: 'Ngày kết thúc YYYY-MM-DD. Mặc định là 30 ngày tới nếu không truyền.',
        },
      },
      required: ['giang_vien_id'],
    },
  },
  {
    name: 'ai_goi_y_lich_day',
    description: 'Kiểm tra và gợi ý khung giờ trống cho một giảng viên trong một ngày cụ thể. Trả về: các buổi GV đang bận, các khoảng thời gian còn trống trong ngày (06:00–21:00), và kiểm tra xem một khung giờ dự kiến có bị trùng không. QUAN TRỌNG: Hệ thống đã cung cấp ngày thực tế trong system prompt — khi admin nói "hôm nay/ngày mai/thứ X tuần này", hãy tự điền ngày từ đó, KHÔNG hỏi lại admin.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        giang_vien_id: {
          type: 'number',
          description: 'ID của giảng viên',
        },
        ngay: {
          type: 'string',
          description: 'Ngày cần kiểm tra YYYY-MM-DD',
        },
        gio_bat_dau_du_kien: {
          type: 'string',
          description: 'Giờ bắt đầu dự kiến định dạng HH:MM (ví dụ: 08:00). Tùy chọn.',
        },
        gio_ket_thuc_du_kien: {
          type: 'string',
          description: 'Giờ kết thúc dự kiến định dạng HH:MM (ví dụ: 11:00). Tùy chọn.',
        },
      },
      required: ['giang_vien_id', 'ngay'],
    },
  },
]

// ════════════════════════════════════════════════════════════════
// THỰC THI TOOL — Gọi API thực tế khi Gemini yêu cầu
// ════════════════════════════════════════════════════════════════
const executeTool = async (toolName, toolArgs, backendUrl, token) => {
  const h = { Authorization: `Bearer ${token}` }
  const safe = async (fn) => {
    try {
      const r = await fn()
      return r.data?.success ? r.data : r.data
    } catch (e) {
      return { error: e.message }
    }
  }

  const params = toolArgs || {}

  switch (toolName) {
    case 'get_dashboard':
      return safe(() => axios.get(`${backendUrl}/api/admin/dashboard`, { headers: h }))

    case 'get_dashboard_extra':
      return safe(() => axios.get(`${backendUrl}/api/admin/dashboard-extra`, { headers: h }))

    case 'get_ho_so':
      return safe(() => axios.get(`${backendUrl}/api/admin/ho-so`, { headers: h, params }))

    case 'get_lop_hoc':
      return safe(() => axios.get(`${backendUrl}/api/admin/lop-hoc`, { headers: h }))

    case 'get_lich_hoc':
      return safe(() => axios.get(`${backendUrl}/api/admin/lich-hoc`, { headers: h, params }))

    case 'get_giang_vien':
      return safe(() => axios.get(`${backendUrl}/api/admin/giang-vien`, { headers: h }))

    case 'get_xe':
      return safe(() => axios.get(`${backendUrl}/api/admin/xe`, { headers: h }))

    case 'get_bao_loi_xe':
      return safe(() => axios.get(`${backendUrl}/api/admin/bao-loi-xe`, { headers: h }))

    case 'get_hoc_phi':
      return safe(() => axios.get(`${backendUrl}/api/admin/hoc-phi`, { headers: h, params }))

    case 'get_lich_thi':
      return safe(() => axios.get(`${backendUrl}/api/admin/lich-thi`, { headers: h }))

    case 'get_khoa_hoc':
      return safe(() => axios.get(`${backendUrl}/api/admin/khoa-hoc-dao-tao`, { headers: h }))

    case 'get_cap_bang':
      return safe(() => axios.get(`${backendUrl}/api/admin/cap-bang/tot-nghiep`, { headers: h }))

    case 'get_bai_thi':
      return safe(() => axios.get(`${backendUrl}/api/admin/bai-thi`, { headers: h }))

    case 'get_lien_he':
      return safe(() => axios.get(`${backendUrl}/api/admin/lien-he`, { headers: h }))

    case 'get_hoat_dong_gan_day':
      return safe(() => axios.get(`${backendUrl}/api/admin/hoat-dong-gan-day`, { headers: h }))

    case 'get_chart_doanh_thu':
      return safe(() => axios.get(`${backendUrl}/api/admin/chart-doanh-thu`, { headers: h, params: { ky: params.ky || 'thang_nay' } }))

    case 'get_chart_hoc_vien':
      return safe(() => axios.get(`${backendUrl}/api/admin/chart-hoc-vien`, { headers: h }))

    case 'get_chart_ket_qua_thi':
      return safe(() => axios.get(`${backendUrl}/api/admin/chart-ket-qua-thi`, { headers: h }))

    case 'get_phi_thi_lai':
      return safe(() => axios.get(`${backendUrl}/api/admin/phi-thi-lai`, { headers: h }))

    // ── AI Analytics: thống kê linh hoạt ────────────────────────────────────
    case 'ai_doanh_thu_theo_khoang':
      return safe(() => axios.get(`${backendUrl}/api/admin/ai/doanh-thu`, {
        headers: h,
        params: {
          tu_ngay:   params.tu_ngay,
          den_ngay:  params.den_ngay,
          nhom_theo: params.nhom_theo || 'ngay',
        },
      }))

    case 'ai_hoc_vien_theo_khoang':
      return safe(() => axios.get(`${backendUrl}/api/admin/ai/hoc-vien`, {
        headers: h,
        params: {
          tu_ngay:   params.tu_ngay,
          den_ngay:  params.den_ngay,
          nhom_theo: params.nhom_theo || 'thang',
        },
      }))

    case 'ai_lich_day_giang_vien':
      return safe(() => axios.get(`${backendUrl}/api/admin/ai/lich-day-giang-vien`, {
        headers: h,
        params: {
          giang_vien_id: params.giang_vien_id,
          tu_ngay:       params.tu_ngay,
          den_ngay:      params.den_ngay,
        },
      }))

    case 'ai_goi_y_lich_day':
      return safe(() => axios.get(`${backendUrl}/api/admin/ai/goi-y-lich-day`, {
        headers: h,
        params: {
          giang_vien_id:        params.giang_vien_id,
          ngay:                 params.ngay,
          gio_bat_dau_du_kien:  params.gio_bat_dau_du_kien,
          gio_ket_thuc_du_kien: params.gio_ket_thuc_du_kien,
        },
      }))

    default:
      return { error: `Tool không tồn tại: ${toolName}` }
  }
}

// ════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Ngắn gọn để tiết kiệm token
// ════════════════════════════════════════════════════════════════
const buildSystemPrompt = (adminInfo) => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`

  const THU = ['CN','T2','T3','T4','T5','T6','T7']
  const dow = now.getDay()
  const diffMon = dow === 0 ? -6 : 1 - dow
  const mon = new Date(now); mon.setDate(now.getDate() + diffMon)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const monToi = new Date(mon); monToi.setDate(mon.getDate() + 7)
  const sunToi = new Date(monToi); sunToi.setDate(monToi.getDate() + 6)
  const monTruoc = new Date(mon); monTruoc.setDate(mon.getDate() - 7)
  const sunTruoc = new Date(monTruoc); sunTruoc.setDate(monTruoc.getDate() + 6)
  const dauThang = new Date(now.getFullYear(), now.getMonth(), 1)
  const cuoiThang = new Date(now.getFullYear(), now.getMonth()+1, 0)
  const tom = new Date(now); tom.setDate(now.getDate()+1)
  const qua = new Date(now); qua.setDate(now.getDate()-1)
  const y = now.getFullYear()

  // Hàm tính đầu/cuối tháng bất kỳ
  const t1 = (m) => `${y}-${pad(m)}-01`
  const t2 = (m) => `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`

  return `Bạn là trợ lý AI Trung Tâm Lái Xe Sao Việt. Admin: ${adminInfo?.ho_ten || 'Admin'}.

NGÀY HIỆN TẠI: ${fmt(now)} (${THU[dow]})
- Hôm qua: ${fmt(qua)} | Ngày mai: ${fmt(tom)}
- Tuần này: ${fmt(mon)}→${fmt(sun)} | Tuần trước: ${fmt(monTruoc)}→${fmt(sunTruoc)} | Tuần tới: ${fmt(monToi)}→${fmt(sunToi)}
- Tháng này: ${fmt(dauThang)}→${fmt(cuoiThang)} | Năm: ${y}
- T1:${t1(1)}→${t2(1)} T2:${t1(2)}→${t2(2)} T3:${t1(3)}→${t2(3)} T4:${t1(4)}→${t2(4)} T5:${t1(5)}→${t2(5)} T6:${t1(6)}→${t2(6)}
- T7:${t1(7)}→${t2(7)} T8:${t1(8)}→${t2(8)} T9:${t1(9)}→${t2(9)} T10:${t1(10)}→${t2(10)} T11:${t1(11)}→${t2(11)} T12:${t1(12)}→${t2(12)}

NHIỆM VỤ: Hỗ trợ quản lý trung tâm lái xe & luật giao thông VN.
NGUYÊN TẮC:
- Hỏi về số liệu/dữ liệu → dùng tools lấy thực tế, KHÔNG bịa
- Có thể gọi nhiều tools cùng lúc
- Dùng ngày YYYY-MM-DD từ bảng trên, KHÔNG hỏi lại admin về ngày tháng
- Nếu hỏi GV cụ thể → get_giang_vien trước lấy ID, rồi dùng ai_lich_day_giang_vien
- Câu hỏi ngoài phạm vi (thời tiết, nấu ăn...) → từ chối lịch sự
- Trả lời tiếng Việt, ngắn gọn, dùng emoji phù hợp`
}

// ════════════════════════════════════════════════════════════════
// HELPERS — phải khai báo trước component
// ════════════════════════════════════════════════════════════════

// Label hiển thị khi tool đang chạy
const TOOL_LABEL = {
  get_dashboard: 'thống kê tổng quan',
  get_dashboard_extra: 'dữ liệu bổ sung',
  get_ho_so: 'hồ sơ học viên',
  get_lop_hoc: 'lớp học',
  get_lich_hoc: 'lịch học',
  get_giang_vien: 'giảng viên',
  get_xe: 'danh sách xe',
  get_bao_loi_xe: 'báo lỗi xe',
  get_hoc_phi: 'học phí',
  get_lich_thi: 'lịch thi',
  get_khoa_hoc: 'khóa học',
  get_cap_bang: 'cấp bằng',
  get_bai_thi: 'cấu hình bài thi',
  get_lien_he: 'liên hệ',
  get_hoat_dong_gan_day: 'hoạt động gần đây',
  get_chart_doanh_thu: 'doanh thu',
  get_chart_hoc_vien: 'thống kê học viên',
  get_chart_ket_qua_thi: 'kết quả thi',
  get_phi_thi_lai: 'phí thi lại',
  ai_doanh_thu_theo_khoang: 'thống kê doanh thu',
  ai_hoc_vien_theo_khoang: 'thống kê học viên',
  ai_lich_day_giang_vien: 'lịch dạy giảng viên',
  ai_goi_y_lich_day: 'gợi ý khung giờ trống',
}

// Giới hạn kích thước data gửi lại cho Gemini để tiết kiệm token
const truncateData = (data) => {
  if (!data) return data
  const str = JSON.stringify(data)
  if (str.length <= 80000) return data
  if (Array.isArray(data)) return data.slice(0, 50)
  if (data.data && Array.isArray(data.data)) {
    return { ...data, data: data.data.slice(0, 50), _truncated: true }
  }
  return data
}

// ════════════════════════════════════════════════════════════════
// Component chính
// ════════════════════════════════════════════════════════════════
const AIAssistant = () => {
  const { token, adminInfo, backendUrl, isAdmin } = useAdmin()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState('') // Hiển thị tool đang chạy
  const chatRef = useRef(null)
  const inputRef = useRef(null)
  const sessionRef = useRef(null)

  if (!isAdmin) return null

  // ── Khởi tạo chat session khi mở ─────────────────────────────
  useEffect(() => {
    if (!open || sessionRef.current) return

    const sysPrompt = buildSystemPrompt(adminInfo)

    sessionRef.current = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: sysPrompt,
        maxOutputTokens: 800,
        temperature: 0.3,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      },
      history: [],
    })

    // Tin nhắn chào
    setMessages([{
      role: 'ai',
      text: `Xin chào **${adminInfo?.ho_ten || 'Admin'}**! 👋\n\nTôi hỗ trợ **quản lý trung tâm lái xe** và **luật giao thông**. Tôi có thể truy cập dữ liệu hệ thống theo yêu cầu — hỏi tôi bất cứ điều gì!`,
      time: new Date(),
    }])
  }, [open, adminInfo])

  // ── Reset session khi đóng ────────────────────────────────────
  useEffect(() => {
    if (!open) {
      sessionRef.current = null
      setMessages([])
      setToolStatus('')
    }
  }, [open])

  // ── Auto scroll ───────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, loading, toolStatus])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // ── Xử lý Function Calling loop ──────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || !sessionRef.current) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text, time: new Date() }])
    setLoading(true)
    setToolStatus('')

    // Helper: gửi message với retry tự động khi bị 429
    const sendWithRetry = async (payload, maxRetries = 2) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await sessionRef.current.sendMessage(payload)
        } catch (err) {
          const msg = err?.message || ''
          const is429 = msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')
          if (is429 && attempt < maxRetries) {
            const waitSec = (attempt + 1) * 8
            setToolStatus(`⏳ Hệ thống AI bận, tự động thử lại sau ${waitSec}s... (${attempt + 1}/${maxRetries})`)
            await new Promise(r => setTimeout(r, waitSec * 1000))
            continue
          }
          throw err
        }
      }
    }

    try {
      let response = await sendWithRetry({ message: text })

      // Vòng lặp xử lý function calls — Gemini có thể gọi nhiều lần
      while (response.functionCalls && response.functionCalls.length > 0) {
        const calls = response.functionCalls

        // Hiển thị status tool đang chạy
        const toolNames = calls.map(c => TOOL_LABEL[c.name] || c.name).join(', ')
        setToolStatus(`🔍 Đang lấy dữ liệu: ${toolNames}...`)

        // Thực thi tất cả tool calls song song
        const results = await Promise.all(
          calls.map(async (call) => {
            const result = await executeTool(call.name, call.args, backendUrl, token)
            return {
              name: call.name,
              // Giới hạn payload để không vượt token
              response: truncateData(result),
            }
          })
        )

        setToolStatus(`✅ Đã lấy: ${toolNames}`)

        // Gửi kết quả tools trở lại cho Gemini
        // Mỗi kết quả là 1 Part với functionResponse
        response = await sendWithRetry({
          message: results.map(r => ({
            functionResponse: {
              name: r.name,
              response: r.response,
            },
          })),
        })
      }

      setToolStatus('')
      const aiText = response.text || 'Xin lỗi, tôi không thể trả lời câu hỏi này.'
      setMessages(prev => [...prev, { role: 'ai', text: aiText, time: new Date() }])

    } catch (err) {
      console.error('Gemini error:', err)
      setToolStatus('')
      const msg = err?.message || ''
      let friendly

      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        friendly = '⚠️ API Gemini đã hết giới hạn miễn phí hôm nay (20 req/ngày với gemini-2.5-flash hoặc quota bị vượt).\n\nVui lòng thử lại vào ngày mai, hoặc liên hệ admin để nâng cấp API key lên gói trả phí tại: https://ai.google.dev'
      } else if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
        friendly = '⚠️ Máy chủ AI đang quá tải. Vui lòng thử lại sau.'
      } else if (msg.includes('API_KEY') || msg.includes('API key') || msg.includes('400')) {
        friendly = '⚠️ API key không hợp lệ hoặc bị thu hồi. Liên hệ quản trị viên hệ thống.'
      } else {
        friendly = `⚠️ Không lấy được phản hồi từ AI. Lỗi: ${msg || 'Không xác định'}. Vui lòng thử lại.`
      }

      setMessages(prev => [...prev, { role: 'ai', text: friendly, time: new Date() }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, backendUrl, token])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Render markdown đơn giản ──────────────────────────────────
  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
      if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
      return p
    })
  }

  const formatMsg = (text) =>
    text.split('\n').map((line, i, arr) => (
      <span key={i}>{renderInline(line)}{i < arr.length - 1 && <br />}</span>
    ))

  const fmtTime = (d) =>
    d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : ''

  // ── Quick prompts ─────────────────────────────────────────────
  const quickPrompts = [
    '📊 Tổng quan hệ thống hôm nay',
    '💰 Doanh thu tháng này',
    '🔍 Có bao nhiêu học viên nộp hồ sơ tháng này',
    '💳 Danh sách học phí chưa đóng',
    '👥 Học viên chờ mở lớp',
    '⚠️ Báo lỗi xe chưa xử lý',
    '🏫 Lớp học đang hoạt động',
    '📅 Lịch thi sắp tới',
    '🎓 Danh sách chờ cấp bằng',
    '🗓️ Lịch dạy của giảng viên tuần tới',
  ]

  return (
    <>
      <button
        className={`ai-fab ${open ? 'ai-fab--open' : ''}`}
        onClick={() => setOpen(!open)}
        title="Trợ lý AI"
        aria-label="Mở trợ lý AI"
      >
        {open ? '✕' : '🤖'}
        {!open && <span className="ai-fab-label">AI</span>}
      </button>

      {open && (
        <div className="ai-panel" role="dialog" aria-label="Trợ lý AI">
          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-header-info">
              <div className="ai-header-avatar">🤖</div>
              <div>
                <p className="ai-header-name">Trợ lý AI Sao Việt</p>
                <p className="ai-header-status">
                  <span className="ai-status-dot" />
                  Kết nối dữ liệu theo yêu cầu
                </p>
              </div>
            </div>
            <button className="ai-header-close" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
          </div>

          {/* Messages */}
          <div className="ai-messages" ref={chatRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-msg ai-msg--${msg.role}`}>
                {msg.role === 'ai' && <div className="ai-msg-avatar">🤖</div>}
                <div className="ai-msg-bubble">
                  <div className="ai-msg-text">{formatMsg(msg.text)}</div>
                  <span className="ai-msg-time">{fmtTime(msg.time)}</span>
                </div>
              </div>
            ))}

            {/* Tool status indicator */}
            {toolStatus && (
              <div className="ai-msg ai-msg--ai">
                <div className="ai-msg-avatar">🤖</div>
                <div className="ai-msg-bubble ai-tool-status">
                  <span className="ai-tool-status-text">{toolStatus}</span>
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {loading && !toolStatus && (
              <div className="ai-msg ai-msg--ai">
                <div className="ai-msg-avatar">🤖</div>
                <div className="ai-msg-bubble ai-msg-bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts — chỉ hiện sau tin nhắn chào */}
          {messages.length === 1 && (
            <div className="ai-quick-prompts">
              {quickPrompts.map((q, i) => (
                <button
                  key={i}
                  className="ai-quick-btn"
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50) }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="ai-input-area">
            <textarea
              ref={inputRef}
              className="ai-input"
              placeholder="Nhập câu hỏi... (Enter để gửi)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
              aria-label="Nhập câu hỏi"
            />
            <button
              className="ai-send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Gửi"
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>

        </div>
      )}
    </>
  )
}

export default AIAssistant
