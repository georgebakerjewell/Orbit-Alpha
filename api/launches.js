export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const response = await fetch('https://fdo.rocketlaunch.live/json/launches/next/10', {
      headers: { 'User-Agent': 'OrbitAlpha/1.0' }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
