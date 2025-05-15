// lib/flag-data.js
export const flags = [
  { name: "United States", code: "us" },
  { name: "Canada", code: "ca" },
  { name: "Mexico", code: "mx" },
  { name: "Brazil", code: "br" },
  { name: "Argentina", code: "ar" },
  { name: "Chile", code: "cl" },
  { name: "Colombia", code: "co" },
  { name: "Peru", code: "pe" },
  { name: "Jamaica", code: "jm" },
  { name: "Cuba", code: "cu" },
  { name: "United Kingdom", code: "gb" },
  { name: "Germany", code: "de" },
  { name: "France", code: "fr" },
  { name: "Italy", code: "it" },
  { name: "Spain", code: "es" },
  { name: "Portugal", code: "pt" },
  { name: "Netherlands", code: "nl" },
  { name: "Belgium", code: "be" },
  { name: "Switzerland", code: "ch" },
  { name: "Austria", code: "at" },
  { name: "Sweden", code: "se" },
  { name: "Norway", code: "no" },
  { name: "Denmark", code: "dk" },
  { name: "Finland", code: "fi" },
  { name: "Ireland", code: "ie" },
  { name: "Greece", code: "gr" },
  { name: "Poland", code: "pl" },
  { name: "Ukraine", code: "ua" },
  { name: "Czech Republic", code: "cz" },
  { name: "Hungary", code: "hu" },
  { name: "Romania", code: "ro" },
  { name: "Japan", code: "jp" },
  { name: "China", code: "cn" },
  { name: "India", code: "in" },
  { name: "South Korea", code: "kr" },
  { name: "Indonesia", code: "id" },
  { name: "Thailand", code: "th" },
  { name: "Vietnam", code: "vn" },
  { name: "Philippines", code: "ph" },
  { name: "Malaysia", code: "my" },
  { name: "Singapore", code: "sg" },
  { name: "Turkey", code: "tr" },
  { name: "Saudi Arabia", code: "sa" },
  { name: "United Arab Emirates", code: "ae" },
  { name: "Israel", code: "il" },
  { name: "Pakistan", code: "pk" },
  { name: "Iran", code: "ir" },
  { name: "South Africa", code: "za" },
  { name: "Nigeria", code: "ng" },
  { name: "Egypt", code: "eg" },
  { name: "Kenya", code: "ke" },
  { name: "Ethiopia", code: "et" },
  { name: "Ghana", code: "gh" },
  { name: "Morocco", code: "ma" },
  { name: "Algeria", code: "dz" },
  { name: "Senegal", code: "sn" },
  { name: "Tanzania", code: "tz" },
  { name: "Australia", code: "au" },
  { name: "New Zealand", code: "nz" },
  { name: "Fiji", code: "fj" },
  { name: "Papua New Guinea", code: "pg" },
].map((flag) => ({
  ...flag,
  imageUrl: `https://flagcdn.com/w320/${flag.code.toLowerCase()}.png`,
}));

export const getRandomOptions = (correctFlag, allFlags, count = 2) => {
  const options = new Set();
  options.add(correctFlag.name);

  while (options.size < count) {
    const randomFlag = allFlags[Math.floor(Math.random() * allFlags.length)];
    if (randomFlag.name !== correctFlag.name) {
      options.add(randomFlag.name);
    }
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
};

export const getRandomFlag = (allFlags) => {
  if (!allFlags || allFlags.length === 0) {
    console.error("getRandomFlag called with empty or no flags array!");
    return null;
  }
  return allFlags[Math.floor(Math.random() * allFlags.length)];
};
