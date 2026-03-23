export interface Option {
  id: string;
  name: string;
  pros: string[];
  cons: string[];
  scores?: Record<string, number>; // For weighted matrix: criteriaId -> score (1-10)
}

export interface Criterion {
  id: string;
  name: string;
  weight: number; // 1-10
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  type: 'pros-cons' | 'matrix' | 'quick';
  options: Option[];
  criteria?: Criterion[];
  createdAt: number;
  aiAnalysis?: {
    summary: string;
    recommendation: string;
    risks: string[];
    opportunities: string[];
  };
}
