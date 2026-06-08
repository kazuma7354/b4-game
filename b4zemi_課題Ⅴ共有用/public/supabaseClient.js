const supabaseUrl = window.env && window.env.SUPABASE_URL;
const supabaseKey = window.env && window.env.SUPABASE_ANON_KEY;
const mySupabase = supabase.createClient(supabaseUrl, supabaseKey);
if (!supabaseUrl || !supabaseKey) {
  throw new Error('SupabaseのURLまたはAPIキーが設定されていません。config.jsの読み込み順や内容を確認してください。');
}
window.mySupabase = supabase.createClient(supabaseUrl, supabaseKey);