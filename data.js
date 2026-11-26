// Prototype data. Store details, times and ratings are sample content from the Figma designs,
// with small variations so sorting and filtering have something to show.
window.CC_DATA = (() => {
  const SERVICES = [
    { id: "measure", label: "In-home measure" },
    { id: "install", label: "Installation" },
    { id: "blinds", label: "Blinds & curtains" },
    { id: "trade", label: "Trade" },
    { id: "commercial", label: "Commercial" },
  ];
  const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];
  const WEEKENDS = [
    { id: "sat", label: "Open Saturday" },
    { id: "sun", label: "Open Sunday" },
  ];
  const SORTS = [
    { id: "nearest", label: "Nearest", short: "Nearest" },
    { id: "rated", label: "Top rated", short: "Top rated" },
    { id: "soonest", label: "Soonest available", short: "Soonest" },
  ];

  // slot: minutes from Mon 7 Sept 2026 00:00, used for "Soonest available".
  const STORES = [
    { id: "nelson-bay", name: "Nelson Bay Carpet Court", short: "Nelson Bay", km: 3.2, address: "11 Shearwater Drive, Taylors Beach", shortAddress: "11 Shearwater Dr, Taylors Beach", suburb: "Taylors Beach NSW 2316", phone: "02 4981 9266", open: "Open till 5pm", earliest: "Thu 10 Sept, 9:00am", slot: 3 * 1440 + 540, rating: 4.8, reviews: 84, img: "assets/img/store-image.png", state: "NSW", services: ["measure", "install", "blinds", "trade"], sat: true, sun: false, pin: { x: 45, y: 31 } },
    { id: "salamander-bay", name: "Salamander Bay Carpet Court", short: "Salamander Bay", km: 5.8, address: "2 Town Centre Circuit, Salamander Bay", shortAddress: "2 Town Centre Cct, Salamander Bay", suburb: "Salamander Bay NSW 2317", phone: "02 4984 1022", open: "Open till 5pm", earliest: "Thu 10 Sept, 1:00pm", slot: 3 * 1440 + 780, rating: 4.9, reviews: 112, img: "assets/img/store-image1.png", state: "NSW", services: ["measure", "install", "blinds"], sat: false, sun: false, pin: { x: 73.5, y: 23 } },
    { id: "raymond-terrace", name: "Raymond Terrace Carpet Court", short: "Raymond Terrace", km: 21.4, address: "45 William Street, Raymond Terrace", shortAddress: "45 William St, Raymond Terrace", suburb: "Raymond Terrace NSW 2324", phone: "02 4987 3310", open: "Open till 5:30pm", earliest: "Fri 11 Sept, 9:30am", slot: 4 * 1440 + 570, rating: 4.7, reviews: 63, img: "assets/img/store-image2.png", state: "NSW", services: ["measure", "install", "trade", "commercial"], sat: true, sun: false, pin: { x: 59.7, y: 60 } },
    { id: "maitland", name: "Maitland Carpet Court", short: "Maitland", km: 38.0, address: "102 New England Highway, Rutherford", shortAddress: "102 New England Hwy, Rutherford", suburb: "Rutherford NSW 2320", phone: "02 4932 7788", open: "Open till 5pm", earliest: "Fri 11 Sept, 11:00am", slot: 4 * 1440 + 660, rating: 4.6, reviews: 51, img: "assets/img/store-image3.png", state: "NSW", services: ["measure", "install", "blinds", "commercial"], sat: false, sun: false, pin: { x: 77.6, y: 67 } },
    { id: "charlestown", name: "Charlestown Carpet Court", short: "Charlestown", km: 44.6, address: "8 Pearson Street, Charlestown", shortAddress: "8 Pearson St, Charlestown", suburb: "Charlestown NSW 2290", phone: "02 4943 2211", open: "Closed · opens 9am", earliest: "Mon 14 Sept, 9:00am", slot: 7 * 1440 + 540, rating: 4.8, reviews: 97, img: "assets/img/store-image4.png", state: "NSW", services: ["measure", "blinds"], sat: false, sun: false, pin: { x: 30, y: 78 } },
    { id: "kotara", name: "Kotara Carpet Court", short: "Kotara", km: 46.1, address: "22 Park Avenue, Kotara", shortAddress: "22 Park Ave, Kotara", suburb: "Kotara NSW 2289", phone: "02 4957 6060", open: "Open till 5pm", earliest: "Mon 14 Sept, 10:30am", slot: 7 * 1440 + 630, rating: 4.5, reviews: 40, img: "assets/img/store-image5.png", state: "NSW", services: ["measure", "install", "blinds", "trade", "commercial"], sat: true, sun: true, pin: { x: 18, y: 64 } },
    { id: "belmont", name: "Belmont Carpet Court", short: "Belmont", km: 49.3, address: "380 Pacific Highway, Belmont", shortAddress: "380 Pacific Hwy, Belmont", suburb: "Belmont NSW 2280", phone: "02 4945 1188", open: "Open till 4pm", earliest: "Tue 15 Sept, 9:00am", slot: 8 * 1440 + 540, rating: 4.7, reviews: 72, img: "assets/img/store-image6.png", state: "NSW", services: ["measure", "install"], sat: true, sun: false, pin: { x: 38, y: 88 } },
  ];

  const GEO = {"nelson-bay":[-32.7218,152.1438],"salamander-bay":[-32.7225,152.079],"raymond-terrace":[-32.7618,151.7447],"maitland":[-32.7186,151.5278],"charlestown":[-32.9645,151.6929],"kotara":[-32.9407,151.6939],"belmont":[-33.0381,151.6603]};
  STORES.forEach((s) => { s.geo = GEO[s.id]; });

  // The Store Details design is for South Melbourne (opened from the header's store selector).
  const DETAIL_ONLY = { id: "south-melbourne", name: "South Melbourne Carpet Court", short: "South Melbourne", address: "216 York St, South Melbourne VIC 3205", phone: "02 4981 9266" };

  const SUBURBS = [
    ["Taylors Beach", "NSW 2316"], ["Taylors Arm", "NSW 2447"], ["Taylors Lakes", "VIC 3038"], ["Taylors Hill", "VIC 3037"],
    ["Nelson Bay", "NSW 2315"], ["Shoal Bay", "NSW 2315"], ["Fingal Bay", "NSW 2315"], ["Corlette", "NSW 2315"],
    ["Salamander Bay", "NSW 2317"], ["Soldiers Point", "NSW 2317"], ["Anna Bay", "NSW 2316"], ["Medowie", "NSW 2318"],
    ["Raymond Terrace", "NSW 2324"], ["Karuah", "NSW 2324"], ["Lemon Tree Passage", "NSW 2319"], ["Tanilba Bay", "NSW 2319"],
    ["Maitland", "NSW 2320"], ["Rutherford", "NSW 2320"], ["Newcastle", "NSW 2300"], ["Charlestown", "NSW 2290"],
    ["Kotara", "NSW 2289"], ["Belmont", "NSW 2280"], ["Parramatta", "NSW 2150"], ["South Melbourne", "VIC 3205"],
  ].map(([name, rest]) => ({ name, rest, postcode: rest.split(" ")[1], state: rest.split(" ")[0] }));

  const RECENT_SEED = [
    { label: "2315", rest: "Nelson Bay NSW" },
    { label: "Parramatta", rest: "NSW 2150" },
  ];

  const FAQS = [
    { q: "How long does an in-home measure take?", a: "Most domestic appointments take 30 to 45 minutes. Todd or Shaun will measure all areas with you, bring samples to the house, and send the quote the same afternoon." },
    { q: "Do you move furniture and lift the old floor?", a: "Yes. Our fitting team moves standard furniture and lifts and removes the old floor covering, so you don't have to. Pianos, aquariums and heavy safes need a specialist." },
    { q: "What does the installation warranty cover?", a: "Our own fitters' workmanship is covered for the life of the floor in your home, on top of the manufacturer's product warranty. Keep your invoice as proof of purchase." },
    { q: "Can I take samples home?", a: "Of course. Borrow up to five samples for a week, no appointment needed. Seeing them in your own light is the best way to choose." },
  ];

  const HOURS = [
    ["Monday", "9:00am - 5:00pm"], ["Tuesday", "9:00am - 5:00pm"], ["Wednesday", "9:00am - 5:00pm"],
    ["Thursday", "9:00am - 5:00pm"], ["Friday", "9:00am - 4:00pm"], ["Saturday", "9:00am - 12:00pm"], ["Sunday", "Closed"],
  ];

  return { SERVICES, STATES, WEEKENDS, SORTS, STORES, DETAIL_ONLY, SUBURBS, RECENT_SEED, FAQS, HOURS };
})();
