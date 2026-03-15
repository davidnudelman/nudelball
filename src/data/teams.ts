/**
 * Team data, country name pools, and waiting-pool teams.
 *
 * Extracted from the original monolithic index.html.  Every country's
 * first-name / last-name arrays are kept intact so the procedural
 * player-name generator can build realistic names per nationality.
 */

import type { CountryCode, NamePool, TeamData, WaitingTeam } from '../types';

// ---------------------------------------------------------------------------
// Country-specific name pools for procedural player-name generation
// ---------------------------------------------------------------------------

/**
 * Maps a two-letter country code to a pool of first and last names.
 * The match engine picks randomly from the relevant pool when generating
 * new players for a team.
 */
export const COUNTRY_NAMES: Record<CountryCode, NamePool> = {
  ES: {
    first: ["Carlos","Diego","Alejandro","Fernando","Sergio","Raúl","Andrés","Iker","Xavi","Pablo","Álvaro","Marcos","Jordi","Gerard","David","Hugo","Adrián","Rubén","Antonio","Jesús","Miguel","Óscar","Alberto","Gonzalo","Enrique","Javier","Daniel","Iván","Nacho","Víctor"],
    last: ["García","López","Martínez","Rodríguez","Hernández","Sánchez","Torres","Ramos","Fernández","Moreno","Muñoz","Álvarez","Romero","Díaz","Navarro","Gil","Domínguez","Vázquez","Serrano","Molina","Ortega","Castillo","Rubio","Delgado","Pardo","Caballero","Iglesias","Pascual","Ruiz","Guerrero"],
  },
  EN: {
    first: ["Alfred","Henry","John","George","Edward","William","James","Arthur","Thomas","Harry","Charles","Frederick","Oliver","Benjamin","Samuel","Daniel","Jack","Michael","Robert","Andrew","David","Richard","Philip","Stephen","Patrick","Martin","Owen","Peter","Luke","Simon"],
    last: ["Pemberton","Smith","Hunter","Baker","Cook","Taylor","Wilson","Brown","Johnson","Evans","Clarke","Roberts","Walker","Turner","Wright","Green","Hall","Wood","Harris","King","Carter","Mitchell","Moore","Jackson","White","Davis","Cooper","Morris","Thompson","Ward"],
  },
  PT: {
    first: ["Rui","Nuno","João","Luís","Pedro","Tiago","Diogo","André","Bruno","Hugo","Ricardo","Gonçalo","Miguel","Paulo","Sérgio","Cristiano","Bernardo","Renato","Vítor","Fábio","Marco","Rafael","Manuel","Eduardo","Nelson","Cláudio","Filipe","Hélder","José","Carlos"],
    last: ["Silva","Santos","Fernandes","Costa","Oliveira","Alves","Pereira","Sousa","Ferreira","Nunes","Vieira","Carvalho","Lopes","Pinto","Mendes","Ribeiro","Rocha","Marques","Correia","Reis","Monteiro","Tavares","Gomes","Cardoso","Fonseca","Teixeira","Mota","Coelho","Martins","Abreu"],
  },
  DE: {
    first: ["Hans","Klaus","Werner","Karl","Jürgen","Thomas","Lothar","Bastian","Miroslav","Lukas","Manuel","Toni","Leon","Joshua","Kai","Timo","Leroy","Julian","Marco","Florian","Philipp","Matthias","Stefan","Bernd","Mats","Lars","Nico","Jonas","Felix","Maximilian"],
    last: ["Müller","Schmidt","Schneider","Fischer","Weber","Becker","Schwarz","Wagner","Hoffmann","Keller","Richter","Klein","Wolf","Neumann","Braun","Werner","Krause","Lehmann","Hartmann","König","Kroos","Reus","Hummels","Götze","Brandt","Schäfer","Lange","Sommer","Vogt","Gross"],
  },
  FR: {
    first: ["Antoine","Kylian","Hugo","Olivier","Paul","Raphaël","Lucas","Adrien","Blaise","Moussa","Ousmane","Samuel","Karim","Franck","Thierry","Patrice","Laurent","Didier","Marcel","Yohan","Gaël","Florian","Nabil","Mathieu","Aurélien","Clément","Jules","Rémy","Benoît","Corentin"],
    last: ["Dupont","Martin","Bernard","Dubois","Moreau","Laurent","Simon","Michel","Lefèvre","Leroy","Roux","Girard","Mercier","Faure","Lambert","Fontaine","Chevalier","Robin","Masson","Blanc","Henry","Renard","Barbier","Fournier","Picard","Deschamps","Vidal","Moulin","Perrin","Lemoine"],
  },
  BR: {
    first: ["Ronaldo","Romário","Carlos","Henrique","Vinícius","Neymar","Lucas","Thiago","Gabriel","Davi","Rafael","Matheus","Gustavo","Felipe","Leonardo","Robinho","Caio","Marcelo","João","Rodrigo","Danilo","Anderson","Émerson","Bruno","Rivaldo","Adriano","Wendell","Renan","Kaká","Willian"],
    last: ["Albuquerque","Silva","Rocha","Santos","Oliveira","Souza","Lima","Pereira","Costa","Ferreira","Ribeiro","Gomes","Martins","Araújo","Barbosa","Nascimento","Cardoso","Correia","Vieira","Nunes","Moura","Cavalcanti","Monteiro","Teixeira","Freitas","Carvalho","Pinto","Mendes","Batista","Reis"],
  },
  US: {
    first: ["Braden","Tyler","Josh","Weston","Christian","Matt","Clint","Landon","Kyle","Cameron","DeAndre","Jordan","Brandon","Austin","Reggie","Marcus","Ethan","Cole","Jake","Mason","Caleb","Logan","Dylan","Chase","Hunter","Connor","Aidan","Blake","Tristan","Nolan"],
    last: ["Pulisic","McKennie","Adams","Brooks","Bradley","Dempsey","Howard","Altidore","Morris","Yedlin","Robinson","Turner","Musah","Reyna","Aaronson","Ferreira","Sargent","Weah","Dest","Richards","Palmer","Fields","Carter","Mitchell","Anderson","Thompson","Gonzalez","Ramirez","Sullivan","Murphy"],
  },
  CA: {
    first: ["Alphonso","Jonathan","Atiba","Cyle","Junior","Tajon","Stephen","Richie","Milan","Jayden","Derek","Samuel","Scott","Liam","Mark","Owen","Theo","Lucas","Ismaël","Alistair","Kamal","Zachary","Aidan","Fraser","Rahim","Doneil","Maxime","Charles","Russell","Marcus"],
    last: ["Davies","David","Hutchinson","Larin","Hoilett","Buchanan","Eustáquio","Borjan","Morgan","Nelson","Fraser","Campbell","Kennedy","Stewart","Robertson","MacDonald","Thomson","Henderson","Murray","Taylor","Sinclair","Gordon","Reid","Graham","Hamilton","Clarke","Ross","Mitchell","MacLeod","Johnston"],
  },
  UA: {
    first: ["Andriy","Oleksandr","Mykola","Viktor","Serhiy","Dmytro","Taras","Vitaliy","Yevhen","Artem","Ruslan","Bohdan","Denys","Vladyslav","Oleh","Roman","Anatoliy","Ihor","Mykhailo","Maksym","Vasyl","Pavlo","Yaroslav","Hryhoriy","Stepan","Volodymyr","Kostiantyn","Petro","Ivan","Leonid"],
    last: ["Shevchenko","Rebrov","Tymoshchuk","Konoplyanka","Yarmolenko","Zinchenko","Tsygankov","Malinovsky","Mudryk","Dovbyk","Sydorchuk","Mykolenko","Zabarnyi","Bondar","Matvienko","Stepanenko","Shaparenko","Pyatov","Trubin","Lunin","Melnyk","Kovalenko","Tkachuk","Shevchuk","Boyko","Lysenko","Horbachuk","Savchenko","Kravets","Moroz"],
  },
  PL: {
    first: ["Robert","Kamil","Jakub","Wojciech","Piotr","Grzegorz","Krzysztof","Łukasz","Tomasz","Arkadiusz","Maciej","Bartosz","Dawid","Mateusz","Sebastian","Damian","Karol","Michał","Marcin","Przemysław","Szymon","Jan","Marek","Rafał","Zbigniew","Leszek","Dariusz","Paweł","Filip","Konrad"],
    last: ["Lewandowski","Szczęsny","Zieliński","Milik","Piszczek","Glik","Krychowiak","Rybus","Moder","Klich","Bednarek","Szymański","Zalewski","Linetty","Frankowski","Piątek","Świderski","Nowak","Kowalski","Wiśniewski","Wójcik","Kamiński","Kozłowski","Jankowski","Zając","Mazur","Krawczyk","Piotrowski","Grabowski","Pawlak"],
  },
  JP: {
    first: ["Takumi","Kaoru","Daichi","Takehiro","Wataru","Ritsu","Junya","Hidemasa","Yuto","Shinji","Keisuke","Makoto","Yuya","Genki","Gaku","Takefusa","Kyogo","Ao","Ayase","Mao","Reo","Koji","Hiroshi","Masato","Daiki","Kento","Shogo","Yuki","Hayato","Sho"],
    last: ["Minamino","Mitoma","Kamada","Tomiyasu","Endo","Doan","Ito","Morita","Nagatomo","Kagawa","Honda","Hasebe","Osako","Haraguchi","Kubo","Furuhashi","Tanaka","Ueda","Asano","Maeda","Yamamoto","Nakamura","Suzuki","Sato","Watanabe","Takahashi","Kobayashi","Yoshida","Inoue","Kimura"],
  },
  CN: {
    first: ["Wei","Lei","Hao","Jun","Tao","Peng","Xiang","Zheng","Ming","Yong","Jian","Long","Chao","Feng","Lin","Gang","Bin","Liang","Bo","Kai","Zhi","Hang","Rui","Yi","Cheng","Yang","Dong","Ke","Qiang","Xin"],
    last: ["Wu","Li","Zhang","Wang","Liu","Chen","Yang","Huang","Zhao","Zhou","Xu","Sun","Ma","Zhu","Lin","He","Gao","Zheng","Luo","Song","Xie","Tang","Han","Feng","Deng","Cao","Peng","Zeng","Jiang","Yu"],
  },
  AD: {
    first: ["Marc","Jordi","Àlex","Ilde","Sergi","Cristian","Èric","Jesús","Máximo","Ludovic","Adrián","Emili","Óscar","Moisés","Rubén","Gabi","Juli","Víctor","Albert","Ricard","Joan","David","Ferran","Xavier","Arnau","Pau","Carles","Antoni","Bernat","Martí"],
    last: ["Lima","Vieira","Rubio","Riera","Vales","Rebes","Cervós","García","Llovera","Alavedra","Pujol","Clemente","Moreno","San Nicolás","Martínez","Fernández","Sonejee","Jiménez","Silva","Koldo","Maneiro","Ayala","Lorenzo","Sánchez","Gómez","Torres","Navarro","Domínguez","Pérez","Rodríguez"],
  },
  FK: {
    first: ["James","William","John","Robert","David","Thomas","Michael","George","Ian","Peter","Andrew","Richard","Paul","Mark","Stephen","Simon","Timothy","Philip","Keith","Colin","Ewan","Graham","Alan","Edward","Oliver","Christopher","Roger","Derek","Stuart","Neil"],
    last: ["Morrison","Stewart","Peck","Clarke","Felton","Sheridan","Luxton","Binnie","Sherlock","Watson","Aldridge","Henderson","Goodwin","Halford","Rendell","Gilbert","McLeod","Harper","Barkman","Curtis","Ross","Newman","Summers","Langdon","Adams","Roberts","Campbell","Duncan","Mitchell","Grant"],
  },
  AR: {
    first: ["Lionel","Diego","Ángel","Paulo","Gonzalo","Sergio","Nicolás","Emiliano","Leandro","Lautaro","Julián","Enzo","Alexis","Rodrigo","Maximiliano","Mauro","Lucas","Roberto","Javier","Hernán","Gabriel","Claudio","Fernando","Esteban","Matías","Federico","Joaquín","Agustín","Ramiro","Cristian"],
    last: ["Messi","Maradona","Fernández","Martínez","Álvarez","Di María","Otamendi","Paredes","Romero","Molina","De Paul","Mac Allister","Acuña","Correa","Dybala","Higuaín","Agüero","Batistuta","Simeone","Zanetti","Gallardo","Crespo","Gómez","López","Pérez","Ruiz","Medina","Sosa","Domínguez","Rossi"],
  },
  CO: {
    first: ["James","Falcao","Juan","Carlos","David","Luis","Fredy","Mario","Yerry","Dávinson","Wilmar","Mateus","Duván","Roger","Jhon","Edwin","Cuadrado","Jefferson","Adrián","Daniel","Andrés","Sebastián","Harold","Jorge","Gustavo","Oscar","Camilo","Santiago","Álvaro","Rafael"],
    last: ["Rodríguez","García","Martínez","López","Sánchez","Ospina","Zapata","Mina","Barrios","Uribe","Díaz","Cuadrado","Muriel","Borré","Lerma","Sinisterra","Arias","Mojica","Moreno","Quintero","Hernández","Asprilla","Rincón","Valderrama","Córdoba","Yepes","Perea","Guarín","Falcao","Higuita"],
  },
  CL: {
    first: ["Arturo","Alexis","Gary","Charles","Eduardo","Claudio","Mauricio","Gonzalo","Jorge","Iván","Marcelo","Matías","Erick","Ben","Diego","Pablo","Felipe","Fabián","Ángelo","Víctor","Jean","Esteban","Guillermo","Leonardo","Rodrigo","Francisco","Nicolás","Sebastián","Tomás","Cristián"],
    last: ["Vidal","Sánchez","Medel","Aránguiz","Vargas","Bravo","Isla","Jara","Valdivia","Zamorano","Salas","Díaz","Suazo","Beausejour","Pinilla","Fernández","Fuenzalida","Mena","Pizarro","Paredes","Henríquez","Gutiérrez","Silva","Muñoz","Reyes","Castillo","Contreras","Núñez","Rojas","Morales"],
  },
  NL: {
    first: ["Johan","Marco","Ruud","Dennis","Edgar","Virgil","Frenkie","Memphis","Matthijs","Daley","Wesley","Stefan","Arjen","Robin","Rafael","Clarence","Patrick","Georginio","Cody","Xavi","Donyell","Teun","Jurriën","Micky","Jeremie","Nathan","Tijjani","Ryan","Luuk","Wout"],
    last: ["van Dijk","de Jong","Bergkamp","Gullit","Rijkaard","Koeman","Kluivert","Sneijder","Robben","Cruyff","van Basten","de Boer","Davids","Seedorf","van Persie","Depay","de Ligt","Blind","Dumfries","Gakpo","Timber","Simons","Ake","Wijnaldum","Koopmeiners","Gravenberch","Weghorst","Malen","Reijnders","Frimpong"],
  },
  HR: {
    first: ["Luka","Ivan","Mateo","Marcelo","Mario","Dejan","Nikola","Ante","Joško","Borna","Andrej","Duje","Josip","Šime","Mislav","Dominik","Bruno","Lovro","Kristijan","Marko","Davor","Robert","Zvonimir","Igor","Stipe","Vedran","Danijel","Niko","Dario","Tin"],
    last: ["Modrić","Perišić","Kovačić","Brozović","Mandžukić","Lovren","Rebić","Kramarić","Vlašić","Rakitić","Šuker","Boban","Prosinečki","Tudor","Bilić","Vida","Gvardiol","Sučić","Baturina","Majer","Ivanušec","Pašalić","Orsić","Petković","Livaković","Budimir","Juranović","Stanišić","Šutalo","Erlić"],
  },
  TR: {
    first: ["Hakan","Arda","Cengiz","Burak","Emre","Ozan","Ferdi","Kerem","Barış","Çağlar","Merih","Zeki","İrfan","Yusuf","Abdülkadir","Enes","Serdar","Cenk","Okay","Kaan","Orkun","Halil","Uğurcan","Altay","Berkan","Taylan","Salih","Ridvan","Yunus","Kenan"],
    last: ["Çalhanoğlu","Güler","Ünder","Yılmaz","Belözoğlu","Kabak","Kadıoğlu","Aktürkoğlu","Söyüncü","Demiral","Çakır","Yazıcı","Ömür","Ünal","Akgün","Bayındır","Çelik","Karaman","Tufan","Yokuslu","Kökçü","Dervişoğlu","Tosun","Türüc","Özcan","Ayhan","Erkin","Şahin","Tekdemir","Mor"],
  },
  SE: {
    first: ["Zlatan","Alexander","Emil","Viktor","Dejan","Sebastian","Robin","Albin","Mattias","Ludwig","Jesper","Anthony","Jens","Marcus","Gustav","Hugo","Patrik","Henrik","Fredrik","Kristoffer","Ken","Oscar","Carl","Mikael","Pontus","Andreas","Per","Erik","Linus","Joel"],
    last: ["Ibrahimović","Isak","Forsberg","Claesson","Kulusevski","Larsson","Quaison","Olsson","Ekdal","Augustinsson","Krafth","Svanberg","Danielson","Lindelöf","Granqvist","Lustig","Jansson","Berg","Toivonen","Guidetti","Svensson","Johansson","Nilsson","Andersson","Eriksson","Karlsson","Pettersson","Lindqvist","Persson","Berglund"],
  },
  KR: {
    first: ["Son","Kim","Park","Lee","Hwang","Cho","Jung","Kang","Yoon","Kwon","Ki","Han","Hong","Jeong","Song","Jang","Bae","Ahn","Seo","Lim","Oh","Shin","Moon","Yang","Choi","Ryu","Na","Ko","Woo","Do"],
    last: ["Heung-min","Min-jae","Ji-sung","Kang-in","Hee-chan","Gue-sung","Sung-yueng","Chang-hoon","Jae-sung","In-beom","Young-gwon","Jin-su","Chul","Seung-ho","Woo-young","Hyun-jun","Tae-hwan","Jun-ho","Dong-hyun","Ui-jo","Ji-soo","Min-hyeok","Jeong-hyeon","Seung-woo","Hyeon-gyu","Sang-ho","Jin-hyeon","Yeong-jae","Se-jong","Min-woo"],
  },
  EG: {
    first: ["Mohamed","Ahmed","Mahmoud","Omar","Ali","Mostafa","Amr","Ramadan","Tarek","Karim","Trezeguet","Marwan","Ayman","Nabil","Abdallah","Ibrahim","Hassan","Hussein","Emad","Walid","Hazem","Wael","Essam","Mido","Shikabala","Zizo","Afsha","Hamdi","Galal","Saad"],
    last: ["Salah","Elneny","Hegazi","Trezeguet","Sobhi","Mohsen","Ashraf","Fathi","El Shenawy","Warda","Marmoush","Abo Gabal","Hassan","Hamdi","El Said","Ghaly","Barakat","Zidan","Mido","Aboutrika","Hossam","Meteb","Gedo","Kahraba","Mustafa","Soliman","Mohsen","Gabr","Samir","Abdel Shafy"],
  },
  UY: {
    first: ["Luis","Edinson","Diego","Federico","Rodrigo","José","Ronald","Maxi","Martín","Sebastián","Giorgian","Darwin","Matías","Nicolás","Álvaro","Nahitan","Lucas","Facundo","Mathías","Fernando","Agustín","Manuel","Brian","Guillermo","Diego","Marcelo","Gonzalo","Gastón","Cristhian","Jonathan"],
    last: ["Suárez","Cavani","Godín","Valverde","Bentancur","Giménez","Araújo","De Arrascaeta","Muslera","Cáceres","Núñez","Viña","Olivera","Ugarte","Torres","Pellistri","Ocampos","Coates","Vecino","Nández","Torreira","De la Cruz","Rodríguez","Recoba","Forlán","Francescoli","Sosa","Enzo","Álvarez","Abreu"],
  },
  AU: {
    first: ["Aaron","Mathew","Mitchell","Ajdin","Harry","Kye","Martin","Jason","Bailey","Thomas","Craig","Tim","Mark","Lucas","Awer","Garang","Riley","Connor","Cameron","Jackson","Joel","Rhyan","Nathaniel","Jamie","Keanu","Joshua","Denis","Trent","Brandon","Kusini"],
    last: ["Mooy","Ryan","Leckie","Hrustic","Souttar","Rowles","Boyle","Cummings","Duke","Behich","Irvine","McGree","Maclaren","Goodwin","Mabil","Kuol","Wright","Baccus","Atkinson","Deng","Karacic","King","Degenek","Sainsbury","Jedinak","Cahill","Kewell","Neill","Vidosic","Arzani"],
  },
  IL: {
    first: ["Eran","Yossi","Eli","Omer","Dor","Lior","Manor","Bibras","Mu'nas","Shon","Gadi","Tomer","Sagiv","Nir","Raz","Eden","Tal","Liel","Oscar","Hatem","Moanes","Sun","Dia","Eyal","Ofir","Gil","Ram","Idan","Omer","Itay"],
    last: ["Zahavi","Benayoun","Dabour","Weissman","Peretz","Solomon","Atzili","Natcho","Abu Fani","Dabbur","Haziza","Glazer","Kinda","Bitton","Revivo","Berkovic","Refaelov","Davidzada","Yeini","Menachem","Shua","Lavi","Nachmias","Abada","Shamir","Karzev","Eliyahu","Melikson","Almog","Baribo"],
  },
  IT: {
    first: ["Marco","Andrea","Alessandro","Lorenzo","Federico","Gianluigi","Leonardo","Giovanni","Nicolo","Sandro","Ciro","Francesco","Roberto","Fabio","Matteo","Giacomo","Davide","Gianluca","Claudio","Daniele","Filippo","Riccardo","Simone","Luca","Antonio","Giorgio","Emanuele","Salvatore","Angelo","Vincenzo"],
    last: ["Rossi","Bianchi","Romano","Ferrari","Esposito","Colombo","Ricci","Moretti","Marchetti","Barbieri","Fontana","Galli","Conti","Costa","Marini","Bruno","Mancini","Leone","Longo","Greco","Rinaldi","Serra","Ferrara","Pellegrini","Gentile","Martinelli","Caruso","Vitale","Benedetti","Montanari"],
  },
};

// ---------------------------------------------------------------------------
// Fallback generic names for any unmapped country
// ---------------------------------------------------------------------------

/** Generic first names used when a country code is not in COUNTRY_NAMES. */
export const GENERIC_FIRST: readonly string[] = [
  "Carlos","Ahmed","Wei","Diego","Omar","Ivan","Mateo","Felix","Leon","Oscar",
  "Pedro","Lucas","Bruno","Andre","James","Jack","Harry","Max","Marco","Luca",
] as const;

/** Generic last names used when a country code is not in COUNTRY_NAMES. */
export const GENERIC_LAST: readonly string[] = [
  "Silva","Santos","Garcia","Martinez","Mueller","Schmidt","Petrov","Rossi",
  "Tanaka","Kim","Fernandes","Costa","Torres","Ramos","Weber","Klein","Brown",
  "Taylor","Park","Chen",
] as const;

// ---------------------------------------------------------------------------
// League teams — seeded into Divisions 1-4 at game start
// ---------------------------------------------------------------------------

/**
 * All teams that begin in the league.  Eight teams per division.
 * Order within a division is arbitrary; the engine shuffles fixtures.
 */
export const TEAMS_DATA: readonly TeamData[] = [
  /* Division 1 */
  { name: "Barcelona",     div: 1, c1: "#ad1519", c2: "#fcdd09", country: "ES" },
  { name: "Madrid",        div: 1, c1: "#ad1519", c2: "#fcdd09", country: "ES" },
  { name: "Manchester",    div: 1, c1: "#cf142b", c2: "#00247d", country: "EN" },
  { name: "Liverpool",     div: 1, c1: "#cf142b", c2: "#00247d", country: "EN" },
  { name: "Porto",         div: 1, c1: "#006600", c2: "#ff0000", country: "PT" },
  { name: "Lisbon",        div: 1, c1: "#006600", c2: "#ff0000", country: "PT" },
  { name: "Rome",          div: 1, c1: "#008c45", c2: "#cd212a", country: "IT" },
  { name: "Istanbul",      div: 1, c1: "#e30a17", c2: "#ffffff", country: "TR" },
  /* Division 2 */
  { name: "Berlin",        div: 2, c1: "#000000", c2: "#ffcc00", country: "DE" },
  { name: "Dortmund",      div: 2, c1: "#000000", c2: "#ffcc00", country: "DE" },
  { name: "Paris",         div: 2, c1: "#002395", c2: "#ed2939", country: "FR" },
  { name: "Lyon",          div: 2, c1: "#002395", c2: "#ed2939", country: "FR" },
  { name: "São Paulo",     div: 2, c1: "#009c3b", c2: "#ffdf00", country: "BR" },
  { name: "Santos",        div: 2, c1: "#009c3b", c2: "#ffdf00", country: "BR" },
  { name: "Amsterdam",     div: 2, c1: "#ae1c28", c2: "#21468b", country: "NL" },
  { name: "Seoul",         div: 2, c1: "#ffffff", c2: "#cd2e3a", country: "KR" },
  /* Division 3 */
  { name: "Chicago",       div: 3, c1: "#b22234", c2: "#3c3b6e", country: "US" },
  { name: "Los Angeles",   div: 3, c1: "#b22234", c2: "#3c3b6e", country: "US" },
  { name: "Vancouver",     div: 3, c1: "#ff0000", c2: "#ffffff", country: "CA" },
  { name: "Toronto",       div: 3, c1: "#ff0000", c2: "#ffffff", country: "CA" },
  { name: "Kiev",          div: 3, c1: "#005bbb", c2: "#ffd500", country: "UA" },
  { name: "Warsaw",        div: 3, c1: "#ffffff", c2: "#dc143c", country: "PL" },
  { name: "Cairo",         div: 3, c1: "#ce1126", c2: "#ffffff", country: "EG" },
  { name: "Montevideo",    div: 3, c1: "#0038a8", c2: "#ffffff", country: "UY" },
  /* Division 4 */
  { name: "Tokyo",         div: 4, c1: "#ffffff", c2: "#bc002d", country: "JP" },
  { name: "Beijing",       div: 4, c1: "#de2910", c2: "#ffde00", country: "CN" },
  { name: "Andorra",       div: 4, c1: "#0032a0", c2: "#fedf00", country: "AD" },
  { name: "Falklands",     div: 4, c1: "#00247d", c2: "#cf142b", country: "FK" },
  { name: "Arapiraca",     div: 4, c1: "#009c3b", c2: "#ffdf00", country: "BR" },
  { name: "Buenos Aires",  div: 4, c1: "#74acdf", c2: "#ffffff", country: "AR" },
  { name: "Stockholm",     div: 4, c1: "#006aa7", c2: "#fecc02", country: "SE" },
  { name: "Melbourne",     div: 4, c1: "#00008b", c2: "#ffffff", country: "AU" },
] as const;

// ---------------------------------------------------------------------------
// Waiting-pool teams — enter Division 4 when another team is relegated out
// ---------------------------------------------------------------------------

/**
 * Teams sitting outside the league waiting for a slot to open up.
 * When a team is relegated out of Division 4, one of these replaces it.
 */
export const WAITING_TEAMS_DATA: readonly WaitingTeam[] = [
  { name: "Bogota",    c1: "#fcd116", c2: "#003893", country: "CO" },
  { name: "Santiago",  c1: "#d52b1e", c2: "#0039a6", country: "CL" },
  { name: "Zagreb",    c1: "#ff0000", c2: "#ffffff", country: "HR" },
  { name: "Tel Aviv",  c1: "#0038b8", c2: "#ffffff", country: "IL" },
] as const;
