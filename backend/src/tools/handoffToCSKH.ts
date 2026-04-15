/**
 * Tool chuyển hội thoại sang CSKH
 */

export interface HandoffResult {
  success: boolean;
  reason: string;
  customer_info: any;
  message: string;
  ticket_id?: string;
}

export async function handoffToCSKH(
  reason: string,
  customerInfo?: any
): Promise<HandoffResult> {
  // Generate ticket ID
  const ticketId = `CSKH-${Date.now()}`;

  return {
    success: true,
    reason,
    customer_info: customerInfo || {},
    message: 'Dạ câu hỏi này bên em cần bộ phận chuyên trách hỗ trợ ạ. Anh/chị vui lòng chờ nhân viên tiếp nhận nhé!',
    ticket_id: ticketId
  };
}
