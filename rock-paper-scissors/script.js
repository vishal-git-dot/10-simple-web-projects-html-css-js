// Rock • Paper • Scissors — Vanilla JS
(() => {
  "use strict";

  const CHOICES = ["rock", "paper", "scissors"];
  const ICONS = {
    rock: "✊",
    paper: "✋",
    scissors: "✌️",
    unknown: "—",
  };

  // Winner rules map (clean + easy to verify)
  const RULES = {
    rock: { scissors: "win", paper: "lose", rock: "draw" },
    paper: { rock: "win", scissors: "lose", paper: "draw" },
    scissors: { paper: "win", rock: "lose", scissors: "draw" },
  };

  // Timing (ms) — matches your spec
  const TIMING = {
    computerShuffle: 600,
    revealPause: 200,
    highlightDuration: 900,
  };

  // State
  const state = {
    playerChoice: null,
    computerChoice: null,
    result: null, // "win" | "lose" | "draw"
    playerScore: 0,
    computerScore: 0,
    draws: 0,
    roundsPlayed: 0,
    isAnimating: false,

    // settings
    bestOf: 0, // 0 = off, else 3/5/7
    historyEnabled: true,
    smoothScroll: true,
    tinyFeedback: false,

    history: [], // last 5 rounds
  };

  // Elements
  const els = {
    themeBtn: document.getElementById("themeBtn"),
    resetBtn: document.getElementById("resetBtn"),
    settingsBtn: document.getElementById("settingsBtn"),

    arena: document.getElementById("arena"),
    playerPanel: document.getElementById("playerPanel"),
    computerPanel: document.getElementById("computerPanel"),

    playerIcon: document.getElementById("playerIcon"),
    computerIcon: document.getElementById("computerIcon"),
    playerChoiceText: document.getElementById("playerChoiceText"),
    computerChoiceText: document.getElementById("computerChoiceText"),

    playerStatus: document.getElementById("playerStatus"),
    computerStatus: document.getElementById("computerStatus"),
    roundStatus: document.getElementById("roundStatus"),

    choiceBtns: Array.from(document.querySelectorAll(".choice")),

    playerScore: document.getElementById("playerScore"),
    computerScore: document.getElementById("computerScore"),
    draws: document.getElementById("draws"),
    roundsPlayed: document.getElementById("roundsPlayed"),
    bestOfLabel: document.getElementById("bestOfLabel"),

    resultCard: document.getElementById("result"),
    resultTitle: document.getElementById("resultTitle"),
    resultBadge: document.getElementById("resultBadge"),
    resultExplain: document.getElementById("resultExplain"),
    recapPlayer: document.getElementById("recapPlayer"),
    recapComputer: document.getElementById("recapComputer"),
    playAgainBtn: document.getElementById("playAgainBtn"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),

    historySection: document.getElementById("history"),
    historyList: document.getElementById("historyList"),

    // settings modal
    modalBackdrop: document.getElementById("modalBackdrop"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    saveSettingsBtn: document.getElementById("saveSettingsBtn"),
    bestOfSelect: document.getElementById("bestOfSelect"),
    historyToggle: document.getElementById("historyToggle"),
    scrollToggle: document.getElementById("scrollToggle"),
    soundToggle: document.getElementById("soundToggle"),

    // final modal
    finalBackdrop: document.getElementById("finalBackdrop"),
    closeFinalBtn: document.getElementById("closeFinalBtn"),
    finalMsg: document.getElementById("finalMsg"),
    restartMatchBtn: document.getElementById("restartMatchBtn"),
    keepPlayingBtn: document.getElementById("keepPlayingBtn"),
  };

  // Helpers
  const clampHistory = () => {
    if (state.history.length > 5) state.history = state.history.slice(0, 5);
  };

  const pickRandomChoice = () => {
    // equal probability
    const idx = Math.floor(Math.random() * CHOICES.length);
    return CHOICES[idx];
  };

  const getWinner = (player, computer) => RULES[player][computer];

  const pretty = (c) => (c ? c[0].toUpperCase() + c.slice(1) : "—");

  function setButtonsEnabled(enabled) {
    els.choiceBtns.forEach((b) => (b.disabled = !enabled));
  }

  function clearHighlights() {
    els.playerPanel.classList.remove("win", "lose");
    els.computerPanel.classList.remove("win", "lose");
  }

  function pop(el) {
    el.classList.remove("pop");
    // force reflow to restart animation
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function updateScoreboard(popped = null) {
    els.playerScore.textContent = String(state.playerScore);
    els.computerScore.textContent = String(state.computerScore);
    els.draws.textContent = String(state.draws);
    els.roundsPlayed.textContent = String(state.roundsPlayed);

    if (popped === "player") pop(els.playerScore);
    if (popped === "computer") pop(els.computerScore);
    if (popped === "draw") pop(els.draws);
    if (popped === "round") pop(els.roundsPlayed);

    if (state.bestOf > 0) {
      const target = Math.ceil(state.bestOf / 2);
      els.bestOfLabel.textContent = `Best-of: ${state.bestOf} (first to ${target})`;
    } else {
      els.bestOfLabel.textContent = "Best-of: Off";
    }
  }

  function updatePanels({ playerChoice, computerChoice, thinking = false } = {}) {
    if (thinking) {
      els.computerPanel.classList.add("thinking");
      els.computerStatus.textContent = "Thinking…";
    } else {
      els.computerPanel.classList.remove("thinking");
      els.computerStatus.textContent = computerChoice ? "Locked" : "Waiting";
    }

    els.playerIcon.textContent = playerChoice ? ICONS[playerChoice] : ICONS.unknown;
    els.computerIcon.textContent = computerChoice ? ICONS[computerChoice] : ICONS.unknown;

    els.playerChoiceText.textContent = playerChoice ? pretty(playerChoice) : "Pick a move";
    els.computerChoiceText.textContent = computerChoice ? pretty(computerChoice) : "…";

    els.playerStatus.textContent = playerChoice ? "Locked" : "Ready";
  }

  function setResultCard({ title, badge, explain, recapP, recapC }) {
    els.resultTitle.textContent = title;
    els.resultBadge.textContent = badge;
    els.resultExplain.textContent = explain;
    els.recapPlayer.textContent = recapP;
    els.recapComputer.textContent = recapC;

    els.resultCard.classList.remove("hidden");
  }

  function hideResultCard() {
    els.resultCard.classList.add("hidden");
  }

  function explainOutcome(player, computer, outcome) {
    if (outcome === "draw") return "Same choice — it’s a draw.";
    const line =
      (player === "rock" && computer === "scissors") || (player === "scissors" && computer === "paper") || (player === "paper" && computer === "rock")
        ? `${pretty(player)} beats ${pretty(computer)}.`
        : `${pretty(computer)} beats ${pretty(player)}.`;
    return line;
  }

  function badgeText(outcome) {
    if (outcome === "win") return "YOU WIN";
    if (outcome === "lose") return "YOU LOSE";
    return "DRAW";
  }

  function applyHighlights(outcome) {
    clearHighlights();
    if (outcome === "win") {
      els.playerPanel.classList.add("win");
      els.computerPanel.classList.add("lose");
    } else if (outcome === "lose") {
      els.playerPanel.classList.add("lose");
      els.computerPanel.classList.add("win");
    } else {
      // draw: no panel glow, keep it clean
    }
  }

  function maybeScrollToResult() {
    if (!state.smoothScroll) return;
    const isSmall = window.matchMedia("(max-width: 780px)").matches;
    if (!isSmall) return;

    els.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderHistory() {
    els.historySection.style.display = state.historyEnabled ? "" : "none";
    if (!state.historyEnabled) return;

    els.historyList.innerHTML = "";
    state.history.forEach((h) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const left = document.createElement("div");
      left.className = "h-icons";
      left.textContent = `${ICONS[h.player]}  vs  ${ICONS[h.computer]}`;

      const mid = document.createElement("div");
      mid.className = "h-line";
      mid.textContent = `Round ${h.round}: You ${pretty(h.player)} • Computer ${pretty(h.computer)}`;

      const right = document.createElement("div");
      right.className = `badge ${h.outcome}`;
      right.textContent = badgeText(h.outcome);

      li.appendChild(left);
      li.appendChild(mid);
      li.appendChild(right);
      els.historyList.appendChild(li);
    });
  }

  function clearHistory() {
    state.history = [];
    renderHistory();
  }

  function resetScores(keepSettings = true) {
    state.playerChoice = null;
    state.computerChoice = null;
    state.result = null;

    state.playerScore = 0;
    state.computerScore = 0;
    state.draws = 0;
    state.roundsPlayed = 0;

    state.isAnimating = false;

    if (!keepSettings) {
      state.bestOf = 0;
      state.historyEnabled = true;
      state.smoothScroll = true;
      state.tinyFeedback = false;
    }

    clearHighlights();
    updatePanels({ playerChoice: null, computerChoice: null, thinking: false });
    els.roundStatus.textContent = "Choose Rock, Paper, or Scissors";
    hideResultCard();
    updateScoreboard();
    clearHistory();
    setButtonsEnabled(true);
  }

  // Computer thinking shuffle animation (cycles icons quickly)
  function runComputerShuffle(durationMs) {
    return new Promise((resolve) => {
      const start = performance.now();
      let i = 0;
      els.computerPanel.classList.add("thinking");
      els.computerStatus.textContent = "Thinking…";

      const tick = (t) => {
        const elapsed = t - start;
        const c = CHOICES[i % CHOICES.length];
        els.computerIcon.textContent = ICONS[c];
        els.computerChoiceText.textContent = pretty(c);
        i++;

        if (elapsed >= durationMs) {
          els.computerPanel.classList.remove("thinking");
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function isMatchOver() {
    if (state.bestOf <= 0) return false;
    const target = Math.ceil(state.bestOf / 2);
    return state.playerScore >= target || state.computerScore >= target;
  }

  function showFinalModal() {
    const target = Math.ceil(state.bestOf / 2);
    const who =
      state.playerScore >= target ? "You won the match 🟢" : "Computer won the match 🔴";
    els.finalMsg.textContent = `${who} — Final score: You ${state.playerScore} • Computer ${state.computerScore} • Draws ${state.draws}`;
    els.finalBackdrop.classList.remove("hidden");
  }

  function closeFinalModal() {
    els.finalBackdrop.classList.add("hidden");
  }

  function openSettings() {
    els.bestOfSelect.value = String(state.bestOf);
    els.historyToggle.setAttribute("aria-pressed", String(state.historyEnabled));
    els.scrollToggle.setAttribute("aria-pressed", String(state.smoothScroll));
    els.soundToggle.setAttribute("aria-pressed", String(state.tinyFeedback));
    els.modalBackdrop.classList.remove("hidden");
  }

  function closeSettings() {
    els.modalBackdrop.classList.add("hidden");
  }

  function toggleSwitch(btn, value) {
    btn.setAttribute("aria-pressed", String(value));
  }

  function tinyPulse() {
    if (!state.tinyFeedback) return;
    // quick UI pulse: shake arena very subtly
    els.arena.classList.remove("shake");
    void els.arena.offsetWidth;
    els.arena.classList.add("shake");
  }

  async function playRound(playerChoice) {
    if (state.isAnimating) return;

    state.isAnimating = true;
    setButtonsEnabled(false);
    clearHighlights();
    hideResultCard();

    state.playerChoice = playerChoice;
    state.computerChoice = null;
    state.result = null;

    els.roundStatus.textContent = "Computer is thinking…";
    updatePanels({ playerChoice: state.playerChoice, computerChoice: null, thinking: true });
    tinyPulse();

    // Shuffle animation
    await runComputerShuffle(TIMING.computerShuffle);

    // Reveal actual computer choice
    state.computerChoice = pickRandomChoice();
    updatePanels({ playerChoice: state.playerChoice, computerChoice: state.computerChoice, thinking: false });

    // Small pause before computing result (feels snappy but readable)
    await new Promise((r) => setTimeout(r, TIMING.revealPause));

    state.result = getWinner(state.playerChoice, state.computerChoice);
    state.roundsPlayed++;

    // Arena shake on reveal
    els.arena.classList.remove("shake");
    void els.arena.offsetWidth;
    els.arena.classList.add("shake");

    // Update scores
    let popWhich = "round";
    if (state.result === "win") {
      state.playerScore++;
      popWhich = "player";
      els.roundStatus.textContent = "You win this round.";
    } else if (state.result === "lose") {
      state.computerScore++;
      popWhich = "computer";
      els.roundStatus.textContent = "You lose this round.";
    } else {
      state.draws++;
      popWhich = "draw";
      els.roundStatus.textContent = "Draw.";
    }

    updateScoreboard(popWhich);

    // Winner highlight glow
    applyHighlights(state.result);

    // Build result card content
    const title =
      state.result === "win" ? "You Win!" : state.result === "lose" ? "You Lose!" : "Draw";
    const explain = explainOutcome(state.playerChoice, state.computerChoice, state.result);

    setResultCard({
      title,
      badge: badgeText(state.result),
      explain,
      recapP: `${ICONS[state.playerChoice]}  ${pretty(state.playerChoice)}`,
      recapC: `${ICONS[state.computerChoice]}  ${pretty(state.computerChoice)}`,
    });

    // History (optional)
    if (state.historyEnabled) {
      state.history.unshift({
        round: state.roundsPlayed,
        player: state.playerChoice,
        computer: state.computerChoice,
        outcome: state.result,
      });
      clampHistory();
      renderHistory();
    }

    // Smooth scroll on small screens
    maybeScrollToResult();

    // Let glow settle, then unlock
    await new Promise((r) => setTimeout(r, TIMING.highlightDuration));

    // If best-of enabled and match ended, show modal (keep buttons enabled after)
    if (isMatchOver()) {
      showFinalModal();
    }

    state.isAnimating = false;
    setButtonsEnabled(true);
  }

  function playAgain() {
    if (state.isAnimating) return;
    state.playerChoice = null;
    state.computerChoice = null;
    state.result = null;

    clearHighlights();
    updatePanels({ playerChoice: null, computerChoice: null, thinking: false });
    els.roundStatus.textContent = "Choose Rock, Paper, or Scissors";
    hideResultCard();
  }

  // Theme
  function toggleTheme() {
    const root = document.documentElement;
    const isLight = root.getAttribute("data-theme") === "light";
    root.setAttribute("data-theme", isLight ? "dark" : "light");
    els.themeBtn.setAttribute("aria-pressed", String(!isLight));
    // store
    localStorage.setItem("rps_theme", isLight ? "dark" : "light");
  }

  function loadTheme() {
    const saved = localStorage.getItem("rps_theme");
    if (!saved) return;
    document.documentElement.setAttribute("data-theme", saved);
    els.themeBtn.setAttribute("aria-pressed", String(saved === "light"));
  }

  // Events
  els.choiceBtns.forEach((btn) => {
    btn.addEventListener("click", () => playRound(btn.dataset.choice));
  });

  els.resetBtn.addEventListener("click", () => resetScores(true));
  els.playAgainBtn.addEventListener("click", playAgain);
  els.clearHistoryBtn.addEventListener("click", clearHistory);

  els.themeBtn.addEventListener("click", toggleTheme);

  els.settingsBtn.addEventListener("click", openSettings);
  els.closeModalBtn.addEventListener("click", closeSettings);
  els.modalBackdrop.addEventListener("click", (e) => {
    if (e.target === els.modalBackdrop) closeSettings();
  });

  els.historyToggle.addEventListener("click", () => {
    const next = !(els.historyToggle.getAttribute("aria-pressed") === "true");
    toggleSwitch(els.historyToggle, next);
  });

  els.scrollToggle.addEventListener("click", () => {
    const next = !(els.scrollToggle.getAttribute("aria-pressed") === "true");
    toggleSwitch(els.scrollToggle, next);
  });

  els.soundToggle.addEventListener("click", () => {
    const next = !(els.soundToggle.getAttribute("aria-pressed") === "true");
    toggleSwitch(els.soundToggle, next);
  });

  els.saveSettingsBtn.addEventListener("click", () => {
    state.bestOf = Number(els.bestOfSelect.value);
    state.historyEnabled = els.historyToggle.getAttribute("aria-pressed") === "true";
    state.smoothScroll = els.scrollToggle.getAttribute("aria-pressed") === "true";
    state.tinyFeedback = els.soundToggle.getAttribute("aria-pressed") === "true";

    updateScoreboard();
    renderHistory();
    closeSettings();
  });

  // Final modal events
  els.closeFinalBtn.addEventListener("click", closeFinalModal);
  els.finalBackdrop.addEventListener("click", (e) => {
    if (e.target === els.finalBackdrop) closeFinalModal();
  });

  els.restartMatchBtn.addEventListener("click", () => {
    closeFinalModal();
    resetScores(true);
  });

  els.keepPlayingBtn.addEventListener("click", () => {
    closeFinalModal();
  });

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    // Close modals
    if (key === "escape") {
      closeSettings();
      closeFinalModal();
      return;
    }

    // Don't play while typing in select or when modal open
    const modalOpen = !els.modalBackdrop.classList.contains("hidden") || !els.finalBackdrop.classList.contains("hidden");
    if (modalOpen) return;

    if (key === "r") playRound("rock");
    if (key === "p") playRound("paper");
    if (key === "s") playRound("scissors");

    if (key === " " || key === "spacebar") {
      e.preventDefault();
      playAgain();
    }
  });

  // Init
  function init() {
    // default theme dark
    document.documentElement.setAttribute("data-theme", "dark");
    loadTheme();

    updatePanels({ playerChoice: null, computerChoice: null, thinking: false });
    updateScoreboard();
    renderHistory();
  }

  init();
})();
