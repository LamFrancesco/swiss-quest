/**
 * Fuzzy Logic Core: Fuzzy Inference Engine (Mamdani-style)
 * 
 * This module implements a complete Fuzzy Inference System (FIS) following
 * the Mamdani architecture with:
 * - Fuzzification of crisp inputs
 * - Rule evaluation using T-norms
 * - Aggregation of rule outputs
 * - Defuzzification to produce crisp outputs
 * 
 * References:
 * - Mamdani, E. H., & Assilian, S. (1975). "An experiment in linguistic synthesis with a fuzzy logic controller"
 * - Driankov, D., Hellendoorn, H., & Reinfrank, M. (1993). "An Introduction to Fuzzy Control"
 */

import { FuzzyVariable, FuzzySet, fuzzify } from './fuzzySets';
import { 
  tNormMin, 
  tNormProduct, 
  tConormMax, 
  aggregateAnd,
  TNorm,
  TConorm,
  implicationMamdani,
  implicationLarsen,
  FuzzyImplication
} from './operators';

// ============================================================================
// FUZZY RULE DEFINITIONS
// ============================================================================

export interface FuzzyRuleCondition {
  variable: string;
  set: string;
  negated?: boolean;
}

export interface FuzzyRuleConsequent {
  variable: string;
  set: string;
}

export interface FuzzyRule {
  id: string;
  antecedent: FuzzyRuleCondition[];
  consequent: FuzzyRuleConsequent;
  weight?: number; // Rule weight (default 1.0)
  connective?: 'AND' | 'OR'; // How to combine antecedent conditions
}

// ============================================================================
// FUZZY INFERENCE SYSTEM
// ============================================================================

export interface FISConfig {
  tNorm: TNorm;
  tConorm: TConorm;
  implication: FuzzyImplication;
  aggregation: 'max' | 'sum' | 'probor';
  defuzzification: 'centroid' | 'bisector' | 'mom' | 'lom' | 'som';
}

export const DEFAULT_FIS_CONFIG: FISConfig = {
  tNorm: tNormMin,
  tConorm: tConormMax,
  implication: implicationMamdani,
  aggregation: 'max',
  defuzzification: 'centroid',
};

export class FuzzyInferenceSystem {
  private variables: Map<string, FuzzyVariable> = new Map();
  private rules: FuzzyRule[] = [];
  private config: FISConfig;
  
  constructor(config: Partial<FISConfig> = {}) {
    this.config = { ...DEFAULT_FIS_CONFIG, ...config };
  }
  
  /**
   * Register a fuzzy variable with the system
   */
  addVariable(variable: FuzzyVariable): void {
    this.variables.set(variable.name, variable);
  }
  
  /**
   * Add a fuzzy rule to the rule base
   */
  addRule(rule: FuzzyRule): void {
    this.rules.push(rule);
  }
  
  /**
   * Add multiple rules at once
   */
  addRules(rules: FuzzyRule[]): void {
    this.rules.push(...rules);
  }
  
  /**
   * Fuzzify all input values
   */
  fuzzifyInputs(inputs: Map<string, number>): Map<string, Map<string, number>> {
    const fuzzified = new Map<string, Map<string, number>>();
    
    for (const [varName, value] of inputs) {
      const variable = this.variables.get(varName);
      if (variable) {
        fuzzified.set(varName, fuzzify(value, variable));
      }
    }
    
    return fuzzified;
  }
  
  /**
   * Evaluate a single rule condition
   */
  private evaluateCondition(
    condition: FuzzyRuleCondition,
    fuzzifiedInputs: Map<string, Map<string, number>>
  ): number {
    const varMemberships = fuzzifiedInputs.get(condition.variable);
    if (!varMemberships) return 0;
    
    let membership = varMemberships.get(condition.set) ?? 0;
    
    // Apply negation if specified
    if (condition.negated) {
      membership = 1 - membership;
    }
    
    return membership;
  }
  
  /**
   * Evaluate a rule's antecedent (firing strength)
   */
  evaluateRule(
    rule: FuzzyRule,
    fuzzifiedInputs: Map<string, Map<string, number>>
  ): number {
    const conditionValues = rule.antecedent.map(cond => 
      this.evaluateCondition(cond, fuzzifiedInputs)
    );
    
    const connective = rule.connective ?? 'AND';
    let firingStrength: number;
    
    if (connective === 'AND') {
      firingStrength = aggregateAnd(conditionValues, this.config.tNorm);
    } else {
      firingStrength = conditionValues.reduce(
        (acc, val) => this.config.tConorm(acc, val),
        0
      );
    }
    
    // Apply rule weight
    const weight = rule.weight ?? 1.0;
    return firingStrength * weight;
  }
  
  /**
   * Aggregate output fuzzy sets from all fired rules
   * Returns a discretized output fuzzy set
   */
  aggregateOutputs(
    ruleResults: Array<{ rule: FuzzyRule; firingStrength: number }>,
    outputVariable: FuzzyVariable,
    resolution: number = 100
  ): number[] {
    const [min, max] = outputVariable.domain;
    const step = (max - min) / resolution;
    const output = new Array(resolution + 1).fill(0);
    
    for (let i = 0; i <= resolution; i++) {
      const x = min + i * step;
      
      for (const { rule, firingStrength } of ruleResults) {
        if (firingStrength === 0) continue;
        
        // Find the consequent fuzzy set
        const consequentSet = outputVariable.sets.find(
          s => s.name === rule.consequent.set
        );
        
        if (!consequentSet) continue;
        
        // Apply implication
        const membershipValue = consequentSet.membershipFunction(x);
        const impliedValue = this.config.implication(firingStrength, membershipValue);
        
        // Aggregate using configured method
        switch (this.config.aggregation) {
          case 'max':
            output[i] = Math.max(output[i], impliedValue);
            break;
          case 'sum':
            output[i] = Math.min(1, output[i] + impliedValue);
            break;
          case 'probor':
            output[i] = output[i] + impliedValue - output[i] * impliedValue;
            break;
        }
      }
    }
    
    return output;
  }
  
  /**
   * Defuzzify an aggregated output fuzzy set
   */
  defuzzify(aggregatedOutput: number[], domain: [number, number]): number {
    const [min, max] = domain;
    const step = (max - min) / (aggregatedOutput.length - 1);
    
    switch (this.config.defuzzification) {
      case 'centroid':
        return this.defuzzifyCentroid(aggregatedOutput, min, step);
      case 'bisector':
        return this.defuzzifyBisector(aggregatedOutput, min, step);
      case 'mom':
        return this.defuzzifyMeanOfMaximum(aggregatedOutput, min, step);
      case 'lom':
        return this.defuzzifyLargestOfMaximum(aggregatedOutput, min, step);
      case 'som':
        return this.defuzzifySmallestOfMaximum(aggregatedOutput, min, step);
      default:
        return this.defuzzifyCentroid(aggregatedOutput, min, step);
    }
  }
  
  /**
   * Center of Gravity (Centroid) defuzzification
   */
  private defuzzifyCentroid(output: number[], min: number, step: number): number {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < output.length; i++) {
      const x = min + i * step;
      numerator += x * output[i];
      denominator += output[i];
    }
    
    return denominator === 0 ? (min + (output.length - 1) * step) / 2 : numerator / denominator;
  }
  
  /**
   * Bisector defuzzification
   */
  private defuzzifyBisector(output: number[], min: number, step: number): number {
    const totalArea = output.reduce((a, b) => a + b, 0) * step;
    let cumulativeArea = 0;
    
    for (let i = 0; i < output.length; i++) {
      cumulativeArea += output[i] * step;
      if (cumulativeArea >= totalArea / 2) {
        return min + i * step;
      }
    }
    
    return min + (output.length - 1) * step / 2;
  }
  
  /**
   * Mean of Maximum defuzzification
   */
  private defuzzifyMeanOfMaximum(output: number[], min: number, step: number): number {
    const maxValue = Math.max(...output);
    if (maxValue === 0) return (min + (output.length - 1) * step) / 2;
    
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < output.length; i++) {
      if (output[i] === maxValue) {
        sum += min + i * step;
        count++;
      }
    }
    
    return sum / count;
  }
  
  /**
   * Largest of Maximum defuzzification
   */
  private defuzzifyLargestOfMaximum(output: number[], min: number, step: number): number {
    const maxValue = Math.max(...output);
    
    for (let i = output.length - 1; i >= 0; i--) {
      if (output[i] === maxValue) {
        return min + i * step;
      }
    }
    
    return min + (output.length - 1) * step / 2;
  }
  
  /**
   * Smallest of Maximum defuzzification
   */
  private defuzzifySmallestOfMaximum(output: number[], min: number, step: number): number {
    const maxValue = Math.max(...output);
    
    for (let i = 0; i < output.length; i++) {
      if (output[i] === maxValue) {
        return min + i * step;
      }
    }
    
    return min + (output.length - 1) * step / 2;
  }
  
  /**
   * Run the complete inference process
   */
  infer(
    inputs: Map<string, number>,
    outputVariableName: string
  ): { crispOutput: number; firedRules: Array<{ ruleId: string; firingStrength: number }> } {
    // Step 1: Fuzzify inputs
    const fuzzifiedInputs = this.fuzzifyInputs(inputs);
    
    // Step 2: Evaluate all rules
    const outputVariable = this.variables.get(outputVariableName);
    if (!outputVariable) {
      throw new Error(`Output variable "${outputVariableName}" not found`);
    }
    
    const ruleResults: Array<{ rule: FuzzyRule; firingStrength: number }> = [];
    const firedRules: Array<{ ruleId: string; firingStrength: number }> = [];
    
    for (const rule of this.rules) {
      if (rule.consequent.variable === outputVariableName) {
        const firingStrength = this.evaluateRule(rule, fuzzifiedInputs);
        ruleResults.push({ rule, firingStrength });
        firedRules.push({ ruleId: rule.id, firingStrength });
      }
    }
    
    // Step 3: Aggregate outputs
    const aggregatedOutput = this.aggregateOutputs(ruleResults, outputVariable);
    
    // Step 4: Defuzzify
    const crispOutput = this.defuzzify(aggregatedOutput, outputVariable.domain);
    
    return { crispOutput, firedRules };
  }
}

// ============================================================================
// PREDEFINED RULE BASES FOR SWISSQUEST
// ============================================================================

/**
 * Rules for determining confidence in query interpretation
 */
export const confidenceRules: FuzzyRule[] = [
  {
    id: 'conf_r1',
    antecedent: [
      { variable: 'similarity', set: 'exact_match' },
    ],
    consequent: { variable: 'confidence', set: 'very_high' },
  },
  {
    id: 'conf_r2',
    antecedent: [
      { variable: 'similarity', set: 'strong_match' },
    ],
    consequent: { variable: 'confidence', set: 'high' },
  },
  {
    id: 'conf_r3',
    antecedent: [
      { variable: 'similarity', set: 'partial_match' },
    ],
    consequent: { variable: 'confidence', set: 'medium' },
  },
  {
    id: 'conf_r4',
    antecedent: [
      { variable: 'similarity', set: 'weak_match' },
    ],
    consequent: { variable: 'confidence', set: 'low' },
  },
  {
    id: 'conf_r5',
    antecedent: [
      { variable: 'similarity', set: 'no_match' },
    ],
    consequent: { variable: 'confidence', set: 'very_low' },
  },
];

/**
 * Rules for determining result relevance
 */
export const relevanceRules: FuzzyRule[] = [
  {
    id: 'rel_r1',
    antecedent: [
      { variable: 'similarity', set: 'exact_match' },
      { variable: 'confidence', set: 'very_high' },
    ],
    consequent: { variable: 'relevance', set: 'perfectly_relevant' },
    connective: 'AND',
  },
  {
    id: 'rel_r2',
    antecedent: [
      { variable: 'similarity', set: 'strong_match' },
      { variable: 'confidence', set: 'high' },
    ],
    consequent: { variable: 'relevance', set: 'highly_relevant' },
    connective: 'AND',
  },
  {
    id: 'rel_r3',
    antecedent: [
      { variable: 'similarity', set: 'partial_match' },
    ],
    consequent: { variable: 'relevance', set: 'relevant' },
  },
  {
    id: 'rel_r4',
    antecedent: [
      { variable: 'similarity', set: 'weak_match' },
    ],
    consequent: { variable: 'relevance', set: 'marginally_relevant' },
  },
  {
    id: 'rel_r5',
    antecedent: [
      { variable: 'similarity', set: 'no_match' },
    ],
    consequent: { variable: 'relevance', set: 'irrelevant' },
  },
  // Combined rules for edge cases
  {
    id: 'rel_r6',
    antecedent: [
      { variable: 'similarity', set: 'partial_match' },
      { variable: 'confidence', set: 'very_high' },
    ],
    consequent: { variable: 'relevance', set: 'highly_relevant' },
    connective: 'AND',
  },
  {
    id: 'rel_r7',
    antecedent: [
      { variable: 'similarity', set: 'strong_match' },
      { variable: 'confidence', set: 'low' },
    ],
    consequent: { variable: 'relevance', set: 'relevant' },
    connective: 'AND',
  },
];
