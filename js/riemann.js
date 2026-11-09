/* Interactive "more rectangles = more precise area" demo for the integral article */
(function () {
  const box = document.getElementById("riemann");
  if (!box) return;
  const f = (x) => 3.2 + 1.5 * Math.sin(0.95 * x - 0.6) + 0.22 * x;
  const X0 = 60, X1 = 560, W = 10, BASE = 250, TOP = 30, YMAX = 7;
  const px = (x) => X0 + ((X1 - X0) * x) / W;
  const py = (y) => BASE - ((BASE - TOP) * y) / YMAX;
  const svgNS = "http://www.w3.org/2000/svg";
  const rectsG = box.querySelector(".riemann-rects");
  const range = box.querySelector(".riemann-range");
  const nOut = box.querySelector(".riemann-n");
  const sumOut = box.querySelector(".riemann-sum");
  const exactOut = box.querySelector(".riemann-exact");
  const errOut = box.querySelector(".riemann-err");

  let d = "";
  for (let i = 0; i <= 200; i++) {
    const x = (i / 200) * W;
    d += (i ? " L" : "M") + px(x).toFixed(1) + "," + py(f(x)).toFixed(1);
  }
  box.querySelector(".riemann-curve").setAttribute("d", d);
  box.querySelector(".riemann-axes").setAttribute("d", `M${px(0)},20 L${px(0)},${BASE} L${X1 + 30},${BASE}`);

  let exact = 0;
  const N = 20000;
  for (let k = 0; k < N; k++) exact += f(((k + 0.5) * W) / N);
  exact *= W / N;
  exactOut.textContent = exact.toFixed(2);

  function draw(n) {
    rectsG.textContent = "";
    const dw = W / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const h = f(i * dw); // left rectangles, like on the drawing
      sum += h * dw;
      const r = document.createElementNS(svgNS, "rect");
      const gap = n > 30 ? 0.5 : 1.5;
      r.setAttribute("x", (px(i * dw) + gap / 2).toFixed(2));
      r.setAttribute("y", py(h).toFixed(2));
      r.setAttribute("width", Math.max(0.5, px(dw) - px(0) - gap).toFixed(2));
      r.setAttribute("height", (BASE - py(h)).toFixed(2));
      r.setAttribute("fill", "#85b0ea");
      rectsG.appendChild(r);
    }
    nOut.textContent = n;
    sumOut.textContent = sum.toFixed(2);
    errOut.textContent = ((Math.abs(sum - exact) / exact) * 100).toFixed(1) + "%";
  }
  range.addEventListener("input", () => draw(parseInt(range.value, 10)));
  draw(parseInt(range.value, 10));
})();
