/* Deviner si un pseudo est plutôt masculin ou féminin, d'après le prénom.
 *
 * C'est une simple liste de prénoms courants (français, anglais et quelques
 * autres) : quand le pseudo n'en contient pas, ou que le prénom est mixte,
 * la fonction ne tranche pas et la voix est tirée au sort. Une devinette peut
 * se tromper : le panneau permet toujours de corriger à la main.
 */
(function (racine) {
  "use strict";

  const HOMMES = `
    aaron adam adrian adrien ahmed akio alain alan albert alexander alexandre ali alphonse amir andre andrei
    andrew andy anthony antoine antonin antonio armand arnaud arthur aurelien austin axel baptiste bastien ben
    benjamin benoit bernard bertrand bill billy bob bobby brad bradley brandon brian bruce bruno bryan caleb
    carl carlos cedric chad charles christian christophe christopher clement colin connor corentin craig cyril
    damien dan daniel danny dave david dean denis dennis derek didier diego dmitri dominic donald doug douglas
    dylan ed eddie edouard edward eli elijah eliott emile emmanuel enzo eric erik ethan etienne eugene evan
    fabien fabrice felix florent florian francesco francis franck francois frank fred frederic gabriel gael
    gaetan gary gaspard gauthier geoffrey george georges gerard gilbert gilles giovanni giuseppe gordon graham
    greg gregoire gregory guillaume gustave guy hans harry hassan henri henry herve hiroshi howard hugo ian
    ibrahim isaac ivan jack jacob jacques jake jamal james jason javier jean jeff jeffrey jeremie jeremy
    jerome jerry jim jimmy joe joel john johnny jon jonathan jorge jose joseph josh joshua juan jules julien
    justin karim keith ken kenji kenneth kevin khalid klaus kyle larry lars laurent lawrence leo leon leonard
    liam lionel logan loic lorenzo louis luc luca lucas ludovic luis luke marc marcel marco mario marius mark
    martin mason mateo mathieu mathis matt matthew matthieu max maxence maxime michael michel mickael miguel
    mike mohamed mohammed muhammad mustafa nathan neil nicholas nick nicolas noah noe oliver olivier omar
    oscar owen pablo pascal patrice patrick paul pavel pedro peter phil philip philippe pierre quentin rafael
    rahul raj ralph randy raphael ravi ray raymond remi remy renaud rene richard rick rob robert rodolphe
    roger romain ron ronald ross roy russell ryan samuel scott sean sebastian sebastien serge sergei sergio
    seth shane shawn simon stefan stephane stephen steve steven stuart sven sylvain takeshi ted theo theodore
    thibault thibaut thierry thomas tim timothee timothy todd tom tommy tony travis trevor tristan tyler
    valentin victor vikram vincent vladimir walter wayne will william xavier yanis yann yusuf yvan yves zach
    zachary zacharie
    abdul abdullah aditya ahmad akash alejandro alessandro amit anand andres anil arjun arturo ashok bilal
    carlo cole darius deepak dev dustin edwin elliot emre enrique ernest faisal farid felipe fernando gavin
    hamza harold haruto hussein imran isaiah jared javad jesse joaquin julian karan kareem kofi kumar kwame
    landon manuel marcus mehdi mehmet minho mitchell nate nathaniel naveen nikhil nikolai nolan omid preston
    rajesh rakesh ramon reggie reza ricardo roberto rohan said salman sami sandeep sanjay santiago spencer
    stanley sunil suresh tariq tomas trent vijay vince vivek wesley wyatt xander youssef yusuke zaid zain`;

  const FEMMES = `
    abigail adele agathe agnes aisha alice alicia aline alison amanda amandine amber amelie amy ana anais
    anastasia angela angelique anna anne annie ashley audrey aurelie aurore axelle ayesha barbara beatrice
    becky benedicte bernadette beth betty brenda brigitte brittany capucine carmen carol carole caroline
    catherine cecile celia celine chantal charlotte cheryl chiara chloe christelle christina christine
    claire clara clemence clementine colette coralie corinne cynthia daisy debbie deborah delphine denise
    diana diane donna dorothy elea elena eleonore elisa elisabeth elise elizabeth ella ellen elodie eloise
    emilie emily emma erin estelle eva eve evelyn fabienne fanny fatima fiona florence francesca francoise
    gabrielle genevieve geraldine giulia grace hannah heather helen helene holly ines ingrid irina isabel
    isabella isabelle jade jane janet jeanne jennifer jenny jessica jill joan josephine judith julia julie
    juliette justine karen karine kate katherine kathy katie kelly kimberly laetitia laura laure lauren
    laurence layla lea leila lena leonie lila lily lina linda lisa lise louise lucia lucie lucile lucy
    ludivine lynn madeleine madison maelle maeva manon margaret margaux margot marguerite maria mariam
    marianne marie marine marion marthe martine mary mathilde megan mei melanie melissa mia michele michelle
    mireille molly monique morgane muriel myriam nadia nadine nancy natalie natasha nathalie nicole nina
    noemie oceane odile olga olivia ophelie pamela pascale patricia pauline perrine priya rachel rebecca
    romane rose ruby ruth sabine sabrina sakura salome samantha sandra sandrine sara sarah sharon simone
    sofia solene sonia sophia sophie stephanie susan suzanne svetlana sylvie tatiana tina tracy valentina
    valentine valerie vanessa veronique victoria virginie wendy yasmine yse yuna yvonne zara zoe
    aaliyah aditi aiko alejandra alexa alexandra alexia amara amina ananya anita anjali antonia aria ariana
    asha ava beatriz bella bianca camila carla carolina cassandra catalina chanel claudia cristina daniela
    deepika divya eleni elif esther farah fatma gabriela gloria hana haruka hina imani isha ivy jasmine
    joanna josefina julieta kavita keiko khadija kiara lakshmi lara leah luna mariana mariko maya meera mina
    naomi natalia neha nour olena paola paula penelope pooja rania riya rosa samira sana shreya sienna sneha
    sonya stella sunita tanya teresa veronica violet vivian whitney willow ximena yara zainab zeynep`;

  const hommes = new Set(HOMMES.split(/\s+/).filter(Boolean));
  const femmes = new Set(FEMMES.split(/\s+/).filter(Boolean));

  // Renvoie "h", "f", ou null quand le pseudo ne permet pas de trancher.
  function deviner(pseudo) {
    const brut = String(pseudo || "");
    // Pronoms affichés dans le pseudo : « (she/her) », « il/lui »…
    if (/\b(she\s*\/\s*her|elle\s*\/\s*elle|elle\s*\/\s*la)\b/i.test(brut) || /\((elle|she)\)/i.test(brut)) return "f";
    if (/\b(he\s*\/\s*him|il\s*\/\s*lui)\b/i.test(brut) || /\((il|he)\)/i.test(brut)) return "h";

    const mots = brut
      .replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, "$1 $2")        // « JeanDupont » -> « Jean Dupont »
      .normalize("NFD").replace(/[̀-ͯ]/g, "")  // sans accents
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((m) => m.length >= 2);
    for (const mot of mots) {
      const h = hommes.has(mot), f = femmes.has(mot);
      if (h && !f) return "h";
      if (f && !h) return "f";
    }
    return null;
  }

  const api = { deviner };
  racine.PingGenre = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
