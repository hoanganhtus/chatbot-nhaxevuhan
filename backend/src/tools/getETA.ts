/**
 * Tool tính thời gian dự kiến (ETA)
 */

import { normalizePlace } from '../utils/placeNormalizer';

export interface ETAResult {
  operator_id: string;
  departure_time: string;
  checkpoint: string;
  eta: string;
  offset_minutes: number;
  confidence: string;
  note: string;
}

// Dữ liệu ETA từ Mỹ Đình - sẽ được load từ knowledge files
const etaFromMyDinh: { [key: string]: number } = {
  'cau_thang_long': 15,
  'ciputra': 15,
  'cong_vien_hoa_binh': 15,
  'bau': 20,
  'nam_hong': 25,
  'nga_3_kim_anh': 30,
  'nga_4_noi_bai': 30,
  'me_linh': 30,
  'quang_minh': 30,
  'km14': 45,
  'km14_binh_xuyen': 45,
  'km25': 60,
  'km25_tam_dao': 60,
  'km41': 70,
  'phu_tho': 120,
  'tuyen_quang': 180,
  'ha_giang': 420,
  'xin_man': 480,
  'dong_van': 600,
  'meo_vac': 540
};

export async function getETA(
  operatorId: string,
  departureTime: string,
  checkpoint: string,
  from?: string,
  to?: string
): Promise<ETAResult> {
  const normalizedCheckpoint = normalizePlace(checkpoint);
  const offsetMinutes = etaFromMyDinh[normalizedCheckpoint.normalized] || 0;

  // Parse departure time
  const [hours, minutes] = departureTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes + offsetMinutes;
  
  // Tính ETA
  let etaHours = Math.floor(totalMinutes / 60) % 24;
  let etaMinutes = totalMinutes % 60;
  let dayOffset = Math.floor(totalMinutes / (24 * 60));

  const etaStr = `${etaHours.toString().padStart(2, '0')}:${etaMinutes.toString().padStart(2, '0')}${dayOffset > 0 ? '+' + dayOffset : ''}`;

  return {
    operator_id: operatorId,
    departure_time: departureTime,
    checkpoint: normalizedCheckpoint.canonical,
    eta: `~${etaStr}`,
    offset_minutes: offsetMinutes,
    confidence: 'approximate',
    note: 'Có thể thay đổi theo điều kiện thực tế. Lái phụ xe sẽ xác nhận chính xác.'
  };
}
