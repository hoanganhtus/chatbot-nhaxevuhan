/**
 * Tool lấy lịch các chuyến xe
 * Sử dụng Q&A từ Knowledge Service (493 cặp hỏi đáp)
 */

import { normalizePlace } from '../utils/placeNormalizer';
import { knowledgeService } from '../services/KnowledgeService';

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
  qa_response?: string;
}

// Dữ liệu lịch chạy cơ bản - bổ sung bởi Q&A từ Knowledge Service
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
  // Đảm bảo Knowledge Service đã khởi tạo
  await knowledgeService.init();

  const normalizedFrom = normalizePlace(from);
  const normalizedTo = normalizePlace(to);

  const scheduleKey = `${normalizedFrom.normalized}|${normalizedTo.normalized}`;
  let departures = baseSchedules[scheduleKey] || [];

  // Tìm Q&A phù hợp từ Knowledge Service
  const query = `${from} ${to} mấy giờ`;
  const qaMatches = knowledgeService.searchQA(query);
  
  let qaResponse: string | undefined;
  if (qaMatches.length > 0) {
    // Tìm câu hỏi về giờ xe phù hợp nhất
    const scheduleQA = qaMatches.find(qa => 
      qa.question.toLowerCase().includes('mấy giờ') ||
      qa.question.toLowerCase().includes('chuyến')
    );
    if (scheduleQA) {
      qaResponse = scheduleQA.answer;
    }
  }

  // Lọc theo loại xe nếu có
  if (vehicle && vehicle !== 'all') {
    departures = departures.filter(d => d.vehicle_type === vehicle);
  }

  return {
    operator_id: operatorId,
    from: normalizedFrom.canonical,
    to: normalizedTo.canonical,
    departures,
    source: 'knowledge',
    qa_response: qaResponse
  };
}
