// ÖSYM Rusça YDS çıkmış soruları (osym_raw/parse_osym.py ile resmî PDF'lerden üretildi).
// Kişisel kullanım içindir; yayımlanacaksa bu klasör ve import'u kaldırılmalı.
import y16s from './yds_2016_sonbahar.json';
import y17i from './yds_2017_ilkbahar.json';
import y17s from './yds_2017_sonbahar.json';
import y18s from './yds_2018_sonbahar.json';
import y19 from './yds_2019_1.json';
import y20 from './yds_2020.json';
import y21a from './yds_2021_1.json';
import y21b from './yds_2021_2.json';

export type OsymQ = { topic: string; text: string; options: string[]; answer: number; passage?: string; exam: string; no: number };

// En yeni sınav önce listelensin
export const osymQuestions: OsymQ[] = [y21b, y21a, y20, y19, y18s, y17s, y17i, y16s].flat() as OsymQ[];
