import * as fs from 'fs';
import * as path from 'path';

// Types
export interface PriceEntry {
  route: string;
  from: string;
  to: string;
  price: number;
  vehicle: string;
}

export interface QAEntry {
  question: string;
  answer: string;
  source?: string; // 'md' | 'json'
}

export interface ScheduleEntry {
  from: string;
  to: string;
  time: string;
  vehicle: string;
  note: string;
}

export interface RouteEntry {
  name: string;
  content: string;
  phone?: string;
}

// Knowledge store: Q&A và Route từ Markdown, Prices/Schedules từ JSON
class KnowledgeService {
  private prices: PriceEntry[] = [];
  private qaPairs: QAEntry[] = [];
  private schedules: ScheduleEntry[] = [];
  private routes: RouteEntry[] = [];
  private initialized = false;

  // Đường dẫn gốc tới Knowledge Store dạng Markdown
  private readonly mdStorePath = path.join(__dirname, '../../knowledge/operators/vu_han');

  // Chuẩn hóa tên địa điểm để so sánh
  private normalizeLocation(loc: string): string {
    if (!loc) return '';
    return loc
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[\/\-\(\)]/g, ' ')
      .replace(/tp\s*cũ/g, '')
      .replace(/thị trấn/g, '')
      .trim();
  }

  // So khớp tên địa điểm (fuzzy match + alias)
  private locationsMatch(loc1: string, loc2: string): boolean {
    const n1 = this.normalizeLocation(loc1);
    const n2 = this.normalizeLocation(loc2);

    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;

    const aliases: Record<string, string[]> = {
      'xín mần': ['cốc pài', 'pà vầy sủ'],
      'bảo lâm': ['pắc mầu'],
      'hà nội': ['mỹ đình', 'hn'],
      'đồng văn': ['đv'],
      'mèo vạc': ['mv'],
      'tuyên quang': ['tq'],
      'hà giang': ['hg'],
    };

    for (const [key, values] of Object.entries(aliases)) {
      if (
        (n1.includes(key) || values.some(v => n1.includes(v))) &&
        (n2.includes(key) || values.some(v => n2.includes(v)))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse Markdown FAQ (format: ### Câu hỏi\nCâu trả lời\n\n...)
   */
  private parseFAQMarkdown(content: string): QAEntry[] {
    const entries: QAEntry[] = [];
    const sections = content.split(/^###\s+/m);

    for (const section of sections) {
      if (!section.trim()) continue;
      const lines = section.split('\n');
      const question = lines[0]?.trim().replace(/\?$/, '').trim();
      const answerLines = lines
        .slice(1)
        .map(l => l.trim())
        .filter(l => l.length > 0);
      const answer = answerLines.join(' ').trim();

      if (question && answer) {
        entries.push({ question, answer, source: 'md' });
      }
    }

    return entries;
  }

  /**
   * Parse Markdown Route (format: ## Tên tuyến\nnội dung...\n\n...)
   */
  private parseRouteMarkdown(content: string): RouteEntry[] {
    const entries: RouteEntry[] = [];
    const sections = content.split(/^##\s+/m);

    for (const section of sections) {
      if (!section.trim()) continue;
      const lines = section.split('\n');
      const name = lines[0]?.trim();
      const body = lines.slice(1).join('\n').trim();

      if (name && body) {
        const phoneMatch = body.match(/SĐT xe:\s*([\d\s,và]+)/);
        entries.push({
          name,
          content: body,
          phone: phoneMatch ? phoneMatch[1].trim() : undefined,
        });
      }
    }

    return entries;
  }

  /**
   * Đọc và ghép tất cả file .md trong một thư mục
   */
  private readMarkdownDir(dir: string): string {
    if (!fs.existsSync(dir)) return '';
    const combined: string[] = [];
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.md')) {
        combined.push(fs.readFileSync(path.join(dir, file), 'utf-8'));
      }
    }
    return combined.join('\n\n');
  }

  /**
   * Khởi tạo: Đọc Markdown trước, fallback sang JSON nếu thiếu
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    console.log('[KnowledgeService] Initializing from Markdown Knowledge Store...');

    // 1. FAQ từ Markdown
    try {
      const faqContent = this.readMarkdownDir(path.join(this.mdStorePath, 'faq'));
      if (faqContent) {
        this.qaPairs = this.parseFAQMarkdown(faqContent);
        console.log(`[KnowledgeService] ✅ Loaded ${this.qaPairs.length} Q&A pairs from Markdown`);
      }
    } catch (err) {
      console.warn('[KnowledgeService] ⚠️ Could not read FAQ Markdown.');
    }

    // Fallback: qa_pairs.json cũ
    if (this.qaPairs.length === 0) {
      const qaPath = path.join(__dirname, '../../knowledge/qa_pairs.json');
      if (fs.existsSync(qaPath)) {
        const raw = JSON.parse(fs.readFileSync(qaPath, 'utf-8'));
        // Normalize field names từ JSON cũ ({question, answer} hoặc {q, a})
        this.qaPairs = raw.map((item: any) => ({
          question: item.question ?? item.q,
          answer: item.answer ?? item.a,
          source: 'json',
        }));
        console.log(`[KnowledgeService] ✅ Loaded ${this.qaPairs.length} Q&A pairs from legacy JSON`);
      }
    }

    // 2. Routes từ Markdown
    try {
      const routeContent = this.readMarkdownDir(path.join(this.mdStorePath, 'route'));
      if (routeContent) {
        this.routes = this.parseRouteMarkdown(routeContent);
        console.log(`[KnowledgeService] ✅ Loaded ${this.routes.length} routes from Markdown`);
      }
    } catch (err) {
      console.warn('[KnowledgeService] ⚠️ Could not read Route Markdown.');
    }

    // 3. Prices từ JSON (giữ nguyên, quá lớn để chuyển sang MD)
    const pricesPath = path.join(__dirname, '../../knowledge/prices.json');
    if (fs.existsSync(pricesPath)) {
      this.prices = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));
      console.log(`[KnowledgeService] ✅ Loaded ${this.prices.length} price entries from JSON`);
    }

    // 4. Schedules từ JSON
    const schedulesPath = path.join(__dirname, '../../knowledge/schedules.json');
    if (fs.existsSync(schedulesPath)) {
      this.schedules = JSON.parse(fs.readFileSync(schedulesPath, 'utf-8'));
      console.log(`[KnowledgeService] ✅ Loaded ${this.schedules.length} schedule entries from JSON`);
    }

    this.initialized = true;
    console.log('[KnowledgeService] 🚀 Knowledge Store ready.');
  }

  // Tìm giá vé
  findPrice(from: string, to: string): PriceEntry[] {
    const results = this.prices.filter(
      p => this.locationsMatch(p.from, from) && this.locationsMatch(p.to, to)
    );
    if (results.length === 0) {
      return this.prices.filter(
        p => this.locationsMatch(p.from, to) && this.locationsMatch(p.to, from)
      );
    }
    return results;
  }

  // Tìm lịch chạy
  findSchedules(from: string, to: string): ScheduleEntry[] {
    const results = this.schedules.filter(
      s => this.locationsMatch(s.from, from) && this.locationsMatch(s.to, to)
    );
    if (results.length === 0) {
      return this.schedules.filter(
        s => this.locationsMatch(s.from, to) && this.locationsMatch(s.to, from)
      );
    }
    return results;
  }

  /**
   * Tìm kiếm Q&A theo từ khóa
   */
  searchQA(query: string, limit = 5): QAEntry[] {
    const normalizedQuery = query.toLowerCase();
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

    return this.qaPairs
      .filter(qa => {
        const qLower = qa.question.toLowerCase();
        const aLower = qa.answer.toLowerCase();
        return queryWords.some(word => qLower.includes(word) || aLower.includes(word));
      })
      .slice(0, limit);
  }

  /**
   * Tìm kiếm lộ trình theo từ khóa
   */
  searchRoutes(query: string): RouteEntry[] {
    const q = query.toLowerCase();
    return this.routes.filter(
      r => r.name.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
    );
  }

  /** Lấy tất cả lộ trình */
  getAllRoutes(): RouteEntry[] {
    return this.routes;
  }

  getUniqueLocations(): string[] {
    const locations = new Set<string>();
    this.prices.forEach(p => {
      locations.add(p.from);
      locations.add(p.to);
    });
    return Array.from(locations).sort();
  }

  getVehicleTypes(): string[] {
    const types = new Set<string>();
    this.prices.forEach(p => { if (p.vehicle) types.add(p.vehicle); });
    return Array.from(types);
  }

  getStats() {
    return {
      totalPrices: this.prices.length,
      totalQAPairs: this.qaPairs.length,
      totalSchedules: this.schedules.length,
      totalRoutes: this.routes.length,
      uniqueLocations: this.getUniqueLocations().length,
      vehicleTypes: this.getVehicleTypes(),
      knowledgeSource: this.qaPairs[0]?.source ?? 'unknown',
    };
  }
}

// Singleton instance
export const knowledgeService = new KnowledgeService();
