import { create } from 'zustand';

export interface Option {
  text: string;
  weights: Record<string, number>;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  dimension?: string;
  type?: string;
  semanticTags?: string[];
}

interface PersonalitySessionState {
  isActive: boolean;
  questions: readonly Question[];
  currentIndex: number;
  answers: Record<string, number>;
  dimensionScores: Record<string, number>;
  sessionFingerprint: string | null;
  queueHash: string | null;
  renderedQuestionIds: string[];
  renderedSemanticTags: string[];
  consecutiveSkipCount: number;
  
  startSession: (questions: Question[], sessionFingerprint: string) => void;
  answerQuestion: (questionId: string, optionIndex: number, optionScores: Record<string, number>) => void;
  nextQuestion: () => void;
  endSession: () => void;
  markQuestionAsRendered: (questionId: string, tags?: string[]) => void;
  incrementSkipCount: () => void;
  resetSkipCount: () => void;
  rebuildQueue: () => void;
}

const usePersonalitySessionStore = create<PersonalitySessionState>((set, get) => ({
  isActive: false,
  questions: [],
  currentIndex: 0,
  answers: {},
  dimensionScores: {},
  sessionFingerprint: null,
  queueHash: null,
  renderedQuestionIds: [],
  renderedSemanticTags: [],
  consecutiveSkipCount: 0,

  startSession: (rawQuestions: Question[], sessionFingerprint: string) => {
    // Strict deduplication using Set
    const seenIds = new Set<string>();
    const uniqueQuestions: Question[] = [];
    
    for (const q of rawQuestions) {
      if (!seenIds.has(q.id)) {
        seenIds.add(q.id);
        uniqueQuestions.push(q);
      }
    }

    // Compute queue hash
    const queueHash = uniqueQuestions.map(q => q.id).join('-');

    // Deep freeze questions
    const frozenQuestions = Object.freeze(
      uniqueQuestions.map(q => {
        const frozenOptions = Object.freeze(q.options.map(opt => Object.freeze({ ...opt })));
        return Object.freeze({
          ...q,
          options: frozenOptions as unknown as Option[]
        });
      })
    );

    set({
      isActive: true,
      questions: frozenQuestions,
      currentIndex: 0,
      answers: {},
      dimensionScores: {},
      sessionFingerprint,
      queueHash,
      renderedQuestionIds: [],
      renderedSemanticTags: [],
      consecutiveSkipCount: 0
    });
  },

  answerQuestion: (questionId: string, optionIndex: number, optionScores: Record<string, number>) => {
    set((state) => {
      const newAnswers = { ...state.answers, [questionId]: optionIndex };
      const newScores = { ...state.dimensionScores };

      if (optionScores) {
        for (const [dim, weight] of Object.entries(optionScores)) {
          newScores[dim] = (newScores[dim] || 0) + weight;
        }
      }

      return {
        answers: newAnswers,
        dimensionScores: newScores
      };
    });
  },

  nextQuestion: () => {
    set((state) => ({
      currentIndex: state.currentIndex + 1
    }));
  },

  endSession: () => {
    set({
      isActive: false,
      questions: [],
      currentIndex: 0,
      answers: {},
      dimensionScores: {},
      sessionFingerprint: null,
      queueHash: null,
      renderedQuestionIds: [],
      renderedSemanticTags: [],
      consecutiveSkipCount: 0
    });
  },

  markQuestionAsRendered: (questionId: string, tags?: string[]) => {
    set((state) => {
      const newIds = [...state.renderedQuestionIds];
      if (!newIds.includes(questionId)) {
        newIds.push(questionId);
      }

      const newTags = [...state.renderedSemanticTags];
      if (tags) {
        tags.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
      }

      return {
        renderedQuestionIds: newIds,
        renderedSemanticTags: newTags,
        consecutiveSkipCount: 0 // Reset consecutive skip count upon successful render mark
      };
    });
  },

  incrementSkipCount: () => {
    set((state) => ({
      consecutiveSkipCount: state.consecutiveSkipCount + 1
    }));
  },

  resetSkipCount: () => {
    set({ consecutiveSkipCount: 0 });
  },

  rebuildQueue: () => {
    set((state) => {
      // Find remaining questions starting from currentIndex
      const remaining = state.questions.slice(state.currentIndex);
      
      // Filter out any duplicate IDs
      const filtered = remaining.filter(q => !state.renderedQuestionIds.includes(q.id));
      
      // Rebuild queue: keep already-processed ones, append filtered remaining ones
      const newQuestions = [
        ...state.questions.slice(0, state.currentIndex),
        ...filtered
      ];

      // Deep freeze the new list
      const frozenQuestions = Object.freeze(
        newQuestions.map(q => {
          const frozenOptions = Object.freeze(q.options.map(opt => Object.freeze({ ...opt })));
          return Object.freeze({
            ...q,
            options: frozenOptions as unknown as Option[]
          });
        })
      );

      // Recalculate queueHash
      const queueHash = frozenQuestions.map(q => q.id).join('-');



      return {
        questions: frozenQuestions,
        queueHash,
        consecutiveSkipCount: 0
      };
    });
  }
}));

export default usePersonalitySessionStore;
