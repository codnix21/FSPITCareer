import { Grade, QuestionType } from '@prisma/client';
import { ScoringService } from './scoring.service';

describe('ScoringService', () => {
  const service = new ScoringService();

  const thresholds = [
    { grade: Grade.INTERN, minScore: 0, maxScore: 49 },
    { grade: Grade.JUNIOR, minScore: 50, maxScore: 69 },
    { grade: Grade.MIDDLE, minScore: 70, maxScore: 84 },
    { grade: Grade.SENIOR, minScore: 85, maxScore: 100 },
  ];

  it('рекомендует grade по порогам', () => {
    expect(service.recommendGrade(100, thresholds)).toBe(Grade.SENIOR);
    expect(service.recommendGrade(90, thresholds)).toBe(Grade.SENIOR);
    expect(service.recommendGrade(82, thresholds)).toBe(Grade.MIDDLE);
    expect(service.recommendGrade(55, thresholds)).toBe(Grade.JUNIOR);
    expect(service.recommendGrade(40, thresholds)).toBe(Grade.INTERN);
    expect(service.recommendGrade(50, thresholds)).toBe(Grade.JUNIOR);
  });

  it('считает weighted score по секциям', () => {
    const questions = [
      { id: '1', skill: 'Python', type: QuestionType.SINGLE_CHOICE, correctOptionIndexes: [0], points: 1 },
      { id: '2', skill: 'Python', type: QuestionType.SINGLE_CHOICE, correctOptionIndexes: [1], points: 1 },
      { id: '3', skill: 'SQL', type: QuestionType.SINGLE_CHOICE, correctOptionIndexes: [0], points: 1 },
    ];
    const answers = new Map<string, number[]>([
      ['1', [0]],
      ['2', [0]], // wrong
      ['3', [0]],
    ]);
    const result = service.calculateWeightedScore({
      questions,
      sections: [
        { skill: 'Python', weight: 0.5 },
        { skill: 'SQL', weight: 0.5 },
      ],
      answersByQuestionId: answers,
    });
    // Python 50%, SQL 100% → overall 75
    expect(result.score).toBe(75);
    expect(result.sectionScores.Python).toBe(50);
    expect(result.sectionScores.SQL).toBe(100);
    expect(result.correctAnswers).toBe(2);
  });

  it('100% даёт max score', () => {
    const questions = [
      { id: '1', skill: 'Python', type: QuestionType.SINGLE_CHOICE, correctOptionIndexes: [2], points: 1 },
    ];
    const result = service.calculateWeightedScore({
      questions,
      sections: [{ skill: 'Python', weight: 1 }],
      answersByQuestionId: new Map([['1', [2]]]),
    });
    expect(result.score).toBe(100);
    expect(service.recommendGrade(result.score, thresholds)).toBe(Grade.SENIOR);
  });
});
