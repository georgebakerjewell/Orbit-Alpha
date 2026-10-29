// Which headlines are worth showing in the news feed.
// A story is shown only if it is not noise (low-information sources, commentary, law-firm adverts,
// quote pages, holdings filings) AND its headline describes a concrete event.
// Used by the /news page, the home page headlines and stock pages (src/App.jsx).
// Test: node scripts/test-newsfilter.mjs <file.json>

// Outlets that mostly publish auto-generated, promotional or opinion pieces.
export const LOW_QUALITY_SOURCES = /motley fool|fool\.com|investorplace|marketbeat|simply wall st|insider monkey|24\/7 wall st|ainvest|zacks|gurufocus|seeking alpha|stocktwits|the street pro|trefis|stockstory|tikr|ad-hoc-news|kalkine|stock traders daily|stock titan|tipranks|pluang|biggo|fxleaders|quiver quant|benzinga pro|ipo-edge|shattered\.io|etf daily news|defense world|investorsobserver|finbold/i;

// Headline patterns that are never news.
const NOISE = [
  // Companies the site never covers
  /boeing|lockheed|northrop|\boklo\b|gilat|destiny tech/i,
  /\b(LMT|BA|NOC|OKLO|GILT|DXYZ)\b/,
  // Headlines asking a question (except "why" explainers of a real move)
  /^(can|will|does|do|should|is|are|has|have|could) /i,
  // Quote and data pages
  /stock price,? news,? quote|stock forecasts?\b|financial trading report|META_TITLE|\(\w+\) stock price\b/i,
  // Law-firm class-action adverts
  /class action|shareholder alert|investor alert|investors? (with|who) (losses|lost)|lost money on|lead plaintiff|deadline (alert|reminder)?|securities (fraud|lawsuit|litigation)|levi & korsinsky|kahn swick|bragar|rosen law|pomerantz|portnoy|faruqi|glancy|bronstein|schall law|gross law|robbins geller|on behalf of (investors|shareholders)/i,
  // Calendar notices and earnings previews (the earnings calendar covers these)
  /schedules .*(call|results|webcast)|results will be released|conference call|to (report|announce|release) .*(results|earnings)|projected to post|beat estimates again|may report negative|earnings expected to|know the trend|earnings preview|what to expect|earnings call highlights/i,
  // Opinion, valuation and "should you buy" pieces
  /should you (buy|sell)|time to (buy|sell)|is it time|is .* a buy|a buy\b|bargain|cheap enough|overvalued|undervalued|fair value|valuation|how much downside|\bupside\b|could rally|potential to rally|how to trade|what's next|here's what happened|what you need to know|could be worth|invested in|investment in .* could|stocks? poised|types of investors|find a bottom|how will .* react|biggest risk|reason to buy|prediction|won.?t stop buying|might be|could mean|which (\w+ )?stock|\bvs\.? |more attractive|load up|what .* means for|bull case|bear case|fresh attention|deserve attention|deliver evidence|turning strategy|rating upgrade\)|here's who|my top/i,
  // Trading chatter, holdings and ownership filings
  /whale activity|options? (activity|buying)|call option|average (price )?target|analysts offer insights|net (sellers|buyers)|passive stake|stake (in|takes)|position in|ownership of|highest volume|what .* (sold|bought)|overnight|retail (sentiment|investors|traders|is|still)|shares (up|down) \d|stock (jumps|up|down|falls|rises|slips|climbs|dips) \d+(\.\d+)?% ?[-:]/i,
];

// Words that mark a concrete event: deals, contracts, results, launches, regulation, people, financing, sharp moves.
const EVENT = /contract|award|earnings|results|revenue|guidance|\bq[1-4]\b|quarter|launch|acquir|acquisition|merger|\bmerg|offering|raises|priced|\bipo\b|lawsuit|legal challenge|investigation|\bprobe\b|delay|scrub|anomaly|failure|explosion|selects|\bwins\b|\bwon\b|signs|signed|\bdeal\b|agreement|partner|\bmou\b|memorandum|approv|\bfcc\b|\bfaa\b|nasa|space force|pentagon|\border\b|backlog|upgrade|downgrade|initiat|price target|appoint|\bceo\b|\bcfo\b|steps down|resign|layoff|\bships\b|unveil|arrives|\btests?\b|test flight|hot-fire|milestone|spectrum|licen[cs]e|lock-?up|unlock|index|s&p 500|added to|financing|loan|\bleas(e|es|ing)\b|debt|notes due|funding|invests?\b|capacity|facility|rejects?|sues|ruling|court|why .*(stock|shares)|surg|soar|plung|slump|tumbl|jump|slide|falls|\brises?\b|climbs|\bdrops?\b|\bsinks?\b|return to flight|resume|rall(y|ies)|record/i;

// Seeking Alpha's own news desk ("... (RKLB:NASDAQ)") is reporting; its contributor pieces ("(NASDAQ:RKLB)") are opinion.
const SA_NEWS = /\([A-Z.]+:(NASDAQ|NYSE)\)\s*$/;
const lowQualitySource = (item) => LOW_QUALITY_SOURCES.test(item.source || "") && !(/seeking alpha/i.test(item.source || "") && SA_NEWS.test(item.title || ""));

export const isNoise = (item) => lowQualitySource(item) || NOISE.some((re) => re.test(item.title || ""));
export const isNewsworthy = (item) => !isNoise(item) && EVENT.test(item.title || "");
