import type { Question } from '../data/questions';
import type { Draft } from '../exam';

// full: 80 soruluk tam sınav; sonuçta puan (doğru × 1,25) gösterilir. Mini denemelerde yalnızca doğru/yanlış.
export type Session = { title: string; qs: Question[]; minutes?: number; exam?: boolean; keepOrder?: boolean; inOrder?: boolean; full?: boolean; draft?: Draft };
export type Start = (s: Session) => void;
