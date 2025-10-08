/**
 * Core Types for ATLAS
 * Attention Temporal Link Analysis System
 */

export interface Utterance {
  id: number;
  speaker: string;
  text: string;
  timestamp: number;
}

export interface Dependency {
  id: number;
  weight: number;
  type: 'local' | 'topic' | 'global';
  evidence?: {
    shared_entities?: string[];
    coreferences?: string[];
    temporal_refs?: string[];
  };
}

export interface SCAINResult {
  is_scain: boolean;
  dependencies: Dependency[];
  scain_type?: 'short-term' | 'mid-term' | 'long-term';
  importance_score: number;
  max_dependency_weight: number;
}

export interface UserProfile {
  name: string;
  expertise: string[];
  tasks: string[];
}

export interface NotificationReason {
  type: 'direct_mention' | 'relevant_topic' | 'question' | 'decision' | 'topic_shift';
  level: 'critical' | 'high' | 'medium';
  message: string;
  metadata?: any;
}

export interface ImportanceResult {
  importance_score: number;
  should_notify: boolean;
  reasons: NotificationReason[];
}

export interface ContextRecovery {
  needs_context: boolean;
  dependency_count: number;
  time_range?: string;
  summary: string;
  key_points: string[];
  your_relevance: string;
  recommended_action: string;
  context_utterances: Utterance[];
  dependency_graph: Dependency[];
}

export interface DetectionConfig {
  scain_threshold: number;
  w_local: number;
  w_topic: number;
  w_global: number;
  lambda_local: number;
  lambda_topic: number;
  lambda_global: number;
}

export const DEFAULT_CONFIG: DetectionConfig = {
  scain_threshold: 0.5,
  w_local: 0.5,
  w_topic: 0.3,
  w_global: 0.2,
  lambda_local: 0.5,
  lambda_topic: 0.2,
  lambda_global: 0.05,
};
