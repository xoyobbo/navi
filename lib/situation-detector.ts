export type UserSituation =
  | "new_life"
  | "hobby_reading"
  | "fitness"
  | "home_upgrade"
  | "tech_lover"
  | "fashion"
  | "unknown";

export interface SituationResult {
  situation: UserSituation;
  confidence: number;
  recommendKeywords: string[];
  sectionTitle: string;
  sectionDescription: string;
}

const SITUATION_PATTERNS: Record<
  UserSituation,
  {
    keywords: string[];
    recommendKeywords: string[];
    title: string;
    description: string;
  }
> = {
  new_life: {
    keywords: [
      "冷蔵庫", "洗濯機", "電子レンジ",
      "掃除機", "炊飯器", "一人暮らし",
      "引越し", "家具", "ベッド", "机",
    ],
    recommendKeywords: [
      "一人暮らし 家電セット",
      "新生活 必需品",
      "コンパクト 家電",
    ],
    title: "新生活の準備、進んでますか？",
    description:
      "最近の検索から、新生活の準備をされているようですね。必要なものをまとめてご提案します。",
  },
  hobby_reading: {
    keywords: [
      "本", "小説", "ビジネス書",
      "漫画", "参考書", "kindle",
      "電子書籍", "ブックカバー",
    ],
    recommendKeywords: [
      "おすすめ小説",
      "ビジネス書 ベストセラー",
      "読書 グッズ",
    ],
    title: "読書好きさんへのおすすめ",
    description:
      "この本を読んだ人が次に読んでいる本もご紹介します。",
  },
  fitness: {
    keywords: [
      "ダンベル", "プロテイン", "ヨガマット",
      "ランニング", "スポーツ", "トレーニング",
      "筋トレ", "ジム", "スニーカー",
    ],
    recommendKeywords: [
      "筋トレ グッズ",
      "プロテイン おすすめ",
      "ホームジム 器具",
    ],
    title: "トレーニングライフを充実させよう",
    description:
      "あなたの目標達成をサポートするアイテムを集めました。",
  },
  home_upgrade: {
    keywords: [
      "収納", "インテリア", "照明",
      "カーテン", "ラグ", "観葉植物",
      "空気清浄機", "加湿器", "アロマ",
    ],
    recommendKeywords: [
      "部屋 おしゃれ インテリア",
      "収納 便利グッズ",
      "お部屋 リラックス",
    ],
    title: "お部屋をもっと好きな空間に",
    description:
      "インテリア好きさんにぴったりのアイテムを厳選しました。",
  },
  tech_lover: {
    keywords: [
      "イヤホン", "スマホ", "PC",
      "ガジェット", "充電器", "カメラ",
      "キーボード", "マウス", "モニター",
    ],
    recommendKeywords: [
      "最新 ガジェット",
      "便利 スマホ周辺機器",
      "テレワーク グッズ",
    ],
    title: "ガジェット好きさんへ",
    description:
      "最新テックアイテムをチェックしてみませんか？",
  },
  fashion: {
    keywords: [
      "服", "コーデ", "ファッション",
      "バッグ", "靴", "アクセサリー",
      "ブランド", "コート", "ジャケット",
    ],
    recommendKeywords: [
      "トレンド ファッション",
      "コーデ おすすめ",
      "人気 ブランド",
    ],
    title: "今季のトレンドをチェック",
    description:
      "あなたのスタイルに合いそうなアイテムを集めました。",
  },
  unknown: {
    keywords: [],
    recommendKeywords: ["人気商品"],
    title: "今週の注目アイテム",
    description: "人気の商品をご紹介します。",
  },
};

export function detectSituation(searchHistory: string[]): SituationResult {
  const scores: Record<UserSituation, number> = {
    new_life: 0,
    hobby_reading: 0,
    fitness: 0,
    home_upgrade: 0,
    tech_lover: 0,
    fashion: 0,
    unknown: 0,
  };

  searchHistory.forEach((query) => {
    const q = query.toLowerCase();
    Object.entries(SITUATION_PATTERNS).forEach(([situation, pattern]) => {
      pattern.keywords.forEach((kw) => {
        if (q.includes(kw.toLowerCase())) {
          scores[situation as UserSituation] += 1;
        }
      });
    });
  });

  const topSituation = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  const situation =
    topSituation[1] > 0 ? (topSituation[0] as UserSituation) : "unknown";

  const pattern = SITUATION_PATTERNS[situation];

  return {
    situation,
    confidence: Math.min(topSituation[1] / 5, 1),
    recommendKeywords: pattern.recommendKeywords,
    sectionTitle: pattern.title,
    sectionDescription: pattern.description,
  };
}
