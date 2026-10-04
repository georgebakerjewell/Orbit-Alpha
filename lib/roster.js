// ─────────────────────────────────────────────────────────────────────────────
// THE single list of what Orbit Alpha covers. Used by the website, every API
// endpoint and the SEO build step. To add or remove a stock, edit this file only.
//
// Per stock:
//   name, sector, about  shown on the site and its stock page (sector drives the
//                        Markets filters and the sector summary on Performance)
//   shares               fallback share count, used only if Nasdaq's live market cap
//                        is unavailable (live figures are fetched automatically)
//   keywords             words that tag a news story to this stock
//   recipients           company names as they appear in US federal contract data
//   launch               (optional) pattern matching its launches or payloads
// ─────────────────────────────────────────────────────────────────────────────

export const COVERED = {
  SPCX: {
    name: "SpaceX", sector: "Launch", shares: 13572800000,
    about: "Operates Falcon 9, Falcon Heavy and Dragon, is developing Starship, and runs the Starlink broadband constellation. Listed on Nasdaq in June 2026.",
    keywords: ["SPCX", "SpaceX", "Starship", "Falcon", "Starlink"], // news matching (whole words)
    recipients: ["SPACE EXPLORATION TECHNOLOGIES"], // USAspending recipient names
    launch: "spacex|falcon|starship|starlink|dragon", // launch provider or payload pattern
  },
  RKLB: {
    name: "Rocket Lab", sector: "Launch", shares: 627800000,
    about: "Launch provider (Electron, with the larger Neutron in development) that also builds spacecraft and satellite components.",
    keywords: ["Rocket Lab", "RKLB", "Electron", "Neutron", "Peter Beck"], // news matching (whole words)
    recipients: ["ROCKET LAB", "GEOST"], // USAspending recipient names
    launch: "rocket lab|electron|neutron", // launch provider or payload pattern
  },
  ASTS: {
    name: "AST SpaceMobile", sector: "Satellite Comms", shares: 389200000,
    about: "Building a satellite network designed to provide cellular broadband directly to standard, unmodified mobile phones, in partnership with mobile network operators.",
    keywords: ["AST SpaceMobile", "ASTS", "BlueBird", "Abel Avellan"], // news matching (whole words)
    recipients: ["AST & SCIENCE"], // USAspending recipient names
    launch: "bluebird|ast spacemobile", // launch provider or payload pattern
  },
  GSAT: {
    name: "Globalstar", sector: "Satellite Comms", shares: 129600000,
    about: "Low Earth orbit satellite operator providing voice, data and IoT services, and the satellite partner behind Apple's emergency messaging. Agreed in 2026 to be acquired by Amazon.",
    keywords: ["Globalstar", "GSAT"], // news matching (whole words)
    recipients: ["GLOBALSTAR"], // USAspending recipient names
    launch: "globalstar", // launch provider or payload pattern
  },
  ECHO: {
    name: "EchoStar", sector: "Satellite Comms", shares: 290800000,
    about: "Satellite and connectivity company behind DISH satellite TV and Hughes satellite broadband.",
    keywords: ["EchoStar", "Hughes"], // news matching (whole words)
    recipients: ["HUGHES NETWORK SYSTEMS", "ECHOSTAR"], // USAspending recipient names
  },
  VSAT: {
    name: "Viasat", sector: "Satellite Comms", shares: 137800000,
    about: "Satellite broadband and communications provider for government, defence, aviation and maritime customers, including the Inmarsat fleet.",
    keywords: ["Viasat", "VSAT"], // news matching (whole words)
    recipients: ["VIASAT"], // USAspending recipient names
    launch: "viasat|inmarsat", // launch provider or payload pattern
  },
  PL: {
    name: "Planet Labs", sector: "Earth Observation", shares: 363800000,
    about: "Operates a large constellation of Earth-imaging satellites and sells imagery and analytics to government and commercial customers.",
    keywords: ["Planet Labs", "Pelican"], // news matching (whole words)
    recipients: ["PLANET LABS"], // USAspending recipient names
    launch: "planet labs|pelican|superdove|\\bflock\\b", // launch provider or payload pattern
  },
  MDA: {
    name: "MDA Space", sector: "Space Infrastructure", shares: 162100000,
    about: "Canadian space company building satellite systems, space robotics and geointelligence solutions.",
    keywords: ["MDA Space", "MDA Ltd"], // news matching (whole words)
    recipients: ["MDA US SYSTEMS", "MACDONALD DETTWILER", "MDA SPACE"], // USAspending recipient names
  },
  KRMN: {
    name: "Karman Space & Defense", sector: "Space Infrastructure", shares: 132500000,
    about: "Designs and manufactures engineered systems and subsystems for space launch, missile and defence programmes.",
    keywords: ["Karman", "KRMN"], // news matching (whole words)
    recipients: ["KARMAN SPACE", "KARMAN HOLDINGS", "SYSTIMA TECHNOLOGIES"], // USAspending recipient names
  },
  FLY: {
    name: "Firefly Aerospace", sector: "Launch", shares: 167400000,
    about: "Builds the Alpha launch vehicle, the Blue Ghost lunar lander and spacecraft for government and commercial missions.",
    keywords: ["Firefly Aerospace", "Alpha rocket"], // news matching (whole words)
    recipients: ["FIREFLY AEROSPACE"], // USAspending recipient names
    launch: "firefly|\\balpha\\b|blue ghost", // launch provider or payload pattern
  },
  LUNR: {
    name: "Intuitive Machines", sector: "Exploration", shares: 228900000,
    about: "Lunar exploration company providing Moon landers, lunar data relay and space infrastructure services, largely for NASA.",
    keywords: ["Intuitive Machines", "LUNR", "IM-3", "IM-4", "lunar lander"], // news matching (whole words)
    recipients: ["INTUITIVE MACHINES"], // USAspending recipient names
    launch: "intuitive machines|\\bIM-\\d", // launch provider or payload pattern
  },
  RDW: {
    name: "Redwire", sector: "Space Infrastructure", shares: 250000000,
    about: "Space infrastructure company making solar arrays, structures, sensors and in-space manufacturing systems, with a growing defence business.",
    keywords: ["Redwire", "RDW"], // news matching (whole words)
    recipients: ["REDWIRE"], // USAspending recipient names
  },
  VOYG: {
    name: "Voyager Technologies", sector: "Exploration", shares: 62000000,
    about: "Space and defence technology company developing the Starlab commercial space station with partners.",
    keywords: ["Voyager Technologies", "VOYG", "Starlab"], // news matching (whole words)
    recipients: ["VOYAGER TECHNOLOGIES", "VOYAGER SPACE", "NANORACKS"], // USAspending recipient names
    launch: "starlab", // launch provider or payload pattern
  },
  TSAT: {
    name: "Telesat", sector: "Satellite Comms", shares: 36200000,
    about: "Canadian satellite operator with a geostationary fleet, building the Lightspeed low Earth orbit broadband constellation.",
    keywords: ["Telesat", "TSAT", "Lightspeed"], // news matching (whole words)
    recipients: ["TELESAT"], // USAspending recipient names
    launch: "telesat|lightspeed", // launch provider or payload pattern
  },
  HAWK: {
    name: "HawkEye 360", sector: "Earth Observation", shares: 98000000,
    about: "Detects and geolocates radio-frequency signals from satellite clusters, providing signals intelligence to defence and government customers.",
    keywords: ["HawkEye 360", "SIGINT", "RF intelligence"], // news matching (whole words)
    recipients: ["HAWKEYE 360"], // USAspending recipient names
    launch: "hawkeye", // launch provider or payload pattern
  },
  YSS: {
    name: "York Space Systems", sector: "Space Infrastructure", shares: 137400000,
    about: "Manufactures standardised satellite platforms, with a large share of its work for US defence constellations.",
    keywords: ["York Space", "YSS"], // news matching (whole words)
    recipients: ["YORK SPACE SYSTEMS"], // USAspending recipient names
  },
  BKSY: {
    name: "BlackSky Technology", sector: "Earth Observation", shares: 40900000,
    about: "Provides rapid-revisit satellite imagery and geospatial intelligence, mainly to defence and intelligence customers.",
    keywords: ["BlackSky", "BKSY"], // news matching (whole words)
    recipients: ["BLACKSKY"], // USAspending recipient names
    launch: "blacksky|gen-3", // launch provider or payload pattern
  },
  SATL: {
    name: "Satellogic", sector: "Earth Observation", shares: 153700000,
    about: "Builds and operates high-resolution Earth observation satellites, selling imagery and dedicated satellite capacity.",
    keywords: ["Satellogic", "SATL"], // news matching (whole words)
    recipients: ["SATELLOGIC"], // USAspending recipient names
    launch: "satellogic|newsat", // launch provider or payload pattern
  },
  SPCE: {
    name: "Virgin Galactic", sector: "Exploration", shares: 151600000,
    about: "Suborbital human spaceflight company developing its next-generation Delta class spaceships for commercial service.",
    keywords: ["Virgin Galactic", "SPCE", "VSS"], // news matching (whole words)
    recipients: ["VIRGIN GALACTIC"], // USAspending recipient names
  },
  SPIR: {
    name: "Spire Global", sector: "Earth Observation", shares: 40600000,
    about: "Operates a constellation of small satellites providing space-based data, including weather and radio-frequency data, and space services.",
    keywords: ["Spire Global", "SPIR"], // news matching (whole words)
    recipients: ["SPIRE GLOBAL"], // USAspending recipient names
    launch: "spire|lemur", // launch provider or payload pattern
  },
  SIDU: {
    name: "Sidus Space", sector: "Space Infrastructure", shares: 101200000,
    about: "Builds the LizzieSat multi-mission satellite platform and provides space hardware manufacturing and data services.",
    keywords: ["Sidus Space", "SIDU", "LizzieSat"], // news matching (whole words)
    recipients: ["SIDUS SPACE"], // USAspending recipient names
    launch: "sidus|lizziesat", // launch provider or payload pattern
  },
  KULR: {
    name: "KULR Technology", sector: "Space Infrastructure", shares: 46300000,
    about: "Thermal management and battery safety technology for space, defence, drones and electric aviation.",
    keywords: ["KULR Technology", "KULR"], // news matching (whole words)
    recipients: ["KULR TECHNOLOGY"], // USAspending recipient names
  },
  MNTS: {
    name: "Momentus", sector: "Space Infrastructure", shares: 22000000,
    about: "In-space transportation and spacecraft services company offering orbital transfer and hosted payload services.",
    keywords: ["Momentus", "MNTS"], // news matching (whole words)
    recipients: ["MOMENTUS"], // USAspending recipient names
    launch: "momentus|vigoride", // launch provider or payload pattern
  },
};

export const ETFS = {
  UFO: { name: "Procure Space ETF", shares: 12600000 },
  ARKX: { name: "ARK Space ETF", shares: 23100000 },
  ROKT: { name: "SPDR Kensho Final Frontiers ETF", shares: 1700000 },
  MARS: { name: "Roundhill Space & Tech ETF", shares: 1800000 },
  NASA: { name: "Tema Space Innovators ETF", shares: 47600000 },
};

// Sector order for filters and the sector summary.
export const SECTOR_ORDER = ["Launch", "Satellite Comms", "Earth Observation", "Space Infrastructure", "Exploration"];

export const BENCHMARKS = { SPY: "S&P 500", QQQ: "Nasdaq 100" };

// Never covered, anywhere on Orbit Alpha.
export const EXCLUDED = ["LMT", "BA", "NOC", "OKLO", "GILT", "DXYZ"];

export const ROSTER = Object.keys(COVERED);
export const ETF_TICKERS = Object.keys(ETFS);
