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
}

export interface ScheduleEntry {
  from: string;
  to: string;
  time: string;
  vehicle: string;
  note: string;
}

// Knowledge store loaded from JSON files
class KnowledgeService {
  private prices: PriceEntry[] = [];
  private qaPairs: QAEntry[] = [];
  private schedules: ScheduleEntry[] = [];
  private initialized = false;

  // Normalize location name for comparison
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

  // Check if two locations match (fuzzy)
  private locationsMatch(loc1: string, loc2: string): boolean {
    const n1 = this.normalizeLocation(loc1);
    const n2 = this.normalizeLocation(loc2);
    
    // Direct match
    if (n1 === n2) return true;
    
    // One contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Alias mappings
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
      if ((n1.includes(key) || values.some(v => n1.includes(v))) &&
          (n2.includes(key) || values.some(v => n2.includes(v)))) {
        return true;
      }
    }

    return false;
  }

  // Initialize by loading JSON data
  async init(): Promise<void> {
    if (this.initialized) return;

    const knowledgePath = path.join(__dirname, '../../knowledge');
    
    try {
      // Load prices
      const pricesPath = path.join(knowledgePath, 'prices.json');
      if (fs.existsSync(pricesPath)) {
        this.prices = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));
        console.log(`[KnowledgeService] Loaded ${this.prices.length} price entries`);
      }

      // Load Q&A pairs
      const qaPath = path.join(knowledgePath, 'qa_pairs.json');
      if (fs.existsSync(qaPath)) {
        this.qaPairs = JSON.parse(fs.readFileSync(qaPath, 'utf-8'));
        console.log(`[KnowledgeService] Loaded ${this.qaPairs.length} Q&A pairs`);
      }

      // Load schedules
      const schedulesPath = path.join(knowledgePath, 'schedules.json');
      if (fs.existsSync(schedulesPath)) {
        this.schedules = JSON.parse(fs.readFileSync(schedulesPath, 'utf-8'));
        console.log(`[KnowledgeService] Loaded ${this.schedules.length} schedule entries`);
      }

      this.initialized = true;
    } catch (error) {
      console.error('[KnowledgeService] Error loading knowledge files:', error);
    }
  }

  // Find price for a route
  findPrice(from: string, to: string): PriceEntry[] {
    const results = this.prices.filter(p => 
      this.locationsMatch(p.from, from) && this.locationsMatch(p.to, to)
    );

    // If no results, try reverse direction
    if (results.length === 0) {
      return this.prices.filter(p => 
        this.locationsMatch(p.from, to) && this.locationsMatch(p.to, from)
      );
    }

    return results;
  }

  // Find schedules for a route
  findSchedules(from: string, to: string): ScheduleEntry[] {
    const results = this.schedules.filter(s =>
      this.locationsMatch(s.from, from) && this.locationsMatch(s.to, to)
    );

    if (results.length === 0) {
      return this.schedules.filter(s =>
        this.locationsMatch(s.from, to) && this.locationsMatch(s.to, from)
      );
    }

    return results;
  }

  // Search Q&A pairs by keyword
  searchQA(query: string): QAEntry[] {
    const normalizedQuery = query.toLowerCase();
    
    return this.qaPairs.filter(qa => {
      const questionLower = qa.question.toLowerCase();
      const answerLower = qa.answer.toLowerCase();
      
      // Check if query keywords appear in question or answer
      const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
      return queryWords.some(word => 
        questionLower.includes(word) || answerLower.includes(word)
      );
    }).slice(0, 5); // Return top 5 matches
  }

  // Get all unique locations
  getUniqueLocations(): string[] {
    const locations = new Set<string>();
    this.prices.forEach(p => {
      locations.add(p.from);
      locations.add(p.to);
    });
    return Array.from(locations).sort();
  }

  // Get all vehicle types
  getVehicleTypes(): string[] {
    const types = new Set<string>();
    this.prices.forEach(p => {
      if (p.vehicle) types.add(p.vehicle);
    });
    return Array.from(types);
  }

  // Get statistics
  getStats() {
    return {
      totalPrices: this.prices.length,
      totalQAPairs: this.qaPairs.length,
      totalSchedules: this.schedules.length,
      uniqueLocations: this.getUniqueLocations().length,
      vehicleTypes: this.getVehicleTypes(),
    };
  }
}

// Singleton instance
export const knowledgeService = new KnowledgeService();
