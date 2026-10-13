// ÖSYM Rusça YDS çıkmış soruları. Telifli oldukları için depoda yer almaz; bu sürüm boş liste döner.
// Yerel kopyada sorular osym_raw/parse_osym.py ile resmî PDF'lerden üretilip bu klasöre JSON olarak konur
// ve bu dosya onları içe aktaracak şekilde değiştirilir (git update-index --skip-worktree ile depoya gitmez).
export type OsymQ = { topic: string; text: string; options: string[]; answer: number; passage?: string; exam: string; no: number };

export const osymQuestions: OsymQ[] = [];
