let Aball = [];

window.onload = function () {
  Aball = Array.from(document.querySelectorAll(".ball"));

  document.getElementById("spinBtn").addEventListener("click", function () {
    const used = new Set();
    const btn = this;
    btn.disabled = true;
    btn.innerText = "抽號碼中...";

    for (let i = 0; i < Aball.length; i++) {
      (function(index) {
        let ball = Aball[index];
        ball.classList.remove("show");
        ball.classList.add("spinning");

        let rolling = setInterval(function() {
          ball.innerText = Math.floor(Math.random() * 49) + 1;
        }, 50);

        setTimeout(function () {
          clearInterval(rolling);
          let finalNum;
          do {
            finalNum = Math.floor(Math.random() * 49) + 1;
          } while (used.has(finalNum));
          used.add(finalNum);

          ball.innerText = finalNum;
          ball.classList.remove("spinning");
          ball.classList.add("show");

          if (index === Aball.length - 1) {
            btn.disabled = false;
            btn.innerText = "抽號碼";
          }
        }, 1000 + index * 300);
      })(i);
    }
  });
};

