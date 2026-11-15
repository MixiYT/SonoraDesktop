const timestamp = (minutes, seconds) => Number(minutes) * 60 + Number(seconds.replace(",", "."));

export function timedLyrics(text) {
  const offset = Number(text.match(/^\[offset:([+-]?\d+)\]/mi)?.[1] || 0) / 1000;
  return text.split(/\r?\n/).flatMap(line => {
    const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{2}(?:[.,]\d+)?)\]/g)];
    const content = line.replace(/^(?:\[[^\]]*\])+/, "").trim();
    if (!content || !stamps.length) return [];
    const markers = [...content.matchAll(/<(\d{1,3}):(\d{2}(?:[.,]\d+)?)>/g)];
    const first = markers[0];
    const parts = markers.map((mark, i) => ({
      time: Math.max(0, timestamp(mark[1], mark[2]) + offset),
      text: content.slice(mark.index + mark[0].length, markers[i + 1]?.index ?? content.length),
    }));
    if (first?.index > 0) parts.unshift({ time: null, text: content.slice(0, first.index) });
    return stamps.map(stamp => ({
      time: Math.max(0, timestamp(stamp[1], stamp[2]) + offset),
      parts: parts.length ? parts : [{ time: null, text: content }],
    }));
  }).sort((a, b) => a.time - b.time);
}

export function drawLyrics(area, text, interactive = false) {
  const lines = timedLyrics(text);
  if (!lines.length) {
    const block = document.createElement("pre");
    block.textContent = text;
    area.replaceChildren(block);
    return;
  }
  area.replaceChildren(...lines.map(line => {
    const row = document.createElement(interactive ? "button" : "p");
    row.dataset.time = line.time;
    if (interactive) {
      const clock = document.createElement("time");
      const second = Math.floor(line.time);
      clock.textContent = Math.floor(second / 60) + ":" + String(second % 60).padStart(2, "0");
      row.append(clock);
    }
    for (const part of line.parts) {
      const span = document.createElement("span");
      span.textContent = part.text;
      if (part.time !== null) span.dataset.wordTime = part.time;
      row.append(span);
    }
    return row;
  }));
}

export function followLyrics(area, time, autoScroll = true, motion = true) {
  const line = [...area.children].findLast(row => Number(row.dataset.time) <= time);
  const previous = area.querySelector(".current");
  if (line !== previous) {
    previous?.classList.remove("current");
    previous?.querySelectorAll(".sung").forEach(word => word.classList.remove("sung"));
    line?.classList.add("current");
    if (line && autoScroll) {
      area.scrollTo({
        top: area.scrollTop + line.getBoundingClientRect().top - area.getBoundingClientRect().top
          - (area.clientHeight - line.clientHeight) / 2,
        behavior: !motion || matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    }
  }
  line?.querySelectorAll("[data-word-time]").forEach(word => {
    word.classList.toggle("sung", Number(word.dataset.wordTime) <= time);
  });
}
