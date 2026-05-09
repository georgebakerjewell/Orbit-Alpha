export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { ticker = 'RKLB' } = req.query;

  try {
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OrbitAlpha/1.0' }
    });
    const data = await response.json();
    const messages = data?.messages?.map(m => ({
      text: m.body,
      author: m.user.username,
      time: m.created_at,
      sentiment: m.entities?.sentiment?.basic || 'neutral',
      ticker,
    })) || [];
    res.status(200).json(messages);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
