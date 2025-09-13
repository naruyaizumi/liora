
const countryCodes = {
  AF: { name: 'Afghanistan', alpha3: 'AFG', numeric: '004' },
  AL: { name: 'Albania', alpha3: 'ALB', numeric: '008' },
  DZ: { name: 'Algeria', alpha3: 'DZA', numeric: '012' },
  AS: { name: 'American Samoa', alpha3: 'ASM', numeric: '016' },
  AD: { name: 'Andorra', alpha3: 'AND', numeric: '020' },
  AO: { name: 'Angola', alpha3: 'AGO', numeric: '024' },
  AI: { name: 'Anguilla', alpha3: 'AIA', numeric: '660' },
  AQ: { name: 'Antarctica', alpha3: 'ATA', numeric: '010' },
  AG: { name: 'Antigua and Barbuda', alpha3: 'ATG', numeric: '028' },
  AR: { name: 'Argentina', alpha3: 'ARG', numeric: '032' },
  AM: { name: 'Armenia', alpha3: 'ARM', numeric: '051' },
  AW: { name: 'Aruba', alpha3: 'ABW', numeric: '533' },
  AU: { name: 'Australia', alpha3: 'AUS', numeric: '036' },
  AT: { name: 'Austria', alpha3: 'AUT', numeric: '040' },
  AZ: { name: 'Azerbaijan', alpha3: 'AZE', numeric: '031' },
  BS: { name: 'Bahamas', alpha3: 'BHS', numeric: '044' },
  BH: { name: 'Bahrain', alpha3: 'BHR', numeric: '048' },
  BD: { name: 'Bangladesh', alpha3: 'BGD', numeric: '050' },
  BB: { name: 'Barbados', alpha3: 'BRB', numeric: '052' },
  BY: { name: 'Belarus', alpha3: 'BLR', numeric: '112' },
  BE: { name: 'Belgium', alpha3: 'BEL', numeric: '056' },
  BZ: { name: 'Belize', alpha3: 'BLZ', numeric: '084' },
  BJ: { name: 'Benin', alpha3: 'BEN', numeric: '204' },
  BM: { name: 'Bermuda', alpha3: 'BMU', numeric: '060' },
  BT: { name: 'Bhutan', alpha3: 'BTN', numeric: '064' },
  BO: { name: 'Bolivia', alpha3: 'BOL', numeric: '068' },
  BA: { name: 'Bosnia and Herzegovina', alpha3: 'BIH', numeric: '070' },
  BW: { name: 'Botswana', alpha3: 'BWA', numeric: '072' },
  BV: { name: 'Bouvet Island', alpha3: 'BVT', numeric: '074' },
  BR: { name: 'Brazil', alpha3: 'BRA', numeric: '076' },
  IO: { name: 'British Indian Ocean Territory', alpha3: 'IOT', numeric: '086' },
  BN: { name: 'Brunei Darussalam', alpha3: 'BRN', numeric: '096' },
  BG: { name: 'Bulgaria', alpha3: 'BGR', numeric: '100' },
  BF: { name: 'Burkina Faso', alpha3: 'BFA', numeric: '854' },
  BI: { name: 'Burundi', alpha3: 'BDI', numeric: '108' },
  KH: { name: 'Cambodia', alpha3: 'KHM', numeric: '116' },
  CM: { name: 'Cameroon', alpha3: 'CMR', numeric: '120' },
  CA: { name: 'Canada', alpha3: 'CAN', numeric: '124' },
  CV: { name: 'Cape Verde', alpha3: 'CPV', numeric: '132' },
  KY: { name: 'Cayman Islands', alpha3: 'CYM', numeric: '136' },
  CF: { name: 'Central African Republic', alpha3: 'CAF', numeric: '140' },
  TD: { name: 'Chad', alpha3: 'TCD', numeric: '148' },
  CL: { name: 'Chile', alpha3: 'CHL', numeric: '152' },
  CN: { name: 'China', alpha3: 'CHN', numeric: '156' },
  CX: { name: 'Christmas Island', alpha3: 'CXR', numeric: '162' },
  CC: { name: 'Cocos (Keeling) Islands', alpha3: 'CCK', numeric: '166' },
  CO: { name: 'Colombia', alpha3: 'COL', numeric: '170' },
  KM: { name: 'Comoros', alpha3: 'COM', numeric: '174' },
  CG: { name: 'Congo', alpha3: 'COG', numeric: '178' },
  CD: { name: 'Congo, Democratic Republic', alpha3: 'COD', numeric: '180' },
  CK: { name: 'Cook Islands', alpha3: 'COK', numeric: '184' },
  CR: { name: 'Costa Rica', alpha3: 'CRI', numeric: '188' },
  CI: { name: "Côte d'Ivoire", alpha3: 'CIV', numeric: '384' },
  HR: { name: 'Croatia', alpha3: 'HRV', numeric: '191' },
  CU: { name: 'Cuba', alpha3: 'CUB', numeric: '192' },
  CY: { name: 'Cyprus', alpha3: 'CYP', numeric: '196' },
  CZ: { name: 'Czech Republic', alpha3: 'CZE', numeric: '203' },
  DK: { name: 'Denmark', alpha3: 'DNK', numeric: '208' },
  DJ: { name: 'Djibouti', alpha3: 'DJI', numeric: '262' },
  DM: { name: 'Dominica', alpha3: 'DMA', numeric: '212' },
  DO: { name: 'Dominican Republic', alpha3: 'DOM', numeric: '214' },
  EC: { name: 'Ecuador', alpha3: 'ECU', numeric: '218' },
  EG: { name: 'Egypt', alpha3: 'EGY', numeric: '818' },
  SV: { name: 'El Salvador', alpha3: 'SLV', numeric: '222' },
  GQ: { name: 'Equatorial Guinea', alpha3: 'GNQ', numeric: '226' },
  ER: { name: 'Eritrea', alpha3: 'ERI', numeric: '232' },
  EE: { name: 'Estonia', alpha3: 'EST', numeric: '233' },
  ET: { name: 'Ethiopia', alpha3: 'ETH', numeric: '231' },
  FK: { name: 'Falkland Islands', alpha3: 'FLK', numeric: '238' },
  FO: { name: 'Faroe Islands', alpha3: 'FRO', numeric: '234' },
  FJ: { name: 'Fiji', alpha3: 'FJI', numeric: '242' },
  FI: { name: 'Finland', alpha3: 'FIN', numeric: '246' },
  FR: { name: 'France', alpha3: 'FRA', numeric: '250' },
  GF: { name: 'French Guiana', alpha3: 'GUF', numeric: '254' },
  PF: { name: 'French Polynesia', alpha3: 'PYF', numeric: '258' },
  TF: { name: 'French Southern Territories', alpha3: 'ATF', numeric: '260' },
  GA: { name: 'Gabon', alpha3: 'GAB', numeric: '266' },
  GM: { name: 'Gambia', alpha3: 'GMB', numeric: '270' },
  GE: { name: 'Georgia', alpha3: 'GEO', numeric: '268' },
  DE: { name: 'Germany', alpha3: 'DEU', numeric: '276' },
  GH: { name: 'Ghana', alpha3: 'GHA', numeric: '288' },
  GI: { name: 'Gibraltar', alpha3: 'GIB', numeric: '292' },
  GR: { name: 'Greece', alpha3: 'GRC', numeric: '300' },
  GL: { name: 'Greenland', alpha3: 'GRL', numeric: '304' },
  GD: { name: 'Grenada', alpha3: 'GRD', numeric: '308' },
  GP: { name: 'Guadeloupe', alpha3: 'GLP', numeric: '312' },
  GU: { name: 'Guam', alpha3: 'GUM', numeric: '316' },
  GT: { name: 'Guatemala', alpha3: 'GTM', numeric: '320' },
  GG: { name: 'Guernsey', alpha3: 'GGY', numeric: '831' },
  GN: { name: 'Guinea', alpha3: 'GIN', numeric: '324' },
  GW: { name: 'Guinea-Bissau', alpha3: 'GNB', numeric: '624' },
  GY: { name: 'Guyana', alpha3: 'GUY', numeric: '328' },
  HT: { name: 'Haiti', alpha3: 'HTI', numeric: '332' },
  HM: { name: 'Heard Island and McDonald Islands', alpha3: 'HMD', numeric: '334' },
  VA: { name: 'Holy See', alpha3: 'VAT', numeric: '336' },
  HN: { name: 'Honduras', alpha3: 'HND', numeric: '340' },
  HK: { name: 'Hong Kong', alpha3: 'HKG', numeric: '344' },
  HU: { name: 'Hungary', alpha3: 'HUN', numeric: '348' },
  IS: { name: 'Iceland', alpha3: 'ISL', numeric: '352' },
  IN: { name: 'India', alpha3: 'IND', numeric: '356' },
  ID: { name: 'Indonesia', alpha3: 'IDN', numeric: '360' },
  IR: { name: 'Iran', alpha3: 'IRN', numeric: '364' },
  IQ: { name: 'Iraq', alpha3: 'IRQ', numeric: '368' },
  IE: { name: 'Ireland', alpha3: 'IRL', numeric: '372' },
  IM: { name: 'Isle of Man', alpha3: 'IMN', numeric: '833' },
  IL: { name: 'Israel', alpha3: 'ISR', numeric: '376' },
  IT: { name: 'Italy', alpha3: 'ITA', numeric: '380' },
  JM: { name: 'Jamaica', alpha3: 'JAM', numeric: '388' },
  JP: { name: 'Japan', alpha3: 'JPN', numeric: '392' },
  JE: { name: 'Jersey', alpha3: 'JEY', numeric: '832' },
  JO: { name: 'Jordan', alpha3: 'JOR', numeric: '400' },
  KZ: { name: 'Kazakhstan', alpha3: 'KAZ', numeric: '398' },
  KE: { name: 'Kenya', alpha3: 'KEN', numeric: '404' },
  KI: { name: 'Kiribati', alpha3: 'KIR', numeric: '296' },
  KP: { name: "Korea, Democratic People's Republic", alpha3: 'PRK', numeric: '408' },
  KR: { name: 'Korea, Republic of', alpha3: 'KOR', numeric: '410' },
  KW: { name: 'Kuwait', alpha3: 'KWT', numeric: '414' },
  KG: { name: 'Kyrgyzstan', alpha3: 'KGZ', numeric: '417' },
  LA: { name: "Lao People's Democratic Republic", alpha3: 'LAO', numeric: '418' },
  LV: { name: 'Latvia', alpha3: 'LVA', numeric: '428' },
  LB: { name: 'Lebanon', alpha3: 'LBN', numeric: '422' },
  LS: { name: 'Lesotho', alpha3: 'LSO', numeric: '426' },
  LR: { name: 'Liberia', alpha3: 'LBR', numeric: '430' },
  LY: { name: 'Libya', alpha3: 'LBY', numeric: '434' },
  LI: { name: 'Liechtenstein', alpha3: 'LIE', numeric: '438' },
  LT: { name: 'Lithuania', alpha3: 'LTU', numeric: '440' },
  LU: { name: 'Luxembourg', alpha3: 'LUX', numeric: '442' },
  MO: { name: 'Macao', alpha3: 'MAC', numeric: '446' },
  MK: { name: 'North Macedonia', alpha3: 'MKD', numeric: '807' },
  MG: { name: 'Madagascar', alpha3: 'MDG', numeric: '450' },
  MW: { name: 'Malawi', alpha3: 'MWI', numeric: '454' },
  MY: { name: 'Malaysia', alpha3: 'MYS', numeric: '458' },
  MV: { name: 'Maldives', alpha3: 'MDV', numeric: '462' },
  ML: { name: 'Mali', alpha3: 'MLI', numeric: '466' },
  MT: { name: 'Malta', alpha3: 'MLT', numeric: '470' },
  MH: { name: 'Marshall Islands', alpha3: 'MHL', numeric: '584' },
  MQ: { name: 'Martinique', alpha3: 'MTQ', numeric: '474' },
  MR: { name: 'Mauritania', alpha3: 'MRT', numeric: '478' },
  MU: { name: 'Mauritius', alpha3: 'MUS', numeric: '480' },
  YT: { name: 'Mayotte', alpha3: 'MYT', numeric: '175' },
  MX: { name: 'Mexico', alpha3: 'MEX', numeric: '484' },
  FM: { name: 'Micronesia', alpha3: 'FSM', numeric: '583' },
  MD: { name: 'Moldova', alpha3: 'MDA', numeric: '498' },
  MC: { name: 'Monaco', alpha3: 'MCO', numeric: '492' },
  MN: { name: 'Mongolia', alpha3: 'MNG', numeric: '496' },
  ME: { name: 'Montenegro', alpha3: 'MNE', numeric: '499' },
  MS: { name: 'Montserrat', alpha3: 'MSR', numeric: '500' },
  MA: { name: 'Morocco', alpha3: 'MAR', numeric: '504' },
  MZ: { name: 'Mozambique', alpha3: 'MOZ', numeric: '508' },
  MM: { name: 'Myanmar', alpha3: 'MMR', numeric: '104' },
  NA: { name: 'Namibia', alpha3: 'NAM', numeric: '516' },
  NR: { name: 'Nauru', alpha3: 'NRU', numeric: '520' },
  NP: { name: 'Nepal', alpha3: 'NPL', numeric: '524' },
  NL: { name: 'Netherlands', alpha3: 'NLD', numeric: '528' },
  NC: { name: 'New Caledonia', alpha3: 'NCL', numeric: '540' },
  NZ: { name: 'New Zealand', alpha3: 'NZL', numeric: '554' },
  NI: { name: 'Nicaragua', alpha3: 'NIC', numeric: '558' },
  NE: { name: 'Niger', alpha3: 'NER', numeric: '562' },
  NG: { name: 'Nigeria', alpha3: 'NGA', numeric: '566' },
  NU: { name: 'Niue', alpha3: 'NIU', numeric: '570' },
  NF: { name: 'Norfolk Island', alpha3: 'NFK', numeric: '574' },
  MP: { name: 'Northern Mariana Islands', alpha3: 'MNP', numeric: '580' },
  NO: { name: 'Norway', alpha3: 'NOR', numeric: '578' },
  OM: { name: 'Oman', alpha3: 'OMN', numeric: '512' },
  PK: { name: 'Pakistan', alpha3: 'PAK', numeric: '586' },
  PW: { name: 'Palau', alpha3: 'PLW', numeric: '585' },
  PS: { name: 'Palestine', alpha3: 'PSE', numeric: '275' },
  PA: { name: 'Panama', alpha3: 'PAN', numeric: '591' },
  PG: { name: 'Papua New Guinea', alpha3: 'PNG', numeric: '598' },
  PY: { name: 'Paraguay', alpha3: 'PRY', numeric: '600' },
  PE: { name: 'Peru', alpha3: 'PER', numeric: '604' },
  PH: { name: 'Philippines', alpha3: 'PHL', numeric: '608' },
  PN: { name: 'Pitcairn', alpha3: 'PCN', numeric: '612' },
  PL: { name: 'Poland', alpha3: 'POL', numeric: '616' },
  PT: { name: 'Portugal', alpha3: 'PRT', numeric: '620' },
  PR: { name: 'Puerto Rico', alpha3: 'PRI', numeric: '630' },
  QA: { name: 'Qatar', alpha3: 'QAT', numeric: '634' },
  RE: { name: 'Réunion', alpha3: 'REU', numeric: '638' },
  RO: { name: 'Romania', alpha3: 'ROU', numeric: '642' },
  RU: { name: 'Russian Federation', alpha3: 'RUS', numeric: '643' },
  RW: { name: 'Rwanda', alpha3: 'RWA', numeric: '646' },
  BL: { name: 'Saint Barthélemy', alpha3: 'BLM', numeric: '652' },
  SH: { name: 'Saint Helena', alpha3: 'SHN', numeric: '654' },
  KN: { name: 'Saint Kitts and Nevis', alpha3: 'KNA', numeric: '659' },
  LC: { name: 'Saint Lucia', alpha3: 'LCA', numeric: '662' },
  MF: { name: 'Saint Martin', alpha3: 'MAF', numeric: '663' },
  PM: { name: 'Saint Pierre and Miquelon', alpha3: 'SPM', numeric: '666' },
  VC: { name: 'Saint Vincent and the Grenadines', alpha3: 'VCT', numeric: '670' },
  WS: { name: 'Samoa', alpha3: 'WSM', numeric: '882' },
  SM: { name: 'San Marino', alpha3: 'SMR', numeric: '674' },
  ST: { name: 'Sao Tome and Principe', alpha3: 'STP', numeric: '678' },
  SA: { name: 'Saudi Arabia', alpha3: 'SAU', numeric: '682' },
  SN: { name: 'Senegal', alpha3: 'SEN', numeric: '686' },
  RS: { name: 'Serbia', alpha3: 'SRB', numeric: '688' },
  SC: { name: 'Seychelles', alpha3: 'SYC', numeric: '690' },
  SL: { name: 'Sierra Leone', alpha3: 'SLE', numeric: '694' },
  SG: { name: 'Singapore', alpha3: 'SGP', numeric: '702' },
  SK: { name: 'Slovakia', alpha3: 'SVK', numeric: '703' },
  SI: { name: 'Slovenia', alpha3: 'SVN', numeric: '705' },
  SB: { name: 'Solomon Islands', alpha3: 'SLB', numeric: '090' },
  SO: { name: 'Somalia', alpha3: 'SOM', numeric: '706' },
  ZA: { name: 'South Africa', alpha3: 'ZAF', numeric: '710' },
  GS: { name: 'South Georgia', alpha3: 'SGS', numeric: '239' },
  SS: { name: 'South Sudan', alpha3: 'SSD', numeric: '728' },
  ES: { name: 'Spain', alpha3: 'ESP', numeric: '724' },
  LK: { name: 'Sri Lanka', alpha3: 'LKA', numeric: '144' },
  SD: { name: 'Sudan', alpha3: 'SDN', numeric: '729' },
  SR: { name: 'Suriname', alpha3: 'SUR', numeric: '740' },
  SJ: { name: 'Svalbard and Jan Mayen', alpha3: 'SJM', numeric: '744' },
  SZ: { name: 'Eswatini', alpha3: 'SWZ', numeric: '748' },
  SE: { name: 'Sweden', alpha3: 'SWE', numeric: '752' },
  CH: { name: 'Switzerland', alpha3: 'CHE', numeric: '756' },
  SY: { name: 'Syrian Arab Republic', alpha3: 'SYR', numeric: '760' },
  TW: { name: 'Taiwan', alpha3: 'TWN', numeric: '158' },
  TJ: { name: 'Tajikistan', alpha3: 'TJK', numeric: '762' },
  TZ: { name: 'Tanzania', alpha3: 'TZA', numeric: '834' },
  TH: { name: 'Thailand', alpha3: 'THA', numeric: '764' },
  TL: { name: 'Timor-Leste', alpha3: 'TLS', numeric: '626' },
  TG: { name: 'Togo', alpha3: 'TGO', numeric: '768' },
  TK: { name: 'Tokelau', alpha3: 'TKL', numeric: '772' },
  TO: { name: 'Tonga', alpha3: 'TON', numeric: '776' },
  TT: { name: 'Trinidad and Tobago', alpha3: 'TTO', numeric: '780' },
  TN: { name: 'Tunisia', alpha3: 'TUN', numeric: '788' },
  TR: { name: 'Turkey', alpha3: 'TUR', numeric: '792' },
  TM: { name: 'Turkmenistan', alpha3: 'TKM', numeric: '795' },
  TC: { name: 'Turks and Caicos Islands', alpha3: 'TCA', numeric: '796' },
  TV: { name: 'Tuvalu', alpha3: 'TUV', numeric: '798' },
  UG: { name: 'Uganda', alpha3: 'UGA', numeric: '800' },
  UA: { name: 'Ukraine', alpha3: 'UKR', numeric: '804' },
  AE: { name: 'United Arab Emirates', alpha3: 'ARE', numeric: '784' },
  GB: { name: 'United Kingdom', alpha3: 'GBR', numeric: '826' },
  US: { name: 'United States', alpha3: 'USA', numeric: '840' },
  UM: { name: 'United States Minor Outlying Islands', alpha3: 'UMI', numeric: '581' },
  UY: { name: 'Uruguay', alpha3: 'URY', numeric: '858' },
  UZ: { name: 'Uzbekistan', alpha3: 'UZB', numeric: '860' },
  VU: { name: 'Vanuatu', alpha3: 'VUT', numeric: '548' },
  VE: { name: 'Venezuela', alpha3: 'VEN', numeric: '862' },
  VN: { name: 'Viet Nam', alpha3: 'VNM', numeric: '704' },
  VG: { name: 'Virgin Islands, British', alpha3: 'VGB', numeric: '092' },
  VI: { name: 'Virgin Islands, U.S.', alpha3: 'VIR', numeric: '850' },
  WF: { name: 'Wallis and Futuna', alpha3: 'WLF', numeric: '876' },
  EH: { name: 'Western Sahara', alpha3: 'ESH', numeric: '732' },
  YE: { name: 'Yemen', alpha3: 'YEM', numeric: '887' },
  ZM: { name: 'Zambia', alpha3: 'ZMB', numeric: '894' },
  ZW: { name: 'Zimbabwe', alpha3: 'ZWE', numeric: '716' }
};

let handler = async (m, { conn, text }) => {
  if (!text) {
    const exampleCodes = `*Contoh Kode Negara:*\nID - Indonesia\nUSA - Amerika (Alpha-3)\n392 - Jepang (Numeric)\nGB - Inggris`;
    return conn.sendMessage(m.chat, {
      text: `*🌍 DAFTAR KODE NEGARA*\n\nGunakan: .populasi <kode>\nContoh:\n.populasi ID (Alpha-2)\n.populasi USA (Alpha-3)\n.populasi 360 (Numeric)\n\n${exampleCodes}\n\n*📚 Referensi Lengkap:*\nhttps://www.iban.com/country-codes`,
      footer: 'Support Alpha-2, Alpha-3, dan Kode Numerik',
      mentions: [m.sender]
    }, { quoted: m });
  }


  let country;
  const input = text.toUpperCase();
  

  if (countryCodes[input]) {
    country = countryCodes[input];
  } 

  else {
    const alpha3Match = Object.entries(countryCodes).find(([_, data]) => data.alpha3 === input);
    if (alpha3Match) country = alpha3Match[1];

    else {
      const numericMatch = Object.entries(countryCodes).find(([_, data]) => data.numeric === input);
      if (numericMatch) country = numericMatch[1];
    }
  }

  if (!country) {
    return conn.sendMessage(m.chat, { 
      text: `*❌ KODE NEGARA TIDAK VALID*\n\n"${text}" tidak terdaftar.\nGunakan .populasi untuk melihat contoh kode.`,
      mentions: [m.sender]
    }, { quoted: m });
  }

  try {
    const loadingMsg = await conn.sendMessage(m.chat, { 
      text: `⏳ Mencari data populasi ${country.name}...`,
      mentions: [m.sender] 
    });


    const alpha2Code = Object.keys(countryCodes).find(code => countryCodes[code].name === country.name);
    const apiUrl = `https://restcountries.com/v3.1/alpha/${alpha2Code}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const [countryData] = await response.json();
    const population = countryData.population.toLocaleString();
    const name = countryData.name.common;
    const flag = countryData.flags.png;
    const capital = countryData.capital?.[0] || 'Tidak diketahui';
    const region = countryData.region || 'Tidak diketahui';
    const currency = countryData.currencies ? Object.values(countryData.currencies)[0].name : 'Tidak diketahui';

    await conn.sendMessage(m.chat, {
      image: { url: flag },
      caption: `*🌍 ${name}*\n\n` +
               `*👥 Populasi:* ${population}\n` +
               `*🏙 Ibu Kota:* ${capital}\n` +
               `*📍 Region:* ${region}\n` +
               `*💰 Mata Uang:* ${currency}\n` +
               `*🔢 Kode Negara:*\n- Alpha-2: ${alpha2Code}\n- Alpha-3: ${country.alpha3}\n- Numerik: ${country.numeric}`,
      footer: `Sumber: REST Countries API`,
      mentions: [m.sender]
    }, { quoted: m });

    await conn.sendMessage(m.chat, { 
      text: `✅ Data populasi ${name} berhasil didapatkan!`,
      edit: loadingMsg.key 
    });

  } catch (error) {
    console.error('Error:', error);
    await conn.sendMessage(m.chat, { 
      text: `*😢 GAGAL MENGAMBIL DATA*\n\nTerjadi kesalahan saat mengambil data ${country.name}.\nSilakan coba lagi nanti.`,
      mentions: [m.sender]
    }, { quoted: m });
  }
};

handler.help = ['populasi <kode negara>'];
handler.command = /^populasi$/i;
handler.tags = ['info'];
handler.limit = true;
handler.register = true;

export default handler;