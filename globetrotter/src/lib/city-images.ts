/**
 * Deterministic City-to-Landmark Image Mapping.
 *
 * Every destination is mapped to an iconic, verified landmark photograph so that
 * cards visually justify the destination shown.
 *
 * Examples:
 *   Paris      -> Eiffel Tower
 *   Rome       -> Colosseum
 *   London     -> Big Ben / Houses of Parliament
 *   Tokyo      -> Tokyo Tower & Cityscape
 *   Kyoto      -> Fushimi Inari Taisha
 *   Osaka      -> Dotonbori / Osaka Castle
 *   Florence   -> Florence Duomo (Santa Maria del Fiore)
 *   Venice     -> Grand Canal & Gondolas
 *   Barcelona  -> Sagrada Familia
 *   Amsterdam  -> Canals & Bridges
 *   New York   -> Statue of Liberty & Manhattan Skyline
 *   Dubai      -> Burj Khalifa
 *   Singapore  -> Marina Bay Sands & Supertrees
 *   Jaipur     -> Hawa Mahal (Palace of Winds)
 *   Jodhpur    -> Mehrangarh Fort
 *   Udaipur    -> Lake Palace / Lake Pichola
 *   Kochi      -> Chinese Fishing Nets
 *   Munnar     -> Tea Plantations
 *   Zurich     -> Lake Zurich & Old Town
 *   Lucerne    -> Chapel Bridge (Kapellbrücke)
 *   Interlaken -> Swiss Alps & Lakes
 */

export const CITY_LANDMARK_IMAGES: Record<string, string> = {
  // Europe
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80", // Eiffel Tower
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80", // Colosseum
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80", // Big Ben & Westminster
  florence: "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?w=800&auto=format&fit=crop&q=80", // Florence Duomo
  venice: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800&auto=format&fit=crop&q=80", // Grand Canal
  barcelona: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&auto=format&fit=crop&q=80", // Sagrada Familia
  amsterdam: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&auto=format&fit=crop&q=80", // Canals
  prague: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&auto=format&fit=crop&q=80", // Charles Bridge
  lisbon: "https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=800&auto=format&fit=crop&q=80", // Tram & Alfama
  vienna: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&auto=format&fit=crop&q=80", // Schönbrunn Palace
  santorini: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&auto=format&fit=crop&q=80", // Oia Blue Domes
  reykjavik: "https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&auto=format&fit=crop&q=80", // Hallgrimskirkja / Aurora
  zurich: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=800&auto=format&fit=crop&q=80", // Lake Zurich
  lucerne: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&auto=format&fit=crop&q=80", // Chapel Bridge
  interlaken: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&auto=format&fit=crop&q=80", // Swiss Alps

  // East & Southeast Asia
  tokyo: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80", // Tokyo Tower
  kyoto: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80", // Fushimi Inari
  osaka: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&auto=format&fit=crop&q=80", // Dotonbori
  bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&auto=format&fit=crop&q=80", // Wat Arun
  chiangmai: "https://images.unsplash.com/photo-1512553353614-82a7370096dc?w=800&auto=format&fit=crop&q=80", // Doi Suthep
  phuket: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&auto=format&fit=crop&q=80", // Phang Nga Bay / Beaches
  ubud: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80", // Tegalalang Rice Terraces
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&auto=format&fit=crop&q=80", // Marina Bay Sands
  hanoi: "https://images.unsplash.com/photo-1509067237096-7d6f51f46d3e?w=800&auto=format&fit=crop&q=80", // Hoan Kiem Lake
  hochiminhcity: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&auto=format&fit=crop&q=80", // Saigon Skyline
  siemreap: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&auto=format&fit=crop&q=80", // Angkor Wat
  kualalumpur: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80", // Petronas Towers
  luangprabang: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&auto=format&fit=crop&q=80", // Kuang Si Falls

  // South Asia
  jaipur: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&auto=format&fit=crop&q=80", // Hawa Mahal
  jodhpur: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&auto=format&fit=crop&q=80", // Mehrangarh Fort
  udaipur: "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?w=800&auto=format&fit=crop&q=80", // Lake Palace
  kochi: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&auto=format&fit=crop&q=80", // Chinese Fishing Nets
  munnar: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&auto=format&fit=crop&q=80", // Tea Gardens
  alleppey: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80", // Backwaters & Houseboat
  varkala: "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&auto=format&fit=crop&q=80", // Cliff Beach
  goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80", // Palolem Beach
  rishikesh: "https://images.unsplash.com/photo-1600100397608-f010f4439151?w=800&auto=format&fit=crop&q=80", // Ganga River
  delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&auto=format&fit=crop&q=80", // India Gate
  agra: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&auto=format&fit=crop&q=80", // Taj Mahal
  kathmandu: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80", // Boudhanath
  colombo: "https://images.unsplash.com/photo-1578637387939-43c525550085?w=800&auto=format&fit=crop&q=80", // Lotus Tower / Coast
  thimphu: "https://images.unsplash.com/photo-1578637387939-43c525550085?w=800&auto=format&fit=crop&q=80", // Buddha Dordenma

  // North America
  newyork: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop&q=80", // Manhattan Skyline
  sanfrancisco: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&auto=format&fit=crop&q=80", // Golden Gate Bridge
  mexicocity: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&auto=format&fit=crop&q=80", // Bellas Artes
  vancouver: "https://images.unsplash.com/photo-1559511260-66a65e0982d5?w=800&auto=format&fit=crop&q=80", // Waterfront
  neworleans: "https://images.unsplash.com/photo-1571893544028-06b07af6adee?w=800&auto=format&fit=crop&q=80", // French Quarter
  banff: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800&auto=format&fit=crop&q=80", // Lake Louise
  havana: "https://images.unsplash.com/photo-1503457574462-bd2c6d48a12e?w=800&auto=format&fit=crop&q=80", // Malecon & Classic Cars

  // Middle East
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80", // Burj Khalifa
  istanbul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&auto=format&fit=crop&q=80", // Hagia Sophia
  petra: "https://images.unsplash.com/photo-1579606032834-c9c0b299e525?w=800&auto=format&fit=crop&q=80", // The Treasury
  cairo: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&auto=format&fit=crop&q=80", // Pyramids of Giza
  muscat: "https://images.unsplash.com/photo-1589802829985-817e51171b92?w=800&auto=format&fit=crop&q=80", // Grand Mosque
  telaviv: "https://images.unsplash.com/photo-1544971587-b842c27f8e14?w=800&auto=format&fit=crop&q=80", // Jaffa & Coast

  // Oceania
  sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&auto=format&fit=crop&q=80", // Sydney Opera House
  melbourne: "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&auto=format&fit=crop&q=80", // Flinders Station / Yarra
  queenstown: "https://images.unsplash.com/photo-1589871973318-9ca1258faa5d?w=800&auto=format&fit=crop&q=80", // Lake Wakatipu & Mountains
  auckland: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&auto=format&fit=crop&q=80", // Sky Tower
  cairns: "https://images.unsplash.com/photo-1587135941948-670b381f08ce?w=800&auto=format&fit=crop&q=80", // Great Barrier Reef
  nadi: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80", // Tropical Lagoon
}

export const DEFAULT_TRAVEL_FALLBACK =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80" // Travel essentials

/**
 * Returns a high-res, verified landmark image for a given city name.
 * Normalizes casing, spaces, and punctuation.
 */
export function getCityImageUrl(cityName: string, fallback?: string): string {
  if (!cityName) return fallback || DEFAULT_TRAVEL_FALLBACK

  const normalized = cityName.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (CITY_LANDMARK_IMAGES[normalized]) {
    return CITY_LANDMARK_IMAGES[normalized]
  }

  // Check substring match (e.g., "Chiang Mai" -> "chiangmai")
  for (const [key, url] of Object.entries(CITY_LANDMARK_IMAGES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url
    }
  }

  return fallback || DEFAULT_TRAVEL_FALLBACK
}
