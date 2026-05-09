export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { sub = 'spaceinvesting', limit = 10 } = req.query;

  try {
    const url = `https://www.reddit.com/r/${sub}/new.json?limit=${limit}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OrbitAlpha/1.0' }
    });
    const data = await response.json();
    const posts = data?.data?.children?.map(p => ({
      title: p.data.title,
      author: p.data.author,
      upvotes: p.data.ups,
      comments: p.data.num_comments,
      url: `https://reddit.com${p.data.permalink}`,
      time: p.data.created_utc,
      flair: p.data.link_flair_text,
      sub: p.data.subreddit,
    })) || [];
    res.status(200).json(posts);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
