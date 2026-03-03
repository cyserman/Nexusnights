
export interface KnowledgeBaseEntry {
  question: string;
  answer: string;
  category: string;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
  owner_name: string;
  listing_url: string;
  current_adr: number;
  occupancy_rate: number;
  estimated_annual_revenue: number;
  review_count: number;
  last_review_date: string;
  amenities: string[];
  photo_quality_score: number; // 0-100
  photo_count: number;
  market_comp_adr: number;
  market_comp_revenue: number;
  alpha_score: number;
  investment_thesis: string;
  knowledge_base?: KnowledgeBaseEntry[];
}

export interface AlphaWeights {
  yield_gap: number;
  aesthetic_debt: number;
  amenity_arbitrage: number;
  pricing_inefficiency: number;
  review_velocity: number;
}

export interface NotebookEntry {
  id: string;
  content: string;
  timestamp: number;
}

export interface Contract {
  property_id: string;
  purchase_price: number;
  closing_date: string;
  proof_of_funds_days: number;
  value_add_clause: string;
  seller_reality_check: string;
}

export enum Step {
  AUTH = 'AUTH',
  COMMAND_CENTER = 'COMMAND_CENTER',
  SCRUBBING = 'SCRUBBING',
  CONTRACT_DRAFT = 'CONTRACT_DRAFT'
}
