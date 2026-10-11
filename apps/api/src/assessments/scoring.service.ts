import { Injectable } from '@nestjs/common';
import { Grade, QuestionType } from '@prisma/client';

export type ScoreQuestion = {
  id: string;
  skill: string;
  type: QuestionType;
  correctOptionIndexes: number[];
  points: number;
};

export type ScoreSection = {
  skill: string;
  weight: number;
};

export type GradeThreshold = {
  grade: Grade;
  minScore: number;
  maxScore: number;
};

@Injectable()
export class ScoringService {
  arraysEqualSorted(a: number[], b: number[]) {
    if (a.length !== b.length) return false;
    const aa = [...a].sort((x, y) => x - y);
    const bb = [...b].sort((x, y) => x - y);
    return aa.every((v, i) => v === bb[i]);
  }

  isAnswerCorrect(question: ScoreQuestion, selected: number[]) {
    if (question.type === QuestionType.SINGLE_CHOICE) {
      return selected.length === 1 && question.correctOptionIndexes.includes(selected[0]);
    }
    return this.arraysEqualSorted(selected, question.correctOptionIndexes);
  }

  /**
   * Weighted section scoring: each section contributes weight * sectionAccuracy * 100
   * to overall score (weights should sum to ~1).
   */
  calculateWeightedScore(params: {
    questions: ScoreQuestion[];
    sections: ScoreSection[];
    answersByQuestionId: Map<string, number[]>;
  }) {
    const { questions, sections, answersByQuestionId } = params;
    const bySkill = new Map<string, ScoreQuestion[]>();
    for (const q of questions) {
      const list = bySkill.get(q.skill) || [];
      list.push(q);
      bySkill.set(q.skill, list);
    }

    const sectionScores: Record<string, number> = {};
    let overall = 0;
    let correctAnswers = 0;

    for (const section of sections) {
      const qs = bySkill.get(section.skill) || [];
      if (qs.length === 0) {
        sectionScores[section.skill] = 0;
        continue;
      }
      let earned = 0;
      let max = 0;
      for (const q of qs) {
        max += q.points;
        const selected = answersByQuestionId.get(q.id) || [];
        const ok = this.isAnswerCorrect(q, selected);
        if (ok) {
          earned += q.points;
          correctAnswers += 1;
        }
      }
      const accuracy = max > 0 ? earned / max : 0;
      const sectionPct = Math.round(accuracy * 1000) / 10;
      sectionScores[section.skill] = sectionPct;
      overall += section.weight * sectionPct;
    }

    // Normalize if weights don't sum to 1
    const weightSum = sections.reduce((s, x) => s + x.weight, 0) || 1;
    if (Math.abs(weightSum - 1) > 0.001) {
      overall = overall / weightSum;
    }

    return {
      score: Math.round(Math.min(100, Math.max(0, overall)) * 10) / 10,
      sectionScores,
      correctAnswers,
      totalQuestions: questions.length,
    };
  }

  recommendGrade(score: number, thresholds: GradeThreshold[]): Grade {
    const sorted = [...thresholds].sort((a, b) => a.minScore - b.minScore);
    for (const t of sorted) {
      if (score >= t.minScore && score <= t.maxScore) return t.grade;
    }
    // fallback: nearest band
    if (sorted.length === 0) return Grade.INTERN;
    if (score < sorted[0].minScore) return sorted[0].grade;
    return sorted[sorted.length - 1].grade;
  }
}
