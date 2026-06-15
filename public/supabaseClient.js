import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://jmrwaizhkdgwavmyapzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcndhaXpoa2Rnd2F2bXlhcHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDAzNTQsImV4cCI6MjA5NjQ3NjM1NH0.lzR9CLYijTjDK582ApxIMw7Qp02tOnlWt6WG4BK5rFo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function normalizeScoreRow(row) {
  return {
    name: row.name || row.player_name || row.playerName || row.user_name || row.username || '',
    score: Number(row.score ?? row.best_score ?? row.bestScore ?? row.points ?? 0),
  };
}

export async function saveScoreToSupabase(name, level, score) {
  console.log('saveScoreToSupabase', { name, level, score });
  const { data, error } = await supabase
    .from('game_scores')
    .insert([
      {
        player_name: name,
        level,
        score,
        source: 'browser',
      }
    ]);

  if (error) {
    console.warn('Supabase score save failed:', error);
    throw error;
  }
  console.log('Supabase insert succeeded:', data);
  return data;
}

export async function fetchTopScoresByLevel(level) {
  const { data, error } = await supabase
    .rpc('get_best_scores_by_level', { p_level: level });

  if (error) {
    console.warn('Supabase fetch failed:', error.message);
    return [];
  }
  if (!data) return [];
  return data.map(normalizeScoreRow);
}

export async function fetchTopScoresForAllLevels() {
  const levels = [1, 2, 3];
  const result = {};

  await Promise.all(levels.map(async (level) => {
    result[level] = await fetchTopScoresByLevel(level);
  }));

  return result;
}
