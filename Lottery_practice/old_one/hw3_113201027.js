"use strict";
let Aball = [];

window.onload = function () {
  Aball = Array.from(document.querySelectorAll(".ball"));
};

function drawBalls() {
  const used = new Set();

  for (let i = 0; i < Aball.length; i++) {
    setTimeout(function () {
      let count = 0;
      let interval = setInterval(function () {
        let num;
        do {
          num = Math.floor(Math.random() * 49) + 1;
        } while (used.has(num));

        Aball[i].innerText = num;
        count++;
        if (count > 20 + i * 2) {
          clearInterval(interval);
          Aball[i].classList.add("show");
          used.add(num);
        }
      }, 66);
    }, i * 500);
  }
}


 
