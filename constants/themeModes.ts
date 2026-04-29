export interface ThemeMode {
  id: 'sakin' | 'sicak' | 'okyanus' | 'gunbatimi';
  name: string;
  colors: {
    background: [string, string, ...string[]];
    card: string;
    cardBorder: string;
    primary: string;
    secondary: string;
    accent: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    glow: string;
    tabBar: {
      background: string;
      active: string;
      inactive: string;
      border: string;
    };
    button: {
      primary: string;
      secondary: string;
      text: string;
    };
    mascot: {
      start: string;
      end: string;
      glow: string;
    };
    input: {
      background: string;
      border: string;
      text: string;
      placeholder: string;
    };
  };
}

export const themeModes: Record<string, ThemeMode> = {
  sakin: {
    id: 'sakin',
    name: 'Sakin 🌙',
    colors: {
      background: ['#1A1C2E', '#2D2F4A'], // Deepened and desaturated
      card: 'rgba(45, 47, 74, 0.4)',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      primary: '#94A3B8', // Soft steel blue
      secondary: '#818CF8',
      accent: '#818CF8',
      text: {
        primary: '#FFFFFF',
        secondary: '#CBD5E1',
        muted: 'rgba(255, 255, 255, 0.4)',
      },
      glow: 'rgba(129, 140, 248, 0.15)',
      tabBar: {
        background: '#1A1C2E',
        active: '#818CF8',
        inactive: '#64748B',
        border: 'rgba(255, 255, 255, 0.05)',
      },
      button: {
        primary: '#818CF8',
        secondary: '#6366F1',
        text: '#FFFFFF',
      },
      mascot: {
        start: '#818CF8',
        end: '#6366F1',
        glow: '#818CF8',
      },
      input: {
        background: 'rgba(30, 41, 59, 0.4)',
        border: 'rgba(255, 255, 255, 0.1)',
        text: '#FFFFFF',
        placeholder: 'rgba(255, 255, 255, 0.3)',
      },
    },
  },
  sicak: {
    id: 'sicak',
    name: 'Sıcak ✨',
    colors: {
      background: ['#2D1B2E', '#4A2D3C'], // Softened warm tones
      card: 'rgba(74, 45, 60, 0.4)',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      primary: '#F472B6',
      secondary: '#FB7185',
      accent: '#FB7185',
      text: {
        primary: '#FFFFFF',
        secondary: '#FECDD3',
        muted: 'rgba(255, 255, 255, 0.3)',
      },
      glow: 'rgba(244, 114, 182, 0.12)',
      tabBar: {
        background: '#2D1B2E',
        active: '#F472B6',
        inactive: '#9F1239',
        border: 'rgba(255, 255, 255, 0.05)',
      },
      button: {
        primary: '#F472B6',
        secondary: '#FB7185',
        text: '#FFFFFF',
      },
      mascot: {
        start: '#FB7185',
        end: '#F472B6',
        glow: '#F472B6',
      },
      input: {
        background: 'rgba(74, 45, 60, 0.4)',
        border: 'rgba(255, 255, 255, 0.1)',
        text: '#FFFFFF',
        placeholder: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
  okyanus: {
    id: 'okyanus',
    name: 'Okyanus 🌊',
    colors: {
      background: ['#0C1621', '#1A2A3A'], // Deep, calm navy-teal
      card: 'rgba(26, 42, 58, 0.4)',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      primary: '#48C6EF',
      secondary: '#6F86D6',
      accent: '#00D2FF',
      text: {
        primary: '#FFFFFF',
        secondary: '#E0F2F1',
        muted: 'rgba(255, 255, 255, 0.3)',
      },
      glow: 'rgba(72, 198, 239, 0.12)',
      tabBar: {
        background: '#0C1621',
        active: '#48C6EF',
        inactive: '#334155',
        border: 'rgba(255, 255, 255, 0.05)',
      },
      button: {
        primary: '#48C6EF',
        secondary: '#6F86D6',
        text: '#0C1621',
      },
      mascot: {
        start: '#6F86D6',
        end: '#48C6EF',
        glow: '#48C6EF',
      },
      input: {
        background: 'rgba(26, 42, 58, 0.4)',
        border: 'rgba(255, 255, 255, 0.1)',
        text: '#FFFFFF',
        placeholder: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
  gunbatimi: {
    id: 'gunbatimi',
    name: 'Gün Batımı 🌅',
    colors: {
      background: ['#3D242D', '#5E3845'], // Muted peach-rose sunset
      card: 'rgba(94, 56, 69, 0.4)',
      cardBorder: 'rgba(255, 255, 255, 0.1)',
      primary: '#FB923C', // Soft peach
      secondary: '#F472B6',
      accent: '#F472B6',
      text: {
        primary: '#FFFFFF',
        secondary: '#FFD1D1',
        muted: 'rgba(255, 255, 255, 0.3)',
      },
      glow: 'rgba(251, 146, 60, 0.12)',
      tabBar: {
        background: '#3D242D',
        active: '#FB923C',
        inactive: '#881337',
        border: 'rgba(255, 255, 255, 0.05)',
      },
      button: {
        primary: '#FB923C',
        secondary: '#F472B6',
        text: '#3D242D',
      },
      mascot: {
        start: '#F472B6',
        end: '#FB923C',
        glow: '#FB923C',
      },
      input: {
        background: 'rgba(94, 56, 69, 0.4)',
        border: 'rgba(255, 255, 255, 0.1)',
        text: '#FFFFFF',
        placeholder: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
};
