/**
 * Core Types for ATLAS
 * Shared type definitions across the library
 */

/**
 * Core Utterance type (used in app layer with numeric IDs)
 */
export type Utterance = {
  id: number; // Numeric ID for core app usage
  text: string;
  timestamp: number; // ms epoch
  speaker: string;
};
