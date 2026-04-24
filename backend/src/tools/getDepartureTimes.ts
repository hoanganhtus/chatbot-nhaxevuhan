/**
 * Tool lấy lịch các chuyến xe
 * Q&A từ Knowledge Store Markdown + baseSchedules dự phòng
 */

import { normalizePlace } from '../utils/placeNormalizer';
import { knowledgeService, RouteEntry } from '../services/KnowledgeService';

export interface DepartureInfo {
  time: string;
  vehicle_type: string;
  vehicle_label: string;
  eta_destination: string;
  note: string;
}

export interface DepartureResult {
  operator_id: string;
  from: string;
  to: string;
  departures: DepartureInfo[];
  source: string;
  qa_response?: string;        // Câu trả lời từ Q&A Markdown — AI PHẢI dùng cái này khi departures rỗng
  route_info?: string;         // Thông tin lộ trình từ Markdown
  has_direct_answer: boolean;  // Cho AI biết có câu trả lời sẵn không
}

// Dữ liệu lịch chạy cơ bản (hardcode cho các tuyến chính)
const baseSchedules: { [key: string]: DepartureInfo[] } = {
  'ha_noi|xin_man': [
    { time: '05:30', vehicle_type: 'bus', vehicle_label: 'Xe giường', eta_destination: '~14:00', note: '' },
    { time: '10:00', vehicle_type: 'bus', vehicle_label: 'Xe giường', eta_destination: '~18:30', note: '' },
    { time: '19:20', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~04:00+1', note: 'Đến sáng hôm sau' }
  ],
  'ha_noi|dong_van': [
    { time: '19:30', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~06:00+1', note: 'Đến sáng hôm sau' }
  ],
  'ha_noi|meo_vac': [
    { time: '18:30', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~05:00+1', note: '' },
    { time: '19:30', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~06:00+1', note: '' }
  ],
  'ha_noi|tuyen_quang': [
    { time: '05:30', vehicle_type: 'limousine', vehicle_label: 'Xe VIP 9 chỗ', eta_destination: '~07:30', note: 'Sớm nhất' },
    { time: '06:20', vehicle_type: 'bus', vehicle_label: 'Xe ghế', eta_destination: '~08:10', note: '' },
    { time: '06:55', vehicle_type: 'limousine', vehicle_label: 'Xe VIP 9 chỗ', eta_destination: '~08:40', note: '' },
    { time: '07:50', vehicle_type: 'bus', vehicle_label: 'Xe ghế', eta_destination: '~09:40', note: '' },
    { time: '15:25', vehicle_type: 'bus', vehicle_label: 'Xe ghế', eta_destination: '~17:10', note: '' },
    { time: '17:50', vehicle_type: 'bus', vehicle_label: 'Xe ghế', eta_destination: '~19:30', note: '' },
    { time: '18:30', vehicle_type: 'bus', vehicle_label: 'Xe giường', eta_destination: '~21:00', note: '' },
    { time: '19:30', vehicle_type: 'bus', vehicle_label: 'Xe giường', eta_destination: '~23:00', note: 'Muộn nhất' }
  ],
  'ha_noi|hoang_su_phi': [
    { time: '05:30', vehicle_type: 'bus', vehicle_label: 'Xe giường', eta_destination: '~14:00', note: '' }
  ],
  'ha_noi|bac_ha': [
    { time: '10:00', vehicle_type: 'bus', vehicle_label: 'Xe giường', eta_destination: '~17:00', note: '' },
    { time: '19:20', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~02:00+1', note: '' }
  ],
  'ha_noi|yen_minh': [
    { time: '18:30', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~04:00+1', note: '' },
    { time: '19:30', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~05:00+1', note: '' }
  ],
  'ha_noi|quan_ba': [
    { time: '18:30', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~03:00+1', note: '' },
    { time: '19:30', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~04:00+1', note: '' }
  ],
  'ha_noi|na_hang': [
    { time: '19:20', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~03:00+1', note: '' }
  ],
  'ha_noi|bao_lam': [
    { time: '19:20', vehicle_type: 'bus', vehicle_label: 'Xe giường (đêm)', eta_destination: '~05:00+1', note: '' }
  ]
};

export async function getDepartureTimes(
  operatorId: string,
  from: string,
  to: string,
  vehicle?: string,
  date?: string
): Promise<DepartureResult> {
  await knowledgeService.init();

  const normalizedFrom = normalizePlace(from);
  const normalizedTo = normalizePlace(to);

  const scheduleKey = `${normalizedFrom.normalized}|${normalizedTo.normalized}`;
  let departures = baseSchedules[scheduleKey] || [];

  // Lọc theo loại xe nếu có
  if (vehicle && vehicle !== 'all') {
    departures = departures.filter(d => d.vehicle_type === vehicle);
  }

  // Tìm Q&A từ Markdown cho câu hỏi lịch chạy
  // Tìm với nhiều dạng câu hỏi khác nhau để tăng độ bao phủ
  const queries = [
    `${from} ${to} mấy giờ`,
    `${to} ${from} mấy giờ`,
    `${from} đi ${to}`,
    `${to} về ${from}`,
    `${from} ${to} chuyến`,
    `${from} ${to}`,
  ];

  let qaResponse: string | undefined;
  let bestConfidence = 0;

  for (const query of queries) {
    const matches = knowledgeService.searchQA(query, 10);
    
    // Ưu tiên câu hỏi có chứa từ "mấy giờ" hoặc "chuyến"
    const scheduleMatch = matches.find(qa =>
      qa.question.toLowerCase().includes('mấy giờ') ||
      qa.question.toLowerCase().includes('chuyến') ||
      qa.question.toLowerCase().includes('giờ')
    );
    
    if (scheduleMatch && !qaResponse) {
      qaResponse = scheduleMatch.answer;
    }

    // Nếu đã đủ, dừng
    if (qaResponse) break;
  }

  // Tìm thông tin lộ trình từ Markdown route
  const routeMatches: RouteEntry[] = knowledgeService.searchRoutes(`${from} ${to}`);
  const routeInfo = routeMatches.length > 0 ? routeMatches[0].content : undefined;

  const hasDirectAnswer = departures.length > 0 || !!qaResponse;

  return {
    operator_id: operatorId,
    from: normalizedFrom.canonical,
    to: normalizedTo.canonical,
    departures,
    source: departures.length > 0 ? 'base_schedule' : (qaResponse ? 'markdown_qa' : 'not_found'),
    qa_response: qaResponse,
    route_info: routeInfo,
    has_direct_answer: hasDirectAnswer,
  };
}
