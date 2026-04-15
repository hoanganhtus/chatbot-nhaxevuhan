/**
 * Chat API Router
 */

import { Router, Request, Response } from 'express';
import { VuHanChatAgent } from '../agents/VuHanChatAgent';

const router = Router();

// Lưu trữ sessions (trong production nên dùng Redis)
const sessions: Map<string, VuHanChatAgent> = new Map();

// POST /api/chat
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, session_id, operator_id = 'vu_han' } = req.body;

    if (!message) {
      return res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Thiếu trường "message"'
        }
      });
    }

    // Lấy hoặc tạo session
    let agent = sessions.get(session_id);
    if (!agent) {
      agent = new VuHanChatAgent(operator_id);
      if (session_id) {
        sessions.set(session_id, agent);
      }
    }

    // Xử lý tin nhắn
    const response = await agent.chat(message);

    res.json({
      success: true,
      session_id: session_id || 'anonymous',
      reply: response.message,
      intent: response.intent,
      booking_data: response.bookingData,
      needs_escalation: response.needsEscalation,
      tool_calls: response.toolCalls?.map(tc => ({
        tool: tc.toolName,
        result: tc.result
      }))
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Lỗi hệ thống, vui lòng thử lại sau'
      }
    });
  }
});

// DELETE /api/chat/:session_id - Reset session
router.delete('/:session_id', (req: Request, res: Response) => {
  const { session_id } = req.params;
  
  if (sessions.has(session_id)) {
    sessions.get(session_id)?.resetConversation();
    res.json({ success: true, message: 'Session reset' });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

export { router as chatRouter };
