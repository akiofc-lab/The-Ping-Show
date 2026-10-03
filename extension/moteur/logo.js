/* Le logo « the ping show » : le « p » et le « g » sont des yeux qui louchent.
 *
 * Le tracé vient du logo fourni (vectorisé une fois pour toutes). Chaque œil
 * est fait d'un blanc (une ellipse : l'intérieur de la lettre) et d'une
 * pupille ronde. Les pupilles suivent le pointeur de la souris, mais chacune
 * vise un peu à côté : elles restent de travers. Pointeur absent, elles
 * reprennent la pose du logo.
 */
(function (racine) {
  "use strict";

  const LARGEUR = 1101, HAUTEUR = 787;
  const LETTRES = "M219 761.5C195.3 757.2 176.7 738.3 175.3 716.9L174.7 709L186.3 709C198.6 709 199 709.2 199 714.3C199.1 721.2 208 732.4 216.3 736.1C222.6 738.8 238.4 739.9 246.5 738.1C263.9 734.2 268.9 712.2 254.4 703C251.8 701.4 247.6 699.3 245.1 698.4C212.9 686.5 200.3 680.3 192.2 672.1C173.2 652.7 180 620.1 205.8 607.1C221.5 599.2 243.6 598.7 258 606C271.7 612.9 280.3 626.9 282.4 645.3L283 651.1L271.9 650.8L260.7 650.5L259.3 645C255.9 631.5 247.4 624.7 233.7 624.6C216.7 624.5 207 631.8 207 644.7C207 654.8 212.2 658.7 242 671.5C265.9 681.7 272 685.1 278.4 692C285.2 699.2 287.3 704.6 287.8 715.7C289.4 749.6 260.4 769 219 761.5ZM549 761.6C509.3 753.3 485.3 720.5 487.3 677.5C488 663.3 489.8 655.4 495.1 644.3C505.1 623.3 524.1 607.9 546.7 602.5C558 599.8 576.8 600.8 587.7 604.7C612.1 613.5 629.8 632.9 636.6 658.5C639.3 668.3 639.3 696.5 636.6 705.9C629.2 732.8 608.4 753.7 582.5 760.6C574.2 762.8 557.1 763.3 549 761.6ZM323 650.5L323 540.9L335.8 541.2L348.5 541.5L349 592.5C349.3 620.5 349.6 642.8 349.8 641.9C350.4 637.1 358.7 623.2 364.6 617.1C375.2 605.8 386.7 601 403 601C428.8 601 446.6 613.8 453.6 637.5C455.2 642.9 455.4 649.7 455.7 701.8L456.1 760L443.1 760L430 760L430 705.8C429.9 656.3 429.8 651 428.1 646.3C424.6 636.2 418.9 630.5 409.1 627.6C388 621.4 364 633 353.3 654.6L349.5 662.4L349.2 711.2L348.9 760L336 760L323 760L323 650.5ZM702.6 755.2C700.4 748.4 658 609 657.3 606.3L656.8 603.9L670.5 604.2L684.3 604.5L700.4 664.2C709.3 697 716.8 723.6 717.1 723.2C717.7 722.6 747.9 627.7 753.6 608.8L755.1 604L770.5 604L785.9 604L790.4 618.2C792.8 626.1 801.3 653.1 809.1 678.3C817 703.5 823.7 723.5 824.1 722.8C824.4 722.1 831.6 696.5 839.9 666C848.3 635.5 855.6 609 856.1 607.2L857.2 604L870.6 604C878.1 604 884 604.4 884 604.9C884 605.4 874.6 636.6 863.1 674.2C851.6 711.8 841 746.4 839.5 751.2L836.9 760L825.1 760L813.2 760L802.5 728.2C796.6 710.8 787 682.4 781.2 665.1C774.9 646.2 770.4 634.3 770 635.1C769.6 635.9 759.9 664.3 748.4 698.2L727.5 760L715.8 760L704.2 760L702.6 755.2ZM575.5 737.5C605.6 729.6 621.8 694 610.5 660.4C593.9 611.1 527.9 613.6 514.4 664C512.1 672.8 512.1 691.2 514.4 700C521.8 727.7 549 744.4 575.5 737.5ZM24 415L24 209L46.4 209L68.8 209L69.4 215.2C69.7 218.7 70.2 235.6 70.6 252.9L71.3 284.2L74.4 273.9C86.5 234.3 108 212.9 143.2 205.3C156.5 202.4 185.6 202.7 197.5 205.9C250.1 219.7 289.8 270.1 297 332.1C298.8 347.5 297.8 380.5 295.1 393.4C278.7 472.6 211.2 522.7 143.9 505.6C110.8 497.2 87 469.6 74 424.5L71.1 414.5L71.1 517.8L71 621L47.5 621L24 621L24 415ZM1006.7 607.2C1005.2 573.1 994.4 557.9 966.7 550.9C959.1 548.9 954.6 548.7 909 548C878.8 547.5 857.4 546.7 854 546.1C822.5 539.5 807 523.4 807 497.5C807 469.1 825.9 452.4 862.1 448.8L874.1 447.7L866.9 444.3C833.6 428.9 809.5 397.8 801.3 359.7C798.7 347.9 798.7 313 801.3 301C812.5 248.7 852.4 210.9 903.7 204C917.3 202.1 937 203.2 949.5 206.4L959.5 209L1018.2 209L1077 209L1076.8 234.2L1076.5 259.5L1068 259.2C1051.5 258.6 1033.6 253.9 1010.4 244L999.2 239.3L1008 247.6C1029.6 268.2 1040 292.4 1041.6 325.5C1044.7 390.1 1006.2 441.9 946.2 453.9C940.9 455 928.2 456.4 918 457C888.4 458.7 869.8 462.1 862.6 467.1C853.4 473.3 851.8 487.3 859.3 495C866.5 502.3 871.2 503 920 503C961.9 503 970.5 503.7 988 508.1C1021.5 516.7 1043.3 536.8 1051.1 566.5C1052.9 573.2 1053.3 578.3 1053.7 597.8L1054.2 621L1030.8 621L1007.3 621L1006.7 607.2ZM362 356L362 209L386 209L410 209L410 356L410 503L386 503L362 503L362 356ZM490 356L490 209L513.5 209L537 209L537.1 248.8L537.1 288.5L540.9 277.9C555.8 236.3 584.9 210.2 623.3 204C632.8 202.4 654.5 203.2 664.6 205.4C699.5 213 723.6 234.9 734 268.8C738.9 284.7 739 286.5 739 398.2L739 503L715.5 503L692 503L692 408.2C692 345.6 691.6 310.5 690.9 304.5C687.4 275.9 674.3 259.3 650.3 252.9C639.3 249.9 618.8 249.9 607.5 252.9C576.9 260.9 550.9 286.2 540.1 318.6L537 327.8L537 415.4L537 503L513.5 503L490 503L490 356ZM180 463C204.3 456.2 226.3 436.8 239 411.2C259.2 370.2 255.7 319 230.3 283.3C197.9 237.8 139.4 233 100.9 272.7C58.1 316.7 58.6 399.5 101.9 442C122.5 462.2 153.3 470.4 180 463ZM936.9 411.3C948.2 408.8 959.5 402.3 969.9 392.5C999.7 364.3 1004.6 314.8 981 280C974.7 270.8 961.6 259 952.6 254.7C929.1 243.2 902 244.7 881.8 258.6C858 275 844.9 300.7 844.9 330.5C845 355.7 853 375.2 870.4 392.6C888.3 410.5 911.7 417 936.9 411.3ZM118.3 175.9C113.6 173.6 109.6 168.4 108.1 162.5C107.3 159.3 93 91.2 93 90.4C93 90.3 91.3 90.4 89.2 90.7L85.3 91.2L83.6 83C81.6 74.1 82 73 86.8 73C89.4 73 89.4 72.6 87.5 64C86.8 60.4 86.2 57.5 86.3 57.4C86.4 57.4 90.1 56.6 94.4 55.6C102.5 53.9 103.9 54.2 104 57.7C104 58.4 104.5 61.2 105.1 63.9C106.2 69.4 106 69.3 113.1 67.4C114.3 67.1 115 68.6 116.3 74.5C118.6 84.9 118.6 84.9 114 85.6C111.8 86 110 86.5 110 86.7C110 88.2 123.2 151.1 124.1 153.8C125.1 156.9 125.5 157.1 128.8 156.8L132.5 156.5L134.5 166.2L136.6 175.8L131.1 176.9C123.8 178.4 123.2 178.3 118.3 175.9ZM127.6 101.8C119.4 62 112.7 29.1 112.6 28.6C112.5 27.3 128.3 23.9 129 25C129.3 25.5 131.3 34.4 133.4 44.7C135.5 55 137.6 63.9 138 64.4C138.5 64.8 139.3 64.3 139.9 63.1C143.8 55.9 155.3 56.9 160.6 64.9C163.7 69.6 183.8 164.9 182 166C180.4 167 167.1 169.4 166.5 168.9C166.3 168.6 161.9 148.6 156.9 124.4C151.9 100.3 147.2 79.9 146.5 79.1C145 77.6 142.2 78.2 141.5 80.2C141.2 80.9 145.2 101.6 150.3 126.2L159.6 170.9L154.8 171.9C152.2 172.5 148.3 173.2 146.3 173.6L142.5 174.2L127.6 101.8ZM198.4 160.6C193.2 158.2 189 153.8 187.1 148.7C186.5 147.2 182.6 129.7 178.5 109.7C170 69.3 169.8 66.8 175 58.6C180 50.7 191.1 47.6 199.6 51.6C203.8 53.6 209.6 60.1 211 64.4C213.1 70.8 219.9 105.5 219.2 106.1C218.8 106.4 213.8 107.7 208 108.9C202.3 110.1 197.4 111.3 197.1 111.5C196.6 112 201.8 138.2 203.1 141.8C204.1 144.3 207.8 144.8 208.7 142.4C209 141.6 208.3 136.3 207.2 130.7C206.1 125.1 205.4 120.3 205.6 120.1C205.8 119.9 209.6 118.9 214 118C221.3 116.4 222 116.3 222.4 117.9C229.8 143.6 226.2 157.9 211.5 161.9C205.8 163.4 204.2 163.3 198.4 160.6ZM355 120L355 91L386 91L417 91L416.8 119.8L416.5 148.5L385.8 148.8L355 149L355 120ZM199.7 95.6C200.3 95 194.8 70.5 193.8 69.2C192.3 67.5 190.2 67.7 189.1 69.8C188.5 70.9 189.1 75.6 190.9 84.3L193.5 97.1L196.4 96.6C198 96.2 199.5 95.8 199.7 95.6Z";
  // Pour chaque œil : centre et rayons du blanc, demi-axes de la course de la
  // pupille, rayon de la pupille, angle de la pose du logo (repos) et écart
  // gardé par rapport au pointeur quand l'œil le suit.
  const YEUX = [{"cx": 160.0, "cy": 355.2, "rx": 91.3, "ry": 109.8, "a": 52.5, "b": 63.2, "r": 55.1, "repos": 0.8783, "ecart": 0.5}, {"cx": 919.8, "cy": 329.6, "rx": 75.4, "ry": 83.0, "a": 40.6, "b": 44.8, "r": 55.6, "repos": -2.4483, "ecart": -0.5}];

  function position(oeil, angle, portee) {
    return [oeil.cx + oeil.a * portee * Math.cos(angle), oeil.cy + oeil.b * portee * Math.sin(angle)];
  }

  function svg() {
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" class="logo" role="img" aria-label="The Ping Show">`;
    YEUX.forEach((oeil, k) => {
      const [x, y] = position(oeil, oeil.repos, 1);
      const blanc = `<ellipse cx="${oeil.cx}" cy="${oeil.cy}" rx="${oeil.rx}" ry="${oeil.ry}"`;
      s += `<clipPath id="logo-oeil-${k}">${blanc}/></clipPath>${blanc} class="logo-blanc"/>`;
      s += `<g clip-path="url(#logo-oeil-${k})"><circle class="logo-pupille" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${oeil.r}"/></g>`;
    });
    return s + `<path class="logo-lettres" fill-rule="evenodd" d="${LETTRES}"/></svg>`;
  }

  // Fait suivre le pointeur aux pupilles du logo placé dans `element`.
  function animer(element) {
    const dessin = element.querySelector("svg");
    const pupilles = [...element.querySelectorAll(".logo-pupille")];
    if (!dessin || pupilles.length !== YEUX.length) return;
    const calme = racine.matchMedia && racine.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const etat = YEUX.map((oeil) => ({ angle: oeil.repos, vise: oeil.repos, portee: 1, porteeVisee: 1 }));
    let image = 0;

    function pas() {
      image = 0;
      let bouge = false;
      const vitesse = calme ? 1 : 0.22;
      etat.forEach((e, k) => {
        let ecart = e.vise - e.angle;
        ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));  // par le plus court chemin
        e.angle += ecart * vitesse;
        e.portee += (e.porteeVisee - e.portee) * vitesse;
        const [x, y] = position(YEUX[k], e.angle, e.portee);
        pupilles[k].setAttribute("cx", x.toFixed(1));
        pupilles[k].setAttribute("cy", y.toFixed(1));
        if (Math.abs(ecart) > 0.002 || Math.abs(e.porteeVisee - e.portee) > 0.002) bouge = true;
      });
      if (bouge) image = requestAnimationFrame(pas);
    }
    const relancer = () => { if (!image) image = requestAnimationFrame(pas); };

    racine.addEventListener("pointermove", (evenement) => {
      const cadre = dessin.getBoundingClientRect();
      if (!cadre.width) return;
      const echelle = cadre.width / LARGEUR;
      etat.forEach((e, k) => {
        const dx = evenement.clientX - (cadre.left + YEUX[k].cx * echelle);
        const dy = evenement.clientY - (cadre.top + YEUX[k].cy * echelle);
        e.vise = Math.atan2(dy, dx) + YEUX[k].ecart;
        // Tout près de l'œil, la pupille revient un peu vers le centre.
        e.porteeVisee = Math.max(0.4, Math.min(1, Math.hypot(dx, dy) / (cadre.width * 0.3)));
      });
      relancer();
    }, { passive: true });
    const auRepos = () => { etat.forEach((e, k) => { e.vise = YEUX[k].repos; e.porteeVisee = 1; }); relancer(); };
    document.documentElement.addEventListener("pointerleave", auRepos);
    racine.addEventListener("blur", auRepos);
  }

  const api = { svg, animer, YEUX, LARGEUR, HAUTEUR, position };
  racine.PingLogo = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
