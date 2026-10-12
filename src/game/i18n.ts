import type { Lang } from './save.ts';
import { useSave } from './store.ts';

const en = {
  tagline: 'Fold. Punch. Unfold.',
  pitch: 'Watch the paper fold, see where it gets punched, then picture it opened flat.',
  daily: 'Daily Challenge',
  dailyBlurb: 'Five puzzles. Same for everyone. Once a day.',
  dailyDone: 'Done for today',
  dailyResume: 'Continue',
  practice: 'Free play',
  play: 'Play',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  easyBlurb: '1–2 folds · 1 punch',
  mediumBlurb: '2–3 folds · diagonals',
  hardBlurb: '3–4 folds · 2–3 punches',
  accuracy: 'Accuracy',
  streak: 'Streak',
  bestStreak: 'Best streak',
  score: 'Score',
  played: 'Played',
  avgTime: 'Avg. time',
  bestTime: 'Best time',
  dayStreak: 'Day streak',
  question: 'Which sheet do you get when it is unfolded?',
  replay: 'Replay',
  flat: 'Start',
  fold: 'Fold',
  punch: 'Punch',
  correct: 'Correct!',
  wrong: 'Not quite',
  answerWas: 'The answer was {letter}',
  next: 'Next puzzle',
  seeResults: 'See results',
  back: 'Back',
  home: 'Home',
  howTo: 'How to play',
  howTo1Title: 'Fold',
  howTo1: 'A square sheet is folded a few times. The dashed line is the crease; the arrow shows which way the flap goes.',
  howTo2Title: 'Punch',
  howTo2: 'A hole is punched straight through every layer of the folded paper.',
  howTo3Title: 'Unfold',
  howTo3: 'Pick the sheet that shows where every hole ends up once the paper is opened flat again.',
  howToTip: 'Tap any step under the paper to look at it again. On a keyboard, press 1–4 to answer and Enter for the next puzzle.',
  gotIt: 'Got it',
  stats: 'Statistics',
  settings: 'Settings',
  language: 'Language',
  theme: 'Appearance',
  themeSystem: 'Auto',
  themeLight: 'Light',
  themeDark: 'Dark',
  grid: 'Grid lines',
  on: 'On',
  off: 'Off',
  reset: 'Reset progress',
  resetConfirm: 'Erase all scores and streaks on this device?',
  resetDone: 'Progress erased',
  close: 'Close',
  dailyTitle: 'Daily #{n}',
  resultTitle: '{n} of {total} correct',
  totalTime: 'Total time',
  share: 'Share result',
  copied: 'Copied to clipboard',
  shareFailed: 'Could not share',
  nextDaily: 'Next challenge in',
  keepPlaying: 'Keep playing',
  noStats: 'No puzzles played yet.',
  optionLabel: 'Option {letter}',
  stepLabel: 'Show step {n}',
  points: '+{n} pts',
  offlineReady: 'Works offline',
} as const;

export type MessageKey = keyof typeof en;

const zhTW: Record<MessageKey, string> = {
  tagline: 'Fold. Punch. Unfold.',
  pitch: '看紙張怎麼摺、在哪裡打洞，然後在腦中把它攤開。',
  daily: '每日挑戰',
  dailyBlurb: '每天五題，所有人題目相同，只能挑戰一次。',
  dailyDone: '今日已完成',
  dailyResume: '繼續挑戰',
  practice: '自由練習',
  play: '開始',
  easy: '簡單',
  medium: '中等',
  hard: '困難',
  easyBlurb: '摺 1–2 次 · 打 1 個洞',
  mediumBlurb: '摺 2–3 次 · 含斜摺',
  hardBlurb: '摺 3–4 次 · 打 2–3 個洞',
  accuracy: '答對率',
  streak: '連勝',
  bestStreak: '最佳連勝',
  score: '分數',
  played: '已玩',
  avgTime: '平均時間',
  bestTime: '最快',
  dayStreak: '連續天數',
  question: '紙張完全展開後，會是哪一張？',
  replay: '重播',
  flat: '開始',
  fold: '摺',
  punch: '打洞',
  correct: '答對了！',
  wrong: '差一點',
  answerWas: '正確答案是 {letter}',
  next: '下一題',
  seeResults: '看結果',
  back: '返回',
  home: '首頁',
  howTo: '玩法說明',
  howTo1Title: '摺',
  howTo1: '一張正方形的紙會被摺幾次。虛線是摺線，箭頭表示紙往哪邊摺過去。',
  howTo2Title: '打洞',
  howTo2: '打洞器會一次穿透摺好的每一層紙。',
  howTo3Title: '展開',
  howTo3: '想像紙張完全攤平後所有洞的位置，選出正確的那一張。',
  howToTip: '點紙張下方的步驟縮圖可以再看一次。鍵盤可按 1–4 作答，Enter 到下一題。',
  gotIt: '知道了',
  stats: '成績統計',
  settings: '設定',
  language: '語言',
  theme: '外觀',
  themeSystem: '自動',
  themeLight: '淺色',
  themeDark: '深色',
  grid: '格線',
  on: '開',
  off: '關',
  reset: '重設紀錄',
  resetConfirm: '確定要清除這台裝置上的所有分數與連勝紀錄嗎？',
  resetDone: '紀錄已清除',
  close: '關閉',
  dailyTitle: '每日挑戰 #{n}',
  resultTitle: '答對 {n} / {total} 題',
  totalTime: '總時間',
  share: '分享成績',
  copied: '已複製到剪貼簿',
  shareFailed: '無法分享',
  nextDaily: '下一次挑戰倒數',
  keepPlaying: '繼續練習',
  noStats: '還沒有任何紀錄。',
  optionLabel: '選項 {letter}',
  stepLabel: '查看步驟 {n}',
  points: '+{n} 分',
  offlineReady: '可離線遊玩',
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, 'zh-TW': zhTW };

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'zh-TW', label: '繁體中文' },
  { id: 'en', label: 'English' },
];

export function detectLang(): Lang {
  const preferred = typeof navigator === 'undefined' ? 'en' : navigator.language;
  return preferred.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en';
}

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translator(lang: Lang): Translate {
  return (key, vars) =>
    MESSAGES[lang][key].replace(/\{(\w+)\}/g, (match, name: string) => String(vars?.[name] ?? match));
}

export function useLang(): Lang {
  return useSave().settings.lang ?? detectLang();
}

export function useT(): Translate {
  return translator(useLang());
}
