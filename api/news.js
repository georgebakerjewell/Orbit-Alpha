export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticker } = req.query;

  const GOOGLE_QUERIES = ticker ? [
    { q: `${ticker} stock` },
  ] : [
    { q: 'Rocket Lab RKLB stock' },
    { q: 'AST SpaceMobile ASTS stock' },
    { q: 'Intuitive Machines LUNR stock' },
    { q: 'Planet Labs PL stock' },
    { q: 'BlackSky Technology BKSY stock' },
    { q: 'Redwire RDW stock' },
    { q: 'Momentus MNTS stock' },
    { q: 'Virgin Galactic SPCE stock' },
    { q: 'Karman Space KRMN stock' },
    { q: 'Satellogic SATL stock' },
    { q: 'KULR Technology stock' },
    { q: 'Telesat TSAT stock' },
    { q: 'Globalstar GSAT stock' },
    { q: 'Viasat VSAT stock' },
    { q: 'MDA Space stock' },
    { q: 'Spire Global SPIR stock' },
    { q: 'Destiny Tech DXYZ stock' },
    { q: 'Lockheed Martin LMT space' },
    { q: 'Firefly Aerospace FLY stock' },
    { q: 'Oklo OKLO stock' },
    { q: 'Boeing BA space' },
    { q: 'Northrop Grumman NOC space' },
    { q: 'RTX Raytheon space' },
    { q: 'SpaceX IPO 2026' },
    { q: 'Blue Origin New Glenn' },
    { q: 'Relativity Space Terran' },
    { q: 'Vast Space Haven' },
    { q: 'ispace HAKUTO lunar' },
    { q: 'NASA commercial space contract' },
    { q: 'ESA European Space Agency' },
    { q: 'ISRO India space' },
    { q: 'US Space Force USSF' },
    { q: 'UFO ARKX space ETF' },
  ];

  const RSS_FEEDS = [
    { url: 'https://spacenews.com/feed/?posts_per_page=30', source: 'SpaceNews' },
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', source: 'NASA' },
    { url: 'https://www.space.com/feeds/all', source: 'Space.com' },
  ];

  const HIGH_SIGNAL_KEYWORDS = [
    'contract', 'IPO', 'earnings', 'revenue', 'quarterly', 'analyst',
    'price target', 'upgrade', 'downgrade', 'acquisition', 'partnership',
    'raises', 'secures', 'wins', 'billion', 'guidance', 'beat', 'miss',
    'record', 'award', 'FCC', 'regulatory', 'launch success', 'launch failure',
  ];

  const EXCLUDE_KEYWORDS = [
    'Star Wars', 'Star Trek', 'sci-fi', 'science fiction', 'movie', 'film',
    'Lego', 'toy', 'video game', 'skywatching', 'meteor shower', 'eclipse',
    'astrophotography', 'horoscope', 'zodiac', 'astrology', 'thriller',
    'best photos', 'flower moon', 'stormtroopers',
  ];

  const RELEVANT_KEYWORDS = [
    'Rocket Lab', 'AST SpaceMobile', 'Intuitive Machines', 'Planet Labs',
    'BlackSky', 'Redwire', 'Momentus', 'Virgin Galactic', 'Karman',
    'Spire Global', 'Lockheed Martin', 'Northrop Grumman', 'Globalstar', 'Viasat',
    'SpaceX', 'Blue Origin', 'Relativity Space', 'Vast Space', 'Firefly',
    'Sierra Space', 'Axiom', 'ispace', 'Astrobotic', 'ULA', 'Arianespace',
    'ISRO', 'ESA', 'JAXA', 'NASA', 'Space Force', 'MDA Space', 'Oklo',
    'Telesat', 'Satellogic', 'KULR', 'Destiny Tech', 'Boeing space',
    'satellite launch', 'rocket launch', 'orbital', 'lunar', 'moon landing',
    'Starlink', 'Starship', 'Falcon', 'Electron', 'Neutron', 'New Glenn',
    'space station', 'ISS', 'Artemis', 'NASA contract', 'space contract',
    'LEO', 'constellation', 'satellite broadband', 'direct-to-device',
    'space economy', 'space IPO', 'commercial space', 'space defense',
    'reusable rocket', 'BlueBird', 'RKLB', 'ASTS', 'LUNR',
  ];
